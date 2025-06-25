import { supabase } from "@/integrations/supabase/client";
import { Loss } from "../types";
import { beginTransaction, endTransaction, abortTransaction } from "./base/supabaseClient";
import type { DateRange } from "react-day-picker";
import { logSystemEvent } from "./logService";

export const fetchLossesWithDetails = async (dateRange?: DateRange): Promise<Loss[]> => {
  let query = supabase
    .from("losses")
    .select("*, production_batches(batch_number)")
    .order("date", { ascending: false });

  if (dateRange?.from && dateRange?.to) {
    query = query
      .gte("date", dateRange.from.toISOString())
      .lte("date", dateRange.to.toISOString());
  }
  
  const { data: lossesData, error: lossesError } = await query;
  
  if (lossesError) throw lossesError;
  
  // Map the losses to our type, ensuring types match the expected enum values
  const losses: Loss[] = lossesData.map(loss => ({
    id: loss.id,
    date: new Date(loss.date),
    productionBatchId: loss.production_batch_id,
    batchNumber: loss.batch_number || loss.production_batches?.batch_number || "",
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

export const createLoss = async (
  loss: Omit<Loss, "id" | "createdAt" | "updatedAt">,
  userId?: string,
  userDisplayName?: string
): Promise<Loss> => {
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
  
  const newLoss = {
    ...loss,
    id: data.id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
  
  await logSystemEvent({
    userId: userId!,
    userDisplayName: userDisplayName!,
    actionType: 'CREATE',
    entityTable: 'losses',
    entityId: data.id,
    newData: newLoss
  });
  
  return newLoss;
};

export const updateLoss = async (id: string, updatedData: Partial<Loss>): Promise<void> => {
  const { error } = await supabase
    .from("losses")
    .update({
      date: updatedData.date?.toISOString(),
      batch_number: updatedData.batchNumber,
      machine: updatedData.machine,
      quantity: updatedData.quantity,
      unit_of_measure: updatedData.unitOfMeasure,
      product_type: updatedData.productType,
      notes: updatedData.notes,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
};

export const deleteLoss = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("losses")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
};

