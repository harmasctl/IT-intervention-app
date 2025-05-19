/**
 * Utility functions for the application
 */

/**
 * Format a number as currency
 * @param amount - The amount to format
 * @param currency - The currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date to a readable string
 * @param date - The date to format
 * @param format - The format to use (default: 'medium')
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, format: 'short' | 'medium' | 'long' = 'medium'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'short' ? 'numeric' : 'long',
    day: 'numeric',
  };
  
  if (format === 'long') {
    options.hour = 'numeric';
    options.minute = 'numeric';
  }
  
  return new Intl.DateTimeFormat('en-US', options).format(dateObj);
}

/**
 * Truncate a string to a specified length
 * @param str - The string to truncate
 * @param length - Maximum length
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated string
 */
export function truncateString(str: string, length: number, suffix: string = '...'): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + suffix;
}

/**
 * Generate a unique ID
 * @returns Unique ID string
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Check if a value is empty (null, undefined, empty string, empty array, or empty object)
 * @param value - The value to check
 * @returns True if the value is empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
} 