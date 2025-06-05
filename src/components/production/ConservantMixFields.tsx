import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConservantUsage {
  materialBatchId: string;
  materialName: string;
  batchNumber: string;
  maxMixes: number;
  assignedMixes: number;
  quantity: number;
  unitOfMeasure: string;
}

interface ConservantMixFieldsProps {
  conservantUsages: ConservantUsage[];
  isValid: boolean;
  validationError: string;
  onMixCountChange: (materialBatchId: string, mixCount: number) => void;
  form: any;
}

export const ConservantMixFields: React.FC<ConservantMixFieldsProps> = ({
  conservantUsages,
  isValid,
  validationError,
  onMixCountChange,
  form
}) => {
  if (conservantUsages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mt-6 p-4 border rounded-lg bg-blue-50/50">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-blue-600" />
        <h4 className="font-medium text-blue-900">Distribuição de Conservantes por Lote</h4>
      </div>
      
      <p className="text-sm text-blue-700">
        Conservantes detectados! Distribua as mexidas entre os lotes disponíveis.
      </p>

      {!isValid && validationError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {conservantUsages.map((usage, index) => (
          <Card key={usage.materialBatchId} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <p className="font-medium text-sm">{usage.materialName}</p>
                <p className="text-xs text-muted-foreground">Lote: {usage.batchNumber}</p>
                <p className="text-xs text-muted-foreground">
                  Máx: {usage.maxMixes} mexidas
                </p>
              </div>
              
              <div>
                <FormLabel className="text-xs">Mexidas Atribuídas</FormLabel>
                <Input
                  type="number"
                  value={usage.assignedMixes === 0 ? "" : usage.assignedMixes}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue === "") {
                      onMixCountChange(usage.materialBatchId, 0);
                    } else {
                      const value = parseInt(inputValue) || 0;
                      onMixCountChange(usage.materialBatchId, value);
                    }
                  }}
                  onBlur={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue === "") {
                      onMixCountChange(usage.materialBatchId, 0);
                    }
                  }}
                  max={usage.maxMixes}
                  min={0}
                  className="h-8"
                  disabled={index === 0 && conservantUsages.length > 1}
                />
                {index === 0 && conservantUsages.length > 1 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-ajustado para balancear o total
                  </p>
                )}
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium">
                  {usage.quantity.toFixed(2)} {usage.unitOfMeasure}
                </p>
                <p className="text-xs text-muted-foreground">
                  Quantidade calculada
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      <div className="pt-3 border-t">
        <div className="flex justify-between text-sm">
          <span>Total de mexidas distribuídas:</span>
          <span className="font-medium">
            {conservantUsages.reduce((sum, usage) => sum + usage.assignedMixes, 0)}
          </span>
        </div>
      </div>
    </div>
  );
};
