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
          mixDate: new Date(batch.mix_date + 'T12:00:00'),
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
          mixDate: new Date(batch.mix_date + 'T12:00:00'),
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
    
    const batchData = {
      batch_number: batch.batchNumber,
      mix_date: batch.mixDay,
      mix_day: batch.mixDay,
      mix_count: batch.mixCount,
      notes: batch.notes || "",
      status: batch.status || 'available'
    };
    
    const { data: insertedBatch, error: batchError } = await supabase
      .from("mix_batches")
      .insert(batchData)
      .select()
      .single();
    
    if (batchError) {
      await abortTransaction();
      throw batchError;
    }
    
    // Process used materials - APENAS REGISTRO, SEM AFETAR ESTOQUE
    for (const material of batch.usedMaterials) {
      console.log(`[MixService] Registrando material: ${material.materialName}, Lote: ${material.batchNumber}, Quantidade: ${material.quantity}`);
      
      // Insert used material record - apenas para documentação
      const { error: materialError } = await supabase
        .from("used_materials_mix")
        .insert({
          mix_batch_id: insertedBatch.id,
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
    
    await endTransaction();
    
    console.log(`[MixService] Mix batch created successfully: ${insertedBatch.id}`);
    
    if (userId && userDisplayName) {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'CREATE',
        entityTable: 'mix_batches',
        entityId: insertedBatch.id,
        newData: insertedBatch
      });
    }
    
    // Fetch and return the complete mix batch
    const [usedMaterials] = await Promise.all([
      fetchUsedMaterialsMix(insertedBatch.id)
    ]);
    
    return {
      id: insertedBatch.id,
      batchNumber: insertedBatch.batch_number,
      mixDate: new Date(insertedBatch.mix_date + 'T12:00:00'),
      mixDay: insertedBatch.mix_day,
      mixCount: insertedBatch.mix_count,
      notes: insertedBatch.notes,
      status: insertedBatch.status as 'available' | 'used' | 'expired',
      usedMaterials,
      createdAt: new Date(insertedBatch.created_at),
      updatedAt: new Date(insertedBatch.updated_at)
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
    if (batch.mixDate !== undefined) batchUpdates.mix_date = batch.mixDay;
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

    // Update used materials if provided - APENAS REGISTROS, SEM AFETAR ESTOQUE
    if (batch.usedMaterials && batch.usedMaterials.length > 0) {
      console.log(`[UpdateMixBatch] Atualizando insumos utilizados (apenas registros)...`);
      
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
        
        // Insert used material record - apenas para documentação
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
        oldData: existingBatchData,
        newData: { id, ...batch }
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

    console.log(`[DeleteMixBatch] Verificando se mexida ${batchToDeleteForLog.batch_number} está vinculada a alguma produção...`);

    // Verificar se a mexida está sendo usada por alguma produção
    const { data: linkedProductions, error: productionCheckError } = await supabase
      .from("production_batches")
      .select("id, batch_number")
      .eq("mix_batch_id", id);

    if (productionCheckError) {
      await abortTransaction();
      throw productionCheckError;
    }

    if (linkedProductions && linkedProductions.length > 0) {
      await abortTransaction();
      const productionNumbers = linkedProductions.map(p => p.batch_number).join(", ");
      throw new Error(
        `Não é possível excluir a mexida "${batchToDeleteForLog.batch_number}" pois ela está vinculada às seguintes produções: ${productionNumbers}. ` +
        `Exclua primeiro a(s) produção(ões) de referência e depois tente excluir a mexida novamente.`
      );
    }

    console.log(`[DeleteMixBatch] Mexida não está vinculada a nenhuma produção. Prosseguindo com exclusão...`);
    console.log(`[DeleteMixBatch] Excluindo mexida ${batchToDeleteForLog.batch_number} - APENAS REGISTROS, SEM AFETAR ESTOQUE`);

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
    
    console.log(`[DeleteMixBatch] Mexida excluída com sucesso: ${id}`);
    
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
