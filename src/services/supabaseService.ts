import { supabase } from "@/integrations/supabase/client";
import { 
  Product, 
  Material, 
  Supplier, 
  MaterialBatch,
  ProductionBatch,
  Sale,
  Order,
  Loss,
  ProducedItem,
  UsedMaterial,
  SaleItem,
  OrderItem
} from "@/types";

// Convert Supabase timestamp strings to Date objects for our app
const convertTimestamps = <T extends { created_at?: string; updated_at?: string }>(item: T) => {
  return {
    ...item,
    createdAt: item.created_at ? new Date(item.created_at) : new Date(),
    updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(),
  };
};

// Product Services
export const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase.from('products').select('*');
  
  if (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
  
  return data.map(product => ({
    id: product.id,
    name: product.name,
    code: product.code,
    description: product.description || undefined,
    unitOfMeasure: product.unit_of_measure,
    createdAt: new Date(product.created_at),
    updatedAt: new Date(product.updated_at)
  }));
};

export const createProduct = async (product: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<Product> => {
  const { data, error } = await supabase.from('products').insert({
    name: product.name,
    code: product.code,
    description: product.description,
    unit_of_measure: product.unitOfMeasure
  }).select().single();
  
  if (error) {
    console.error("Error creating product:", error);
    throw error;
  }
  
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    description: data.description || undefined,
    unitOfMeasure: data.unit_of_measure,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateProduct = async (id: string, product: Partial<Product>): Promise<void> => {
  const updateData: any = {};
  
  if (product.name !== undefined) updateData.name = product.name;
  if (product.code !== undefined) updateData.code = product.code;
  if (product.description !== undefined) updateData.description = product.description;
  if (product.unitOfMeasure !== undefined) updateData.unit_of_measure = product.unitOfMeasure;
  
  const { error } = await supabase.from('products').update(updateData).eq('id', id);
  
  if (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  
  if (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

// Material Services
export const fetchMaterials = async (): Promise<Material[]> => {
  const { data, error } = await supabase.from('materials').select('*');
  
  if (error) {
    console.error("Error fetching materials:", error);
    throw error;
  }
  
  return data.map(material => ({
    id: material.id,
    name: material.name,
    code: material.code,
    type: material.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro",
    unitOfMeasure: material.unit_of_measure,
    description: material.description || undefined,
    createdAt: new Date(material.created_at),
    updatedAt: new Date(material.updated_at)
  }));
};

// Adding new CRUD operations for materials
export const createMaterial = async (material: Omit<Material, "id" | "createdAt" | "updatedAt">): Promise<Material> => {
  const { data, error } = await supabase.from('materials').insert({
    name: material.name,
    code: material.code,
    type: material.type,
    unit_of_measure: material.unitOfMeasure,
    description: material.description
  }).select().single();
  
  if (error) {
    console.error("Error creating material:", error);
    throw error;
  }
  
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    type: data.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro",
    unitOfMeasure: data.unit_of_measure,
    description: data.description || undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateMaterial = async (id: string, material: Partial<Material>): Promise<void> => {
  const updateData: any = {};
  
  if (material.name !== undefined) updateData.name = material.name;
  if (material.code !== undefined) updateData.code = material.code;
  if (material.type !== undefined) updateData.type = material.type;
  if (material.unitOfMeasure !== undefined) updateData.unit_of_measure = material.unitOfMeasure;
  if (material.description !== undefined) updateData.description = material.description;
  
  const { error } = await supabase.from('materials').update(updateData).eq('id', id);
  
  if (error) {
    console.error("Error updating material:", error);
    throw error;
  }
};

export const deleteMaterial = async (id: string): Promise<void> => {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  
  if (error) {
    console.error("Error deleting material:", error);
    throw error;
  }
};

// Supplier Services
export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase.from('suppliers').select('*');
  
  if (error) {
    console.error("Error fetching suppliers:", error);
    throw error;
  }
  
  return data.map(supplier => ({
    id: supplier.id,
    name: supplier.name,
    code: supplier.code,
    contacts: supplier.contacts || undefined,
    notes: supplier.notes || undefined,
    createdAt: new Date(supplier.created_at),
    updatedAt: new Date(supplier.updated_at)
  }));
};

// Adding new CRUD operations for suppliers
export const createSupplier = async (supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">): Promise<Supplier> => {
  const { data, error } = await supabase.from('suppliers').insert({
    name: supplier.name,
    code: supplier.code,
    contacts: supplier.contacts,
    notes: supplier.notes
  }).select().single();
  
  if (error) {
    console.error("Error creating supplier:", error);
    throw error;
  }
  
  return {
    id: data.id,
    name: data.name,
    code: data.code,
    contacts: data.contacts || undefined,
    notes: data.notes || undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateSupplier = async (id: string, supplier: Partial<Supplier>): Promise<void> => {
  const updateData: any = {};
  
  if (supplier.name !== undefined) updateData.name = supplier.name;
  if (supplier.code !== undefined) updateData.code = supplier.code;
  if (supplier.contacts !== undefined) updateData.contacts = supplier.contacts;
  if (supplier.notes !== undefined) updateData.notes = supplier.notes;
  
  const { error } = await supabase.from('suppliers').update(updateData).eq('id', id);
  
  if (error) {
    console.error("Error updating supplier:", error);
    throw error;
  }
};

export const deleteSupplier = async (id: string): Promise<void> => {
  const { error } = await supabase.from('suppliers').delete().eq('id', id);
  
  if (error) {
    console.error("Error deleting supplier:", error);
    throw error;
  }
};

// Material Batches Services
export const fetchMaterialBatches = async (): Promise<MaterialBatch[]> => {
  const { data, error } = await supabase
    .from('material_batches')
    .select(`
      *,
      materials(name, type)
    `);
  
  if (error) {
    console.error("Error fetching material batches:", error);
    throw error;
  }
  
  return data.map(batch => ({
    id: batch.id,
    materialId: batch.material_id,
    materialName: batch.materials?.name || "",
    materialType: batch.materials?.type || "",
    batchNumber: batch.batch_number,
    quantity: batch.quantity,
    suppliedQuantity: batch.supplied_quantity,
    remainingQuantity: batch.remaining_quantity,
    unitOfMeasure: batch.unit_of_measure,
    expiryDate: batch.expiry_date ? new Date(batch.expiry_date) : undefined,
    hasReport: batch.has_report || false,
    createdAt: new Date(batch.created_at),
    updatedAt: new Date(batch.updated_at)
  }));
};

// Production Batch Services
export const fetchProductionBatches = async (): Promise<ProductionBatch[]> => {
  try {
    // Fetch production batches
    const { data: batchesData, error: batchesError } = await supabase
      .from('production_batches')
      .select('*')
      .order('production_date', { ascending: false });
    
    if (batchesError) throw batchesError;
    if (!batchesData) return [];
    
    // Map over each batch to fetch its produced items and used materials
    const batchesWithDetails = await Promise.all(batchesData.map(async (batch) => {
      // Fetch produced items for this batch
      const { data: producedItemsData, error: producedItemsError } = await supabase
        .from('produced_items')
        .select(`
          *,
          products(name)
        `)
        .eq('production_batch_id', batch.id);
      
      if (producedItemsError) throw producedItemsError;
      
      // Fetch used materials for this batch with proper join syntax
      const { data: usedMaterialsData, error: usedMaterialsError } = await supabase
        .from('used_materials')
        .select(`
          *,
          material_batches!inner(
            *,
            materials!inner(name, type)
          )
        `)
        .eq('production_batch_id', batch.id);
      
      if (usedMaterialsError) throw usedMaterialsError;
      
      // Map produced items to our app's format
      const producedItems: ProducedItem[] = (producedItemsData || []).map(item => ({
        id: item.id,
        productId: item.product_id,
        productName: item.products?.name || "Unknown Product",
        quantity: item.quantity,
        unitOfMeasure: item.unit_of_measure,
        batchNumber: item.batch_number,
        remainingQuantity: item.remaining_quantity
      }));
      
      // Map used materials to our app's format with corrected access pattern
      const usedMaterials: UsedMaterial[] = (usedMaterialsData || []).map(material => ({
        id: material.id,
        materialBatchId: material.material_batch_id,
        materialName: material.material_batches.materials.name || "Unknown Material",
        materialType: material.material_batches.materials.type || "Unknown Type",
        batchNumber: "Unknown Batch", // This would need to be fetched from material_batches if stored there
        quantity: material.quantity,
        unitOfMeasure: material.unit_of_measure
      }));
      
      // Return the complete production batch
      return {
        id: batch.id,
        batchNumber: batch.batch_number,
        productionDate: new Date(batch.production_date),
        mixDay: batch.mix_day,
        mixCount: batch.mix_count,
        notes: batch.notes || undefined,
        producedItems: producedItems,
        usedMaterials: usedMaterials,
        createdAt: new Date(batch.created_at),
        updatedAt: new Date(batch.updated_at)
      };
    }));
    
    return batchesWithDetails;
  } catch (error) {
    console.error("Error fetching production batches:", error);
    throw error;
  }
};

// Order Services
export const fetchOrders = async (): Promise<Order[]> => {
  try {
    // Fetch orders
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        suppliers(name)
      `)
      .order('date', { ascending: false });
    
    if (ordersError) throw ordersError;
    if (!ordersData) return [];
    
    // Map over each order to fetch its items
    const ordersWithItems = await Promise.all(ordersData.map(async (order) => {
      // Fetch order items
      const { data: orderItemsData, error: orderItemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          materials!inner(name, type)
        `)
        .eq('order_id', order.id);
      
      if (orderItemsError) throw orderItemsError;
      
      // Map order items to our app's format
      const orderItems: OrderItem[] = (orderItemsData || []).map(item => ({
        id: item.id,
        materialId: item.material_id,
        materialName: item.materials.name,
        materialType: item.materials.type,
        quantity: item.quantity,
        unitOfMeasure: item.unit_of_measure,
        batchNumber: item.batch_number,
        expiryDate: item.expiry_date ? new Date(item.expiry_date) : undefined,
        hasReport: item.has_report || false
      }));
      
      // Return the complete order
      return {
        id: order.id,
        date: new Date(order.date),
        invoiceNumber: order.invoice_number,
        supplierId: order.supplier_id,
        supplierName: order.suppliers?.name || "Unknown Supplier",
        notes: order.notes || undefined,
        items: orderItems,
        createdAt: new Date(order.created_at),
        updatedAt: new Date(order.updated_at)
      };
    }));
    
    return ordersWithItems;
  } catch (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }
};

export const createOrder = async (order: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> => {
  try {
    // Start a transaction
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        date: order.date.toISOString(),
        invoice_number: order.invoiceNumber,
        supplier_id: order.supplierId,
        notes: order.notes
      })
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    // Insert order items
    const orderItemsToInsert = order.items.map(item => ({
      order_id: orderData.id,
      material_id: item.materialId,
      quantity: item.quantity,
      unit_of_measure: item.unitOfMeasure,
      batch_number: item.batchNumber,
      expiry_date: item.expiryDate?.toISOString(),
      has_report: item.hasReport
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert);
    
    if (itemsError) throw itemsError;
    
    // Return the created order with its items
    return {
      ...order,
      id: orderData.id,
      createdAt: new Date(orderData.created_at),
      updatedAt: new Date(orderData.updated_at)
    };
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  }
};

export const updateOrder = async (id: string, order: Partial<Order>): Promise<void> => {
  try {
    const updateData: any = {};
    
    if (order.date !== undefined) updateData.date = order.date.toISOString();
    if (order.invoiceNumber !== undefined) updateData.invoice_number = order.invoiceNumber;
    if (order.supplierId !== undefined) updateData.supplier_id = order.supplierId;
    if (order.notes !== undefined) updateData.notes = order.notes;
    
    const { error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    // If order items are provided, update them as well
    if (order.items && order.items.length > 0) {
      // For simplicity, we'll delete existing items and insert new ones
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id);
      
      if (deleteError) throw deleteError;
      
      const orderItemsToInsert = order.items.map(item => ({
        order_id: id,
        material_id: item.materialId,
        quantity: item.quantity,
        unit_of_measure: item.unitOfMeasure,
        batch_number: item.batchNumber,
        expiry_date: item.expiryDate?.toISOString(),
        has_report: item.hasReport
      }));
      
      const { error: insertError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);
      
      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error("Error updating order:", error);
    throw error;
  }
};

export const deleteOrder = async (id: string): Promise<void> => {
  try {
    // Delete associated order items first
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', id);
    
    if (itemsError) throw itemsError;
    
    // Delete the order
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting order:", error);
    throw error;
  }
};

// Sales Services
export const fetchSales = async (): Promise<Sale[]> => {
  try {
    // Fetch sales
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false });
    
    if (salesError) throw salesError;
    if (!salesData) return [];
    
    // Map over each sale to fetch its items
    const salesWithItems = await Promise.all(salesData.map(async (sale) => {
      // Fetch sale items
      const { data: saleItemsData, error: saleItemsError } = await supabase
        .from('sale_items')
        .select(`
          *,
          products!inner(name)
        `)
        .eq('sale_id', sale.id);
      
      if (saleItemsError) throw saleItemsError;
      
      // Map sale items to our app's format
      const saleItems: SaleItem[] = (saleItemsData || []).map(item => ({
        id: item.id,
        productId: item.product_id,
        productName: item.products.name,
        producedItemId: item.produced_item_id,
        batchNumber: "Unknown Batch", // This would need to be fetched from produced_items if stored there
        quantity: item.quantity,
        unitOfMeasure: item.unit_of_measure
      }));
      
      // Return the complete sale
      return {
        id: sale.id,
        date: new Date(sale.date),
        invoiceNumber: sale.invoice_number,
        customerName: sale.customer_name,
        type: sale.type as "Venda" | "Doação" | "Descarte" | "Devolução" | "Outro",
        notes: sale.notes || undefined,
        items: saleItems,
        createdAt: new Date(sale.created_at),
        updatedAt: new Date(sale.updated_at)
      };
    }));
    
    return salesWithItems;
  } catch (error) {
    console.error("Error fetching sales:", error);
    throw error;
  }
};

export const createSale = async (sale: Omit<Sale, "id" | "createdAt" | "updatedAt">): Promise<Sale> => {
  try {
    // Insert sale
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        date: sale.date.toISOString(),
        invoice_number: sale.invoiceNumber,
        customer_name: sale.customerName,
        type: sale.type,
        notes: sale.notes
      })
      .select()
      .single();
    
    if (saleError) throw saleError;
    
    // Insert sale items
    const saleItemsToInsert = sale.items.map(item => ({
      sale_id: saleData.id,
      product_id: item.productId,
      produced_item_id: item.producedItemId,
      quantity: item.quantity,
      unit_of_measure: item.unitOfMeasure
    }));
    
    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItemsToInsert);
    
    if (itemsError) throw itemsError;
    
    // Return the created sale with its items
    return {
      ...sale,
      id: saleData.id,
      createdAt: new Date(saleData.created_at),
      updatedAt: new Date(saleData.updated_at)
    };
  } catch (error) {
    console.error("Error creating sale:", error);
    throw error;
  }
};

export const updateSale = async (id: string, sale: Partial<Sale>): Promise<void> => {
  try {
    const updateData: any = {};
    
    if (sale.date !== undefined) updateData.date = sale.date.toISOString();
    if (sale.invoiceNumber !== undefined) updateData.invoice_number = sale.invoiceNumber;
    if (sale.customerName !== undefined) updateData.customer_name = sale.customerName;
    if (sale.type !== undefined) updateData.type = sale.type;
    if (sale.notes !== undefined) updateData.notes = sale.notes;
    
    const { error } = await supabase
      .from('sales')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    // If sale items are provided, update them as well
    if (sale.items && sale.items.length > 0) {
      // For simplicity, we'll delete existing items and insert new ones
      const { error: deleteError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', id);
      
      if (deleteError) throw deleteError;
      
      const saleItemsToInsert = sale.items.map(item => ({
        sale_id: id,
        product_id: item.productId,
        produced_item_id: item.producedItemId,
        quantity: item.quantity,
        unit_of_measure: item.unitOfMeasure
      }));
      
      const { error: insertError } = await supabase
        .from('sale_items')
        .insert(saleItemsToInsert);
      
      if (insertError) throw insertError;
    }
  } catch (error) {
    console.error("Error updating sale:", error);
    throw error;
  }
};

export const deleteSale = async (id: string): Promise<void> => {
  try {
    // Delete associated sale items first
    const { error: itemsError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', id);
    
    if (itemsError) throw itemsError;
    
    // Delete the sale
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting sale:", error);
    throw error;
  }
};

// Losses Services
export const fetchLosses = async (): Promise<Loss[]> => {
  try {
    const { data, error } = await supabase
      .from('losses')
      .select(`
        *,
        production_batches(batch_number)
      `)
      .order('date', { ascending: false });
    
    if (error) throw error;
    if (!data) return [];
    
    return data.map(loss => ({
      id: loss.id,
      date: new Date(loss.date),
      productionBatchId: loss.production_batch_id,
      batchNumber: loss.production_batches?.batch_number || "Unknown Batch",
      machine: loss.machine as "Moinho" | "Mexedor" | "Tombador" | "Embaladora" | "Outro",
      quantity: loss.quantity,
      unitOfMeasure: loss.unit_of_measure,
      productType: loss.product_type as "Goma" | "Fécula" | "Embalagem" | "Sorbato" | "Produto Acabado" | "Outro",
      notes: loss.notes || undefined,
      createdAt: new Date(loss.created_at),
      updatedAt: new Date(loss.updated_at)
    }));
  } catch (error) {
    console.error("Error fetching losses:", error);
    throw error;
  }
};

export const createLoss = async (loss: Omit<Loss, "id" | "createdAt" | "updatedAt">): Promise<Loss> => {
  try {
    const { data, error } = await supabase
      .from('losses')
      .insert({
        date: loss.date.toISOString(),
        production_batch_id: loss.productionBatchId,
        machine: loss.machine,
        quantity: loss.quantity,
        unit_of_measure: loss.unitOfMeasure,
        product_type: loss.productType,
        notes: loss.notes
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      date: new Date(data.date),
      productionBatchId: data.production_batch_id,
      batchNumber: loss.batchNumber, // We use the provided batch number since we don't fetch it in this operation
      machine: data.machine as "Moinho" | "Mexedor" | "Tombador" | "Embaladora" | "Outro",
      quantity: data.quantity,
      unitOfMeasure: data.unit_of_measure,
      productType: data.product_type as "Goma" | "Fécula" | "Embalagem" | "Sorbato" | "Produto Acabado" | "Outro",
      notes: data.notes || undefined,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  } catch (error) {
    console.error("Error creating loss:", error);
    throw error;
  }
};

export const updateLoss = async (id: string, loss: Partial<Loss>): Promise<void> => {
  try {
    const updateData: any = {};
    
    if (loss.date !== undefined) updateData.date = loss.date.toISOString();
    if (loss.productionBatchId !== undefined) updateData.production_batch_id = loss.productionBatchId;
    if (loss.machine !== undefined) updateData.machine = loss.machine;
    if (loss.quantity !== undefined) updateData.quantity = loss.quantity;
    if (loss.unitOfMeasure !== undefined) updateData.unit_of_measure = loss.unitOfMeasure;
    if (loss.productType !== undefined) updateData.product_type = loss.productType;
    if (loss.notes !== undefined) updateData.notes = loss.notes;
    
    const { error } = await supabase
      .from('losses')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error updating loss:", error);
    throw error;
  }
};

export const deleteLoss = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('losses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting loss:", error);
    throw error;
  }
};

// Production Batch additional CRUD operations
export const createProductionBatch = async (batch: Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">): Promise<ProductionBatch> => {
  try {
    // Insert production batch
    const { data: batchData, error: batchError } = await supabase
      .from('production_batches')
      .insert({
        batch_number: batch.batchNumber,
        production_date: batch.productionDate.toISOString(),
        mix_day: batch.mixDay,
        mix_count: batch.mixCount,
        notes: batch.notes
      })
      .select()
      .single();
    
    if (batchError) throw batchError;
    
    // Insert produced items
    const producedItemsToInsert = batch.producedItems.map(item => ({
      production_batch_id: batchData.id,
      product_id: item.productId,
      quantity: item.quantity,
      remaining_quantity: item.remainingQuantity,
      unit_of_measure: item.unitOfMeasure,
      batch_number: item.batchNumber
    }));
    
    const { error: itemsError } = await supabase
      .from('produced_items')
      .insert(producedItemsToInsert);
    
    if (itemsError) throw itemsError;
    
    // Insert used materials
    const usedMaterialsToInsert = batch.usedMaterials.map(material => ({
      production_batch_id: batchData.id,
      material_batch_id: material.materialBatchId,
      quantity: material.quantity,
      unit_of_measure: material.unitOfMeasure
    }));
    
    const { error: materialsError } = await supabase
      .from('used_materials')
      .insert(usedMaterialsToInsert);
    
    if (materialsError) throw materialsError;
    
    // Return the created batch
    return {
      ...batch,
      id: batchData.id,
      createdAt: new Date(batchData.created_at),
      updatedAt: new Date(batchData.updated_at)
    };
  } catch (error) {
    console.error("Error creating production batch:", error);
    throw error;
  }
};

export const updateProductionBatch = async (id: string, batch: Partial<ProductionBatch>): Promise<void> => {
  try {
    const updateData: any = {};
    
    if (batch.batchNumber !== undefined) updateData.batch_number = batch.batchNumber;
    if (batch.productionDate !== undefined) updateData.production_date = batch.productionDate.toISOString();
    if (batch.mixDay !== undefined) updateData.mix_day = batch.mixDay;
    if (batch.mixCount !== undefined) updateData.mix_count = batch.mixCount;
    if (batch.notes !== undefined) updateData.notes = batch.notes;
    
    const { error } = await supabase
      .from('production_batches')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
    
    // If produced items are provided, update them
    if (batch.producedItems && batch.producedItems.length > 0) {
      // For simplicity, we'll delete existing items and insert new ones
      const { error: deleteItemsError } = await supabase
        .from('produced_items')
        .delete()
        .eq('production_batch_id', id);
      
      if (deleteItemsError) throw deleteItemsError;
      
      const producedItemsToInsert = batch.producedItems.map(item => ({
        production_batch_id: id,
        product_id: item.productId,
        quantity: item.quantity,
        remaining_quantity: item.remainingQuantity,
        unit_of_measure: item.unitOfMeasure,
        batch_number: item.batchNumber
      }));
      
      const { error: insertItemsError } = await supabase
        .from('produced_items')
        .insert(producedItemsToInsert);
      
      if (insertItemsError) throw insertItemsError;
    }
    
    // If used materials are provided, update them
    if (batch.usedMaterials && batch.usedMaterials.length > 0) {
      // For simplicity, we'll delete existing materials and insert new ones
      const { error: deleteMaterialsError } = await supabase
        .from('used_materials')
        .delete()
        .eq('production_batch_id', id);
      
      if (deleteMaterialsError) throw deleteMaterialsError;
      
      const usedMaterialsToInsert = batch.usedMaterials.map(material => ({
        production_batch_id: id,
        material_batch_id: material.materialBatchId,
        quantity: material.quantity,
        unit_of_measure: material.unitOfMeasure
      }));
      
      const { error: insertMaterialsError } = await supabase
        .from('used_materials')
        .insert(usedMaterialsToInsert);
      
      if (insertMaterialsError) throw insertMaterialsError;
    }
  } catch (error) {
    console.error("Error updating production batch:", error);
    throw error;
  }
};

export const deleteProductionBatch = async (id: string): Promise<void> => {
  try {
    // Delete associated produced items
    const { error: producedItemsError } = await supabase
      .from('produced_items')
      .delete()
      .eq('production_batch_id', id);
    
    if (producedItemsError) throw producedItemsError;
    
    // Delete associated used materials
    const { error: usedMaterialsError } = await supabase
      .from('used_materials')
      .delete()
      .eq('production_batch_id', id);
    
    if (usedMaterialsError) throw usedMaterialsError;
    
    // Delete the production batch
    const { error } = await supabase
      .from('production_batches')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting production batch:", error);
    throw error;
  }
};

// Material Batch additional CRUD operations
export const createMaterialBatch = async (batch: Omit<MaterialBatch, "id" | "createdAt" | "updatedAt" | "materialName" | "materialType">): Promise<MaterialBatch> => {
  try {
    // Get material name and type
    const { data: materialData, error: materialError } = await supabase
      .from('materials')
      .select('name, type')
      .eq('id', batch.materialId)
      .single();
    
    if (materialError) throw materialError;
    
    // Insert material batch
    const { data, error } = await supabase
      .from('material_batches')
      .insert({
        material_id: batch.materialId,
        batch_number: batch.batchNumber,
        quantity: batch.quantity,
        supplied_quantity: batch.suppliedQuantity,
        remaining_quantity: batch.remainingQuantity,
        unit_of_measure: batch.unitOfMeasure,
        expiry_date: batch.expiryDate?.toISOString(),
        has_report: batch.hasReport
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      materialId: data.material_id,
      materialName: materialData.name,
      materialType: materialData.type,
      batchNumber: data.batch_number,
      quantity: data.quantity,
      suppliedQuantity: data.supplied_quantity,
      remainingQuantity: data.remaining_quantity,
      unitOfMeasure: data.unit_of_measure,
      expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined,
      hasReport: data.has_report || false,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  } catch (error) {
    console.error("Error creating material batch:", error);
    throw error;
  }
};

export const updateMaterialBatch = async (id: string, batch: Partial<Omit<MaterialBatch, "materialName" | "materialType">>): Promise<void> => {
  try {
    const updateData: any = {};
    
    if (batch.materialId !== undefined) updateData.material_id = batch.materialId;
    if (batch.batchNumber !== undefined) updateData.batch_number = batch.batchNumber;
    if (batch.quantity !== undefined) updateData.quantity = batch.quantity;
    if (batch.suppliedQuantity !== undefined) updateData.supplied_quantity = batch.suppliedQuantity;
    if (batch.remainingQuantity !== undefined) updateData.remaining_quantity = batch.remainingQuantity;
    if (batch.unitOfMeasure !== undefined) updateData.unit_of_measure = batch.unitOfMeasure;
    if (batch.expiryDate !== undefined) updateData.expiry_date = batch.expiryDate.toISOString();
    if (batch.hasReport !== undefined) updateData.has_report = batch.hasReport;
    
    const { error } = await supabase
      .from('material_batches')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error updating material batch:", error);
    throw error;
  }
};

export const deleteMaterialBatch = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('material_batches')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting material batch:", error);
    throw error;
  }
};
