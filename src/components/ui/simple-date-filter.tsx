
import React, { useState } from "react";
import { format } from "date-fns";
import { Button } from "./button";
import { Input } from "./input";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

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
  // Função para navegar para o período anterior
  const goToPreviousPeriod = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    const currentRange = dateRange.to.getTime() - dateRange.from.getTime();
    const newTo = new Date(dateRange.from);
    const newFrom = new Date(dateRange.from.getTime() - currentRange);
    
    onDateRangeChange({ from: newFrom, to: newTo });
  };
  
  // Função para navegar para o próximo período
  const goToNextPeriod = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    const currentRange = dateRange.to.getTime() - dateRange.from.getTime();
    const newFrom = new Date(dateRange.to);
    const newTo = new Date(dateRange.to.getTime() + currentRange);
    
    // Não deixar selecionar datas futuras além de hoje
    const today = new Date();
    if (newTo > today) {
      newTo.setTime(today.getTime());
    }
    
    onDateRangeChange({ from: newFrom, to: newTo });
  };
  
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    
    const newFrom = new Date(e.target.value);
    const newTo = dateRange?.to || new Date();
    
    // Garantir que a data final não seja anterior à data inicial
    if (newFrom > newTo) {
      onDateRangeChange({ from: newFrom, to: newFrom });
    } else {
      onDateRangeChange({ from: newFrom, to: newTo });
    }
  };
  
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    
    const newTo = new Date(e.target.value);
    const newFrom = dateRange?.from || new Date();
    
    // Garantir que a data inicial não seja posterior à data final
    if (newTo < newFrom) {
      onDateRangeChange({ from: newTo, to: newTo });
    } else {
      onDateRangeChange({ from: newFrom, to: newTo });
    }
  };
  
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button 
        variant="outline" 
        size="icon"
        className="h-9 w-9"
        onClick={goToPreviousPeriod}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-2">
        <Input
          type="date"
          className="w-auto"
          value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
          onChange={handleStartDateChange}
        />
        <span>até</span>
        <Input
          type="date"
          className="w-auto"
          value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
          onChange={handleEndDateChange}
        />
      </div>
      
      <Button 
        variant="outline" 
        size="icon"
        className="h-9 w-9"
        onClick={goToNextPeriod}
        disabled={dateRange?.to && dateRange.to >= new Date()}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
