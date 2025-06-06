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
  // Using toLocaleDateString to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a date string safely, accounting for timezone differences
 */
export function parseDateString(dateString: string): Date {
  // Parse the date using UTC to avoid timezone shifts
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // 12h UTC para evitar mudanças de dia
}
