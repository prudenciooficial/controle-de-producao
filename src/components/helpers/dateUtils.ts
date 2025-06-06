/**
 * Utility functions for handling dates with timezone considerations
 */

/**
 * Returns today's date in YYYY-MM-DD format, accounting for timezone differences
 */
export function getTodayDateString(): string {
  const today = new Date();
  return formatDateString(today);
}

/**
 * Converts a Date object to YYYY-MM-DD format string, accounting for timezone differences
 */
export function formatDateString(date: Date): string {
  // Using toLocaleDateString with specific locale to avoid timezone issues
  return date.toLocaleDateString('sv-SE'); // 'sv-SE' locale returns YYYY-MM-DD format
}

/**
 * Parses a date string safely, accounting for timezone differences
 */
export function parseDateString(dateString: string): Date {
  // Parse the date as local date to match user's timezone expectation
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
