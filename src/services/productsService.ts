
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
    feculaConversionFactor: product.fecula_conversion_factor || 25, // Default to 25
    productionPredictionFactor: product.production_prediction_factor || 5, // Default to 5
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
      weight_factor: product.weightFactor || 1, // Default to 1 if not set
      fecula_conversion_factor: product.feculaConversionFactor || 25, // Default to 25
      production_prediction_factor: product.productionPredictionFactor || 5 // Default to 5
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
    feculaConversionFactor: data.fecula_conversion_factor || 25,
    productionPredictionFactor: data.production_prediction_factor || 5,
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
  if (product.code !== undefined) updates.code = product.code;
  if (product.description !== undefined) updates.description = product.description;
  if (product.unitOfMeasure) updates.unit_of_measure = product.unitOfMeasure;
  if (product.weightFactor !== undefined) updates.weight_factor = product.weightFactor;
  if (product.feculaConversionFactor !== undefined) updates.fecula_conversion_factor = product.feculaConversionFactor;
  if (product.productionPredictionFactor !== undefined) updates.production_prediction_factor = product.productionPredictionFactor;
  
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
