import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths, isEqual, Locale, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

interface SimpleDateFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
  compact?: boolean;
}

export function SimpleDateFilter({
  dateRange,
  onDateRangeChange,
  className,
  compact = false,
}: SimpleDateFilterProps) {
  const today = new Date();

  const normalizedDateRange: DateRange | undefined = React.useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return {
        from: startOfDay(dateRange.from),
        to: startOfDay(dateRange.to),
      };
    }
    return undefined;
  }, [dateRange]);

  const isCurrentMonth = (rangeToCheck: DateRange | undefined): boolean => {
    if (!rangeToCheck?.from || !rangeToCheck?.to) return false;
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = startOfDay(endOfMonth(today));
    return isEqual(rangeToCheck.from, currentMonthStart) && isEqual(rangeToCheck.to, currentMonthEnd);
  };

  const isLast3Months = (rangeToCheck: DateRange | undefined): boolean => {
    if (!rangeToCheck?.from || !rangeToCheck?.to) return false;
    const threeMonthsAgoStart = startOfMonth(subMonths(today, 2));
    const currentMonthEnd = startOfDay(endOfMonth(today));
    return isEqual(rangeToCheck.from, threeMonthsAgoStart) && isEqual(rangeToCheck.to, currentMonthEnd);
  };

  const isLast6Months = (rangeToCheck: DateRange | undefined): boolean => {
    if (!rangeToCheck?.from || !rangeToCheck?.to) return false;
    const sixMonthsAgoStart = startOfMonth(subMonths(today, 5));
    const currentMonthEnd = startOfDay(endOfMonth(today));
    return isEqual(rangeToCheck.from, sixMonthsAgoStart) && isEqual(rangeToCheck.to, currentMonthEnd);
  };

  const isLastYear = (rangeToCheck: DateRange | undefined): boolean => {
    if (!rangeToCheck?.from || !rangeToCheck?.to) return false;
    const oneYearAgoStart = startOfMonth(subMonths(today, 11));
    const currentMonthEnd = startOfDay(endOfMonth(today));
    return isEqual(rangeToCheck.from, oneYearAgoStart) && isEqual(rangeToCheck.to, currentMonthEnd);
  };

  const activeCurrentMonth = isCurrentMonth(normalizedDateRange);
  const activeLast3Months = isLast3Months(normalizedDateRange);
  const activeLast6Months = isLast6Months(normalizedDateRange);
  const activeLastYear = isLastYear(normalizedDateRange);

  const isCustomDateActive = 
    !!normalizedDateRange &&
    !activeCurrentMonth && 
    !activeLast3Months && 
    !activeLast6Months && 
    !activeLastYear;

  const setCurrentMonth = () => {
    const currentToday = new Date();
    onDateRangeChange({
      from: startOfMonth(currentToday),
      to: endOfMonth(currentToday)
    });
  };

  const setLast3Months = () => {
    const currentToday = new Date();
    const threeMonthsAgo = subMonths(currentToday, 2);
    onDateRangeChange({
      from: startOfMonth(threeMonthsAgo),
      to: endOfMonth(currentToday)
    });
  };

  const setLast6Months = () => {
    const currentToday = new Date();
    const sixMonthsAgo = subMonths(currentToday, 5);
    onDateRangeChange({
      from: startOfMonth(sixMonthsAgo),
      to: endOfMonth(currentToday)
    });
  };

  const setLastYear = () => {
    const currentToday = new Date();
    const oneYearAgo = subMonths(currentToday, 11);
    onDateRangeChange({
      from: startOfMonth(oneYearAgo),
      to: endOfMonth(currentToday)
    });
  };

  return (
    <div className={cn(
      compact
        ? "flex flex-wrap items-center gap-2 w-full"
        : "flex flex-col space-y-2 w-full border rounded-lg p-4 shadow-sm",
      className
    )}>
      {compact ? (
        <span className="text-sm font-medium text-muted-foreground">Período:</span>
      ) : (
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Filtro por Período</h3>
      )}

      <div className={cn("flex flex-wrap gap-2", compact && "items-center")}>
        <Button
          variant={activeCurrentMonth ? "default" : "outline"}
          size="sm"
          className={cn("text-xs font-medium", compact ? "" : "w-full sm:w-auto")}
          onClick={setCurrentMonth}
        >
          Mês Atual
        </Button>

        <Button
          variant={activeLast3Months ? "default" : "outline"}
          size="sm"
          className={cn("text-xs font-medium", compact ? "" : "w-full sm:w-auto")}
          onClick={setLast3Months}
        >
          Últimos 3 Meses
        </Button>

        <Button
          variant={activeLast6Months ? "default" : "outline"}
          size="sm"
          className={cn("text-xs font-medium", compact ? "" : "w-full sm:w-auto")}
          onClick={setLast6Months}
        >
          Últimos 6 Meses
        </Button>

        <Button
          variant={activeLastYear ? "default" : "outline"}
          size="sm"
          className={cn("text-xs font-medium", compact ? "" : "w-full sm:w-auto")}
          onClick={setLastYear}
        >
          Últimos 12 Meses
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={isCustomDateActive ? "default" : "outline"}
              size="sm"
              className={cn("text-xs font-medium sm:justify-start justify-center", compact ? "" : "w-full sm:w-auto")}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">
                Personalizado
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={onDateRangeChange}
              locale={ptBR}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
