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
  try {
    const { data, error } = await supabase
      .from("global_settings")
      .select("*")
      .limit(1); // Usar limit(1) em vez de single() para evitar erro quando não há dados

    if (error) {
      console.warn("Error fetching global settings:", error);
      return null;
    }

    // Se não há dados, retornar configurações padrão
    if (!data || data.length === 0) {
      console.info("No global settings found, using defaults");
      return null;
    }

    return data[0] as GlobalSettings;
  } catch (error) {
    console.warn("Error in fetchGlobalSettings:", error);
    return null;
  }
};
