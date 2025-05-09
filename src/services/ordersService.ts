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
    await beginTransaction();
    console.log(`Deleting order with ID: ${id}`);
    
    // First, get all order items for this order
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id);
    
    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
      await abortTransaction();
      throw itemsError;
    }
    
    console.log(`Found ${orderItems?.length || 0} order items to process`);
    
    // For each order item, check if there are material batches that need to be deleted
    for (const item of orderItems || []) {
      console.log(`Processing order item: ${item.id} for material: ${item.material_id}, batch: ${item.batch_number}`);
      
      // Check if material batches from this order are being used in any production
      // Using a better approach for the query
      const { data: materialBatches } = await supabase
        .from("material_batches")
        .select("id")
        .eq("material_id", item.material_id)
        .eq("batch_number", item.batch_number);
        
      if (!materialBatches || materialBatches.length === 0) {
        console.log("No material batches found for this order item");
        continue;
      }
      
      const batchIds = materialBatches.map(batch => batch.id);
      
      // Check if any of these batches are used in production
      const { data: usedMaterials } = await supabase
        .from("used_materials")
        .select("material_batch_id")
        .in("material_batch_id", batchIds);
      
      if (usedMaterials && usedMaterials.length > 0) {
        console.log(`Material batch is being used in production. Cannot delete material batches.`);
        // Skip deleting material batches that are being used
      } else {
        console.log(`No usage found for material batches. Safe to delete.`);
        // Delete material batches that are not being used
        const { error: deleteBatchError } = await supabase
          .from("material_batches")
          .delete()
          .in("id", batchIds);
        
        if (deleteBatchError) {
          console.error("Error deleting material batches:", deleteBatchError);
          // Continue deleting other items even if this one fails
        }
      }
    }
    
    // Delete all order items
    const { error: deleteItemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", id);
    
    if (deleteItemsError) {
      console.error("Error deleting order items:", deleteItemsError);
      await abortTransaction();
      throw deleteItemsError;
    }
    
    // Finally, delete the order itself
    const { error: deleteOrderError } = await supabase
      .from("orders")
      .delete()
      .eq("id", id);
    
    if (deleteOrderError) {
      console.error("Error deleting order:", deleteOrderError);
      await abortTransaction();
      throw deleteOrderError;
    }
    
    console.log("Order deletion completed successfully");
    await endTransaction();
  } catch (error) {
    console.error("Error in deleteOrder:", error);
    await abortTransaction();
    throw error;
  }
};
