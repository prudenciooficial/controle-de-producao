import { supabase } from "@/integrations/supabase/client";
import { MixBatch, UsedMaterialMix } from "../types/mix";
import { beginTransaction, endTransaction, abortTransaction } from "./base/supabaseClient";
import { logSystemEvent } from "./logService";

const fetchUsedMaterialsMix = async (mixBatchId: string): Promise<UsedMaterialMix[]> => {
  const { data, error } = await supabase
    .from("used_materials_mix")
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
    .eq("mix_batch_id", mixBatchId);

  if (error) {
    console.error("Error fetching used materials mix:", error);
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

export const fetchMixBatches = async (): Promise<MixBatch[]> => {
  try {
    const { data, error } = await supabase
      .from("mix_batches")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const batches = await Promise.all(
      data.map(async (batch) => {
        const usedMaterials = await fetchUsedMaterialsMix(batch.id);

        return {
          id: batch.id,
          batchNumber: batch.batch_number,
          mixDate: new Date(batch.mix_date),
          mixDay: batch.mix_day,
          mixCount: batch.mix_count,
          notes: batch.notes,
          status: batch.status as 'available' | 'used' | 'expired',
          usedMaterials,
          createdAt: new Date(batch.created_at),
          updatedAt: new Date(batch.updated_at)
        } as MixBatch;
      })
    );

    return batches;
  } catch (error) {
    console.error("Error fetching mix batches:", error);
    throw error;
  }
};

export const fetchAvailableMixBatches = async (): Promise<MixBatch[]> => {
  try {
    const { data, error } = await supabase
      .from("mix_batches")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const batches = await Promise.all(
      data.map(async (batch) => {
        const usedMaterials = await fetchUsedMaterialsMix(batch.id);

        return {
          id: batch.id,
          batchNumber: batch.batch_number,
          mixDate: new Date(batch.mix_date),
          mixDay: batch.mix_day,
          mixCount: batch.mix_count,
          notes: batch.notes,
          status: batch.status as 'available' | 'used' | 'expired',
          usedMaterials,
          createdAt: new Date(batch.created_at),
          updatedAt: new Date(batch.updated_at)
        } as MixBatch;
      })
    );

    return batches;
  } catch (error) {
    console.error("Error fetching available mix batches:", error);
    throw error;
  }
};

export const createMixBatch = async (
  batch: Omit<MixBatch, "id" | "createdAt" | "updatedAt">,
  userId?: string,
  userDisplayName?: string
): Promise<MixBatch> => {
  try {
    await beginTransaction();
    
    console.log(`[MixService] Creating mix batch: ${batch.batchNumber}`);
    
    // Insert the mix batch
    const { data: batchData, error: batchError } = await supabase
      .from("mix_batches")
      .insert({
        batch_number: batch.batchNumber,
        mix_date: batch.mixDate instanceof Date 
          ? batch.mixDate.toISOString().split('T')[0] 
          : String(batch.mixDate),
        mix_day: batch.mixDay,
        mix_count: batch.mixCount,
        notes: batch.notes,
        status: batch.status
      })
      .select()
      .single();
    
    if (batchError) {
      await abortTransaction();
      throw batchError;
    }
    
    // Insert used materials AND UPDATE STOCK
    for (const material of batch.usedMaterials) {
      console.log(`[MixService] Processing material: ${material.materialName}, Batch: ${material.batchNumber}, Quantity: ${material.quantity}`);
      
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
      
      console.log(`[MixService] Stock BEFORE: ${materialBatchBefore.remaining_quantity} for batch ${materialBatchBefore.batch_number}`);
      
      // Insert used material record
      const { error: materialError } = await supabase
        .from("used_materials_mix")
        .insert({
          mix_batch_id: batchData.id,
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
      console.log(`[MixService] Calculated new stock: ${materialBatchBefore.remaining_quantity} - ${material.quantity} = ${newRemainingQuantity}`);
      
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
      
      console.log(`[MixService] Stock AFTER update: ${updatedBatch?.remaining_quantity} for material ${material.materialName}`);
    }
    
    await endTransaction();
    
    console.log(`[MixService] Mix batch created successfully: ${batchData.id}`);
    
    if (userId && userDisplayName) {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'CREATE',
        entityTable: 'mix_batches',
        entityId: batchData.id,
        newData: batchData
      });
    }
    
    // Fetch and return the complete mix batch
    const [usedMaterials] = await Promise.all([
      fetchUsedMaterialsMix(batchData.id)
    ]);

    return {
      id: batchData.id,
      batchNumber: batchData.batch_number,
      mixDate: new Date(batchData.mix_date),
      mixDay: batchData.mix_day,
      mixCount: batchData.mix_count,
      notes: batchData.notes,
      status: batchData.status as 'available' | 'used' | 'expired',
      usedMaterials,
      createdAt: new Date(batchData.created_at),
      updatedAt: new Date(batchData.updated_at)
    } as MixBatch;
    
  } catch (error) {
    console.error("Error creating mix batch:", error);
    try {
      await abortTransaction();
    } catch (rollbackError) {
      console.error("Error in rollback:", rollbackError);
    }
    throw error;
  }
};

export const updateMixBatch = async (
  id: string,
  batch: Partial<MixBatch>,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  let existingBatchData: any = null;
  try {
    await beginTransaction();
    
    console.log(`[UpdateMixBatch] Iniciando atualização da mexida ${id}`);
    
    // Fetch existing data for logging
    const { data: fetchedExistingBatch, error: fetchError } = await supabase
      .from("mix_batches")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchedExistingBatch) {
      existingBatchData = fetchedExistingBatch;
      console.log(`[UpdateMixBatch] Mexida existente: ${existingBatchData.batch_number}`);
    }

    // Update mix batch
    const batchUpdates: any = {};
    if (batch.batchNumber !== undefined) batchUpdates.batch_number = batch.batchNumber;
    if (batch.mixDate !== undefined) batchUpdates.mix_date = batch.mixDate instanceof Date 
      ? batch.mixDate.toISOString().split('T')[0] 
      : String(batch.mixDate);
    if (batch.mixDay !== undefined) batchUpdates.mix_day = batch.mixDay;
    if (batch.mixCount !== undefined) batchUpdates.mix_count = batch.mixCount;
    if (batch.notes !== undefined) batchUpdates.notes = batch.notes;
    if (batch.status !== undefined) batchUpdates.status = batch.status;

    if (Object.keys(batchUpdates).length > 0) {
      console.log(`[UpdateMixBatch] Atualizando dados da mexida:`, batchUpdates);
      const { error: batchUpdateError } = await supabase
        .from("mix_batches")
        .update(batchUpdates)
        .eq("id", id);
      if (batchUpdateError) {
        await abortTransaction();
        throw batchUpdateError;
      }
    }

    // Update used materials if provided
    if (batch.usedMaterials && batch.usedMaterials.length > 0) {
      console.log(`[UpdateMixBatch] Atualizando insumos utilizados...`);
      
      // Get existing used materials with full details
      const { data: existingUsedMaterials, error: fetchUsedError } = await supabase
        .from("used_materials_mix")
        .select("material_batch_id, quantity")
        .eq("mix_batch_id", id);
      
      if (fetchUsedError) {
        await abortTransaction();
        throw fetchUsedError;
      }
      
      console.log(`[UpdateMixBatch] Insumos originais encontrados:`, existingUsedMaterials);
      
      // NOVA LÓGICA: Calcular as diferenças por lote de material
      // Primeiro, construir um mapa dos materiais antigos e novos
      const oldMaterialsMap = new Map<string, number>();
      const newMaterialsMap = new Map<string, number>();
      
      // Mapear materiais antigos
      if (existingUsedMaterials && existingUsedMaterials.length > 0) {
        for (const oldMaterial of existingUsedMaterials) {
          oldMaterialsMap.set(oldMaterial.material_batch_id, oldMaterial.quantity);
        }
      }
      
      // Mapear novos materiais
      for (const newMaterial of batch.usedMaterials) {
        const currentQuantity = newMaterialsMap.get(newMaterial.materialBatchId) || 0;
        newMaterialsMap.set(newMaterial.materialBatchId, currentQuantity + newMaterial.quantity);
      }
      
      console.log(`[UpdateMixBatch] Mapa de materiais antigos:`, Object.fromEntries(oldMaterialsMap));
      console.log(`[UpdateMixBatch] Mapa de materiais novos:`, Object.fromEntries(newMaterialsMap));
      
      // Calcular ajustes necessários para cada lote de material
      const allMaterialBatchIds = new Set([...oldMaterialsMap.keys(), ...newMaterialsMap.keys()]);
      
      for (const materialBatchId of allMaterialBatchIds) {
        const oldQuantity = oldMaterialsMap.get(materialBatchId) || 0;
        const newQuantity = newMaterialsMap.get(materialBatchId) || 0;
        const difference = newQuantity - oldQuantity; // Diferença que precisa ser ajustada
        
        console.log(`[UpdateMixBatch] Material ${materialBatchId}: Antigo=${oldQuantity}, Novo=${newQuantity}, Diferença=${difference}`);
        
        if (difference !== 0) {
          // Buscar estoque atual
          const { data: currentBatch, error: fetchCurrentError } = await supabase
            .from("material_batches")
            .select('remaining_quantity, batch_number')
            .eq('id', materialBatchId)
            .single();
          
          if (fetchCurrentError || !currentBatch) {
            await abortTransaction();
            throw new Error(`Erro ao buscar lote atual: ${fetchCurrentError?.message}`);
          }
          
          // Calcular novo estoque: estoque_atual - diferença
          // Se diferença > 0: consumir mais estoque
          // Se diferença < 0: restaurar estoque
          const newStockQuantity = currentBatch.remaining_quantity - difference;
          
          console.log(`[UpdateMixBatch] Ajustando estoque do lote ${currentBatch.batch_number}: ${currentBatch.remaining_quantity} → ${newStockQuantity} (diferença: ${difference > 0 ? '-' : '+'}${Math.abs(difference)})`);
          
          // Verificar se o estoque não ficará negativo
          if (newStockQuantity < 0) {
            await abortTransaction();
            throw new Error(`Estoque insuficiente para o lote ${currentBatch.batch_number}. Disponível: ${currentBatch.remaining_quantity}, Necessário: ${difference}`);
          }
          
          // Atualizar estoque
          const { error: stockUpdateError } = await supabase
            .from("material_batches")
            .update({ 
              remaining_quantity: newStockQuantity
            })
            .eq('id', materialBatchId);
          
          if (stockUpdateError) {
            await abortTransaction();
            throw new Error(`Erro ao atualizar estoque: ${stockUpdateError.message}`);
          }
        }
      }
      
      // Delete existing used materials
      console.log(`[UpdateMixBatch] Removendo registros antigos de insumos utilizados...`);
      const { error: deleteUsedError } = await supabase
        .from("used_materials_mix")
        .delete()
        .eq("mix_batch_id", id);
      
      if (deleteUsedError) {
        await abortTransaction();
        throw deleteUsedError;
      }
      
      // Insert updated used materials
      console.log(`[UpdateMixBatch] Inserindo novos registros de insumos...`);
      for (const material of batch.usedMaterials) {
        console.log(`[UpdateMixBatch] Inserindo insumo: ${material.materialName}, Quantidade: ${material.quantity}`);
        
        // Insert used material record
        const { error: materialError } = await supabase
          .from("used_materials_mix")
          .insert({
            mix_batch_id: id,
            material_batch_id: material.materialBatchId,
            quantity: material.quantity,
            unit_of_measure: material.unitOfMeasure,
            mix_count_used: material.mixCountUsed
          });
        
        if (materialError) {
          await abortTransaction();
          throw materialError;
        }
      }
    }

    await endTransaction();
    
    console.log(`[UpdateMixBatch] Mexida atualizada com sucesso: ${id}`);
    
    if (userId && userDisplayName) {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'UPDATE',
        entityTable: 'mix_batches',
        entityId: id,
        oldData: existingBatchData ?? { id },
        newData: batch
      });
    }
  } catch (error) {
    console.error("Error updating mix batch:", error);
    try {
      await abortTransaction();
    } catch (rollbackError) {
      console.error("Error in rollback:", rollbackError);
    }
    throw error;
  }
};

export const deleteMixBatch = async (
  id: string, 
  userId?: string, 
  userDisplayName?: string
): Promise<void> => {
  let batchToDeleteForLog: any = { id };
  try {
    await beginTransaction();

    // Fetch the batch before deleting for logging
    const { data: fetchedBatch, error: fetchError } = await supabase
      .from("mix_batches")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchedBatch) {
      batchToDeleteForLog = fetchedBatch;
    }

    // Get used materials to restore stock
    const { data: usedMaterialsToRestore, error: fetchUsedError } = await supabase
      .from("used_materials_mix")
      .select("material_batch_id, quantity")
      .eq("mix_batch_id", id);
    
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

    // Delete used materials (CASCADE will handle this, but being explicit)
    const { error: usedMaterialsDeleteError } = await supabase
      .from("used_materials_mix")
      .delete()
      .eq("mix_batch_id", id);
    if (usedMaterialsDeleteError) { 
      await abortTransaction(); 
      throw usedMaterialsDeleteError; 
    }

    // Delete the mix batch
    const { error: batchError } = await supabase
      .from("mix_batches")
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
        entityTable: 'mix_batches',
        entityId: id,
        oldData: batchToDeleteForLog
      });
    }
  } catch (error) {
    console.error("Error deleting mix batch:", error);
    try {
      await abortTransaction();
    } catch (rollbackError) {
      console.error("Error in rollback:", rollbackError);
    }
    throw error;
  }
};

export const markMixAsUsed = async (mixBatchId: string): Promise<void> => {
  const { error } = await supabase
    .from("mix_batches")
    .update({ status: 'used' })
    .eq("id", mixBatchId);
    
  if (error) throw error;
};

export const markMixAsAvailable = async (mixBatchId: string): Promise<void> => {
  const { error } = await supabase
    .from("mix_batches")
    .update({ status: 'available' })
    .eq("id", mixBatchId);
    
  if (error) throw error;
};
