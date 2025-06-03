import { supabase } from "@/integrations/supabase/client";
import { Product } from "../types";
import { createLogEntry } from "./logService";

export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("name");
  
  if (error) throw error;
  
  return data.map(product => ({
    id: product.id,
    name: product.name,
    description: product.description,
    unitOfMeasure: product.unit_of_measure,
    weightFactor: product.weight_factor === null ? undefined : product.weight_factor,
    feculaConversionFactor: product.fecula_conversion_factor === null ? undefined : product.fecula_conversion_factor,
    productionPredictionFactor: product.production_prediction_factor === null ? undefined : product.production_prediction_factor,
    conservantConversionFactor: product.conservant_conversion_factor === null ? undefined : product.conservant_conversion_factor,
    conservantUsageFactor: product.conservant_usage_factor === null ? undefined : product.conservant_usage_factor,
    type: product.type === null ? undefined : product.type,
    notes: product.notes === null ? undefined : product.notes,
    createdAt: new Date(product.created_at),
    updatedAt: new Date(product.updated_at)
  }));
};

export const createProduct = async (
  product: Omit<Product, "id" | "createdAt" | "updatedAt">,
  userId?: string,
  userDisplayName?: string
): Promise<Product> => {
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: product.name,
      description: product.description,
      unit_of_measure: product.unitOfMeasure,
      weight_factor: product.weightFactor,
      fecula_conversion_factor: product.feculaConversionFactor,
      production_prediction_factor: product.productionPredictionFactor,
      conservant_conversion_factor: product.conservantConversionFactor,
      conservant_usage_factor: product.conservantUsageFactor,
      type: product.type,
      notes: product.notes
    })
    .select()
    .single();

  if (error) throw error;
  const newProduct = {
    ...product,
    id: data.id,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };

  await createLogEntry({
    user_id: userId,
    user_description: userDisplayName,
    action_type: "CREATE",
    entity_type: "products",
    entity_id: newProduct.id,
    details: { message: `Produto '${newProduct.name}' (ID: ${newProduct.id}) criado.`, data: newProduct }
  });

  return newProduct;
};

export const updateProduct = async (
  id: string,
  product: Partial<Product>,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  const updates: { [key: string]: any } = {};
  if (product.name !== undefined) updates.name = product.name;
  if (product.description !== undefined) updates.description = product.description;
  if (product.unitOfMeasure !== undefined) updates.unit_of_measure = product.unitOfMeasure;
  if (product.weightFactor !== undefined) updates.weight_factor = product.weightFactor;
  if (product.feculaConversionFactor !== undefined) updates.fecula_conversion_factor = product.feculaConversionFactor;
  if (product.productionPredictionFactor !== undefined) updates.production_prediction_factor = product.productionPredictionFactor;
  if (product.conservantConversionFactor !== undefined) updates.conservant_conversion_factor = product.conservantConversionFactor;
  if (product.conservantUsageFactor !== undefined) updates.conservant_usage_factor = product.conservantUsageFactor;
  if (product.type !== undefined) updates.type = product.type;
  if (product.notes !== undefined) updates.notes = product.notes;

  if (Object.keys(updates).length === 0) {
    console.log("UpdateProduct: Nenhuma alteração fornecida para o produto ID:", id);
    return;
  }

  const { error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id);

  if (error) throw error;

  await createLogEntry({
    user_id: userId,
    user_description: userDisplayName,
    action_type: "UPDATE",
    entity_type: "products",
    entity_id: id,
    details: { message: `Produto (ID: ${id}) atualizado.`, changes: updates }
  });
};

export const deleteProduct = async (id: string, userId?: string, userDisplayName?: string): Promise<void> => {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) throw error;

  await createLogEntry({
    user_id: userId,
    user_description: userDisplayName,
    action_type: "DELETE",
    entity_type: "products",
    entity_id: id,
    details: { message: `Produto (ID: ${id}) excluído.` }
  });
};
