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
}

export function SimpleDateFilter({
  dateRange,
  onDateRangeChange,
  className,
}: SimpleDateFilterProps) {
  const today = new Date();

  const isCurrentMonth = (range: DateRange | undefined): boolean => {
    if (!range?.from || !range?.to) return false;
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);
    return isEqual(startOfDay(range.from), currentMonthStart) && isEqual(startOfDay(range.to), currentMonthEnd);
  };

  const isLast3Months = (range: DateRange | undefined): boolean => {
    if (!range?.from || !range?.to) return false;
    const threeMonthsAgoStart = startOfMonth(subMonths(today, 2));
    const currentMonthEnd = endOfMonth(today);
    return isEqual(startOfDay(range.from), threeMonthsAgoStart) && isEqual(startOfDay(range.to), currentMonthEnd);
  };

  const isLast6Months = (range: DateRange | undefined): boolean => {
    if (!range?.from || !range?.to) return false;
    const sixMonthsAgoStart = startOfMonth(subMonths(today, 5));
    const currentMonthEnd = endOfMonth(today);
    return isEqual(startOfDay(range.from), sixMonthsAgoStart) && isEqual(startOfDay(range.to), currentMonthEnd);
  };

  const isLastYear = (range: DateRange | undefined): boolean => {
    if (!range?.from || !range?.to) return false;
    const oneYearAgoStart = startOfMonth(subMonths(today, 11));
    const currentMonthEnd = endOfMonth(today);
    return isEqual(startOfDay(range.from), oneYearAgoStart) && isEqual(startOfDay(range.to), currentMonthEnd);
  };

  const актуальныйDateRangeFrom = dateRange?.from ? startOfDay(dateRange.from) : undefined;
  const актуальныйDateRangeTo = dateRange?.to ? startOfDay(dateRange.to) : undefined;

  const isCustomDateActive = 
    !!актуальныйDateRangeFrom && !!актуальныйDateRangeTo &&
    !isCurrentMonth({ from: актуальныйDateRangeFrom, to: актуальныйDateRangeTo }) && 
    !isLast3Months({ from: актуальныйDateRangeFrom, to: актуальныйDateRangeTo }) && 
    !isLast6Months({ from: актуальныйDateRangeFrom, to: актуальныйDateRangeTo }) && 
    !isLastYear({ from: актуальныйDateRangeFrom, to: актуальныйDateRangeTo });

  // Set current month
  const setCurrentMonth = () => {
    const today = new Date();
    onDateRangeChange({
      from: startOfMonth(today),
      to: endOfMonth(today)
    });
  };

  // Set last 3 months (including current month)
  const setLast3Months = () => {
    const today = new Date();
    const threeMonthsAgo = subMonths(today, 2);
    onDateRangeChange({
      from: startOfMonth(threeMonthsAgo),
      to: endOfMonth(today)
    });
  };

  // Set last 6 months (including current month)
  const setLast6Months = () => {
    const today = new Date();
    const sixMonthsAgo = subMonths(today, 5);
    onDateRangeChange({
      from: startOfMonth(sixMonthsAgo),
      to: endOfMonth(today)
    });
  };

  // Set last year (including current month)
  const setLastYear = () => {
    const today = new Date();
    const oneYearAgo = subMonths(today, 11);
    onDateRangeChange({
      from: startOfMonth(oneYearAgo),
      to: endOfMonth(today)
    });
  };

  return (
    <div className={cn("flex flex-col space-y-2 w-full border rounded-lg p-4 shadow-sm", className)}>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Filtro por Período</h3>
      
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={isCurrentMonth(dateRange) ? "default" : "outline"} 
          size="sm"
          className="text-xs font-medium w-full sm:w-auto"
          onClick={setCurrentMonth}
        >
          Mês Atual
        </Button>
        
        <Button 
          variant={isLast3Months(dateRange) ? "default" : "outline"}
          size="sm"
          className="text-xs font-medium w-full sm:w-auto"
          onClick={setLast3Months}
        >
          Últimos 3 Meses
        </Button>
        
        <Button 
          variant={isLast6Months(dateRange) ? "default" : "outline"}
          size="sm"
          className="text-xs font-medium w-full sm:w-auto"
          onClick={setLast6Months}
        >
          Últimos 6 Meses
        </Button>
        
        <Button 
          variant={isLastYear(dateRange) ? "default" : "outline"}
          size="sm"
          className="text-xs font-medium w-full sm:w-auto"
          onClick={setLastYear}
        >
          Últimos 12 Meses
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={isCustomDateActive ? "default" : "outline"}
              size="sm"
              className="text-xs font-medium w-full sm:w-auto justify-start text-left"
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
