import { format, differenceInDays, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formats a date according to Brazilian standards
 */
export function formatDateBR(date: Date): string {
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Formats a date to day/month format for charts
 */
export function formatDayMonth(date: Date): string {
  return format(date, 'dd/MM', { locale: ptBR });
}

/**
 * Formats a date to month/year format for charts
 */
export function formatMonthYear(date: Date): string {
  return format(date, 'MMM/yy', { locale: ptBR });
}

/**
 * Calculates if a date range is within a month
 */
export function isWithinOneMonth(from: Date, to: Date): boolean {
  // If dates are in the same month, return true
  if (isSameMonth(from, to)) {
    return true;
  }
  
  // Otherwise check if the difference is less than or equal to 31 days
  return differenceInDays(to, from) <= 31;
}

/**
 * Returns the label for a chart tooltip
 */
export function getChartTooltipLabel(date: Date, isDaily: boolean): string {
  if (isDaily) {
    return format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  }
  return format(date, "MMMM 'de' yyyy", { locale: ptBR });
}

/**
 * Formats a value as Brazilian number
 */
export function formatNumberBR(value: number): string {
  return value.toLocaleString('pt-BR');
}
