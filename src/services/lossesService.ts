import { supabase } from "@/integrations/supabase/client";
import { Loss } from "../types";
import { beginTransaction, endTransaction, abortTransaction } from "./base/supabaseClient";
import type { DateRange } from "react-day-picker";
import { createLogEntry } from "./logService";

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
  
  await createLogEntry({
    user_id: userId,
    user_description: userDisplayName,
    action_type: "CREATE",
    entity_type: "losses",
    entity_id: newLoss.id,
    details: { message: `Perda (ID: ${newLoss.id}) criada.`, data: newLoss }
  });
  
  return newLoss;
};

export const updateLoss = async (
  id: string,
  loss: Partial<Loss>,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  try {
    console.log("Beginning update process for loss:", id);
    
    // Start a transaction
    await beginTransaction();
    console.log("Transaction started for loss update");
    
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
    
    if (error) {
      console.error("Error updating loss:", error);
      await abortTransaction();
      console.log("Transaction aborted due to error");
      throw error;
    }
    
    console.log("Loss updated successfully");
    
    // Commit the transaction
    await endTransaction();
    console.log("Transaction committed successfully");
    
    await createLogEntry({
      user_id: userId,
      user_description: userDisplayName,
      action_type: "UPDATE",
      entity_type: "losses",
      entity_id: id,
      details: { message: `Perda (ID: ${id}) atualizada.`, changes: updates }
    });
  } catch (error) {
    console.error("Error in update loss operation:", error);
    try {
      // Only abort if we didn't already
      await abortTransaction();
      console.log("Transaction aborted in catch block");
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    throw error;
  }
};

export const deleteLoss = async (
  id: string,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  try {
    console.log("Beginning deletion process for loss:", id);
    
    // Start a transaction
    await beginTransaction();
    console.log("Transaction started for loss deletion");
    
    // Delete the loss
    const { error } = await supabase
      .from("losses")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Error deleting loss:", error);
      await abortTransaction();
      console.log("Transaction aborted due to error");
      throw error;
    }
    
    console.log("Loss deleted successfully");
    
    // Commit the transaction
    await endTransaction();
    console.log("Transaction committed successfully");
    
    await createLogEntry({
      user_id: userId,
      user_description: userDisplayName,
      action_type: "DELETE",
      entity_type: "losses",
      entity_id: id,
      details: { message: `Perda (ID: ${id}) excluída.` }
    });
  } catch (error) {
    console.error("Error in delete loss operation:", error);
    try {
      // Only abort if we didn't already
      await abortTransaction();
      console.log("Transaction aborted in catch block");
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    throw error;
  }
};

