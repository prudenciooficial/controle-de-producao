
import { supabase } from "@/integrations/supabase/client";

// Helper function for debugging
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from("products").select("count");
    if (error) {
      console.error("Supabase connection error:", error);
      return false;
    }
    console.log("Supabase connection successful:", data);
    return true;
  } catch (error) {
    console.error("Supabase connection test failed:", error);
    return false;
  }
};

// Helper functions for transactions
export const beginTransaction = async (): Promise<void> => {
  await supabase.rpc('begin_transaction');
};

export const endTransaction = async (): Promise<void> => {
  await supabase.rpc('end_transaction');
};

export const abortTransaction = async (): Promise<void> => {
  await supabase.rpc('abort_transaction');
};
