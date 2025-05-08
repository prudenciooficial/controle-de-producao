
import { supabase } from "@/integrations/supabase/client";
import { Product } from "../types";

export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");
  
  if (error) throw error;
  
  return data.map(product => ({
    ...product,
    id: product.id,
    name: product.name,
    code: product.code,
    description: product.description,
    unitOfMeasure: product.unit_of_measure,
    weightFactor: product.weight_factor || 1, // Default to 1 if not set
    createdAt: new Date(product.created_at),
    updatedAt: new Date(product.updated_at)
  }));
};

export const createProduct = async (
  product: Omit<Product, "id" | "createdAt" | "updatedAt">
): Promise<Product> => {
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: product.name,
      code: product.code,
      description: product.description,
      unit_of_measure: product.unitOfMeasure,
      weight_factor: product.weightFactor || 1 // Default to 1 if not set
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    ...data,
    id: data.id,
    name: data.name,
    code: data.code,
    description: data.description,
    unitOfMeasure: data.unit_of_measure,
    weightFactor: data.weight_factor || 1,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateProduct = async (
  id: string,
  product: Partial<Product>
): Promise<void> => {
  const updates: any = {};
  
  if (product.name) updates.name = product.name;
  if (product.code) updates.code = product.code;
  if (product.description !== undefined) updates.description = product.description;
  if (product.unitOfMeasure) updates.unit_of_measure = product.unitOfMeasure;
  if (product.weightFactor !== undefined) updates.weight_factor = product.weightFactor;
  
  const { error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
};

export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
};
