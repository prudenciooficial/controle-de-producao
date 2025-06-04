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
    updatedAt: new Date(data.updated_at)
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
      updatedAt: new Date(batch.updated_at)
    });
  }

  return productionBatches;
};

// When creating a production batch, ensure remaining_quantity is set to the same value as quantity
export const createProductionBatch = async (
  batch: Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">,
  userId?: string,
  userDisplayName?: string
): Promise<ProductionBatch> => {
  try {
    await beginTransaction();
    
    // Insert the production batch
    const { data: batchData, error: batchError } = await supabase
      .from("production_batches")
      .insert({
        batch_number: batch.batchNumber,
        production_date: batch.productionDate.toISOString(),
        mix_day: batch.mixDay,
        mix_count: batch.mixCount,
        notes: batch.notes
      })
      .select()
      .single();
    
    if (batchError) {
      await abortTransaction();
      throw batchError;
    }
    
    // Insert produced items
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
    
    // Insert used materials
    for (const material of batch.usedMaterials) {
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
    }
    
    await endTransaction();
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
  let existingBatchData: any = null; // Para armazenar os dados antes da atualização
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
      // Dependendo da lógica de negócio, pode-se querer lançar o erro aqui ou prosseguir
      // Se prosseguir, oldData no log será limitado.
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

    // Lógica para atualizar producedItems (se fornecido em batch.producedItems)
    // ... (sua lógica existente de atualização de producedItems)

    // Lógica para atualizar usedMaterials (se fornecido em batch.usedMaterials)
    // ... (sua lógica existente de atualização de usedMaterials)

    await endTransaction();
    await logSystemEvent({
      userId: userId!,
      userDisplayName: userDisplayName!,
      actionType: 'UPDATE',
      entityTable: 'production_batches',
      entityId: id,
      oldData: existingBatchData ?? { id }, // Usa o que foi buscado ou um fallback
      newData: batch // O objeto 'batch' contém as atualizações que foram tentadas/aplicadas
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

    // Delete produced items (como na sua lógica original)
    const { error: producedItemsError } = await supabase
      .from("produced_items")
      .delete()
      .eq("production_batch_id", id);
    if (producedItemsError) { await abortTransaction(); throw producedItemsError; }

    // Delete used materials (como na sua lógica original)
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
