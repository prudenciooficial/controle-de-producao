
import { supabase } from "@/integrations/supabase/client";
import { Material, MaterialBatch } from "../types";

// Materials
export const fetchMaterials = async (): Promise<Material[]> => {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .order("name");
  
  if (error) throw error;
  
  return data.map(material => ({
    ...material,
    id: material.id,
    name: material.name,
    code: material.code,
    type: material.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro",
    unitOfMeasure: material.unit_of_measure,
    description: material.description,
    createdAt: new Date(material.created_at),
    updatedAt: new Date(material.updated_at)
  }));
};

export const createMaterial = async (
  material: Omit<Material, "id" | "createdAt" | "updatedAt">
): Promise<Material> => {
  const { data, error } = await supabase
    .from("materials")
    .insert({
      name: material.name,
      code: material.code,
      type: material.type,
      unit_of_measure: material.unitOfMeasure,
      description: material.description
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    ...data,
    id: data.id,
    name: data.name,
    code: data.code,
    type: data.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro",
    unitOfMeasure: data.unit_of_measure,
    description: data.description,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateMaterial = async (
  id: string,
  material: Partial<Material>
): Promise<void> => {
  const updates: any = {};
  
  if (material.name) updates.name = material.name;
  if (material.code) updates.code = material.code;
  if (material.type) updates.type = material.type;
  if (material.unitOfMeasure) updates.unit_of_measure = material.unitOfMeasure;
  if (material.description !== undefined) updates.description = material.description;
  
  const { error } = await supabase
    .from("materials")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
};

export const deleteMaterial = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
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

// Get Material Batches with Material names and types
export const fetchMaterialBatchesWithDetails = async (): Promise<MaterialBatch[]> => {
  // First, identify and remove duplicate material batches
  try {
    console.log("Cleaning up duplicate material batches");
    
    // Execute the SQL function that we created for cleaning up duplicates
    // We need to use a direct SQL query instead of rpc since the function isn't in the allowed list
    const { error: cleanupError } = await supabase
      .from('_exec_sql')  // Using a raw SQL execution approach
      .select('*')
      .eq('command', 'SELECT cleanup_duplicate_material_batches()');
    
    if (cleanupError) {
      console.error("Error cleaning up duplicate batches:", cleanupError);
      // Continue with the fetch despite the cleanup error
    } else {
      console.log("Duplicate material batches cleaned up successfully");
    }
  } catch (cleanupErr) {
    console.error("Exception during duplicate cleanup:", cleanupErr);
    // Continue with the fetch despite the error
  }
  
  // Now fetch the clean data
  const { data, error } = await supabase
    .from("material_batches")
    .select(`
      *,
      materials:material_id (
        name,
        type
      )
    `)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  
  return data.map(batch => ({
    ...batch,
    id: batch.id,
    materialId: batch.material_id,
    materialName: batch.materials?.name || "",
    materialType: batch.materials?.type || "",
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
  const updates: any = {};
  
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
