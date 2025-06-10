// Re-export all services
export * from './productsService';
export * from './materialsService';
export * from './suppliersService';
export * from './productionService';
export * from './salesService';
export * from './ordersService';
export * from './lossesService';
export * from './traceabilityService';
export * from './stockReductionService';
export * from './base/supabaseClient';
export * from './logService';
export * from './mixService';

// Nova função para buscar as configurações globais
import { supabase } from "@/integrations/supabase/client";
import type { GlobalSettings } from "../types";

export const fetchGlobalSettings = async (): Promise<GlobalSettings | null> => {
  const { data, error } = await supabase
    .from("global_settings")
    .select("*")
    .single(); // Usamos single() assumindo que há apenas uma linha de configuração

  if (error) {
    console.error("Error fetching global settings:", error);
    // Você pode querer lançar o erro ou retornar null/um objeto padrão
    // dependendo de como você quer lidar com a ausência dessas configurações
    return null;
  }
  return data as GlobalSettings;
};
