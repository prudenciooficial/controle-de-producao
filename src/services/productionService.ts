
import { supabase } from "@/integrations/supabase/client";
import { ProductionBatch, UsedMaterial, ProducedItem } from "../types";
import { beginTransaction, endTransaction, abortTransaction } from "./base/supabaseClient";

export const fetchProductionBatches = async (): Promise<ProductionBatch[]> => {
  // First, fetch the production batches
  const { data: batchesData, error: batchesError } = await supabase
    .from("production_batches")
    .select("*")
    .order("production_date", { ascending: false });
  
  if (batchesError) throw batchesError;
  
  // Create an array to store complete production batches
  const productionBatches: ProductionBatch[] = [];
  
  // For each batch, fetch used materials and produced items
  for (const batch of batchesData) {
    // Fetch used materials for this batch with explicit path to nested material info
    const { data: usedMaterialsData, error: usedMaterialsError } = await supabase
      .from("used_materials")
      .select(`
        *,
        material_batches!inner (
          *,
          materials!inner (
            name,
            type
          )
        )
      `)
      .eq("production_batch_id", batch.id);
    
    if (usedMaterialsError) throw usedMaterialsError;
    
    // Format used materials with improved data access
    const usedMaterials: UsedMaterial[] = usedMaterialsData.map(material => {
      return {
        id: material.id,
        materialBatchId: material.material_batch_id,
        materialName: material.material_batches?.materials?.name || 'Nome não encontrado',
        materialType: material.material_batches?.materials?.type || 'Tipo não encontrado',
        batchNumber: material.material_batches?.batch_number || 'Lote não encontrado',
        quantity: material.quantity,
        unitOfMeasure: material.unit_of_measure,
        createdAt: new Date(material.created_at),
        updatedAt: new Date(material.updated_at)
      };
    });
    
    // Fetch produced items for this batch
    const { data: producedItemsData, error: producedItemsError } = await supabase
      .from("produced_items")
      .select(`
        *,
        products:product_id (
          name
        )
      `)
      .eq("production_batch_id", batch.id);
    
    if (producedItemsError) throw producedItemsError;
    
    // Format produced items
    const producedItems: ProducedItem[] = producedItemsData.map(item => ({
      id: item.id,
      productId: item.product_id,
      productName: item.products?.name || 'Nome não encontrado',
      batchNumber: item.batch_number,
      quantity: item.quantity,
      remainingQuantity: item.remaining_quantity,
      unitOfMeasure: item.unit_of_measure,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));
    
    // Add the complete production batch to the array
    productionBatches.push({
      id: batch.id,
      batchNumber: batch.batch_number,
      productionDate: new Date(batch.production_date),
      mixDay: batch.mix_day,
      mixCount: batch.mix_count,
      usedMaterials,
      producedItems,
      notes: batch.notes,
      createdAt: new Date(batch.created_at),
      updatedAt: new Date(batch.updated_at)
    });
  }
  
  return productionBatches;
};

export const createProductionBatch = async (
  batch: Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">
): Promise<ProductionBatch> => {
  // We'll use the transaction functions here
  try {
    // Start a transaction
    await beginTransaction();
    
    // Insert the production batch
    const { data: batchData, error: batchError } = await supabase
      .from("production_batches")
      .insert({
        batch_number: batch.batchNumber,
        production_date: batch.productionDate instanceof Date 
          ? batch.productionDate.toISOString() 
          : batch.productionDate,
        mix_day: batch.mixDay,
        mix_count: batch.mixCount,
        notes: batch.notes
      })
      .select()
      .single();
    
    if (batchError) throw batchError;
    
    const productionBatchId = batchData.id;
    
    // Insert used materials
    for (const material of batch.usedMaterials) {
      const { error: materialError } = await supabase
        .from("used_materials")
        .insert({
          production_batch_id: productionBatchId,
          material_batch_id: material.materialBatchId,
          quantity: material.quantity,
          unit_of_measure: material.unitOfMeasure
        });
      
      if (materialError) throw materialError;
      
      // Update material batch remaining quantity
      // Get current remaining quantity
      const { data: materialBatchData, error: fetchError } = await supabase
        .from("material_batches")
        .select("remaining_quantity")
        .eq("id", material.materialBatchId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Calculate new remaining quantity
      const newRemainingQty = materialBatchData.remaining_quantity - material.quantity;
      
      if (newRemainingQty < 0) {
        throw new Error(`Not enough quantity in material batch. Available: ${materialBatchData.remaining_quantity}, Requested: ${material.quantity}`);
      }
      
      // Update the material batch
      const { error: updateError } = await supabase
        .from("material_batches")
        .update({ remaining_quantity: newRemainingQty })
        .eq("id", material.materialBatchId);
      
      if (updateError) throw updateError;
    }
    
    // Insert produced items
    for (const item of batch.producedItems) {
      const { error: itemError } = await supabase
        .from("produced_items")
        .insert({
          production_batch_id: productionBatchId,
          product_id: item.productId,
          batch_number: item.batchNumber,
          quantity: item.quantity,
          remaining_quantity: item.quantity,  // Initially, remaining quantity equals quantity
          unit_of_measure: item.unitOfMeasure
        });
      
      if (itemError) throw itemError;
    }
    
    // Commit the transaction
    await endTransaction();
    
    // Return the complete production batch
    return {
      ...batch,
      id: productionBatchId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    // Rollback on error
    await abortTransaction();
    throw error;
  }
};

export const updateProductionBatch = async (
  id: string,
  batch: Partial<ProductionBatch>
): Promise<void> => {
  const updates: any = {};
  
  if (batch.batchNumber) updates.batch_number = batch.batchNumber;
  if (batch.productionDate) {
    updates.production_date = batch.productionDate instanceof Date 
      ? batch.productionDate.toISOString() 
      : batch.productionDate;
  }
  if (batch.mixDay) updates.mix_day = batch.mixDay;
  if (batch.mixCount !== undefined) updates.mix_count = batch.mixCount;
  if (batch.notes !== undefined) updates.notes = batch.notes;
  
  const { error } = await supabase
    .from("production_batches")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
};

export const deleteProductionBatch = async (id: string): Promise<void> => {
  try {
    console.log("Beginning deletion process for production batch:", id);
    
    // Start a transaction
    await beginTransaction();
    console.log("Transaction started");
    
    // First restore material quantities
    // Get the used materials for this batch
    const { data: usedMaterialsData, error: usedMaterialsError } = await supabase
      .from("used_materials")
      .select("*")
      .eq("production_batch_id", id);
    
    if (usedMaterialsError) {
      console.error("Error fetching used materials:", usedMaterialsError);
      await abortTransaction();
      throw usedMaterialsError;
    }
    
    console.log(`Found ${usedMaterialsData?.length || 0} used materials to process`);
    
    // For each used material, restore the quantity to the material batch
    for (const material of usedMaterialsData || []) {
      console.log(`Processing material: ${material.id} for material batch: ${material.material_batch_id}`);
      
      try {
        // Get current remaining quantity
        const { data: materialBatchData, error: fetchError } = await supabase
          .from("material_batches")
          .select("remaining_quantity")
          .eq("id", material.material_batch_id)
          .single();
        
        if (fetchError) {
          console.error("Error fetching material batch data:", fetchError);
          await abortTransaction();
          throw fetchError;
        }
        
        if (!materialBatchData) {
          console.error("No material batch data found for:", material.material_batch_id);
          await abortTransaction();
          throw new Error(`No data found for material batch: ${material.material_batch_id}`);
        }
        
        console.log(`Current remaining quantity: ${materialBatchData.remaining_quantity}, Adding back: ${material.quantity}`);
        
        // Calculate new remaining quantity
        const newRemainingQty = materialBatchData.remaining_quantity + material.quantity;
        
        console.log(`New remaining quantity will be: ${newRemainingQty}`);
        
        // Update the material batch
        const { error: updateError } = await supabase
          .from("material_batches")
          .update({ remaining_quantity: newRemainingQty })
          .eq("id", material.material_batch_id);
        
        if (updateError) {
          console.error("Error updating material batch quantity:", updateError);
          await abortTransaction();
          throw updateError;
        }
        
        console.log(`Successfully updated remaining quantity for material batch: ${material.material_batch_id}`);
      } catch (materialError) {
        console.error(`Error processing used material ${material.id}:`, materialError);
        await abortTransaction();
        throw materialError;
      }
    }
    
    console.log("All material quantities restored, now deleting produced items");
    
    // Delete produced items for this batch
    const { error: producedItemsError } = await supabase
      .from("produced_items")
      .delete()
      .eq("production_batch_id", id);
    
    if (producedItemsError) {
      console.error("Error deleting produced items:", producedItemsError);
      await abortTransaction();
      throw producedItemsError;
    }
    
    console.log("Produced items deleted, now deleting used materials");
    
    // Delete used materials for this batch
    const { error: usedMaterialsDeleteError } = await supabase
      .from("used_materials")
      .delete()
      .eq("production_batch_id", id);
    
    if (usedMaterialsDeleteError) {
      console.error("Error deleting used materials:", usedMaterialsDeleteError);
      await abortTransaction();
      throw usedMaterialsDeleteError;
    }
    
    console.log("Used materials deleted, now deleting the production batch");
    
    // Delete the production batch
    const { error: batchError } = await supabase
      .from("production_batches")
      .delete()
      .eq("id", id);
    
    if (batchError) {
      console.error("Error deleting production batch:", batchError);
      await abortTransaction();
      throw batchError;
    }
    
    console.log("Production batch deleted successfully, committing transaction");
    
    // Commit the transaction
    await endTransaction();
    console.log("Transaction committed successfully");
    
    return;
  } catch (error) {
    // Rollback on error
    console.error("Error in delete production batch operation, rolling back:", error);
    try {
      await abortTransaction();
      console.log("Transaction aborted successfully");
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    throw error;
  }
};
