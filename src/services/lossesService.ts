
import { supabase } from "@/integrations/supabase/client";
import { Loss } from "../types";

export const fetchLossesWithDetails = async (): Promise<Loss[]> => {
  const { data: lossesData, error: lossesError } = await supabase
    .from("losses")
    .select("*, production_batches(batch_number)")
    .order("date", { ascending: false });
  
  if (lossesError) throw lossesError;
  
  // Map the losses to our type, ensuring types match the expected enum values
  const losses: Loss[] = lossesData.map(loss => ({
    id: loss.id,
    date: new Date(loss.date),
    productionBatchId: loss.production_batch_id,
    batchNumber: loss.production_batches?.batch_number || "",
    machine: loss.machine as "Moinho" | "Mexedor" | "Tombador" | "Embaladora" | "Outro",
    quantity: loss.quantity,
    unitOfMeasure: loss.unit_of_measure,
    productType: loss.product_type as "Goma" | "Fécula" | "Embalagem" | "Sorbato" | "Produto Acabado" | "Outro",
    notes: loss.notes,
    createdAt: new Date(loss.created_at),
    updatedAt: new Date(loss.updated_at)
  }));
  
  return losses;
};

export const createLoss = async (loss: Omit<Loss, "id" | "createdAt" | "updatedAt">): Promise<Loss> => {
  const { data, error } = await supabase
    .from("losses")
    .insert({
      date: loss.date instanceof Date ? loss.date.toISOString() : loss.date,
      production_batch_id: loss.productionBatchId,
      batch_number: loss.batchNumber,
      machine: loss.machine,
      quantity: loss.quantity,
      unit_of_measure: loss.unitOfMeasure,
      product_type: loss.productType,
      notes: loss.notes
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    ...loss,
    id: data.id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateLoss = async (id: string, loss: Partial<Loss>): Promise<void> => {
  const updates: any = {};
  
  if (loss.date) {
    updates.date = loss.date instanceof Date ? loss.date.toISOString() : loss.date;
  }
  if (loss.productionBatchId) updates.production_batch_id = loss.productionBatchId;
  if (loss.batchNumber) updates.batch_number = loss.batchNumber;
  if (loss.machine) updates.machine = loss.machine;
  if (loss.quantity !== undefined) updates.quantity = loss.quantity;
  if (loss.unitOfMeasure) updates.unit_of_measure = loss.unitOfMeasure;
  if (loss.productType) updates.product_type = loss.productType;
  if (loss.notes !== undefined) updates.notes = loss.notes;
  
  const { error } = await supabase
    .from("losses")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
};

export const deleteLoss = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("losses")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
};
