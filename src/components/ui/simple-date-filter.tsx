
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
    <div className={cn("flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 items-start", className)}>
      <Button 
        variant="outline" 
        className="w-full sm:w-auto" 
        onClick={setCurrentMonth}
      >
        Mês atual
      </Button>

      <div className="flex space-x-1 w-full sm:w-auto">
        <Button variant="outline" size="icon" onClick={setPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
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
                <span>Selecione um período</span>
              )}
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

        <Button variant="outline" size="icon" onClick={setNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
