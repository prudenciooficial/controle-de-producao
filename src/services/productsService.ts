import { supabase } from "@/integrations/supabase/client";
import { Product } from "../types";
import { logSystemEvent } from "./logService";

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
  userId?: string | null,
  userDisplayName?: string | null
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

  await logSystemEvent({
    userId: userId,
    userDisplayName: userDisplayName,
    actionType: 'CREATE',
    entityTable: 'products',
    entityId: data.id,
    newData: data
  });

  return {
    ...data,
    id: data.id,
    name: data.name,
    description: data.description,
    unitOfMeasure: data.unit_of_measure,
    weightFactor: data.weight_factor === null ? undefined : data.weight_factor,
    feculaConversionFactor: data.fecula_conversion_factor === null ? undefined : data.fecula_conversion_factor,
    productionPredictionFactor: data.production_prediction_factor === null ? undefined : data.production_prediction_factor,
    conservantConversionFactor: data.conservant_conversion_factor === null ? undefined : data.conservant_conversion_factor,
    conservantUsageFactor: data.conservant_usage_factor === null ? undefined : data.conservant_usage_factor,
    type: data.type === null ? undefined : data.type,
    notes: data.notes === null ? undefined : data.notes,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateProduct = async (
  id: string,
  product: Partial<Product>,
  userId?: string | null,
  userDisplayName?: string | null
): Promise<void> => {
  let productBeforeUpdate: any = { id };
  try {
    const { data: fetchedProduct, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchedProduct) {
      productBeforeUpdate = fetchedProduct;
    } else if (fetchError) {
      console.warn(`Produto (ID: ${id}) não encontrado antes da atualização, ou erro ao buscar: ${fetchError.message}`);
    }

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

    const { error: updateError } = await supabase
      .from("products")
      .update(updates)
      .eq("id", id);

    if (updateError) throw updateError;

    await logSystemEvent({
      userId: userId,
      userDisplayName: userDisplayName,
      actionType: 'UPDATE',
      entityTable: 'products',
      entityId: id,
      oldData: productBeforeUpdate,
      newData: { id, ...updates }
    });
  } catch (error) {
    console.error(`Erro ao atualizar produto (ID: ${id}):`, error);
    throw error;
  }
};

export const deleteProduct = async (id: string, userId?: string | null, userDisplayName?: string | null): Promise<void> => {
  let productToDeleteForLog: any = { id };

  try {
    const { data: fetchedProduct, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchedProduct) {
      productToDeleteForLog = fetchedProduct;
    } else if (fetchError) {
      console.warn(`Produto (ID: ${id}) não encontrado antes da deleção, ou erro ao buscar: ${fetchError.message}`);
    }

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (deleteError) {
      throw deleteError;
    }

    await logSystemEvent({
      userId: userId,
      userDisplayName: userDisplayName,
      actionType: 'DELETE',
      entityTable: 'products',
      entityId: id,
      oldData: productToDeleteForLog
    });
  } catch (error) {
    console.error(`Erro ao deletar produto (ID: ${id}):`, error);
    throw error;
  }
};
