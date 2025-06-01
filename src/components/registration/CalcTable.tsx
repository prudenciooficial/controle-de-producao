import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface GlobalFactors {
  id: string | null;
  feculaConversionFactor: number;
  productionPredictionFactor: number;
  conservantConversionFactor: number;
  conservantUsageFactor: number;
}

const CalcTable = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [factors, setFactors] = useState<GlobalFactors>({
    id: null,
    feculaConversionFactor: 25,
    productionPredictionFactor: 1.5,
    conservantConversionFactor: 1,
    conservantUsageFactor: 0.1
  });

  useEffect(() => {
    fetchGlobalFactors();
  }, []);

  const fetchGlobalFactors = async () => {
    try {
      setIsLoading(true);
      // Buscar da tabela global_settings
      const { data, error } = await supabase
        .from("global_settings")
        .select("id, fecula_conversion_factor, production_prediction_factor, conservant_conversion_factor, conservant_usage_factor")
        .limit(1) // Deve haver apenas um registro de configurações globais
        .single();
      
      if (error) {
        console.error("Error fetching global factors:", error);
        // Se não encontrar configurações, pode ser a primeira execução. Mantém os padrões.
        if (error.code === 'PGRST116') { // PGRST116: "Searched for a single row, but found no rows"
          toast({
            title: "Configurações Iniciais",
            description: "Nenhuma configuração global encontrada. Usando valores padrão. Salve para criar o primeiro registro."
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro",
            description: "Falha ao carregar fatores de cálculo."
          });
        }
        // Não retorna, permite que o usuário salve e crie o registro se não existir.
      }
      
      if (data) {
        setFactors({
          id: data.id,
          feculaConversionFactor: data.fecula_conversion_factor || 25,
          productionPredictionFactor: data.production_prediction_factor || 1.5,
          conservantConversionFactor: data.conservant_conversion_factor || 1,
          conservantUsageFactor: data.conservant_usage_factor || 0.1
        });
      } else if (!error) {
        // Caso não haja dados mas também não haja erro (improvável com .single() a menos que a tabela esteja vazia e não retorne PGRST116)
        // Considerar criar um registro aqui ou garantir que o save o faça.
        toast({
            title: "Atenção",
            description: "Nenhum fator de cálculo global encontrado. Verifique as configurações ou salve para criar."
        });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Erro Inesperado",
        description: "Ocorreu um erro inesperado ao buscar os fatores."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateGlobalFactors = async () => {
    try {
      setIsSaving(true);

      const dataToUpdate = {
        fecula_conversion_factor: factors.feculaConversionFactor,
        production_prediction_factor: factors.productionPredictionFactor,
        conservant_conversion_factor: factors.conservantConversionFactor,
        conservant_usage_factor: factors.conservantUsageFactor
      };

      let error;

      if (factors.id) {
        // Se temos um ID, atualizamos o registro existente
        const { error: updateError } = await supabase
          .from("global_settings")
          .update(dataToUpdate)
          .eq("id", factors.id);
        error = updateError;
      } else {
        // Se não temos um ID (primeira vez, ou falha ao buscar), tentamos inserir um novo registro.
        // O ID será gerado pelo banco de dados (DEFAULT gen_random_uuid()).
        // E created_at e updated_at também serão definidos pelo banco.
        const { data: newData, error: insertError } = await supabase
          .from("global_settings")
          .insert(dataToUpdate)
          .select("id") // Seleciona o ID do novo registro para atualizar o estado
          .single();
        error = insertError;
        if (!error && newData) {
          setFactors(prevFactors => ({ ...prevFactors, id: newData.id })); // Atualiza o ID no estado
        }
      }
      
      if (error) {
        console.error("Error updating global factors:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha ao atualizar fatores de cálculo."
        });
        return;
      }
      
      toast({
        title: "Fatores atualizados",
        description: "Os fatores de cálculo foram atualizados com sucesso."
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao atualizar os fatores de cálculo."
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fecula-conversion">Fator de Conversão de Fécula</Label>
                <Input
                  id="fecula-conversion"
                  type="number"
                  step="0.01"
                  value={factors.feculaConversionFactor}
                  onChange={(e) => setFactors({
                    ...factors,
                    feculaConversionFactor: parseFloat(e.target.value) || 0
                  })}
                />
                <p className="text-sm text-muted-foreground">
                  Fator para converter a quantidade de fécula em kg.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="production-prediction">Fator de Previsão de Produção</Label>
                <Input
                  id="production-prediction"
                  type="number"
                  step="0.01"
                  value={factors.productionPredictionFactor}
                  onChange={(e) => setFactors({
                    ...factors,
                    productionPredictionFactor: parseFloat(e.target.value) || 0
                  })}
                />
                <p className="text-sm text-muted-foreground">
                  Fator para calcular a quantidade prevista de kg a serem produzidos.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conservant-conversion">Fator de Conversão de Conservante</Label>
                <Input
                  id="conservant-conversion"
                  type="number"
                  step="0.01"
                  value={factors.conservantConversionFactor}
                  onChange={(e) => setFactors({
                    ...factors,
                    conservantConversionFactor: parseFloat(e.target.value) || 0
                  })}
                />
                <p className="text-sm text-muted-foreground">
                  Fator para converter caixas de conservante em kg.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conservant-usage">Fator de Uso do Conservante</Label>
                <Input
                  id="conservant-usage"
                  type="number"
                  step="0.01"
                  value={factors.conservantUsageFactor}
                  onChange={(e) => setFactors({
                    ...factors,
                    conservantUsageFactor: parseFloat(e.target.value) || 0
                  })}
                />
                <p className="text-sm text-muted-foreground">
                  Quantidade de conservante em kg necessária por mexida.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={updateGlobalFactors} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Fatores"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CalcTable;
