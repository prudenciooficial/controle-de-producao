import { supabase } from "@/integrations/supabase/client";
import { Material, MaterialBatch } from "../types";
import { logSystemEvent } from "./logService";

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
  material: Omit<Material, "id" | "createdAt" | "updatedAt">,
  userId?: string,
  userDisplayName?: string
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
  
  await logSystemEvent({
    userId: userId!,
    userDisplayName: userDisplayName!,
    actionType: 'CREATE',
    entityTable: 'materials',
    entityId: data.id,
    newData: data
  });
  
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
  material: Partial<Material>,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  const updates: any = {};
  
  if (material.name) updates.name = material.name;
  if (material.code !== undefined) updates.code = material.code;
  if (material.type) updates.type = material.type;
  if (material.unitOfMeasure) updates.unit_of_measure = material.unitOfMeasure;
  if (material.description !== undefined) updates.description = material.description;
  
  const { error } = await supabase
    .from("materials")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
  
  await logSystemEvent({
    userId: userId!,
    userDisplayName: userDisplayName!,
    actionType: 'UPDATE',
    entityTable: 'materials',
    entityId: id,
    oldData: { id, updates }
  });
};

export const deleteMaterial = async (id: string, userId?: string, userDisplayName?: string): Promise<void> => {
  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
  
  await logSystemEvent({
    userId: userId!,
    userDisplayName: userDisplayName!,
    actionType: 'DELETE',
    entityTable: 'materials',
    entityId: id,
    oldData: { id }
  });
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
    
    // Instead of calling the SQL function directly, we'll manually perform the cleanup in JS
    // Step 1: Get all material batches
    const { data: allBatches, error: fetchError } = await supabase
      .from("material_batches")
      .select("*");
    
    if (fetchError) {
      console.error("Error fetching material batches:", fetchError);
    } else {
      // Step 2: Identify duplicate batches (same material_id and batch_number)
      // Group by material_id + batch_number
      const batchGroups = new Map();
      
      allBatches.forEach(batch => {
        const key = `${batch.material_id}-${batch.batch_number}`;
        if (!batchGroups.has(key)) {
          batchGroups.set(key, []);
        }
        batchGroups.get(key).push(batch);
      });
      
      // Step 3: For each group that has duplicates, keep only the most recent one
      const batchesToDelete = [];
      
      batchGroups.forEach(batches => {
        if (batches.length > 1) {
          // Sort by id in descending order (assuming higher id = more recent)
          batches.sort((a, b) => b.id.localeCompare(a.id));
          
          // Keep the first one (most recent), mark rest for deletion
          for (let i = 1; i < batches.length; i++) {
            batchesToDelete.push(batches[i].id);
          }
        }
      });
      
      // Step 4: Delete the duplicate batches
      if (batchesToDelete.length > 0) {
        console.log(`Found ${batchesToDelete.length} duplicate batches to delete`);
        
        const { error: deleteError } = await supabase
          .from("material_batches")
          .delete()
          .in("id", batchesToDelete);
        
        if (deleteError) {
          console.error("Error deleting duplicate batches:", deleteError);
        } else {
          console.log(`Successfully deleted ${batchesToDelete.length} duplicate batches`);
        }
      } else {
        console.log("No duplicate material batches found");
      }
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
    supplierId: "",  // Add empty supplier fields to match type
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
