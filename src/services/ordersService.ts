import { supabase } from "@/integrations/supabase/client";
import { Order, OrderItem } from "../types";
import { beginTransaction, endTransaction, abortTransaction } from "./base/supabaseClient";

export const fetchOrders = async (): Promise<Order[]> => {
  // First, fetch the orders
  const { data: ordersData, error: ordersError } = await supabase
    .from("orders")
    .select(`
      *,
      suppliers:supplier_id (
        name
      )
    `)
    .order("date", { ascending: false });
  
  if (ordersError) throw ordersError;
  
  // Create an array to store complete orders
  const orders: Order[] = [];
  
  // For each order, fetch order items
  for (const order of ordersData) {
    // Fetch order items for this order
    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from("order_items")
      .select(`
        *,
        materials:material_id (
          name, type
        )
      `)
      .eq("order_id", order.id);
    
    if (orderItemsError) throw orderItemsError;
    
    // Format order items
    const items: OrderItem[] = orderItemsData.map(item => ({
      id: item.id,
      materialId: item.material_id,
      materialName: item.materials.name,
      materialType: item.materials.type,
      quantity: item.quantity,
      unitOfMeasure: item.unit_of_measure,
      batchNumber: item.batch_number,
      expiryDate: item.expiry_date ? new Date(item.expiry_date) : undefined,
      hasReport: item.has_report
    }));
    
    // Add the complete order to the array
    orders.push({
      id: order.id,
      date: new Date(order.date),
      invoiceNumber: order.invoice_number,
      supplierId: order.supplier_id,
      supplierName: order.suppliers.name,
      notes: order.notes,
      items,
      createdAt: new Date(order.created_at),
      updatedAt: new Date(order.updated_at)
    });
  }
  
  return orders;
};

// Helper function to get conservant conversion factor
const getConservantConversionFactor = async (): Promise<number> => {
  const { data, error } = await supabase
    .from("products")
    .select("conservant_conversion_factor")
    .limit(1)
    .single();
  
  if (error) {
    console.warn("Could not fetch conservant conversion factor, using default:", error);
    return 1; // Default factor
  }
  
  return data.conservant_conversion_factor || 1;
};

export const createOrder = async (
  order: Omit<Order, "id" | "createdAt" | "updatedAt">
): Promise<Order> => {
  try {
    // Start a transaction
    await beginTransaction();
    
    // Get conservant conversion factor
    const conservantFactor = await getConservantConversionFactor();
    
    // Insert the order
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .insert({
        date: order.date instanceof Date ? order.date.toISOString() : order.date,
        invoice_number: order.invoiceNumber,
        supplier_id: order.supplierId,
        notes: order.notes
      })
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    const orderId = orderData.id;
    
    // Insert order items with automatic conservant conversion
    for (const item of order.items) {
      let adjustedQuantity = item.quantity;
      
      // Check if this is a conservant material and apply conversion
      if (item.materialType === "Conservante") {
        adjustedQuantity = item.quantity * conservantFactor;
        console.log(`Converting conservant: ${item.quantity} caixas × ${conservantFactor} = ${adjustedQuantity} kg`);
      }
      
      // Insert order item
      const { error: itemError } = await supabase
        .from("order_items")
        .insert({
          order_id: orderId,
          material_id: item.materialId,
          quantity: adjustedQuantity, // Use converted quantity for conservants
          unit_of_measure: item.unitOfMeasure,
          batch_number: item.batchNumber,
          expiry_date: item.expiryDate instanceof Date ? item.expiryDate.toISOString() : item.expiryDate,
          has_report: item.hasReport
        })
        .select()
        .single();
      
      if (itemError) throw itemError;
    }
    
    // Commit the transaction
    await endTransaction();
    
    // Return the complete order
    return {
      ...order,
      id: orderId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    // Rollback on error
    await abortTransaction();
    throw error;
  }
};

export const updateOrder = async (
  id: string,
  order: Partial<Order>
): Promise<void> => {
  try {
    // Start transaction
    await beginTransaction();
    
    // Update the order basic info
    const updates: any = {};
    
    if (order.date) {
      updates.date = order.date instanceof Date ? order.date.toISOString() : order.date;
    }
    if (order.invoiceNumber) updates.invoice_number = order.invoiceNumber;
    if (order.supplierId) updates.supplier_id = order.supplierId;
    if (order.notes !== undefined) updates.notes = order.notes;
    
    const { error } = await supabase
      .from("orders")
      .update(updates)
      .eq("id", id);
    
    if (error) throw error;
    
    // If there are items to update
    if (order.items && order.items.length > 0) {
      console.log(`Updating ${order.items.length} order items`);
      
      // First, get current items to compare
      const { data: currentItems, error: fetchError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id);
      
      if (fetchError) throw fetchError;
      
      // Check which items need to be updated, which need to be deleted, and which are new
      const currentItemIds = new Set(currentItems?.map(item => item.id) || []);
      const updatedItemIds = new Set(order.items.filter(item => item.id).map(item => item.id));
      
      // Items to delete: exist in current but not in updated
      const itemsToDelete = currentItems?.filter(item => !updatedItemIds.has(item.id)) || [];
      
      // Items to update: exist in both
      const itemsToUpdate = order.items.filter(item => item.id && currentItemIds.has(item.id));
      
      // Items to add: exist in updated but not in current
      const itemsToAdd = order.items.filter(item => !item.id || !currentItemIds.has(item.id));
      
      console.log(`Deleting ${itemsToDelete.length} items, updating ${itemsToUpdate.length} items, adding ${itemsToAdd.length} items`);
      
      // Process deletions
      for (const item of itemsToDelete) {
        // Now delete the order item
        const { error: deleteError } = await supabase
          .from("order_items")
          .delete()
          .eq("id", item.id);
        
        if (deleteError) throw deleteError;
      }
      
      // Get conservant conversion factor for updates and additions
      const conservantFactor = await getConservantConversionFactor();
      
      // Process updates
      for (const item of itemsToUpdate) {
        if (!item.id) continue; // Extra safety check
        
        let adjustedQuantity = item.quantity;
        // Check if this is a conservant material and apply conversion
        if (item.materialType === "Conservante") {
          adjustedQuantity = item.quantity * conservantFactor;
        }
        
        const { error: updateError } = await supabase
          .from("order_items")
          .update({
            material_id: item.materialId,
            quantity: adjustedQuantity,
            unit_of_measure: item.unitOfMeasure,
            batch_number: item.batchNumber,
            expiry_date: item.expiryDate instanceof Date ? item.expiryDate.toISOString() : item.expiryDate,
            has_report: item.hasReport
          })
          .eq("id", item.id);
        
        if (updateError) throw updateError;
      }
      
      // Process additions
      for (const item of itemsToAdd) {
        let adjustedQuantity = item.quantity;
        // Check if this is a conservant material and apply conversion
        if (item.materialType === "Conservante") {
          adjustedQuantity = item.quantity * conservantFactor;
        }
        
        const { error: insertError } = await supabase
          .from("order_items")
          .insert({
            order_id: id,
            material_id: item.materialId,
            quantity: adjustedQuantity,
            unit_of_measure: item.unitOfMeasure,
            batch_number: item.batchNumber,
            expiry_date: item.expiryDate instanceof Date ? item.expiryDate.toISOString() : item.expiryDate,
            has_report: item.hasReport
          });
        
        if (insertError) throw insertError;
      }
    }
    
    await endTransaction();
  } catch (error) {
    await abortTransaction();
    throw error;
  }
};

export const deleteOrder = async (id: string): Promise<void> => {
  try {
    // Start transaction
    await beginTransaction();

    // Delete all order items for this order first (se não houver ON DELETE CASCADE na FK de orders para order_items)
    // Se houver CASCADE, esta etapa é redundante mas não prejudicial.
    const { error: deleteItemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", id);

    if (deleteItemsError) {
      console.error("Error deleting order items:", deleteItemsError);
      await abortTransaction();
      throw deleteItemsError;
    }

    // Then delete the order itself
    const { error: deleteOrderError } = await supabase
      .from("orders")
      .delete()
      .eq("id", id);
    
    if (deleteOrderError) {
      console.error("Error deleting order:", deleteOrderError);
      await abortTransaction();
      throw deleteOrderError;
    }
    
    // Commit the transaction
    await endTransaction();
    
  } catch (error) {
    // Rollback on error
    await abortTransaction();
    console.error("Error in deleteOrder transaction:", error);
    throw error;
  }
};
