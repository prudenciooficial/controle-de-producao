
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

// Add other services as needed (production batches, sales, orders, losses)
// This approach allows us to work with Supabase without modifying the read-only types.ts file

// These are just the core services - you can expand this file as needed with additional CRUD operations
