
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface GlobalFactors {
  feculaConversionFactor: number;
  productionPredictionFactor: number;
}

const CalcTable = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [factors, setFactors] = useState<GlobalFactors>({
    feculaConversionFactor: 25,
    productionPredictionFactor: 1.5
  });

  useEffect(() => {
    fetchGlobalFactors();
  }, []);

  const fetchGlobalFactors = async () => {
    try {
      setIsLoading(true);
      // Get the first product to extract global factors
      const { data, error } = await supabase
        .from("products")
        .select("fecula_conversion_factor, production_prediction_factor")
        .limit(1)
        .single();
      
      if (error) {
        console.error("Error fetching global factors:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Falha ao carregar fatores de cálculo."
        });
        return;
      }
      
      setFactors({
        feculaConversionFactor: data.fecula_conversion_factor || 25,
        productionPredictionFactor: data.production_prediction_factor || 1.5
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateGlobalFactors = async () => {
    try {
      setIsSaving(true);
      
      // Update all products with the same global factors
      const { error } = await supabase
        .from("products")
        .update({
          fecula_conversion_factor: factors.feculaConversionFactor,
          production_prediction_factor: factors.productionPredictionFactor
        });
      
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
