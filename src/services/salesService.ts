
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
    
    // Insert sale items
    for (const item of sale.items) {
      const { error: itemError } = await supabase
        .from("sale_items")
        .insert({
          sale_id: saleId,
          product_id: item.productId,
          produced_item_id: item.producedItemId,
          quantity: item.quantity,
          unit_of_measure: item.unitOfMeasure
        });
      
      if (itemError) throw itemError;
      
      // Update produced item remaining quantity
      // Get current remaining quantity
      const { data: producedItemData, error: fetchError } = await supabase
        .from("produced_items")
        .select("remaining_quantity")
        .eq("id", item.producedItemId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Calculate new remaining quantity
      const newRemainingQty = producedItemData.remaining_quantity - item.quantity;
      
      if (newRemainingQty < 0) {
        throw new Error(`Not enough quantity in produced item. Available: ${producedItemData.remaining_quantity}, Requested: ${item.quantity}`);
      }
      
      // Update the produced item
      const { error: updateError } = await supabase
        .from("produced_items")
        .update({ remaining_quantity: newRemainingQty })
        .eq("id", item.producedItemId);
      
      if (updateError) throw updateError;
    }
    
    // Commit the transaction
    await endTransaction();
    
    // Return the complete sale
    return {
      ...sale,
      id: saleId,
      createdAt: new Date(),
      updatedAt: new Date()
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
};

export const deleteSale = async (id: string): Promise<void> => {
  try {
    // Start a transaction
    await beginTransaction();
    
    // Get the sale items to restore produced item quantities
    const { data: saleItemsData, error: getSaleItemsError } = await supabase
      .from("sale_items")
      .select("*")
      .eq("sale_id", id);
    
    if (getSaleItemsError) throw getSaleItemsError;
    
    // Restore remaining quantities
    for (const item of saleItemsData) {
      // Get current remaining quantity
      const { data: producedItemData, error: fetchError } = await supabase
        .from("produced_items")
        .select("remaining_quantity")
        .eq("id", item.produced_item_id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Calculate new remaining quantity
      const newRemainingQty = producedItemData.remaining_quantity + item.quantity;
      
      // Update the produced item
      const { error: updateError } = await supabase
        .from("produced_items")
        .update({ remaining_quantity: newRemainingQty })
        .eq("id", item.produced_item_id);
      
      if (updateError) throw updateError;
    }
    
    // Delete sale items
    const { error: saleItemsError } = await supabase
      .from("sale_items")
      .delete()
      .eq("sale_id", id);
    
    if (saleItemsError) throw saleItemsError;
    
    // Delete the sale
    const { error } = await supabase
      .from("sales")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    
    // Commit the transaction
    await endTransaction();
  } catch (error) {
    // Rollback on error
    await abortTransaction();
    throw error;
  }
};
