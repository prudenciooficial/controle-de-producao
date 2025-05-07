
import { supabase } from "@/integrations/supabase/client";
import { 
  Product, 
  Material, 
  Supplier, 
  MaterialBatch,
  ProductionBatch,
  Sale,
  Order,
  Loss,
  ProducedItem,
  UsedMaterial,
  SaleItem,
  OrderItem
} from "@/types";

// Convert Supabase timestamp strings to Date objects for our app
const convertTimestamps = <T extends { created_at?: string; updated_at?: string }>(item: T) => {
  return {
    ...item,
    createdAt: item.created_at ? new Date(item.created_at) : new Date(),
    updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
  };
};

// Product Services
export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase.from('products').select('*');
  
  if (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
  
  return data.map(product => ({
    id: product.id,
    name: product.name,
    code: product.code,
    description: product.description || undefined,
    unitOfMeasure: product.unit_of_measure,
    createdAt: new Date(product.created_at),
    updatedAt: new Date(product.updated_at)
  }));
};

export const createProduct = async (product: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<Product> => {
  const { data, error } = await supabase.from('products').insert({
    name: product.name,
    code: product.code,
    description: product.description,
    unit_of_measure: product.unitOfMeasure
  }).select().single();
  
  if (error) {
    console.error("Error creating product:", error);
    throw error;
  }
  
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    description: data.description || undefined,
    unitOfMeasure: data.unit_of_measure,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateProduct = async (id: string, product: Partial<Product>): Promise<void> => {
  const updateData: any = {};
  
  if (product.name !== undefined) updateData.name = product.name;
  if (product.code !== undefined) updateData.code = product.code;
  if (product.description !== undefined) updateData.description = product.description;
  if (product.unitOfMeasure !== undefined) updateData.unit_of_measure = product.unitOfMeasure;
  
  const { error } = await supabase.from('products').update(updateData).eq('id', id);
  
  if (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  
  if (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

// Material Services
export const fetchMaterials = async (): Promise<Material[]> => {
  const { data, error } = await supabase.from('materials').select('*');
  
  if (error) {
    console.error("Error fetching materials:", error);
    throw error;
  }
  
  return data.map(material => ({
    id: material.id,
    name: material.name,
    code: material.code,
    type: material.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro",
    unitOfMeasure: material.unit_of_measure,
    description: material.description || undefined,
    createdAt: new Date(material.created_at),
    updatedAt: new Date(material.updated_at)
  }));
};

// Adding new CRUD operations for materials
export const createMaterial = async (material: Omit<Material, "id" | "createdAt" | "updatedAt">): Promise<Material> => {
  const { data, error } = await supabase.from('materials').insert({
    name: material.name,
    code: material.code,
    type: material.type,
    unit_of_measure: material.unitOfMeasure,
    description: material.description
  }).select().single();
  
  if (error) {
    console.error("Error creating material:", error);
    throw error;
  }
  
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    type: data.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro",
    unitOfMeasure: data.unit_of_measure,
    description: data.description || undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateMaterial = async (id: string, material: Partial<Material>): Promise<void> => {
  const updateData: any = {};
  
  if (material.name !== undefined) updateData.name = material.name;
  if (material.code !== undefined) updateData.code = material.code;
  if (material.type !== undefined) updateData.type = material.type;
  if (material.unitOfMeasure !== undefined) updateData.unit_of_measure = material.unitOfMeasure;
  if (material.description !== undefined) updateData.description = material.description;
  
  const { error } = await supabase.from('materials').update(updateData).eq('id', id);
  
  if (error) {
    console.error("Error updating material:", error);
    throw error;
  }
};

export const deleteMaterial = async (id: string): Promise<void> => {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  
  if (error) {
    console.error("Error deleting material:", error);
    throw error;
  }
};

// Supplier Services
export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase.from('suppliers').select('*');
  
  if (error) {
    console.error("Error fetching suppliers:", error);
    throw error;
  }
  
  return data.map(supplier => ({
    id: supplier.id,
    name: supplier.name,
    code: supplier.code,
    contacts: supplier.contacts || undefined,
    notes: supplier.notes || undefined,
    createdAt: new Date(supplier.created_at),
    updatedAt: new Date(supplier.updated_at)
  }));
};

// Adding new CRUD operations for suppliers
export const createSupplier = async (supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">): Promise<Supplier> => {
  const { data, error } = await supabase.from('suppliers').insert({
    name: supplier.name,
    code: supplier.code,
    contacts: supplier.contacts,
    notes: supplier.notes
  }).select().single();
  
  if (error) {
    console.error("Error creating supplier:", error);
    throw error;
  }
  
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    contacts: data.contacts || undefined,
    notes: data.notes || undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateSupplier = async (id: string, supplier: Partial<Supplier>): Promise<void> => {
  const updateData: any = {};
  
  if (supplier.name !== undefined) updateData.name = supplier.name;
  if (supplier.code !== undefined) updateData.code = supplier.code;
  if (supplier.contacts !== undefined) updateData.contacts = supplier.contacts;
  if (supplier.notes !== undefined) updateData.notes = supplier.notes;
  
  const { error } = await supabase.from('suppliers').update(updateData).eq('id', id);
  
  if (error) {
    console.error("Error updating supplier:", error);
    throw error;
  }
};

export const deleteSupplier = async (id: string): Promise<void> => {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  
  if (error) {
    console.error("Error deleting supplier:", error);
    throw error;
  }
};

// Material Batches Services
export const fetchMaterialBatches = async (): Promise<MaterialBatch[]> => {
  const { data, error } = await supabase
    .from('material_batches')
    .select(`
      *,
      materials(name, type)
    `);
  
  if (error) {
    console.error("Error fetching material batches:", error);
    throw error;
  }
  
  return data.map(batch => ({
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
    hasReport: batch.has_report || false,
    createdAt: new Date(batch.created_at),
    updatedAt: new Date(batch.updated_at)
  }));
};

// Production Batch Services
export const fetchProductionBatches = async (): Promise<ProductionBatch[]> => {
  try {
    // Fetch production batches
    const { data: batchesData, error: batchesError } = await supabase
      .from('production_batches')
      .select('*')
      .order('production_date', { ascending: false });
    
    if (batchesError) throw batchesError;
    if (!batchesData) return [];
    
    // Map over each batch to fetch its produced items and used materials
    const batchesWithDetails = await Promise.all(batchesData.map(async (batch) => {
      // Fetch produced items for this batch
      const { data: producedItemsData, error: producedItemsError } = await supabase
        .from('produced_items')
        .select(`
          *,
          products(name)
        `)
        .eq('production_batch_id', batch.id);
      
      if (producedItemsError) throw producedItemsError;
      
      // Fetch used materials for this batch
      const { data: usedMaterialsData, error: usedMaterialsError } = await supabase
        .from('used_materials')
        .select(`
          *,
          material_batches(id, material_id),
          material_batches.materials:material_id(name, type)
        `)
        .eq('production_batch_id', batch.id);
      
      if (usedMaterialsError) throw usedMaterialsError;
      
      // Map produced items to our app's format
      const producedItems: ProducedItem[] = (producedItemsData || []).map(item => ({
        id: item.id,
        productId: item.product_id,
        productName: item.products?.name || "Unknown Product",
        quantity: item.quantity,
        unitOfMeasure: item.unit_of_measure,
        batchNumber: item.batch_number,
        remainingQuantity: item.remaining_quantity
      }));
      
      // Map used materials to our app's format
      const usedMaterials: UsedMaterial[] = (usedMaterialsData || []).map(material => ({
        id: material.id,
        materialBatchId: material.material_batch_id,
        materialName: material.material_batches?.materials?.name || "Unknown Material",
        materialType: material.material_batches?.materials?.type || "Unknown Type",
        batchNumber: "Unknown Batch", // This would need to be fetched from material_batches if stored there
        quantity: material.quantity,
        unitOfMeasure: material.unit_of_measure
      }));
      
      // Return the complete production batch
      return {
        id: batch.id,
        batchNumber: batch.batch_number,
        productionDate: new Date(batch.production_date),
        mixDay: batch.mix_day,
        mixCount: batch.mix_count,
        notes: batch.notes || undefined,
        producedItems: producedItems,
        usedMaterials: usedMaterials,
        createdAt: new Date(batch.created_at),
        updatedAt: new Date(batch.updated_at)
      };
    }));
    
    return batchesWithDetails;
  } catch (error) {
    console.error("Error fetching production batches:", error);
    throw error;
  }
};

// Add more services for other entities
