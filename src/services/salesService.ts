
import { supabase } from "@/integrations/supabase/client";
import { Sale, SaleItem } from "../types";
import { beginTransaction, endTransaction, abortTransaction } from "./base/supabaseClient";

export const fetchSales = async (): Promise<Sale[]> => {
  // First, fetch the sales
  const { data: salesData, error: salesError } = await supabase
    .from("sales")
    .select("*")
    .order("date", { ascending: false });
  
  if (salesError) throw salesError;
  
  // Create an array to store complete sales
  const sales: Sale[] = [];
  
  // For each sale, fetch sale items
  for (const sale of salesData) {
    // Fetch sale items for this sale
    const { data: saleItemsData, error: saleItemsError } = await supabase
      .from("sale_items")
      .select(`
        *,
        products:product_id (
          name
        ),
        produced_items:produced_item_id (
          batch_number
        )
      `)
      .eq("sale_id", sale.id);
    
    if (saleItemsError) throw saleItemsError;
    
    // Format sale items
    const items: SaleItem[] = saleItemsData.map(item => ({
      id: item.id,
      productId: item.product_id,
      productName: item.products.name,
      producedItemId: item.produced_item_id,
      batchNumber: item.produced_items.batch_number,
      quantity: item.quantity,
      unitOfMeasure: item.unit_of_measure
    }));
    
    // Add the complete sale to the array
    sales.push({
      id: sale.id,
      date: new Date(sale.date),
      invoiceNumber: sale.invoice_number,
      customerName: sale.customer_name,
      type: sale.type as "Venda" | "Doação" | "Descarte" | "Devolução" | "Outro",
      notes: sale.notes,
      items,
      createdAt: new Date(sale.created_at),
      updatedAt: new Date(sale.updated_at)
    });
  }
  
  return sales;
};

export const createSale = async (
  sale: Omit<Sale, "id" | "createdAt" | "updatedAt">
): Promise<Sale> => {
  try {
    // Start a transaction
    await beginTransaction();
    
    // Insert the sale
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert({
        date: sale.date instanceof Date ? sale.date.toISOString() : sale.date,
        invoice_number: sale.invoiceNumber,
        customer_name: sale.customerName,
        type: sale.type,
        notes: sale.notes
      })
      .select()
      .single();
    
    if (saleError) throw saleError;
    
    const saleId = saleData.id;
    
    // Insert sale items - let Supabase generate the IDs
    for (const item of sale.items) {
      // Insert each sale item individually, removing the ID field to let Supabase generate it
      const itemToInsert = {
        sale_id: saleId,
        product_id: item.productId,
        produced_item_id: item.producedItemId,
        quantity: item.quantity,
        unit_of_measure: item.unitOfMeasure
      };
      
      const { error: itemError } = await supabase
        .from("sale_items")
        .insert(itemToInsert);
      
      if (itemError) throw itemError;
    }
    
    // Commit the transaction
    await endTransaction();
    
    // Fetch the inserted sale items to get their IDs
    const { data: insertedItems, error: fetchItemsError } = await supabase
      .from("sale_items")
      .select(`
        *,
        products:product_id (name),
        produced_items:produced_item_id (batch_number)
      `)
      .eq("sale_id", saleId);
    
    if (fetchItemsError) throw fetchItemsError;
    
    // Map the inserted items to our SaleItem type
    const items: SaleItem[] = insertedItems.map(item => ({
      id: item.id,
      productId: item.product_id,
      productName: item.products.name,
      producedItemId: item.produced_item_id,
      batchNumber: item.produced_items.batch_number,
      quantity: item.quantity,
      unitOfMeasure: item.unit_of_measure
    }));
    
    // Return the complete sale with correctly generated IDs
    return {
      ...sale,
      id: saleId,
      items,
      createdAt: new Date(saleData.created_at),
      updatedAt: new Date(saleData.updated_at)
    };
  } catch (error) {
    // Rollback on error
    await abortTransaction();
    throw error;
  }
};

export const updateSale = async (
  id: string,
  sale: Partial<Sale>
): Promise<void> => {
  try {
    await beginTransaction();
    
    // Update basic sale info
    const updates: any = {};
    
    if (sale.date) {
      updates.date = sale.date instanceof Date ? sale.date.toISOString() : sale.date;
    }
    if (sale.invoiceNumber) updates.invoice_number = sale.invoiceNumber;
    if (sale.customerName) updates.customer_name = sale.customerName;
    if (sale.type) updates.type = sale.type;
    if (sale.notes !== undefined) updates.notes = sale.notes;
    
    const { error } = await supabase
      .from("sales")
      .update(updates)
      .eq("id", id);
    
    if (error) throw error;
    
    // If there are items to update
    if (sale.items && sale.items.length > 0) {
      console.log(`Updating ${sale.items.length} sale items`);
      
      // First, get current items to compare
      const { data: currentItems, error: fetchError } = await supabase
        .from("sale_items")
        .select(`
          *,
          produced_items:produced_item_id (remaining_quantity)
        `)
        .eq("sale_id", id);
      
      if (fetchError) throw fetchError;
      
      // Check which items need to be updated, which need to be deleted, and which are new
      const currentItemIds = new Set(currentItems?.map(item => item.id) || []);
      const updatedItemIds = new Set(sale.items.filter(item => item.id).map(item => item.id));
      
      // Items to delete: exist in current but not in updated
      const itemsToDelete = currentItems?.filter(item => !updatedItemIds.has(item.id)) || [];
      
      // Items to update: exist in both
      const itemsToUpdate = sale.items.filter(item => item.id && currentItemIds.has(item.id));
      
      // Items to add: exist in updated but not in current
      const itemsToAdd = sale.items.filter(item => !item.id || !currentItemIds.has(item.id));
      
      console.log(`Deleting ${itemsToDelete.length} items, updating ${itemsToUpdate.length} items, adding ${itemsToAdd.length} items`);
      
      // Process deletions
      for (const item of itemsToDelete) {
        // Restore the quantity to the produced item
        const { error: restoreError } = await supabase
          .from("produced_items")
          .update({
            remaining_quantity: item.produced_items.remaining_quantity + item.quantity
          })
          .eq("id", item.produced_item_id);
        
        if (restoreError) throw restoreError;
        
        // Now delete the sale item
        const { error: deleteError } = await supabase
          .from("sale_items")
          .delete()
          .eq("id", item.id);
        
        if (deleteError) throw deleteError;
      }
      
      // Process updates
      for (const itemUpdate of itemsToUpdate) {
        if (!itemUpdate.id) continue; // Safety check
        
        // Find the original item to calculate quantity difference
        const originalItem = currentItems?.find(ci => ci.id === itemUpdate.id);
        
        if (originalItem) {
          const quantityDiff = itemUpdate.quantity - originalItem.quantity;
          
          if (quantityDiff !== 0) {
            // Update the produced item's remaining quantity
            const { data: producedItem, error: fetchProducedError } = await supabase
              .from("produced_items")
              .select("remaining_quantity")
              .eq("id", itemUpdate.producedItemId || originalItem.produced_item_id)
              .single();
            
            if (fetchProducedError) throw fetchProducedError;
            
            const newRemainingQty = producedItem.remaining_quantity - quantityDiff;
            
            // Check if we have enough remaining quantity
            if (newRemainingQty < 0) {
              throw new Error(`Não há quantidade suficiente disponível para o produto ${itemUpdate.productName || 'selecionado'}`);
            }
            
            // Update the produced item
            const { error: updateProducedError } = await supabase
              .from("produced_items")
              .update({ remaining_quantity: newRemainingQty })
              .eq("id", itemUpdate.producedItemId || originalItem.produced_item_id);
            
            if (updateProducedError) throw updateProducedError;
          }
          
          // Update the sale item
          const { error: updateError } = await supabase
            .from("sale_items")
            .update({
              product_id: itemUpdate.productId || originalItem.product_id,
              produced_item_id: itemUpdate.producedItemId || originalItem.produced_item_id,
              quantity: itemUpdate.quantity,
              unit_of_measure: itemUpdate.unitOfMeasure
            })
            .eq("id", itemUpdate.id);
          
          if (updateError) throw updateError;
        }
      }
      
      // Process additions
      for (const itemToAdd of itemsToAdd) {
        // Check if we have enough remaining quantity
        const { data: producedItem, error: fetchProducedError } = await supabase
          .from("produced_items")
          .select("remaining_quantity")
          .eq("id", itemToAdd.producedItemId)
          .single();
        
        if (fetchProducedError) throw fetchProducedError;
        
        const newRemainingQty = producedItem.remaining_quantity - itemToAdd.quantity;
        
        // Check if we have enough remaining quantity
        if (newRemainingQty < 0) {
          throw new Error(`Não há quantidade suficiente disponível para o produto ${itemToAdd.productName || 'selecionado'}`);
        }
        
        // Update the produced item
        const { error: updateProducedError } = await supabase
          .from("produced_items")
          .update({ remaining_quantity: newRemainingQty })
          .eq("id", itemToAdd.producedItemId);
        
        if (updateProducedError) throw updateProducedError;
        
        // Add the new sale item
        const { error: insertError } = await supabase
          .from("sale_items")
          .insert({
            sale_id: id,
            product_id: itemToAdd.productId,
            produced_item_id: itemToAdd.producedItemId,
            quantity: itemToAdd.quantity,
            unit_of_measure: itemToAdd.unitOfMeasure
          });
        
        if (insertError) throw insertError;
      }
    }
    
    await endTransaction();
  } catch (error) {
    // Rollback on error
    await abortTransaction();
    throw error;
  }
};

export const deleteSale = async (id: string): Promise<void> => {
  // The system is freezing during deletion, so let's add some error handling and improve the transaction flow
  try {
    console.log("Beginning deletion process for sale:", id);
    
    // Start a transaction
    await beginTransaction();
    console.log("Transaction started");
    
    // Get the sale items to restore produced item quantities
    const { data: saleItemsData, error: getSaleItemsError } = await supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", id);
    
    if (getSaleItemsError) {
      console.error("Error getting sale items:", getSaleItemsError);
      await abortTransaction();
      throw getSaleItemsError;
    }
    
    console.log(`Found ${saleItemsData?.length || 0} sale items to process`);
    
    // Restore remaining quantities
    for (const item of saleItemsData || []) {
      console.log(`Processing item: ${item.id} for produced item: ${item.produced_item_id}`);
      try {
        // Get current remaining quantity
        const { data: producedItemData, error: fetchError } = await supabase
          .from("produced_items")
          .select("remaining_quantity")
          .eq("id", item.produced_item_id)
          .single();
        
        if (fetchError) {
          console.error("Error fetching produced item data:", fetchError);
          await abortTransaction();
          throw fetchError;
        }
        
        if (!producedItemData) {
          console.error("No produced item data found for:", item.produced_item_id);
          await abortTransaction();
          throw new Error(`No data found for produced item: ${item.produced_item_id}`);
        }
        
        console.log(`Current remaining quantity: ${producedItemData.remaining_quantity}, Adding back: ${item.quantity}`);
        
        // Calculate new remaining quantity
        const newRemainingQty = producedItemData.remaining_quantity + item.quantity;
        
        console.log(`New remaining quantity will be: ${newRemainingQty}`);
        
        // Update the produced item
        const { error: updateError } = await supabase
          .from("produced_items")
          .update({ remaining_quantity: newRemainingQty })
          .eq("id", item.produced_item_id);
        
        if (updateError) {
          console.error("Error updating produced item quantity:", updateError);
          await abortTransaction();
          throw updateError;
        }
        
        console.log(`Successfully updated remaining quantity for: ${item.produced_item_id}`);
      } catch (itemError) {
        console.error(`Error processing sale item ${item.id}:`, itemError);
        await abortTransaction();
        throw itemError;
      }
    }
    
    console.log("All produced item quantities updated, now deleting sale items");
    
    // Delete sale items
    const { error: saleItemsError } = await supabase
      .from("sale_items")
      .delete()
      .eq("sale_id", id);
    
    if (saleItemsError) {
      console.error("Error deleting sale items:", saleItemsError);
      await abortTransaction();
      throw saleItemsError;
    }
    
    console.log("Sale items deleted, now deleting the sale");
    
    // Delete the sale
    const { error } = await supabase
      .from("sales")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Error deleting sale:", error);
      await abortTransaction();
      throw error;
    }
    
    console.log("Sale deleted successfully, committing transaction");
    
    // Commit the transaction
    await endTransaction();
    console.log("Transaction committed successfully");
  } catch (error) {
    // Rollback on error
    console.error("Error in delete sale operation, rolling back:", error);
    try {
      await abortTransaction();
      console.log("Transaction aborted successfully");
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    throw error;
  }
};
