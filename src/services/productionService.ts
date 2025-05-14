
import { supabase } from "@/integrations/supabase/client";
import { ProductionBatch, ProducedItem, UsedMaterial } from "../types";
import { beginTransaction, endTransaction, abortTransaction } from "./base/supabaseClient";

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
  batch: Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">
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
    
    // Insert used materials and update material batch quantities
    for (const material of batch.usedMaterials) {
      const { error: materialError } = await supabase
        .from("used_materials")
        .insert({
          production_batch_id: batchData.id,
          material_batch_id: material.materialBatchId,
          quantity: material.quantity,
          unit_of_measure: material.unitOfMeasure
        });
      
      if (materialError) {
        await abortTransaction();
        throw materialError;
      }
      
      // FIXED: Manually update the remaining_quantity in material_batches
      // Get current remaining quantity first
      const { data: materialBatchData, error: fetchError } = await supabase
        .from("material_batches")
        .select("remaining_quantity")
        .eq("id", material.materialBatchId)
        .single();
      
      if (fetchError) {
        console.error("Error fetching material batch data:", fetchError);
        await abortTransaction();
        throw fetchError;
      }
      
      // Calculate new remaining quantity 
      const newRemainingQty = materialBatchData.remaining_quantity - material.quantity;
      
      // Update the material batch with the new remaining quantity
      const { error: updateError } = await supabase
        .from("material_batches")
        .update({ remaining_quantity: newRemainingQty })
        .eq("id", material.materialBatchId);
      
      if (updateError) {
        console.error("Error updating material batch quantity:", updateError);
        await abortTransaction();
        throw updateError;
      }
    }
    
    await endTransaction();
    
    // Return the created batch with all relations
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
  batch: Partial<ProductionBatch>
): Promise<void> => {
  try {
    await beginTransaction();

    const updates: any = {};

    if (batch.batchNumber) updates.batch_number = batch.batchNumber;
    if (batch.productionDate) updates.production_date = batch.productionDate.toISOString();
    if (batch.mixDay) updates.mix_day = batch.mixDay;
    if (batch.mixCount) updates.mix_count = batch.mixCount;
    if (batch.notes !== undefined) updates.notes = batch.notes;

    // Update the production batch
    const { error: batchError } = await supabase
      .from("production_batches")
      .update(updates)
      .eq("id", id);

    if (batchError) {
      await abortTransaction();
      throw batchError;
    }

    // Update produced items - enhanced to handle quantity updates
    if (batch.producedItems && batch.producedItems.length > 0) {
      for (const item of batch.producedItems) {
        // If quantity changed, update the remaining quantity accordingly
        let remainingQuantity = item.remainingQuantity;
        
        // If quantity changed, calculate new remaining quantity
        if (item.quantity !== undefined) {
          // First get the original item to compare quantities
          const { data: originalItem, error: getItemError } = await supabase
            .from("produced_items")
            .select("quantity, remaining_quantity")
            .eq("id", item.id)
            .single();
            
          if (getItemError) {
            await abortTransaction();
            throw getItemError;
          }
          
          // Calculate the difference between new and old quantity
          const quantityDiff = item.quantity - originalItem.quantity;
          
          // Adjust remaining quantity by the same amount as the quantity change
          remainingQuantity = originalItem.remaining_quantity + quantityDiff;
        }
        
        const { error: itemError } = await supabase
          .from("produced_items")
          .update({
            product_id: item.productId,
            quantity: item.quantity,
            unit_of_measure: item.unitOfMeasure,
            batch_number: item.batchNumber,
            remaining_quantity: remainingQuantity
          })
          .eq("id", item.id);

        if (itemError) {
          await abortTransaction();
          throw itemError;
        }
      }
    }

    // Update used materials
    if (batch.usedMaterials && batch.usedMaterials.length > 0) {
      for (const material of batch.usedMaterials) {
        // First check if the quantity is going to change
        if (material.quantity !== undefined) {
          // Get the original material usage record
          const { data: originalUsage, error: getUsageError } = await supabase
            .from("used_materials")
            .select("quantity, material_batch_id")
            .eq("id", material.id)
            .single();
            
          if (getUsageError) {
            await abortTransaction();
            throw getUsageError;
          }
          
          // Calculate the difference in quantity
          const quantityDiff = material.quantity - originalUsage.quantity;
          
          // Get current material batch data
          const { data: materialBatch, error: batchError } = await supabase
            .from("material_batches")
            .select("remaining_quantity")
            .eq("id", originalUsage.material_batch_id)
            .single();
            
          if (batchError) {
            await abortTransaction();
            throw batchError;
          }
          
          // If we're increasing usage, decrease the remaining quantity in material batch
          // If we're decreasing usage, increase the remaining quantity in material batch
          const newRemainingQuantity = materialBatch.remaining_quantity - quantityDiff;
          
          // Update the material batch remaining quantity
          const { error: updateBatchError } = await supabase
            .from("material_batches")
            .update({ remaining_quantity: newRemainingQuantity })
            .eq("id", originalUsage.material_batch_id);
            
          if (updateBatchError) {
            await abortTransaction();
            throw updateBatchError;
          }
        }
        
        // Update the used material record
        const { error: materialError } = await supabase
          .from("used_materials")
          .update({
            material_batch_id: material.materialBatchId,
            quantity: material.quantity,
            unit_of_measure: material.unitOfMeasure
          })
          .eq("id", material.id);

        if (materialError) {
          await abortTransaction();
          throw materialError;
        }
      }
    }

    await endTransaction();
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

export const deleteProductionBatch = async (id: string): Promise<void> => {
  try {
    await beginTransaction();

    // Get all used materials for this production batch
    const { data: usedMaterials, error: usedMaterialsError } = await supabase
      .from("used_materials")
      .select("*")
      .eq("production_batch_id", id);

    if (usedMaterialsError) {
      await abortTransaction();
      throw usedMaterialsError;
    }

    // Return materials to inventory
    for (const material of usedMaterials) {
      // Get current remaining quantity
      const { data: materialBatch, error: fetchError } = await supabase
        .from("material_batches")
        .select("remaining_quantity")
        .eq("id", material.material_batch_id)
        .single();
      
      if (fetchError) {
        await abortTransaction();
        throw fetchError;
      }
      
      // Update the material batch to return the quantity
      const newRemainingQuantity = materialBatch.remaining_quantity + material.quantity;
      
      const { error: updateError } = await supabase
        .from("material_batches")
        .update({ remaining_quantity: newRemainingQuantity })
        .eq("id", material.material_batch_id);
      
      if (updateError) {
        await abortTransaction();
        throw updateError;
      }
    }

    // Delete produced items
    const { error: producedItemsError } = await supabase
      .from("produced_items")
      .delete()
      .eq("production_batch_id", id);

    if (producedItemsError) {
      await abortTransaction();
      throw producedItemsError;
    }

    // Delete used materials
    const { error: usedMaterialsDeleteError } = await supabase
      .from("used_materials")
      .delete()
      .eq("production_batch_id", id);

    if (usedMaterialsDeleteError) {
      await abortTransaction();
      throw usedMaterialsDeleteError;
    }

    // Delete the production batch
    const { error: batchError } = await supabase
      .from("production_batches")
      .delete()
      .eq("id", id);

    if (batchError) {
      await abortTransaction();
      throw batchError;
    }

    await endTransaction();
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
