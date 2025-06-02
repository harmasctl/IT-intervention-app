// Advanced Search and Filtering System
import { supabase } from './supabase';
import { performanceMonitor } from './performance';

export interface SearchFilter {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is' | 'not';
  value: any;
  type?: 'string' | 'number' | 'date' | 'boolean' | 'array';
}

export interface SearchOptions {
  table: string;
  filters: SearchFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  select?: string;
  includeRelations?: boolean;
}

export interface SearchResult<T = any> {
  data: T[];
  count: number;
  totalPages: number;
  currentPage: number;
  hasMore: boolean;
  searchTime: number;
  filters: SearchFilter[];
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  table: string;
  filters: SearchFilter[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

class AdvancedSearchService {
  private searchHistory: SearchOptions[] = [];
  private savedSearches: SavedSearch[] = [];
  private maxHistorySize: number = 50;

  constructor() {
    this.loadSavedSearches();
  }

  // Main search function
  async search<T = any>(options: SearchOptions): Promise<SearchResult<T>> {
    const timer = performanceMonitor.startTimer('advanced_search', { table: options.table });
    
    try {
      // Build the query
      let query = supabase.from(options.table);

      // Apply select clause
      if (options.select) {
        query = query.select(options.select);
      } else if (options.includeRelations) {
        query = this.addRelations(query, options.table);
      } else {
        query = query.select('*');
      }

      // Apply filters
      query = this.applyFilters(query, options.filters);

      // Apply sorting
      if (options.sortBy) {
        query = query.order(options.sortBy, { ascending: options.sortOrder !== 'desc' });
      }

      // Get total count for pagination
      const countQuery = supabase
        .from(options.table)
        .select('*', { count: 'exact', head: true });
      
      const countQueryWithFilters = this.applyFilters(countQuery, options.filters);

      // Execute queries in parallel
      const [dataResult, countResult] = await Promise.all([
        options.limit ? query.range(options.offset || 0, (options.offset || 0) + options.limit - 1) : query,
        countQueryWithFilters
      ]);

      if (dataResult.error) {
        throw dataResult.error;
      }

      const totalCount = countResult.count || 0;
      const currentPage = options.limit ? Math.floor((options.offset || 0) / options.limit) + 1 : 1;
      const totalPages = options.limit ? Math.ceil(totalCount / options.limit) : 1;
      const hasMore = options.limit ? (options.offset || 0) + options.limit < totalCount : false;

      // Add to search history
      this.addToHistory(options);

      const searchTime = timer();

      return {
        data: dataResult.data || [],
        count: totalCount,
        totalPages,
        currentPage,
        hasMore,
        searchTime,
        filters: options.filters,
      };

    } catch (error) {
      timer();
      performanceMonitor.logError(error as Error, 'error', { 
        context: 'advanced_search',
        table: options.table,
        filters: options.filters 
      });
      throw error;
    }
  }

  // Apply filters to query
  private applyFilters(query: any, filters: SearchFilter[]): any {
    let filteredQuery = query;

    filters.forEach(filter => {
      const { field, operator, value, type } = filter;

      // Handle different data types
      let processedValue = value;
      if (type === 'date' && typeof value === 'string') {
        processedValue = new Date(value).toISOString();
      }

      switch (operator) {
        case 'eq':
          filteredQuery = filteredQuery.eq(field, processedValue);
          break;
        case 'neq':
          filteredQuery = filteredQuery.neq(field, processedValue);
          break;
        case 'gt':
          filteredQuery = filteredQuery.gt(field, processedValue);
          break;
        case 'gte':
          filteredQuery = filteredQuery.gte(field, processedValue);
          break;
        case 'lt':
          filteredQuery = filteredQuery.lt(field, processedValue);
          break;
        case 'lte':
          filteredQuery = filteredQuery.lte(field, processedValue);
          break;
        case 'like':
          filteredQuery = filteredQuery.like(field, `%${processedValue}%`);
          break;
        case 'ilike':
          filteredQuery = filteredQuery.ilike(field, `%${processedValue}%`);
          break;
        case 'in':
          filteredQuery = filteredQuery.in(field, Array.isArray(processedValue) ? processedValue : [processedValue]);
          break;
        case 'is':
          filteredQuery = filteredQuery.is(field, processedValue);
          break;
        case 'not':
          filteredQuery = filteredQuery.not(field, 'eq', processedValue);
          break;
      }
    });

    return filteredQuery;
  }

  // Add relations based on table
  private addRelations(query: any, table: string): any {
    switch (table) {
      case 'devices':
        return query.select(`
          *,
          restaurant:restaurants(id, name, address),
          category:device_categories(id, name, color),
          model:device_models(id, name, manufacturer)
        `);
      case 'maintenance_records':
        return query.select(`
          *,
          device:devices(id, name, serial_number),
          technician:users(id, name, email)
        `);
      case 'tickets':
        return query.select(`
          *,
          device:devices(id, name, serial_number),
          assigned_to:users(id, name, email),
          created_by:users(id, name, email)
        `);
      case 'notifications':
        return query.select(`
          *,
          device:devices(id, name, serial_number),
          user:users(id, name, email)
        `);
      default:
        return query.select('*');
    }
  }

  // Quick search across multiple fields
  async quickSearch(table: string, searchTerm: string, fields: string[] = []): Promise<SearchResult> {
    const defaultFields = this.getDefaultSearchFields(table);
    const searchFields = fields.length > 0 ? fields : defaultFields;

    const filters: SearchFilter[] = searchFields.map(field => ({
      field,
      operator: 'ilike',
      value: searchTerm,
      type: 'string'
    }));

    // Use OR logic for quick search (simulate with multiple searches and combine)
    const searches = await Promise.all(
      filters.map(filter => 
        this.search({ table, filters: [filter], limit: 20 })
      )
    );

    // Combine and deduplicate results
    const combinedData = new Map();
    let totalSearchTime = 0;

    searches.forEach(result => {
      totalSearchTime += result.searchTime;
      result.data.forEach(item => {
        if (item.id && !combinedData.has(item.id)) {
          combinedData.set(item.id, item);
        }
      });
    });

    return {
      data: Array.from(combinedData.values()),
      count: combinedData.size,
      totalPages: 1,
      currentPage: 1,
      hasMore: false,
      searchTime: totalSearchTime,
      filters,
    };
  }

  // Get default search fields for each table
  private getDefaultSearchFields(table: string): string[] {
    switch (table) {
      case 'devices':
        return ['name', 'serial_number', 'model', 'notes'];
      case 'maintenance_records':
        return ['description', 'notes', 'technician_notes'];
      case 'tickets':
        return ['title', 'description', 'resolution_notes'];
      case 'restaurants':
        return ['name', 'address', 'contact_person'];
      case 'users':
        return ['name', 'email'];
      default:
        return ['name', 'description'];
    }
  }

  // Save a search for reuse
  async saveSearch(search: Omit<SavedSearch, 'id' | 'createdAt' | 'usageCount'>): Promise<SavedSearch> {
    const savedSearch: SavedSearch = {
      ...search,
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    this.savedSearches.push(savedSearch);
    this.persistSavedSearches();

    return savedSearch;
  }

  // Load a saved search
  async loadSavedSearch(searchId: string): Promise<SavedSearch | null> {
    const search = this.savedSearches.find(s => s.id === searchId);
    if (search) {
      search.usageCount++;
      this.persistSavedSearches();
    }
    return search || null;
  }

  // Get all saved searches
  getSavedSearches(table?: string): SavedSearch[] {
    return table 
      ? this.savedSearches.filter(s => s.table === table)
      : this.savedSearches;
  }

  // Delete a saved search
  deleteSavedSearch(searchId: string): boolean {
    const index = this.savedSearches.findIndex(s => s.id === searchId);
    if (index > -1) {
      this.savedSearches.splice(index, 1);
      this.persistSavedSearches();
      return true;
    }
    return false;
  }

  // Get search history
  getSearchHistory(): SearchOptions[] {
    return [...this.searchHistory];
  }

  // Clear search history
  clearSearchHistory(): void {
    this.searchHistory = [];
    this.persistSearchHistory();
  }

  // Add to search history
  private addToHistory(options: SearchOptions): void {
    // Remove duplicate if exists
    this.searchHistory = this.searchHistory.filter(h => 
      JSON.stringify(h) !== JSON.stringify(options)
    );

    // Add to beginning
    this.searchHistory.unshift(options);

    // Limit size
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }

    this.persistSearchHistory();
  }

  // Persistence methods
  private persistSavedSearches(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('saved_searches', JSON.stringify(this.savedSearches));
    }
  }

  private persistSearchHistory(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('search_history', JSON.stringify(this.searchHistory));
    }
  }

  private loadSavedSearches(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('saved_searches');
        if (saved) {
          this.savedSearches = JSON.parse(saved);
        }

        const history = localStorage.getItem('search_history');
        if (history) {
          this.searchHistory = JSON.parse(history);
        }
      }
    } catch (error) {
      performanceMonitor.logError(error as Error, 'warning', { context: 'load_saved_searches' });
    }
  }

  // Build filter from common UI patterns
  static buildDateRangeFilter(field: string, startDate: string, endDate: string): SearchFilter[] {
    return [
      { field, operator: 'gte', value: startDate, type: 'date' },
      { field, operator: 'lte', value: endDate, type: 'date' }
    ];
  }

  static buildStatusFilter(field: string, statuses: string[]): SearchFilter {
    return { field, operator: 'in', value: statuses, type: 'array' };
  }

  static buildTextSearchFilter(field: string, searchTerm: string): SearchFilter {
    return { field, operator: 'ilike', value: searchTerm, type: 'string' };
  }

  static buildNumericRangeFilter(field: string, min: number, max: number): SearchFilter[] {
    return [
      { field, operator: 'gte', value: min, type: 'number' },
      { field, operator: 'lte', value: max, type: 'number' }
    ];
  }
}

// Create singleton instance
export const advancedSearchService = new AdvancedSearchService();

// Convenience functions
export const searchDevices = (filters: SearchFilter[], options?: Partial<SearchOptions>) =>
  advancedSearchService.search({ table: 'devices', filters, includeRelations: true, ...options });

export const searchMaintenance = (filters: SearchFilter[], options?: Partial<SearchOptions>) =>
  advancedSearchService.search({ table: 'maintenance_records', filters, includeRelations: true, ...options });

export const searchTickets = (filters: SearchFilter[], options?: Partial<SearchOptions>) =>
  advancedSearchService.search({ table: 'tickets', filters, includeRelations: true, ...options });

export const quickSearchDevices = (searchTerm: string) =>
  advancedSearchService.quickSearch('devices', searchTerm);

export const quickSearchAll = async (searchTerm: string) => {
  const [devices, maintenance, tickets] = await Promise.all([
    advancedSearchService.quickSearch('devices', searchTerm),
    advancedSearchService.quickSearch('maintenance_records', searchTerm),
    advancedSearchService.quickSearch('tickets', searchTerm),
  ]);

  return { devices, maintenance, tickets };
};
