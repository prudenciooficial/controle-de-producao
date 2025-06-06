
import React from "react";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Combobox } from "@/components/ui/combobox";
import { UseFormReturn } from "react-hook-form";
import { ProductionBatch } from "@/types";

interface MixSelectorProps {
  form: UseFormReturn<any>;
  availableMixes: ProductionBatch[];
}

const MixSelector: React.FC<MixSelectorProps> = ({ form, availableMixes }) => {
  const mixOptions = availableMixes.map(mix => ({
    value: mix.id,
    label: `${mix.batchNumber} - ${new Date(mix.productionDate).toLocaleDateString('pt-BR')} (${mix.mixCount} mexidas)`
  }));

  return (
    <FormField
      control={form.control}
      name="selectedMixId"
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>Mexida Base (Opcional)</FormLabel>
          <FormControl>
            <Combobox
              options={mixOptions}
              value={field.value || ""}
              onValueChange={field.onChange}
              placeholder="Selecione uma mexida existente"
              searchPlaceholder="Buscar mexida..."
              notFoundMessage="Nenhuma mexida encontrada."
              allowClear={true}
            />
          </FormControl>
          <FormDescription>
            Selecione uma mexida previamente registrada para usar como base desta produção.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export { MixSelector };
