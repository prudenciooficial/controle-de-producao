import { supabase } from "@/integrations/supabase/client";
import { ProductionBatch, UsedMaterial, ProducedItem } from "../types";
import { beginTransaction, endTransaction, abortTransaction } from "./base/supabaseClient";
import { logSystemEvent } from "./logService";

// Temporary simplified implementation until database types are regenerated
const fetchUsedMaterials = async (productionBatchId: string): Promise<UsedMaterial[]> => {
  try {
    // Use any type temporarily to bypass TypeScript errors
    const { data, error } = await (supabase as any)
      .from("used_materials")
      .select(`
        *,
        material_batches:material_batch_id (
          batch_number,
          materials:material_id (
            name,
            type
          )
        )
      `)
      .eq("production_batch_id", productionBatchId);

    if (error) {
      console.error("Error fetching used materials:", error);
      throw error;
    }

    return data?.map((material: any) => ({
      id: material.id,
      materialBatchId: material.material_batch_id,
      materialName: material.material_batches?.materials?.name || '',
      materialType: material.material_batches?.materials?.type || '',
      batchNumber: material.material_batches?.batch_number || '',
      quantity: material.quantity,
      unitOfMeasure: material.unit_of_measure,
      mixCountUsed: material.mix_count_used,
      createdAt: new Date(material.created_at),
      updatedAt: new Date(material.updated_at)
    })) || [];
  } catch (error) {
    console.error("Error in fetchUsedMaterials:", error);
    return [];
  }
};

const fetchProducedItems = async (productionBatchId: string): Promise<ProducedItem[]> => {
  try {
    // Use any type temporarily to bypass TypeScript errors
    const { data, error } = await (supabase as any)
      .from("produced_items")
      .select(`
        *,
        products:product_id (
          name,
          type
        )
      `)
      .eq("production_batch_id", productionBatchId);

    if (error) {
      console.error("Error fetching produced items:", error);
      throw error;
    }

    return data?.map((item: any) => ({
      id: item.id,
      productId: item.product_id,
      productName: item.products?.name || '',
      productType: item.products?.type || '',
      batchNumber: item.batch_number,
      quantity: item.quantity,
      remainingQuantity: item.remaining_quantity,
      unitOfMeasure: item.unit_of_measure,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    })) || [];
  } catch (error) {
    console.error("Error in fetchProducedItems:", error);
    return [];
  }
};

export const fetchProductionBatches = async (): Promise<ProductionBatch[]> => {
  try {
    console.log('[ProductionService] Fetching production batches...');
    
    // Use any type temporarily to bypass TypeScript errors
    const { data, error } = await (supabase as any)
      .from("production_batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log('[ProductionService] Raw production batches data:', data);

    const batches = await Promise.all(
      (data || []).map(async (batch: any) => {
        const [usedMaterials, producedItems] = await Promise.all([
          fetchUsedMaterials(batch.id),
          fetchProducedItems(batch.id)
        ]);

        return {
          id: batch.id,
          batchNumber: batch.batch_number,
          productionDate: new Date(batch.production_date),
          mixDay: batch.mix_day,
          mixCount: batch.mix_count,
          notes: batch.notes || '',
          mixBatchId: batch.mix_batch_id || null,
          status: batch.status || 'complete',
          usedMaterials,
          producedItems,
          createdAt: new Date(batch.created_at),
          updatedAt: new Date(batch.updated_at)
        } as ProductionBatch;
      })
    );

    console.log('[ProductionService] Processed production batches:', batches);
    return batches;
  } catch (error) {
    console.error("Error fetching production batches:", error);
    throw error;
  }
};

export const createProductionBatch = async (
  batch: Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">,
  userId?: string,
  userDisplayName?: string
): Promise<ProductionBatch> => {
  try {
    await beginTransaction();
    
    console.log(`[ProductionService] Creating production batch: ${batch.batchNumber}`);
    console.log(`[ProductionService] Mix batch ID: ${batch.mixBatchId}`);
    
    // Insert the production batch using any type temporarily
    const batchData = {
      batch_number: batch.batchNumber,
      production_date: batch.productionDate.toISOString().split('T')[0],
      mix_day: batch.mixDay,
      mix_count: batch.mixCount,
      notes: batch.notes,
      mix_batch_id: batch.mixBatchId,
      status: 'complete' // Always use 'complete' status
    };

    console.log('[ProductionService] Inserting batch data:', batchData);

    const { data: insertedBatch, error: batchError } = await (supabase as any)
      .from("production_batches")
      .insert(batchData)
      .select()
      .single();
    
    if (batchError) {
      console.log('[ProductionService] Error inserting batch:', batchError);
      await abortTransaction();
      throw batchError;
    }
    
    console.log('[ProductionService] Batch inserted successfully:', insertedBatch);
    
    // Insert produced items
    for (const item of batch.producedItems) {
      console.log(`[ProductionService] Inserting produced item: ${item.productName}, Quantity: ${item.quantity}`);
      
      // Insert produced item using any type temporarily
      const { error: itemError } = await (supabase as any)
        .from("produced_items")
        .insert({
          production_batch_id: insertedBatch.id,
          product_id: item.productId,
          batch_number: item.batchNumber,
          quantity: item.quantity,
          remaining_quantity: item.remainingQuantity,
          unit_of_measure: item.unitOfMeasure
        });
      
      if (itemError) {
        await abortTransaction();
        throw itemError;
      }
    }
    
    // Insert used materials AND UPDATE STOCK
    for (const material of batch.usedMaterials) {
      console.log(`[ProductionService] Processing material: ${material.materialName}, Batch: ${material.batchNumber}, Quantity: ${material.quantity}`);
      
      // Get current stock BEFORE any operations
      const { data: materialBatchBefore, error: fetchBeforeError } = await supabase
        .from('material_batches')
        .select('remaining_quantity, batch_number')
        .eq('id', material.materialBatchId)
        .single();
      
      if (fetchBeforeError || !materialBatchBefore) {
        await abortTransaction();
        throw new Error(`Erro ao buscar lote de material: ${fetchBeforeError?.message}`);
      }
      
      console.log(`[ProductionService] Stock BEFORE: ${materialBatchBefore.remaining_quantity} for batch ${materialBatchBefore.batch_number}`);
      
      // Insert used material record using any type temporarily
      const { error: materialError } = await (supabase as any)
        .from("used_materials")
        .insert({
          production_batch_id: insertedBatch.id,
          material_batch_id: material.materialBatchId,
          quantity: material.quantity,
          unit_of_measure: material.unitOfMeasure,
          mix_count_used: material.mixCountUsed
        });
      
      if (materialError) {
        await abortTransaction();
        throw materialError;
      }
      
      // Calculate new stock value
      const newRemainingQuantity = materialBatchBefore.remaining_quantity - material.quantity;
      console.log(`[ProductionService] Calculated new stock: ${materialBatchBefore.remaining_quantity} - ${material.quantity} = ${newRemainingQuantity}`);
      
      // UPDATE STOCK
      const { error: stockUpdateError, data: updatedBatch } = await supabase
        .from('material_batches')
        .update({ 
          remaining_quantity: newRemainingQuantity
        })
        .eq('id', material.materialBatchId)
        .select('remaining_quantity')
        .single();
      
      if (stockUpdateError) {
        await abortTransaction();
        throw new Error(`Erro ao atualizar estoque do material: ${stockUpdateError.message}`);
      }
      
      console.log(`[ProductionService] Stock AFTER update: ${updatedBatch?.remaining_quantity} for material ${material.materialName}`);
    }
    
    await endTransaction();
    
    console.log(`[ProductionService] Production batch created successfully: ${insertedBatch.id}`);
    
    if (userId && userDisplayName) {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'CREATE',
        entityTable: 'production_batches',
        entityId: insertedBatch.id,
        newData: insertedBatch
      });
    }
    
    // Fetch and return the complete production batch
    const [usedMaterials, producedItems] = await Promise.all([
      fetchUsedMaterials(insertedBatch.id),
      fetchProducedItems(insertedBatch.id)
    ]);

    return {
      id: insertedBatch.id,
      batchNumber: insertedBatch.batch_number,
      productionDate: new Date(insertedBatch.production_date),
      mixDay: insertedBatch.mix_day,
      mixCount: insertedBatch.mix_count,
      notes: insertedBatch.notes || '',
      mixBatchId: insertedBatch.mix_batch_id || null,
      status: insertedBatch.status || 'complete',
      usedMaterials,
      producedItems,
      createdAt: new Date(insertedBatch.created_at),
      updatedAt: new Date(insertedBatch.updated_at)
    } as ProductionBatch;
    
  } catch (error) {
    console.error("Error creating production batch:", error);
    try {
      await abortTransaction();
    } catch (rollbackError) {
      console.error("Error in rollback:", rollbackError);
    }
    throw error;
  }
};

export const updateProductionBatch = async (
  id: string,
  batch: Partial<ProductionBatch>,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  let existingBatchData: any = null;
  try {
    await beginTransaction();
    
    // Fetch existing data for logging using any type temporarily
    const { data: fetchedExistingBatch, error: fetchError } = await (supabase as any)
      .from("production_batches")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchedExistingBatch) {
      existingBatchData = fetchedExistingBatch;
    }

    // Update production batch
    const batchUpdates: any = {};
    if (batch.batchNumber !== undefined) batchUpdates.batch_number = batch.batchNumber;
    if (batch.productionDate !== undefined) batchUpdates.production_date = batch.productionDate.toISOString().split('T')[0];
    if (batch.mixDay !== undefined) batchUpdates.mix_day = batch.mixDay;
    if (batch.mixCount !== undefined) batchUpdates.mix_count = batch.mixCount;
    if (batch.notes !== undefined) batchUpdates.notes = batch.notes;
    if (batch.mixBatchId !== undefined) batchUpdates.mix_batch_id = batch.mixBatchId;
    if (batch.status !== undefined) batchUpdates.status = batch.status;

    if (Object.keys(batchUpdates).length > 0) {
      const { error: batchUpdateError } = await (supabase as any)
        .from("production_batches")
        .update(batchUpdates)
        .eq("id", id);
      if (batchUpdateError) {
        await abortTransaction();
        throw batchUpdateError;
      }
    }

    // Handle produced items updates if provided
    if (batch.producedItems && batch.producedItems.length > 0) {
      // Delete existing produced items using any type temporarily
      const { error: deleteItemsError } = await (supabase as any)
        .from("produced_items")
        .delete()
        .eq("production_batch_id", id);
      
      if (deleteItemsError) {
        await abortTransaction();
        throw deleteItemsError;
      }
      
      // Insert updated produced items
      for (const item of batch.producedItems) {
        const { error: itemError } = await (supabase as any)
          .from("produced_items")
          .insert({
            production_batch_id: id,
            product_id: item.productId,
            batch_number: item.batchNumber,
            quantity: item.quantity,
            remaining_quantity: item.remainingQuantity,
            unit_of_measure: item.unitOfMeasure
          });
        
        if (itemError) {
          await abortTransaction();
          throw itemError;
        }
      }
    }

    // Handle used materials updates if provided
    if (batch.usedMaterials && batch.usedMaterials.length > 0) {
      // Get existing used materials to restore stock using any type temporarily
      const { data: existingUsedMaterials, error: fetchUsedError } = await (supabase as any)
        .from("used_materials")
        .select("material_batch_id, quantity")
        .eq("production_batch_id", id);
      
      if (fetchUsedError) {
        await abortTransaction();
        throw fetchUsedError;
      }
      
      // Restore stock from existing used materials
      if (existingUsedMaterials && existingUsedMaterials.length > 0) {
        for (const existingMaterial of existingUsedMaterials) {
          const { data: currentBatch, error: fetchCurrentError } = await supabase
            .from("material_batches")
            .select('remaining_quantity')
            .eq('id', existingMaterial.material_batch_id)
            .single();
          
          if (fetchCurrentError || !currentBatch) {
            await abortTransaction();
            throw new Error(`Erro ao buscar lote atual: ${fetchCurrentError?.message}`);
          }
          
          const restoredQuantity = currentBatch.remaining_quantity + existingMaterial.quantity;
          
          const { error: stockRestoreError } = await supabase
            .from("material_batches")
            .update({ 
              remaining_quantity: restoredQuantity
            })
            .eq('id', existingMaterial.material_batch_id);
          
          if (stockRestoreError) {
            await abortTransaction();
            throw new Error(`Erro ao restaurar estoque: ${stockRestoreError.message}`);
          }
        }
      }
      
      // Delete existing used materials using any type temporarily
      const { error: deleteUsedError } = await (supabase as any)
        .from("used_materials")
        .delete()
        .eq("production_batch_id", id);
      
      if (deleteUsedError) {
        await abortTransaction();
        throw deleteUsedError;
      }
      
      // Insert updated used materials and consume new stock
      for (const material of batch.usedMaterials) {
        // Insert used material record using any type temporarily
        const { error: materialError } = await (supabase as any)
          .from("used_materials")
          .insert({
            production_batch_id: id,
            material_batch_id: material.materialBatchId,
            quantity: material.quantity,
            unit_of_measure: material.unitOfMeasure,
            mix_count_used: material.mixCountUsed
          });
        
        if (materialError) {
          await abortTransaction();
          throw materialError;
        }
        
        // Consume new stock
        const { data: currentMaterialBatch, error: fetchCurrentMaterialError } = await supabase
          .from("material_batches")
          .select('remaining_quantity')
          .eq('id', material.materialBatchId)
          .single();
        
        if (fetchCurrentMaterialError || !currentMaterialBatch) {
          await abortTransaction();
          throw new Error(`Erro ao buscar lote de material: ${fetchCurrentMaterialError?.message}`);
        }
        
        const newConsumedQuantity = currentMaterialBatch.remaining_quantity - material.quantity;
        
        const { error: stockConsumeError } = await supabase
          .from("material_batches")
          .update({ 
            remaining_quantity: newConsumedQuantity
          })
          .eq('id', material.materialBatchId);
        
        if (stockConsumeError) {
          await abortTransaction();
          throw new Error(`Erro ao consumir estoque: ${stockConsumeError.message}`);
        }
      }
    }

    await endTransaction();
    
    if (userId && userDisplayName) {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'UPDATE',
        entityTable: 'production_batches',
        entityId: id,
        oldData: existingBatchData ?? { id },
        newData: batch
      });
    }
  } catch (error) {
    console.error("Error updating production batch:", error);
    try {
      await abortTransaction();
    } catch (rollbackError) {
      console.error("Error in rollback:", rollbackError);
    }
    throw error;
  }
};

export const deleteProductionBatch = async (
  id: string, 
  userId?: string, 
  userDisplayName?: string
): Promise<void> => {
  let batchToDeleteForLog: any = { id };
  try {
    await beginTransaction();

    // Fetch the batch before deleting for logging using any type temporarily
    const { data: fetchedBatch, error: fetchError } = await (supabase as any)
      .from("production_batches")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchedBatch) {
      batchToDeleteForLog = fetchedBatch;
    }

    // Get used materials to restore stock using any type temporarily
    const { data: usedMaterialsToRestore, error: fetchUsedError } = await (supabase as any)
      .from("used_materials")
      .select("material_batch_id, quantity")
      .eq("production_batch_id", id);
    
    if (fetchUsedError) {
      await abortTransaction();
      throw new Error(`Erro ao buscar materiais usados: ${fetchUsedError.message}`);
    }
    
    // Restore stock
    if (usedMaterialsToRestore && usedMaterialsToRestore.length > 0) {
      for (const usedMaterial of usedMaterialsToRestore) {
        const { data: currentMaterialBatch, error: fetchCurrentError } = await supabase
          .from("material_batches")
          .select('remaining_quantity')
          .eq('id', usedMaterial.material_batch_id)
          .single();
        
        if (fetchCurrentError || !currentMaterialBatch) {
          await abortTransaction();
          throw new Error(`Erro ao buscar lote de material atual: ${fetchCurrentError?.message}`);
        }
        
        const restoredQuantity = currentMaterialBatch.remaining_quantity + usedMaterial.quantity;
        
        const { error: stockRestoreError } = await supabase
          .from("material_batches")
          .update({ 
            remaining_quantity: restoredQuantity
          })
          .eq('id', usedMaterial.material_batch_id);
        
        if (stockRestoreError) {
          await abortTransaction();
          throw new Error(`Erro ao restaurar estoque do material: ${stockRestoreError.message}`);
        }
      }
    }

    // Delete produced items using any type temporarily
    const { error: producedItemsDeleteError } = await (supabase as any)
      .from("produced_items")
      .delete()
      .eq("production_batch_id", id);
    if (producedItemsDeleteError) { 
      await abortTransaction(); 
      throw producedItemsDeleteError; 
    }

    // Delete used materials using any type temporarily
    const { error: usedMaterialsDeleteError } = await (supabase as any)
      .from("used_materials")
      .delete()
      .eq("production_batch_id", id);
    if (usedMaterialsDeleteError) { 
      await abortTransaction(); 
      throw usedMaterialsDeleteError; 
    }

    // Delete the production batch using any type temporarily
    const { error: batchError } = await (supabase as any)
      .from("production_batches")
      .delete()
      .eq("id", id);
    if (batchError) { 
      await abortTransaction(); 
      throw batchError; 
    }

    await endTransaction();
    
    if (userId && userDisplayName) {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'DELETE',
        entityTable: 'production_batches',
        entityId: id,
        oldData: batchToDeleteForLog
      });
    }
  } catch (error) {
    console.error("Error deleting production batch:", error);
    try {
      await abortTransaction();
    } catch (rollbackError) {
      console.error("Error in rollback:", rollbackError);
    }
    throw error;
  }
};

export const fetchAvailableMixBatches = async (): Promise<ProductionBatch[]> => {
  console.warn("fetchAvailableMixBatches is deprecated. Use fetchAvailableMixBatches from mixService instead.");
  return [];
};

export const fetchAvailableMixes = async (): Promise<ProductionBatch[]> => {
  console.warn("fetchAvailableMixes is deprecated. Use fetchAvailableMixBatches from mixService instead.");
  return [];
};
