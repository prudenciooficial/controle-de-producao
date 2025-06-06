import { supabase } from "@/integrations/supabase/client";
import { ProductionBatch, ProducedItem, UsedMaterial } from "../types";
import { beginTransaction, endTransaction, abortTransaction } from "./base/supabaseClient";
import { logSystemEvent } from "./logService";
import { markMixAsUsed } from "./mixService";

const fetchProducedItems = async (productionBatchId: string): Promise<ProducedItem[]> => {
  const { data, error } = await supabase
    .from("produced_items")
    .select(`
      *,
      products:product_id (
        name
      )
    `)
    .eq("production_batch_id", productionBatchId);

  if (error) {
    console.error("Error fetching produced items:", error);
    throw error;
  }

  return data.map(item => ({
    id: item.id,
    productId: item.product_id,
    productName: item.products.name,
    quantity: item.quantity,
    unitOfMeasure: item.unit_of_measure,
    batchNumber: item.batch_number,
    remainingQuantity: item.remaining_quantity,
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at)
  }));
};

const fetchUsedMaterials = async (productionBatchId: string): Promise<UsedMaterial[]> => {
  const { data, error } = await supabase
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

  return data.map(material => ({
    id: material.id,
    materialBatchId: material.material_batch_id,
    materialName: material.material_batches.materials.name,
    materialType: material.material_batches.materials.type,
    batchNumber: material.material_batches.batch_number,
    quantity: material.quantity,
    unitOfMeasure: material.unit_of_measure,
    mixCountUsed: material.mix_count_used,
    createdAt: new Date(material.created_at),
    updatedAt: new Date(material.updated_at)
  }));
};

const fetchProductionBatchById = async (id: string): Promise<ProductionBatch> => {
  const { data, error } = await supabase
    .from("production_batches")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;

  const [producedItems, usedMaterials] = await Promise.all([
    fetchProducedItems(id),
    fetchUsedMaterials(id),
  ]);

  return {
    ...data,
    id: data.id,
    batchNumber: data.batch_number,
    productionDate: data.production_date,
    mixDay: data.mix_day || "1",
    mixCount: data.mix_count || 1,
    notes: data.notes || "",
    producedItems,
    usedMaterials,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    isMixOnly: false,
    mixProductionBatchId: data.mix_batch_id,
    status: data.status || 'complete'
  } as ProductionBatch;
};

export const fetchProductionBatches = async (): Promise<ProductionBatch[]> => {
  try {
    console.log('[ProductionService] Fetching production batches...');
    const { data, error } = await supabase
      .from("production_batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log('[ProductionService] Raw production batches:', data?.length || 0);

    const batches = await Promise.all(
      data.map(async (batch) => {
        const [producedItems, usedMaterials] = await Promise.all([
          fetchProducedItems(batch.id),
          fetchUsedMaterials(batch.id),
        ]);

        return {
          id: batch.id,
          batchNumber: batch.batch_number,
          productionDate: new Date(batch.production_date),
          mixDay: batch.mix_day,
          mixCount: batch.mix_count,
          notes: batch.notes,
          producedItems: producedItems,
          usedMaterials: usedMaterials,
          createdAt: new Date(batch.created_at),
          updatedAt: new Date(batch.updated_at),
          isMixOnly: false,
          mixProductionBatchId: batch.mix_batch_id || null,
          status: batch.status || 'complete'
        } as ProductionBatch;
      })
    );

    console.log('[ProductionService] Processed production batches:', batches.length);
    return batches;
  } catch (error) {
    console.error("Error fetching production batches:", error);
    throw error;
  }
};

// Deprecated function - use fetchAvailableMixBatches from mixService instead
export const fetchAvailableMixes = async (): Promise<ProductionBatch[]> => {
  console.warn("fetchAvailableMixes is deprecated. Use fetchAvailableMixBatches from mixService instead.");
  return [];
};

export const createProductionBatch = async (
  batch: Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">,
  userId?: string,
  userDisplayName?: string
): Promise<ProductionBatch> => {
  try {
    await beginTransaction();
    
    console.log(`[ProductionService] Creating production batch: ${batch.batchNumber}`);
    console.log(`[ProductionService] Mix batch ID: ${batch.mixProductionBatchId}`);
    console.log(`[ProductionService] Status to be set: ${batch.status}`);
    
    // Validate that mix exists and is available
    if (batch.mixProductionBatchId) {
      // Use any type temporarily to bypass TypeScript errors
      const { data: mixBatch, error: mixError } = await (supabase as any)
        .from("mix_batches")
        .select("status")
        .eq("id", batch.mixProductionBatchId)
        .single();

      if (mixError || !mixBatch) {
        await abortTransaction();
        throw new Error("Mexida não encontrada");
      }

      if (mixBatch.status !== 'available') {
        await abortTransaction();
        throw new Error("Mexida não está disponível para uso");
      }
    }
    
    // Insert the production batch
    const batchInsertData: any = {
      batch_number: batch.batchNumber,
      production_date: batch.productionDate.toISOString(),
      mix_day: batch.mixDay,
      mix_count: batch.mixCount,
      notes: batch.notes,
      status: batch.status === 'complete' ? 'complete' : 'rework', // Ensure valid status
      mix_batch_id: batch.mixProductionBatchId || null
    };

    console.log(`[ProductionService] Inserting batch data:`, batchInsertData);

    const { data: batchData, error: batchError } = await supabase
      .from("production_batches")
      .insert(batchInsertData)
      .select()
      .single();
    
    if (batchError) {
      console.error(`[ProductionService] Error inserting batch:`, batchError);
      await abortTransaction();
      throw batchError;
    }

    console.log(`[ProductionService] Batch inserted with ID: ${batchData.id}`);
    
    // Insert produced items
    if (batch.producedItems && batch.producedItems.length > 0) {
      console.log(`[ProductionService] Inserting ${batch.producedItems.length} produced items`);
      for (const item of batch.producedItems) {
        const { error: itemError } = await supabase
          .from("produced_items")
          .insert({
            production_batch_id: batchData.id,
            product_id: item.productId,
            quantity: item.quantity,
            remaining_quantity: item.quantity,
            unit_of_measure: item.unitOfMeasure,
            batch_number: item.batchNumber
          });
        
        if (itemError) {
          console.error(`[ProductionService] Error inserting produced item:`, itemError);
          await abortTransaction();
          throw itemError;
        }
      }
    }
    
    // Insert used materials (additional materials only, not mix materials)
    if (batch.usedMaterials && batch.usedMaterials.length > 0) {
      console.log(`[ProductionService] Processing ${batch.usedMaterials.length} additional materials`);
      for (const material of batch.usedMaterials) {
        console.log(`[ProductionService] Processing additional material: ${material.materialName}, Batch: ${material.batchNumber}, Quantity: ${material.quantity}`);
        
        // Get current stock BEFORE any operations
        const { data: materialBatchBefore, error: fetchBeforeError } = await supabase
          .from('material_batches')
          .select('remaining_quantity, batch_number')
          .eq('id', material.materialBatchId)
          .single();
        
        if (fetchBeforeError || !materialBatchBefore) {
          await abortTransaction();
          throw new Error(`Erro ao buscar lote de material ANTES da operação: ${fetchBeforeError?.message}`);
        }
        
        console.log(`[ProductionService] Stock BEFORE: ${materialBatchBefore.remaining_quantity} for batch ${materialBatchBefore.batch_number}`);
        
        // Validate sufficient stock
        if (materialBatchBefore.remaining_quantity < material.quantity) {
          await abortTransaction();
          throw new Error(`Estoque insuficiente para ${material.materialName}. Disponível: ${materialBatchBefore.remaining_quantity}, Necessário: ${material.quantity}`);
        }
        
        // Insert used material record
        const { error: materialError } = await supabase
          .from("used_materials")
          .insert({
            production_batch_id: batchData.id,
            material_batch_id: material.materialBatchId,
            quantity: material.quantity,
            unit_of_measure: material.unitOfMeasure,
            mix_count_used: material.mixCountUsed
          });
        
        if (materialError) {
          console.error(`[ProductionService] Error inserting used material:`, materialError);
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
          console.error(`[ProductionService] Error updating stock:`, stockUpdateError);
          await abortTransaction();
          throw new Error(`Erro ao atualizar estoque do material: ${stockUpdateError.message}`);
        }
        
        console.log(`[ProductionService] Stock AFTER update: ${updatedBatch?.remaining_quantity} for material ${material.materialName}`);
      }
    }
    
    // If linking to a mix, mark the mix as used
    if (batch.mixProductionBatchId) {
      console.log(`[ProductionService] Marking mix ${batch.mixProductionBatchId} as used`);
      await markMixAsUsed(batch.mixProductionBatchId);
    }
    
    await endTransaction();
    
    console.log(`[ProductionService] Production batch created successfully: ${batchData.id}`);
    
    if (userId && userDisplayName) {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'CREATE',
        entityTable: 'production_batches',
        entityId: batchData.id,
        newData: batchData
      });
    }
    
    return fetchProductionBatchById(batchData.id);
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
    
    const { data: fetchedExistingBatch, error: fetchError } = await supabase
      .from("production_batches")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchedExistingBatch) {
      existingBatchData = fetchedExistingBatch;
    }

    // Apply updates to main production batch
    const batchUpdates: any = {};
    if (batch.batchNumber !== undefined) batchUpdates.batch_number = batch.batchNumber;
    if (batch.productionDate !== undefined) batchUpdates.production_date = batch.productionDate.toISOString();
    if (batch.mixDay !== undefined) batchUpdates.mix_day = batch.mixDay;
    if (batch.mixCount !== undefined) batchUpdates.mix_count = batch.mixCount;
    if (batch.notes !== undefined) batchUpdates.notes = batch.notes;
    if (batch.mixProductionBatchId !== undefined) batchUpdates.mix_batch_id = batch.mixProductionBatchId;

    if (Object.keys(batchUpdates).length > 0) {
      const { error: batchUpdateError } = await supabase
        .from("production_batches")
        .update(batchUpdates)
        .eq("id", id);
      if (batchUpdateError) {
        await abortTransaction();
        throw batchUpdateError;
      }
    }

    // Update produced items if provided
    if (batch.producedItems && batch.producedItems.length > 0) {
      const { error: deleteProducedError } = await supabase
        .from("produced_items")
        .delete()
        .eq("production_batch_id", id);
      
      if (deleteProducedError) {
        await abortTransaction();
        throw deleteProducedError;
      }
      
      for (const item of batch.producedItems) {
        const { error: itemError } = await supabase
          .from("produced_items")
          .insert({
            production_batch_id: id,
            product_id: item.productId,
            quantity: item.quantity,
            remaining_quantity: item.remainingQuantity || item.quantity,
            unit_of_measure: item.unitOfMeasure,
            batch_number: item.batchNumber
          });
        
        if (itemError) {
          await abortTransaction();
          throw itemError;
        }
      }
    }

    // Update used materials if provided (only for additional materials in production)
    if (batch.usedMaterials && batch.usedMaterials.length > 0) {
      const { data: existingUsedMaterials, error: fetchUsedError } = await supabase
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
      
      // Delete existing used materials
      const { error: deleteUsedError } = await supabase
        .from("used_materials")
        .delete()
        .eq("production_batch_id", id);
      
      if (deleteUsedError) {
        await abortTransaction();
        throw deleteUsedError;
      }
      
      // Insert updated used materials and consume new stock
      for (const material of batch.usedMaterials) {
        const { error: materialError } = await supabase
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

export const deleteProductionBatch = async (id: string, userId?: string, userDisplayName?: string): Promise<void> => {
  let batchToDeleteForLog: any = { id };
  try {
    await beginTransaction();

    const { data: fetchedBatch, error: fetchError } = await supabase
      .from("production_batches")
      .select("*, mix_batch_id")
      .eq("id", id)
      .single();

    if (fetchedBatch) {
      batchToDeleteForLog = fetchedBatch;
    }

    // Get used materials to restore stock (only additional materials, not mix materials)
    const { data: usedMaterialsToRestore, error: fetchUsedError } = await supabase
      .from("used_materials")
      .select("material_batch_id, quantity")
      .eq("production_batch_id", id);
    
    if (fetchUsedError) {
      await abortTransaction();
      throw new Error(`Erro ao buscar materiais usados: ${fetchUsedError.message}`);
    }

    // Restore stock only for additional materials (not mix materials)
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

    // Delete produced items
    const { error: producedItemsError } = await supabase
      .from("produced_items")
      .delete()
      .eq("production_batch_id", id);
    if (producedItemsError) { 
      await abortTransaction(); 
      throw producedItemsError; 
    }

    // Delete used materials
    const { error: usedMaterialsDeleteError } = await supabase
      .from("used_materials")
      .delete()
      .eq("production_batch_id", id);
    if (usedMaterialsDeleteError) { 
      await abortTransaction(); 
      throw usedMaterialsDeleteError; 
    }

    // Delete the production batch
    const { error: batchError } = await supabase
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
