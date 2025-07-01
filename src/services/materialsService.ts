import { supabase } from "@/integrations/supabase/client";
import { materialsAdapter } from "./database/MaterialsAdapter";
import { Material, MaterialBatch } from "../types";
import { logSystemEvent } from "./logService";

// Materials - NOVA IMPLEMENTAÇÃO OFFLINE-FIRST
export const fetchMaterials = async (): Promise<Material[]> => {
  return await materialsAdapter.getMaterials();
};

export const createMaterial = async (
  material: Omit<Material, "id" | "createdAt" | "updatedAt">,
  userId?: string,
  userDisplayName?: string
): Promise<Material> => {
  const result = await materialsAdapter.createMaterial(material);
  
  // Log apenas se online (para evitar conflitos)
  if (await materialsAdapter.isOnline() && userId && userDisplayName) {
    try {
      await logSystemEvent({
        userId: userId,
        userDisplayName: userDisplayName,
        actionType: 'CREATE',
        entityTable: 'materials',
        entityId: result.id,
        newData: result as unknown as Record<string, unknown>
      });
    } catch (error) {
      console.warn('Erro ao fazer log (sistema continuará funcionando):', error);
    }
  }
  
  return result;
};

export const updateMaterial = async (
  id: string,
  material: Partial<Material>,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  await materialsAdapter.updateMaterial(id, material);
  
  // Log apenas se online
  if (await materialsAdapter.isOnline() && userId && userDisplayName) {
    try {
      await logSystemEvent({
        userId: userId,
        userDisplayName: userDisplayName,
        actionType: 'UPDATE',
        entityTable: 'materials',
        entityId: id,
        oldData: { id, updates: material }
      });
    } catch (error) {
      console.warn('Erro ao fazer log (sistema continuará funcionando):', error);
    }
  }
};

export const deleteMaterial = async (
  id: string, 
  userId?: string, 
  userDisplayName?: string
): Promise<void> => {
  await materialsAdapter.deleteMaterial(id);
  
  // Log apenas se online
  if (await materialsAdapter.isOnline() && userId && userDisplayName) {
    try {
      await logSystemEvent({
        userId: userId,
        userDisplayName: userDisplayName,
        actionType: 'DELETE',
        entityTable: 'materials',
        entityId: id,
        oldData: { id }
      });
    } catch (error) {
      console.warn('Erro ao fazer log (sistema continuará funcionando):', error);
    }
  }
};

// NOVA FUNÇÃO: Sincronizar operações pendentes
export const syncPendingMaterials = async (): Promise<void> => {
  await materialsAdapter.syncPendingOperations();
};

// NOVA FUNÇÃO: Verificar status de conectividade
export const isOnline = async (): Promise<boolean> => {
  return await materialsAdapter.isOnline();
};

// Material Batches
export const fetchMaterialBatches = async (): Promise<MaterialBatch[]> => {
  const { data, error } = await supabase
    .from("material_batches")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  
  return data.map(batch => ({
    ...batch,
    id: batch.id,
    materialId: batch.material_id,
    materialName: "", // We need to fetch material name separately or join tables
    materialType: "", // We need to fetch material type separately or join tables
    batchNumber: batch.batch_number,
    quantity: batch.quantity,
    suppliedQuantity: batch.supplied_quantity,
    remainingQuantity: batch.remaining_quantity,
    unitOfMeasure: batch.unit_of_measure,
    expiryDate: batch.expiry_date ? new Date(batch.expiry_date) : undefined,
    hasReport: batch.has_report,
    createdAt: new Date(batch.created_at),
    updatedAt: new Date(batch.updated_at)
  }));
};

// Get Material Batches with Material names and types - VERSÃO OTIMIZADA
export const fetchMaterialBatchesWithDetails = async (): Promise<MaterialBatch[]> => {
  // console.time('🔍 Fetch MaterialBatches');
  
  // Carregamento otimizado sem limpeza de duplicatas a cada request
  const { data, error } = await supabase
    .from("material_batches")
    .select(`
      id,
      material_id,
      batch_number,
      quantity,
      supplied_quantity,
      remaining_quantity,
      unit_of_measure,
      expiry_date,
      has_report,
      created_at,
      updated_at,
      materials:material_id (
        name,
        type
      )
    `)
    .gt('remaining_quantity', 0) // Apenas lotes com estoque disponível
    .order("created_at", { ascending: false });
  
  if (error) {
    // console.timeEnd('🔍 Fetch MaterialBatches');
    throw error;
  }
  
  const result = data.map(batch => ({
    ...batch,
    id: batch.id,
    materialId: batch.material_id,
    materialName: batch.materials?.name || "",
    materialType: batch.materials?.type || "",
    supplierId: "",  
    supplierName: "",
    batchNumber: batch.batch_number,
    quantity: batch.quantity,
    suppliedQuantity: batch.supplied_quantity,
    remainingQuantity: batch.remaining_quantity,
    unitOfMeasure: batch.unit_of_measure,
    expiryDate: batch.expiry_date ? new Date(batch.expiry_date) : undefined,
    hasReport: batch.has_report,
    createdAt: new Date(batch.created_at),
    updatedAt: new Date(batch.updated_at)
  }));
  
  // console.timeEnd('🔍 Fetch MaterialBatches');
  // console.log(`📦 Carregados ${result.length} lotes de materiais`);
  
  return result;
};

// Função específica para buscar apenas fécula (para cálculo de capacidade produtiva)
export const fetchFeculaBatchesOnly = async (): Promise<MaterialBatch[]> => {
  // console.time('🌾 Fetch Fécula Only');
  
  const { data, error } = await supabase
    .from("material_batches")
    .select(`
      id,
      material_id,
      batch_number,
      remaining_quantity,
      unit_of_measure,
      created_at,
      materials:material_id (
        name,
        type
      )
    `)
    .gt('remaining_quantity', 0)
    .eq('materials.type', 'Fécula')
    .order("created_at", { ascending: false });
  
  if (error) {
    // console.timeEnd('🌾 Fetch Fécula Only');
    throw error;
  }
  
  const result = data.map(batch => ({
    ...batch,
    id: batch.id,
    materialId: batch.material_id,
    materialName: batch.materials?.name || "",
    materialType: batch.materials?.type || "",
    supplierId: "",  
    supplierName: "",
    batchNumber: batch.batch_number,
    quantity: batch.remaining_quantity,
    suppliedQuantity: batch.remaining_quantity,
    remainingQuantity: batch.remaining_quantity,
    unitOfMeasure: batch.unit_of_measure,
    expiryDate: undefined,
    hasReport: false,
    createdAt: new Date(batch.created_at),
    updatedAt: new Date(batch.created_at)
  }));
  
  // console.timeEnd('🌾 Fetch Fécula Only');
  // console.log(`🌾 Carregados ${result.length} lotes de fécula`);
  
  return result;
};

export const createMaterialBatch = async (
  batch: Omit<MaterialBatch, "id" | "createdAt" | "updatedAt">
): Promise<MaterialBatch> => {
  const { data, error } = await supabase
    .from("material_batches")
    .insert({
      material_id: batch.materialId,
      batch_number: batch.batchNumber,
      quantity: batch.quantity,
      supplied_quantity: batch.suppliedQuantity,
      remaining_quantity: batch.remainingQuantity,
      unit_of_measure: batch.unitOfMeasure,
      expiry_date: batch.expiryDate instanceof Date ? batch.expiryDate.toISOString() : batch.expiryDate,
      has_report: batch.hasReport
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    ...data,
    id: data.id,
    materialId: data.material_id,
    materialName: batch.materialName,
    materialType: batch.materialType,
    supplierId: batch.supplierId || "",
    supplierName: batch.supplierName || "",
    batchNumber: data.batch_number,
    quantity: data.quantity,
    suppliedQuantity: data.supplied_quantity,
    remainingQuantity: data.remaining_quantity,
    unitOfMeasure: data.unit_of_measure,
    expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined,
    hasReport: data.has_report,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateMaterialBatch = async (
  id: string,
  batch: Partial<MaterialBatch>
): Promise<void> => {
  const updates: Record<string, string | number | Date | boolean | undefined> = {};
  
  if (batch.materialId) updates.material_id = batch.materialId;
  if (batch.batchNumber) updates.batch_number = batch.batchNumber;
  if (batch.quantity !== undefined) updates.quantity = batch.quantity;
  if (batch.suppliedQuantity !== undefined) updates.supplied_quantity = batch.suppliedQuantity;
  if (batch.remainingQuantity !== undefined) updates.remaining_quantity = batch.remainingQuantity;
  if (batch.unitOfMeasure) updates.unit_of_measure = batch.unitOfMeasure;
  if (batch.expiryDate !== undefined) {
    updates.expiry_date = batch.expiryDate instanceof Date 
      ? batch.expiryDate.toISOString() 
      : batch.expiryDate;
  }
  if (batch.hasReport !== undefined) updates.has_report = batch.hasReport;
  
  const { error } = await supabase
    .from("material_batches")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
};

export const deleteMaterialBatch = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("material_batches")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
};
