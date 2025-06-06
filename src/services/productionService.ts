import { supabase } from "@/integrations/supabase/client";
import { ProductionBatch, ProducedItem, UsedMaterial } from "../types";
import { beginTransaction, endTransaction, abortTransaction } from "./base/supabaseClient";
import { logSystemEvent } from "./logService";

const fetchProducedItems = async (productionBatchId: string): Promise<ProducedItem[]> => {
  // Updated query to include the product name from products table
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
    productName: item.products.name, // Now getting the product name from the joined data
    quantity: item.quantity,
    unitOfMeasure: item.unit_of_measure,
    batchNumber: item.batch_number,
    remainingQuantity: item.remaining_quantity,
    createdAt: new Date(item.created_at),
    updatedAt: new Date(item.updated_at)
  }));
};

const fetchUsedMaterials = async (productionBatchId: string): Promise<UsedMaterial[]> => {
  // Updated query to include material name and type from material_batches and materials tables
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
    materialName: material.material_batches.materials.name, // Now getting material name from joined data
    materialType: material.material_batches.materials.type, // Now getting material type from joined data
    batchNumber: material.material_batches.batch_number, // Now getting batch number from joined data
    quantity: material.quantity,
    unitOfMeasure: material.unit_of_measure,
    mixCountUsed: material.mix_count_used, // Include the new mix count field
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

  if (error) {
    console.error("Error fetching production batch:", error);
    throw error;
  }

  const producedItems = await fetchProducedItems(id);
  const usedMaterials = await fetchUsedMaterials(id);

  return {
    id: data.id,
    batchNumber: data.batch_number,
    productionDate: new Date(data.production_date),
    mixDay: data.mix_day,
    mixCount: data.mix_count,
    notes: data.notes,
    producedItems: producedItems,
    usedMaterials: usedMaterials,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    // Novos campos - usar valores padrão para compatibilidade
    isMixOnly: (data as any).is_mix_only || false,
    mixProductionBatchId: (data as any).mix_production_batch_id || null,
    status: (data as any).status || 'production_complete'
  };
};

export const fetchProductionBatches = async (): Promise<ProductionBatch[]> => {
  const { data, error } = await supabase
    .from("production_batches")
    .select("*")
    .order("production_date", { ascending: false });

  if (error) {
    console.error("Error fetching production batches:", error);
    throw error;
  }

  // Fetch related data for each batch
  const productionBatches: ProductionBatch[] = [];
  for (const batch of data) {
    const producedItems = await fetchProducedItems(batch.id);
    const usedMaterials = await fetchUsedMaterials(batch.id);

    productionBatches.push({
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
      // Novos campos - usar valores padrão para compatibilidade
      isMixOnly: (batch as any).is_mix_only || false,
      mixProductionBatchId: (batch as any).mix_production_batch_id || null,
      status: (batch as any).status || 'production_complete'
    });
  }

  return productionBatches;
};

// Função para buscar apenas mexidas disponíveis
export const fetchAvailableMixes = async (): Promise<ProductionBatch[]> => {
  const { data, error } = await supabase
    .from("production_batches")
    .select("*")
    .eq("is_mix_only", true)
    .eq("status", "mix_only")
    .order("production_date", { ascending: false });

  if (error) {
    console.error("Error fetching available mixes:", error);
    throw error;
  }

  const mixes: ProductionBatch[] = [];
  for (const batch of data) {
    const usedMaterials = await fetchUsedMaterials(batch.id);

    mixes.push({
      id: batch.id,
      batchNumber: batch.batch_number,
      productionDate: new Date(batch.production_date),
      mixDay: batch.mix_day,
      mixCount: batch.mix_count,
      notes: batch.notes,
      producedItems: [], // Mexidas não têm produtos acabados
      usedMaterials: usedMaterials,
      createdAt: new Date(batch.created_at),
      updatedAt: new Date(batch.updated_at),
      isMixOnly: (batch as any).is_mix_only || false,
      mixProductionBatchId: (batch as any).mix_production_batch_id || null,
      status: (batch as any).status || 'mix_only'
    });
  }

  return mixes;
};

// When creating a production batch, ensure remaining_quantity is set to the same value as quantity
export const createProductionBatch = async (
  batch: Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">,
  userId?: string,
  userDisplayName?: string
): Promise<ProductionBatch> => {
  try {
    await beginTransaction();
    
    console.log(`[ProductionService] Creating production batch: ${batch.batchNumber}`);
    
    // Insert the production batch
    const batchInsertData: any = {
      batch_number: batch.batchNumber,
      production_date: batch.productionDate.toISOString(),
      mix_day: batch.mixDay,
      mix_count: batch.mixCount,
      notes: batch.notes
    };

    // Adicionar campos opcionais apenas se existirem na tabela
    if ('is_mix_only' in batch) {
      batchInsertData.is_mix_only = batch.isMixOnly || false;
    }
    if ('status' in batch) {
      batchInsertData.status = batch.status || 'production_complete';
    }
    if (batch.mixProductionBatchId) {
      batchInsertData.mix_production_batch_id = batch.mixProductionBatchId;
    }

    const { data: batchData, error: batchError } = await supabase
      .from("production_batches")
      .insert(batchInsertData)
      .select()
      .single();
    
    if (batchError) {
      await abortTransaction();
      throw batchError;
    }
    
    // Insert produced items (apenas se não for mexida)
    if (!batch.isMixOnly && batch.producedItems) {
      for (const item of batch.producedItems) {
        // FIXED: Ensure remaining_quantity is same as quantity initially
        const { error: itemError } = await supabase
          .from("produced_items")
          .insert({
            production_batch_id: batchData.id,
            product_id: item.productId,
            quantity: item.quantity,
            remaining_quantity: item.quantity, // Set to same as quantity
            unit_of_measure: item.unitOfMeasure,
            batch_number: item.batchNumber
          });
        
        if (itemError) {
          await abortTransaction();
          throw itemError;
        }
      }
    }
    
    // Insert used materials AND UPDATE STOCK - FIXED VERSION
    for (const material of batch.usedMaterials) {
      console.log(`[ProductionService] Processing material: ${material.materialName}, Batch: ${material.batchNumber}, Quantity to consume: ${material.quantity}`);
      
      // FIRST: Get current stock BEFORE any operations
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
      
      // Insert used material record
      const { error: materialError } = await supabase
        .from("used_materials")
        .insert({
          production_batch_id: batchData.id,
          material_batch_id: material.materialBatchId,
          quantity: material.quantity,
          unit_of_measure: material.unitOfMeasure,
          mix_count_used: material.mixCountUsed // Include mix count for conservants
        });
      
      if (materialError) {
        await abortTransaction();
        throw materialError;
      }
      
      // Calculate new stock value
      const newRemainingQuantity = materialBatchBefore.remaining_quantity - material.quantity;
      console.log(`[ProductionService] Calculated new stock: ${materialBatchBefore.remaining_quantity} - ${material.quantity} = ${newRemainingQuantity}`);
      
      // UPDATE STOCK: Use direct calculation to avoid any triggers duplication
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
      
      // Verify the update was correct
      if (updatedBatch && Math.abs(updatedBatch.remaining_quantity - newRemainingQuantity) > 0.001) {
        await abortTransaction();
        throw new Error(`Inconsistência detectada! Esperado: ${newRemainingQuantity}, Obtido: ${updatedBatch.remaining_quantity} para material ${material.materialName}`);
      }
    }
    
    // Se estiver vinculando uma mexida à produção, atualizar o status da mexida
    if (batch.mixProductionBatchId) {
      const { error: mixUpdateError } = await supabase
        .from("production_batches")
        .update({ status: 'production_complete' } as any)
        .eq("id", batch.mixProductionBatchId);
      
      if (mixUpdateError) {
        await abortTransaction();
        throw new Error(`Erro ao atualizar status da mexida: ${mixUpdateError.message}`);
      }
    }
    
    await endTransaction();
    
    console.log(`[ProductionService] Production batch created successfully: ${batchData.id}`);
    
    await logSystemEvent({
      userId: userId!,
      userDisplayName: userDisplayName!,
      actionType: 'CREATE',
      entityTable: 'production_batches',
      entityId: batchData.id,
      newData: batchData
    });
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
    
    // Buscar os dados existentes ANTES de qualquer alteração para o log
    const { data: fetchedExistingBatch, error: fetchError } = await supabase
      .from("production_batches")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError) {
      console.warn(`Batch (ID: ${id}) not found before update, or other fetch error: ${fetchError.message}`);
    } else {
      existingBatchData = fetchedExistingBatch;
    }

    // Aplicar atualizações ao lote de produção principal
    const batchUpdates: any = {};
    if (batch.batchNumber !== undefined) batchUpdates.batch_number = batch.batchNumber;
    if (batch.productionDate !== undefined) batchUpdates.production_date = batch.productionDate.toISOString();
    if (batch.mixDay !== undefined) batchUpdates.mix_day = batch.mixDay;
    if (batch.mixCount !== undefined) batchUpdates.mix_count = batch.mixCount;
    if (batch.notes !== undefined) batchUpdates.notes = batch.notes;

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

    // Atualizar producedItems (se fornecido em batch.producedItems)
    if (batch.producedItems && batch.producedItems.length > 0) {
      // Delete existing produced items
      const { error: deleteProducedError } = await supabase
        .from("produced_items")
        .delete()
        .eq("production_batch_id", id);
      
      if (deleteProducedError) {
        await abortTransaction();
        throw deleteProducedError;
      }
      
      // Insert updated produced items
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

    // Atualizar usedMaterials (se fornecido em batch.usedMaterials)
    if (batch.usedMaterials && batch.usedMaterials.length > 0) {
      // Get existing used materials to compare and potentially restore stock
      const { data: existingUsedMaterials, error: fetchUsedError } = await supabase
        .from("used_materials")
        .select("material_batch_id, quantity")
        .eq("production_batch_id", id);
      
      if (fetchUsedError) {
        await abortTransaction();
        throw fetchUsedError;
      }
      
      // Verificar se os materiais realmente mudaram
      const materialsChanged = () => {
        if (!existingUsedMaterials || existingUsedMaterials.length !== batch.usedMaterials!.length) {
          return true;
        }
        
        // Verificar se algum material ou quantidade mudou
        for (const newMaterial of batch.usedMaterials!) {
          const existingMaterial = existingUsedMaterials.find(
            existing => existing.material_batch_id === newMaterial.materialBatchId
          );
          
          if (!existingMaterial || existingMaterial.quantity !== newMaterial.quantity) {
            return true;
          }
        }
        
        return false;
      };
      
      // Só reverter e reaplicar estoque se os materiais realmente mudaram
      if (materialsChanged()) {
        console.log(`🔄 EDIÇÃO: Materiais mudaram - processando reversão e nova aplicação de estoque...`);
        
        // Restore stock from existing used materials
        if (existingUsedMaterials && existingUsedMaterials.length > 0) {
          console.log(`🔄 EDIÇÃO: Revertendo estoque de ${existingUsedMaterials.length} materiais originais...`);
          
          for (const existingMaterial of existingUsedMaterials) {
            // Fetch current remaining quantity
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
            
            console.log(`📦 REVERTENDO - Material ${existingMaterial.material_batch_id}: ${currentBatch.remaining_quantity} + ${existingMaterial.quantity} = ${restoredQuantity}`);
            
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
        console.log(`🔄 EDIÇÃO: Aplicando novos consumos de ${batch.usedMaterials.length} materiais...`);
        
        for (const material of batch.usedMaterials) {
          // Insert used material record
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
          
          console.log(`📦 CONSUMINDO - Material ${material.materialBatchId}: ${currentMaterialBatch.remaining_quantity} - ${material.quantity} = ${newConsumedQuantity}`);
          
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
      } else {
        console.log(`⏭️ EDIÇÃO: Materiais não mudaram - pulando operações de estoque`);
      }
    }

    await endTransaction();
    await logSystemEvent({
      userId: userId!,
      userDisplayName: userDisplayName!,
      actionType: 'UPDATE',
      entityTable: 'production_batches',
      entityId: id,
      oldData: existingBatchData ?? { id },
      newData: batch
    });
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
  let batchToDeleteForLog: any = { id }; // Fallback para o log
  try {
    await beginTransaction();

    // Buscar o lote ANTES de deletar para registrar em oldData
    const { data: fetchedBatch, error: fetchError } = await supabase
      .from("production_batches")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchedBatch) {
      batchToDeleteForLog = fetchedBatch;
    } else if (fetchError) {
      console.warn(`Batch (ID: ${id}) not found before deletion, or other fetch error: ${fetchError.message}`);
      // Prossegue com a tentativa de deleção mesmo assim
    }

    // *** CORREÇÃO: REVERTER ESTOQUE DOS MATERIAIS USADOS ***
    // Buscar os materiais usados ANTES de deletar para reverter o estoque
    const { data: usedMaterialsToRestore, error: fetchUsedError } = await supabase
      .from("used_materials")
      .select("material_batch_id, quantity")
      .eq("production_batch_id", id);
    
    if (fetchUsedError) {
      await abortTransaction();
      throw new Error(`Erro ao buscar materiais usados: ${fetchUsedError.message}`);
    }
    
    // Reverter o estoque de cada material usado
    if (usedMaterialsToRestore && usedMaterialsToRestore.length > 0) {
      console.log(`🔄 Revertendo estoque de ${usedMaterialsToRestore.length} materiais usados...`);
      
      for (const usedMaterial of usedMaterialsToRestore) {
        // Buscar quantidade atual do lote de material
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
        
        console.log(`📦 Material ${usedMaterial.material_batch_id}: ${currentMaterialBatch.remaining_quantity} + ${usedMaterial.quantity} = ${restoredQuantity}`);
        
        // Restaurar o estoque
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

    // Delete produced items (como na sua lógica original)
    const { error: producedItemsError } = await supabase
      .from("produced_items")
      .delete()
      .eq("production_batch_id", id);
    if (producedItemsError) { await abortTransaction(); throw producedItemsError; }

    // Delete used materials (APÓS reverter o estoque)
    const { error: usedMaterialsDeleteError } = await supabase
      .from("used_materials")
      .delete()
      .eq("production_batch_id", id);
    if (usedMaterialsDeleteError) { await abortTransaction(); throw usedMaterialsDeleteError; }

    // Delete the production batch
    const { error: batchError } = await supabase
      .from("production_batches")
      .delete()
      .eq("id", id);
    if (batchError) { await abortTransaction(); throw batchError; }

    await endTransaction();
    console.log(`✅ Lote de produção ${id} excluído com estoque revertido com sucesso!`);
    
    await logSystemEvent({
      userId: userId!,
      userDisplayName: userDisplayName!,
      actionType: 'DELETE',
      entityTable: 'production_batches',
      entityId: id,
      oldData: batchToDeleteForLog
    });
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
