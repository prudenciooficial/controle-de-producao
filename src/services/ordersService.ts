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

export const createOrder = async (
  order: Omit<Order, "id" | "createdAt" | "updatedAt">
): Promise<Order> => {
  try {
    // Start a transaction
    await beginTransaction();
    
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
    
    // Insert order items only - removed manual material_batches insertion 
    // since this is handled by the database trigger
    for (const item of order.items) {
      // Insert order item
      const { error: itemError } = await supabase
        .from("order_items")
        .insert({
          order_id: orderId,
          material_id: item.materialId,
          quantity: item.quantity,
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
};

export const deleteOrder = async (id: string): Promise<void> => {
  try {
    console.log("Beginning deletion process for order:", id);
    
    // Start a transaction
    await beginTransaction();
    console.log("Transaction started");
    
    // Get the order items to find related material batches
    const { data: orderItemsData, error: getOrderItemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id);
    
    if (getOrderItemsError) {
      console.error("Error getting order items:", getOrderItemsError);
      await abortTransaction();
      throw getOrderItemsError;
    }
    
    console.log(`Found ${orderItemsData?.length || 0} order items to process`);
    
    // Delete material batches related to this order
    for (const item of orderItemsData || []) {
      console.log(`Processing order item: ${item.id} for material: ${item.material_id}, batch: ${item.batch_number}`);
      
      try {
        // Find and delete material batches with matching material_id and batch_number
        const { error: materialBatchError } = await supabase
          .from("material_batches")
          .delete()
          .eq("material_id", item.material_id)
          .eq("batch_number", item.batch_number);
        
        if (materialBatchError) {
          console.error("Error deleting material batch:", materialBatchError);
          await abortTransaction();
          throw materialBatchError;
        }
        
        console.log(`Successfully deleted material batch for material: ${item.material_id}, batch: ${item.batch_number}`);
      } catch (itemError) {
        console.error(`Error processing order item ${item.id}:`, itemError);
        await abortTransaction();
        throw itemError;
      }
    }
    
    console.log("Material batches deleted, now deleting order items");
    
    // Delete order items
    const { error: orderItemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", id);
    
    if (orderItemsError) {
      console.error("Error deleting order items:", orderItemsError);
      await abortTransaction();
      throw orderItemsError;
    }
    
    console.log("Order items deleted, now deleting the order");
    
    // Delete the order
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Error deleting order:", error);
      await abortTransaction();
      throw error;
    }
    
    console.log("Order deleted successfully, committing transaction");
    
    // Commit the transaction
    await endTransaction();
    console.log("Transaction committed successfully");
    
    return;
  } catch (error) {
    // Rollback on error
    console.error("Error in delete order operation, rolling back:", error);
    try {
      await abortTransaction();
      console.log("Transaction aborted successfully");
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }
    throw error;
  }
};
