// Data Export and Backup System
import { supabase } from './supabase';
import { performanceMonitor } from './performance';

export interface ExportOptions {
  table: string;
  format: 'csv' | 'json' | 'xlsx' | 'pdf';
  filters?: any[];
  includeRelations?: boolean;
  dateRange?: {
    start: string;
    end: string;
    field: string;
  };
  customFields?: string[];
  filename?: string;
}

export interface BackupOptions {
  tables: string[];
  includeSchema?: boolean;
  compression?: boolean;
  encryption?: boolean;
  destination?: 'local' | 'cloud';
}

export interface ExportResult {
  success: boolean;
  filename: string;
  recordCount: number;
  fileSize: number;
  downloadUrl?: string;
  error?: string;
  exportTime: number;
}

class DataExportService {
  private exportHistory: ExportResult[] = [];
  private maxHistorySize: number = 100;

  constructor() {
    this.loadExportHistory();
  }

  // Main export function
  async exportData(options: ExportOptions): Promise<ExportResult> {
    const timer = performanceMonitor.startTimer('data_export', { 
      table: options.table, 
      format: options.format 
    });

    try {
      // Fetch data from Supabase
      const data = await this.fetchDataForExport(options);
      
      if (!data || data.length === 0) {
        throw new Error('No data found for export');
      }

      // Generate filename
      const filename = options.filename || this.generateFilename(options);

      // Export based on format
      let exportResult: ExportResult;
      switch (options.format) {
        case 'csv':
          exportResult = await this.exportToCSV(data, filename);
          break;
        case 'json':
          exportResult = await this.exportToJSON(data, filename);
          break;
        case 'xlsx':
          exportResult = await this.exportToExcel(data, filename);
          break;
        case 'pdf':
          exportResult = await this.exportToPDF(data, filename, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      exportResult.exportTime = timer();
      exportResult.recordCount = data.length;

      // Add to history
      this.addToHistory(exportResult);

      return exportResult;

    } catch (error) {
      const exportTime = timer();
      const result: ExportResult = {
        success: false,
        filename: options.filename || 'export_failed',
        recordCount: 0,
        fileSize: 0,
        error: (error as Error).message,
        exportTime,
      };

      performanceMonitor.logError(error as Error, 'error', { 
        context: 'data_export',
        table: options.table,
        format: options.format 
      });

      this.addToHistory(result);
      return result;
    }
  }

  // Fetch data for export
  private async fetchDataForExport(options: ExportOptions): Promise<any[]> {
    let query = supabase.from(options.table);

    // Apply custom field selection
    if (options.customFields && options.customFields.length > 0) {
      query = query.select(options.customFields.join(', '));
    } else if (options.includeRelations) {
      query = this.addRelationsToQuery(query, options.table);
    } else {
      query = query.select('*');
    }

    // Apply date range filter
    if (options.dateRange) {
      query = query
        .gte(options.dateRange.field, options.dateRange.start)
        .lte(options.dateRange.field, options.dateRange.end);
    }

    // Apply additional filters
    if (options.filters && options.filters.length > 0) {
      options.filters.forEach(filter => {
        // Apply filter logic here
        if (filter.field && filter.operator && filter.value !== undefined) {
          switch (filter.operator) {
            case 'eq':
              query = query.eq(filter.field, filter.value);
              break;
            case 'neq':
              query = query.neq(filter.field, filter.value);
              break;
            case 'gt':
              query = query.gt(filter.field, filter.value);
              break;
            case 'gte':
              query = query.gte(filter.field, filter.value);
              break;
            case 'lt':
              query = query.lt(filter.field, filter.value);
              break;
            case 'lte':
              query = query.lte(filter.field, filter.value);
              break;
            case 'like':
              query = query.like(filter.field, `%${filter.value}%`);
              break;
            case 'ilike':
              query = query.ilike(filter.field, `%${filter.value}%`);
              break;
            case 'in':
              query = query.in(filter.field, filter.value);
              break;
          }
        }
      });
    }

    // Order by created_at if available
    try {
      query = query.order('created_at', { ascending: false });
    } catch {
      // If created_at doesn't exist, order by id
      query = query.order('id', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  // Add relations to query based on table
  private addRelationsToQuery(query: any, table: string): any {
    switch (table) {
      case 'devices':
        return query.select(`
          *,
          restaurant:restaurants(id, name, address, phone),
          category:device_categories(id, name, color),
          model:device_models(id, name, manufacturer, specifications)
        `);
      case 'maintenance_records':
        return query.select(`
          *,
          device:devices(id, name, serial_number, model),
          technician:users(id, name, email, phone)
        `);
      case 'tickets':
        return query.select('*');
      default:
        return query.select('*');
    }
  }

  // Export to CSV
  private async exportToCSV(data: any[], filename: string): Promise<ExportResult> {
    try {
      const csvContent = this.convertToCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      if (typeof window !== 'undefined') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      return {
        success: true,
        filename,
        recordCount: data.length,
        fileSize: blob.size,
        downloadUrl: typeof window !== 'undefined' ? 'downloaded' : undefined,
        exportTime: 0, // Will be set by caller
      };
    } catch (error) {
      throw new Error(`CSV export failed: ${(error as Error).message}`);
    }
  }

  // Export to JSON
  private async exportToJSON(data: any[], filename: string): Promise<ExportResult> {
    try {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      
      if (typeof window !== 'undefined') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      return {
        success: true,
        filename,
        recordCount: data.length,
        fileSize: blob.size,
        downloadUrl: typeof window !== 'undefined' ? 'downloaded' : undefined,
        exportTime: 0,
      };
    } catch (error) {
      throw new Error(`JSON export failed: ${(error as Error).message}`);
    }
  }

  // Export to Excel (simplified - would need a library like xlsx in production)
  private async exportToExcel(data: any[], filename: string): Promise<ExportResult> {
    // For now, export as CSV with .xlsx extension
    // In production, you'd use a library like 'xlsx' or 'exceljs'
    return this.exportToCSV(data, filename.replace('.csv', '.xlsx'));
  }

  // Export to PDF (simplified - would need a library like jsPDF in production)
  private async exportToPDF(data: any[], filename: string, options: ExportOptions): Promise<ExportResult> {
    try {
      // Create a simple text-based PDF content
      const pdfContent = this.generatePDFContent(data, options);
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      
      if (typeof window !== 'undefined') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      return {
        success: true,
        filename,
        recordCount: data.length,
        fileSize: blob.size,
        downloadUrl: typeof window !== 'undefined' ? 'downloaded' : undefined,
        exportTime: 0,
      };
    } catch (error) {
      throw new Error(`PDF export failed: ${(error as Error).message}`);
    }
  }

  // Convert data to CSV format
  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    // Get all unique keys from all objects (flattened)
    const allKeys = new Set<string>();
    data.forEach(item => {
      this.flattenObject(item).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const csvRows = [headers.join(',')];

    data.forEach(item => {
      const flatItem = this.flattenObject(item);
      const row = headers.map(header => {
        const value = flatItem.get(header) || '';
        // Escape commas and quotes
        const escapedValue = String(value).replace(/"/g, '""');
        return `"${escapedValue}"`;
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  // Flatten nested objects for CSV export
  private flattenObject(obj: any, prefix: string = ''): Map<string, any> {
    const flattened = new Map<string, any>();

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Recursively flatten nested objects
        const nested = this.flattenObject(value, newKey);
        nested.forEach((nestedValue, nestedKey) => {
          flattened.set(nestedKey, nestedValue);
        });
      } else {
        flattened.set(newKey, value);
      }
    });

    return flattened;
  }

  // Generate PDF content (simplified)
  private generatePDFContent(data: any[], options: ExportOptions): string {
    const title = `${options.table.toUpperCase()} EXPORT REPORT`;
    const date = new Date().toLocaleString();
    
    let content = `${title}\nGenerated: ${date}\nRecords: ${data.length}\n\n`;
    
    // Add data summary
    data.slice(0, 10).forEach((item, index) => {
      content += `Record ${index + 1}:\n`;
      Object.keys(item).forEach(key => {
        if (typeof item[key] !== 'object') {
          content += `  ${key}: ${item[key]}\n`;
        }
      });
      content += '\n';
    });

    if (data.length > 10) {
      content += `... and ${data.length - 10} more records\n`;
    }

    return content;
  }

  // Generate filename
  private generateFilename(options: ExportOptions): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const extension = options.format === 'xlsx' ? 'xlsx' : options.format;
    return `${options.table}_export_${timestamp}.${extension}`;
  }

  // Backup entire database
  async createBackup(options: BackupOptions): Promise<ExportResult> {
    const timer = performanceMonitor.startTimer('database_backup');

    try {
      const backupData: any = {};
      let totalRecords = 0;

      // Export each table
      for (const table of options.tables) {
        const { data, error } = await supabase.from(table).select('*');
        if (error) {
          throw error;
        }
        backupData[table] = data;
        totalRecords += data?.length || 0;
      }

      // Add metadata
      backupData._metadata = {
        created_at: new Date().toISOString(),
        tables: options.tables,
        total_records: totalRecords,
        version: '1.0',
      };

      const filename = `database_backup_${new Date().toISOString().split('T')[0]}.json`;
      const jsonContent = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });

      if (typeof window !== 'undefined') {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      const result: ExportResult = {
        success: true,
        filename,
        recordCount: totalRecords,
        fileSize: blob.size,
        downloadUrl: typeof window !== 'undefined' ? 'downloaded' : undefined,
        exportTime: timer(),
      };

      this.addToHistory(result);
      return result;

    } catch (error) {
      const exportTime = timer();
      const result: ExportResult = {
        success: false,
        filename: 'backup_failed',
        recordCount: 0,
        fileSize: 0,
        error: (error as Error).message,
        exportTime,
      };

      performanceMonitor.logError(error as Error, 'error', { context: 'database_backup' });
      this.addToHistory(result);
      return result;
    }
  }

  // Get export history
  getExportHistory(): ExportResult[] {
    return [...this.exportHistory];
  }

  // Clear export history
  clearExportHistory(): void {
    this.exportHistory = [];
    this.persistExportHistory();
  }

  // Add to export history
  private addToHistory(result: ExportResult): void {
    this.exportHistory.unshift(result);

    // Limit size
    if (this.exportHistory.length > this.maxHistorySize) {
      this.exportHistory = this.exportHistory.slice(0, this.maxHistorySize);
    }

    this.persistExportHistory();
  }

  // Persistence methods
  private persistExportHistory(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('export_history', JSON.stringify(this.exportHistory));
    }
  }

  private loadExportHistory(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const history = localStorage.getItem('export_history');
        if (history) {
          this.exportHistory = JSON.parse(history);
        }
      }
    } catch (error) {
      performanceMonitor.logError(error as Error, 'warning', { context: 'load_export_history' });
    }
  }
}

// Create singleton instance
export const dataExportService = new DataExportService();

// Convenience functions
export const exportDevicesCSV = (filters?: any[]) =>
  dataExportService.exportData({ 
    table: 'devices', 
    format: 'csv', 
    includeRelations: true, 
    filters 
  });

export const exportMaintenanceJSON = (dateRange?: { start: string; end: string }) =>
  dataExportService.exportData({ 
    table: 'maintenance_records', 
    format: 'json', 
    includeRelations: true,
    dateRange: dateRange ? { ...dateRange, field: 'created_at' } : undefined
  });

export const createFullBackup = () =>
  dataExportService.createBackup({ 
    tables: ['devices', 'maintenance_records', 'tickets', 'restaurants', 'device_categories', 'users'],
    includeSchema: true 
  });
