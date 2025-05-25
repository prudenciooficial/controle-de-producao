
import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
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
    <div className={cn("flex flex-col space-y-4", className)}>
      <h3 className="text-sm font-medium text-gray-700">Filtro por Período</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs font-medium" 
          onClick={setCurrentMonth}
        >
          Mês Atual
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs font-medium" 
          onClick={setLast3Months}
        >
          Últimos 3 Meses
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs font-medium" 
          onClick={setLast6Months}
        >
          Últimos 6 Meses
        </Button>
        
        <Button 
          variant="outline" 
          size="sm"
          className="text-xs font-medium" 
          onClick={setLastYear}
        >
          Últimos 12 Meses
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-medium justify-start text-left"
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
