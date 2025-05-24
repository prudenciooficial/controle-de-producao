
import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
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

  // Set last 3 months
  const setLast3Months = () => {
    const today = new Date();
    const threeMonthsAgo = subMonths(today, 3);
    const lastMonth = subMonths(today, 1);
    onDateRangeChange({
      from: startOfMonth(threeMonthsAgo),
      to: endOfMonth(lastMonth)
    });
  };

  // Set last 6 months
  const setLast6Months = () => {
    const today = new Date();
    const sixMonthsAgo = subMonths(today, 6);
    const lastMonth = subMonths(today, 1);
    onDateRangeChange({
      from: startOfMonth(sixMonthsAgo),
      to: endOfMonth(lastMonth)
    });
  };

  // Set last year
  const setLastYear = () => {
    const today = new Date();
    const oneYearAgo = subMonths(today, 12);
    const lastMonth = subMonths(today, 1);
    onDateRangeChange({
      from: startOfMonth(oneYearAgo),
      to: endOfMonth(lastMonth)
    });
  };

  // Navigate to previous month
  const setPreviousMonth = () => {
    if (dateRange?.from) {
      const prevMonthStart = startOfMonth(subMonths(dateRange.from, 1));
      const prevMonthEnd = endOfMonth(prevMonthStart);
      onDateRangeChange({
        from: prevMonthStart,
        to: prevMonthEnd
      });
    } else {
      setCurrentMonth();
    }
  };

  // Navigate to next month
  const setNextMonth = () => {
    if (dateRange?.from) {
      const nextMonthStart = startOfMonth(addMonths(dateRange.from, 1));
      const nextMonthEnd = endOfMonth(nextMonthStart);
      onDateRangeChange({
        from: nextMonthStart,
        to: nextMonthEnd
      });
    } else {
      setCurrentMonth();
    }
  };

  return (
    <div className={cn("flex flex-col space-y-6", className)}>
      {/* Quick period filters */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Períodos Rápidos</h3>
        <div className="flex flex-wrap gap-2">
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
            Último Ano
          </Button>
        </div>
      </div>

      {/* Custom date selection and navigation */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Seleção Personalizada</h3>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="icon"
            className="h-9 w-9 shrink-0" 
            onClick={setPreviousMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "flex-1 justify-start text-left font-normal min-w-0",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    "Selecione um período"
                  )}
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

          <Button 
            variant="outline" 
            size="icon"
            className="h-9 w-9 shrink-0" 
            onClick={setNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
