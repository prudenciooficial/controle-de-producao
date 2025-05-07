
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
  UsedMaterial,
  ProducedItem,
  SaleItem,
  OrderItem
} from "../types";

// Products
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
      unit_of_measure: product.unitOfMeasure
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
  if (product.code) updates.code = product.code;
  if (product.description !== undefined) updates.description = product.description;
  if (product.unitOfMeasure) updates.unit_of_measure = product.unitOfMeasure;
  
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

// Materials
export const fetchMaterials = async (): Promise<Material[]> => {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .order("name");
  
  if (error) throw error;
  
  return data.map(material => ({
    ...material,
    id: material.id,
    name: material.name,
    code: material.code,
    type: material.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro",
    unitOfMeasure: material.unit_of_measure,
    description: material.description,
    createdAt: new Date(material.created_at),
    updatedAt: new Date(material.updated_at)
  }));
};

export const createMaterial = async (
  material: Omit<Material, "id" | "createdAt" | "updatedAt">
): Promise<Material> => {
  const { data, error } = await supabase
    .from("materials")
    .insert({
      name: material.name,
      code: material.code,
      type: material.type,
      unit_of_measure: material.unitOfMeasure,
      description: material.description
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    ...data,
    id: data.id,
    name: data.name,
    code: data.code,
    type: data.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro",
    unitOfMeasure: data.unit_of_measure,
    description: data.description,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateMaterial = async (
  id: string,
  material: Partial<Material>
): Promise<void> => {
  const updates: any = {};
  
  if (material.name) updates.name = material.name;
  if (material.code) updates.code = material.code;
  if (material.type) updates.type = material.type;
  if (material.unitOfMeasure) updates.unit_of_measure = material.unitOfMeasure;
  if (material.description !== undefined) updates.description = material.description;
  
  const { error } = await supabase
    .from("materials")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
};

export const deleteMaterial = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
};

// Suppliers
export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");
  
  if (error) throw error;
  
  return data.map(supplier => ({
    ...supplier,
    id: supplier.id,
    name: supplier.name,
    code: supplier.code,
    contacts: supplier.contacts,
    notes: supplier.notes,
    createdAt: new Date(supplier.created_at),
    updatedAt: new Date(supplier.updated_at)
  }));
};

export const createSupplier = async (
  supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">
): Promise<Supplier> => {
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name: supplier.name,
      code: supplier.code,
      contacts: supplier.contacts,
      notes: supplier.notes
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    ...data,
    id: data.id,
    name: data.name,
    code: data.code,
    contacts: data.contacts,
    notes: data.notes,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateSupplier = async (
  id: string,
  supplier: Partial<Supplier>
): Promise<void> => {
  const updates: any = {};
  
  if (supplier.name) updates.name = supplier.name;
  if (supplier.code) updates.code = supplier.code;
  if (supplier.contacts !== undefined) updates.contacts = supplier.contacts;
  if (supplier.notes !== undefined) updates.notes = supplier.notes;
  
  const { error } = await supabase
    .from("suppliers")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
};

export const deleteSupplier = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
};

// Material Batches
export const fetchMaterialBatches = async (): Promise<MaterialBatch[]> => {
  const { data, error } = await supabase
    .from("material_batches")
    .select("*")
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  
  return data.map(batch => ({
    ...batch,
    id: batch.id,
    materialId: batch.material_id,
    materialName: "", // We need to fetch material name separately or join tables
    materialType: "", // We need to fetch material type separately or join tables
    batchNumber: batch.batch_number,
    quantity: batch.quantity,
    suppliedQuantity: batch.supplied_quantity,
    remainingQuantity: batch.remaining_quantity,
    unitOfMeasure: batch.unit_of_measure,
    expiryDate: batch.expiry_date ? new Date(batch.expiry_date) : undefined,
    hasReport: batch.has_report,
    createdAt: new Date(batch.created_at),
    updatedAt: new Date(batch.updated_at)
  }));
};

// Get Material Batches with Material names and types
export const fetchMaterialBatchesWithDetails = async (): Promise<MaterialBatch[]> => {
  const { data, error } = await supabase
    .from("material_batches")
    .select(`
      *,
      materials:material_id (
        name,
        type
      )
    `)
    .order("created_at", { ascending: false });
  
  if (error) throw error;
  
  return data.map(batch => ({
    ...batch,
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
    hasReport: batch.has_report,
    createdAt: new Date(batch.created_at),
    updatedAt: new Date(batch.updated_at)
  }));
};

export const createMaterialBatch = async (
  batch: Omit<MaterialBatch, "id" | "createdAt" | "updatedAt">
): Promise<MaterialBatch> => {
  const { data, error } = await supabase
    .from("material_batches")
    .insert({
      material_id: batch.materialId,
      batch_number: batch.batchNumber,
      quantity: batch.quantity,
      supplied_quantity: batch.suppliedQuantity,
      remaining_quantity: batch.remainingQuantity,
      unit_of_measure: batch.unitOfMeasure,
      expiry_date: batch.expiryDate instanceof Date ? batch.expiryDate.toISOString() : batch.expiryDate,
      has_report: batch.hasReport
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    ...data,
    id: data.id,
    materialId: data.material_id,
    materialName: batch.materialName,
    materialType: batch.materialType,
    batchNumber: data.batch_number,
    quantity: data.quantity,
    suppliedQuantity: data.supplied_quantity,
    remainingQuantity: data.remaining_quantity,
    unitOfMeasure: data.unit_of_measure,
    expiryDate: data.expiry_date ? new Date(data.expiry_date) : undefined,
    hasReport: data.has_report,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateMaterialBatch = async (
  id: string,
  batch: Partial<MaterialBatch>
): Promise<void> => {
  const updates: any = {};
  
  if (batch.materialId) updates.material_id = batch.materialId;
  if (batch.batchNumber) updates.batch_number = batch.batchNumber;
  if (batch.quantity !== undefined) updates.quantity = batch.quantity;
  if (batch.suppliedQuantity !== undefined) updates.supplied_quantity = batch.suppliedQuantity;
  if (batch.remainingQuantity !== undefined) updates.remaining_quantity = batch.remainingQuantity;
  if (batch.unitOfMeasure) updates.unit_of_measure = batch.unitOfMeasure;
  if (batch.expiryDate !== undefined) {
    updates.expiry_date = batch.expiryDate instanceof Date 
      ? batch.expiryDate.toISOString() 
      : batch.expiryDate;
  }
  if (batch.hasReport !== undefined) updates.has_report = batch.hasReport;
  
  const { error } = await supabase
    .from("material_batches")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
};

export const deleteMaterialBatch = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("material_batches")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
};

// Production Batches
export const fetchProductionBatches = async (): Promise<ProductionBatch[]> => {
  // First, fetch the production batches
  const { data: batchesData, error: batchesError } = await supabase
    .from("production_batches")
    .select("*")
    .order("production_date", { ascending: false });
  
  if (batchesError) throw batchesError;
  
  // Create an array to store complete production batches
  const productionBatches: ProductionBatch[] = [];
  
  // For each batch, fetch used materials and produced items
  for (const batch of batchesData) {
    // Fetch used materials for this batch
    const { data: usedMaterialsData, error: usedMaterialsError } = await supabase
      .from("used_materials")
      .select(`
        *,
        material_batches:material_batch_id (
          *,
          materials:material_id (
            name, type
          )
        )
      `)
      .eq("production_batch_id", batch.id);
    
    if (usedMaterialsError) throw usedMaterialsError;
    
    // Format used materials
    const usedMaterials: UsedMaterial[] = usedMaterialsData.map(material => ({
      id: material.id,
      materialBatchId: material.material_batch_id,
      materialName: material.material_batches.materials.name,
      materialType: material.material_batches.materials.type,
      batchNumber: material.material_batches.batch_number,
      quantity: material.quantity,
      unitOfMeasure: material.unit_of_measure,
      createdAt: new Date(material.created_at),
      updatedAt: new Date(material.updated_at)
    }));
    
    // Fetch produced items for this batch
    const { data: producedItemsData, error: producedItemsError } = await supabase
      .from("produced_items")
      .select(`
        *,
        products:product_id (
          name
        )
      `)
      .eq("production_batch_id", batch.id);
    
    if (producedItemsError) throw producedItemsError;
    
    // Format produced items
    const producedItems: ProducedItem[] = producedItemsData.map(item => ({
      id: item.id,
      productId: item.product_id,
      productName: item.products.name,
      batchNumber: item.batch_number,
      quantity: item.quantity,
      remainingQuantity: item.remaining_quantity,
      unitOfMeasure: item.unit_of_measure,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));
    
    // Add the complete production batch to the array
    productionBatches.push({
      id: batch.id,
      batchNumber: batch.batch_number,
      productionDate: new Date(batch.production_date),
      mixDay: batch.mix_day,
      mixCount: batch.mix_count,
      usedMaterials,
      producedItems,
      notes: batch.notes,
      createdAt: new Date(batch.created_at),
      updatedAt: new Date(batch.updated_at)
    });
  }
  
  return productionBatches;
};

export const createProductionBatch = async (
  batch: Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">
): Promise<ProductionBatch> => {
  // We'll use the transaction functions here
  try {
    // Start a transaction
    await supabase.rpc('begin_transaction');
    
    // Insert the production batch
    const { data: batchData, error: batchError } = await supabase
      .from("production_batches")
      .insert({
        batch_number: batch.batchNumber,
        production_date: batch.productionDate instanceof Date 
          ? batch.productionDate.toISOString() 
          : batch.productionDate,
        mix_day: batch.mixDay,
        mix_count: batch.mixCount,
        notes: batch.notes
      })
      .select()
      .single();
    
    if (batchError) throw batchError;
    
    const productionBatchId = batchData.id;
    
    // Insert used materials
    for (const material of batch.usedMaterials) {
      const { error: materialError } = await supabase
        .from("used_materials")
        .insert({
          production_batch_id: productionBatchId,
          material_batch_id: material.materialBatchId,
          quantity: material.quantity,
          unit_of_measure: material.unitOfMeasure
        });
      
      if (materialError) throw materialError;
      
      // Update material batch remaining quantity
      // Get current remaining quantity
      const { data: materialBatchData, error: fetchError } = await supabase
        .from("material_batches")
        .select("remaining_quantity")
        .eq("id", material.materialBatchId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Calculate new remaining quantity
      const newRemainingQty = materialBatchData.remaining_quantity - material.quantity;
      
      if (newRemainingQty < 0) {
        throw new Error(`Not enough quantity in material batch. Available: ${materialBatchData.remaining_quantity}, Requested: ${material.quantity}`);
      }
      
      // Update the material batch
      const { error: updateError } = await supabase
        .from("material_batches")
        .update({ remaining_quantity: newRemainingQty })
        .eq("id", material.materialBatchId);
      
      if (updateError) throw updateError;
    }
    
    // Insert produced items
    for (const item of batch.producedItems) {
      const { error: itemError } = await supabase
        .from("produced_items")
        .insert({
          production_batch_id: productionBatchId,
          product_id: item.productId,
          batch_number: item.batchNumber,
          quantity: item.quantity,
          remaining_quantity: item.quantity,  // Initially, remaining quantity equals quantity
          unit_of_measure: item.unitOfMeasure
        });
      
      if (itemError) throw itemError;
    }
    
    // Commit the transaction
    await supabase.rpc('end_transaction');
    
    // Return the complete production batch
    return {
      ...batch,
      id: productionBatchId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    // Rollback on error
    await supabase.rpc('abort_transaction');
    throw error;
  }
};

export const updateProductionBatch = async (
  id: string,
  batch: Partial<ProductionBatch>
): Promise<void> => {
  const updates: any = {};
  
  if (batch.batchNumber) updates.batch_number = batch.batchNumber;
  if (batch.productionDate) {
    updates.production_date = batch.productionDate instanceof Date 
      ? batch.productionDate.toISOString() 
      : batch.productionDate;
  }
  if (batch.mixDay) updates.mix_day = batch.mixDay;
  if (batch.mixCount !== undefined) updates.mix_count = batch.mixCount;
  if (batch.notes !== undefined) updates.notes = batch.notes;
  
  const { error } = await supabase
    .from("production_batches")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
  
  // Update used materials and produced items if provided
  // Note: This would be more complex and might require deleting and reinserting
  // relationships or using separate update functions for those
};

export const deleteProductionBatch = async (id: string): Promise<void> => {
  try {
    // Start a transaction
    await supabase.rpc('begin_transaction');
    
    // Delete produced items for this batch
    const { error: producedItemsError } = await supabase
      .from("produced_items")
      .delete()
      .eq("production_batch_id", id);
    
    if (producedItemsError) throw producedItemsError;
    
    // Delete used materials for this batch
    const { error: usedMaterialsError } = await supabase
      .from("used_materials")
      .delete()
      .eq("production_batch_id", id);
    
    if (usedMaterialsError) throw usedMaterialsError;
    
    // Delete the production batch
    const { error } = await supabase
      .from("production_batches")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    
    // Commit the transaction
    await supabase.rpc('end_transaction');
  } catch (error) {
    // Rollback on error
    await supabase.rpc('abort_transaction');
    throw error;
  }
};

// Sales
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
    await supabase.rpc('begin_transaction');
    
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
    await supabase.rpc('end_transaction');
    
    // Return the complete sale
    return {
      ...sale,
      id: saleId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    // Rollback on error
    await supabase.rpc('abort_transaction');
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
  
  // Update sale items if provided
  // Note: This would be more complex and might require deleting and reinserting
  // items or using separate update functions for those
};

export const deleteSale = async (id: string): Promise<void> => {
  try {
    // Start a transaction
    await supabase.rpc('begin_transaction');
    
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
    await supabase.rpc('end_transaction');
  } catch (error) {
    // Rollback on error
    await supabase.rpc('abort_transaction');
    throw error;
  }
};

// Orders
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
    await supabase.rpc('begin_transaction');
    
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
    
    // Insert order items and create material batches
    for (const item of order.items) {
      // Insert order item
      const { data: orderItemData, error: itemError } = await supabase
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
      
      // Create material batch for this order item
      const { error: batchError } = await supabase
        .from("material_batches")
        .insert({
          material_id: item.materialId,
          batch_number: item.batchNumber,
          quantity: item.quantity,
          supplied_quantity: item.quantity,
          remaining_quantity: item.quantity,
          unit_of_measure: item.unitOfMeasure,
          expiry_date: item.expiryDate instanceof Date ? item.expiryDate.toISOString() : item.expiryDate,
          has_report: item.hasReport
        });
      
      if (batchError) throw batchError;
    }
    
    // Commit the transaction
    await supabase.rpc('end_transaction');
    
    // Return the complete order
    return {
      ...order,
      id: orderId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    // Rollback on error
    await supabase.rpc('abort_transaction');
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
  
  // Update order items if provided
  // Note: This would be more complex and might require deleting and reinserting
};

export const deleteOrder = async (id: string): Promise<void> => {
  try {
    // Start a transaction
    await supabase.rpc('begin_transaction');
    
    // Get the order items to find related material batches
    const { data: orderItemsData, error: getOrderItemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id);
    
    if (getOrderItemsError) throw getOrderItemsError;
    
    // Delete material batches related to this order
    for (const item of orderItemsData) {
      // Find and delete material batches with matching material_id and batch_number
      const { error: materialBatchError } = await supabase
        .from("material_batches")
        .delete()
        .eq("material_id", item.material_id)
        .eq("batch_number", item.batch_number);
      
      if (materialBatchError) throw materialBatchError;
    }
    
    // Delete order items
    const { error: orderItemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", id);
    
    if (orderItemsError) throw orderItemsError;
    
    // Delete the order
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", id);
    
    if (error) throw error;
    
    // Commit the transaction
    await supabase.rpc('end_transaction');
  } catch (error) {
    // Rollback on error
    await supabase.rpc('abort_transaction');
    throw error;
  }
};

// Losses
export const fetchLosses = async (): Promise<Loss[]> => {
  const { data, error } = await supabase
    .from("losses")
    .select("*")
    .order("date", { ascending: false });
  
  if (error) throw error;
  
  return data.map(loss => ({
    id: loss.id,
    date: new Date(loss.date),
    productionBatchId: loss.production_batch_id,
    batchNumber: "", // We need to fetch batch number separately
    machine: loss.machine as "Moinho" | "Mexedor" | "Tombador" | "Embaladora" | "Outro",
    quantity: loss.quantity,
    unitOfMeasure: loss.unit_of_measure,
    productType: loss.product_type as "Goma" | "Fécula" | "Embalagem" | "Sorbato" | "Produto Acabado" | "Outro",
    notes: loss.notes,
    createdAt: new Date(loss.created_at),
    updatedAt: new Date(loss.updated_at)
  }));
};

export const fetchLossesWithDetails = async (): Promise<Loss[]> => {
  const { data, error } = await supabase
    .from("losses")
    .select(`
      *,
      production_batches:production_batch_id (
        batch_number
      )
    `)
    .order("date", { ascending: false });
  
  if (error) throw error;
  
  return data.map(loss => ({
    id: loss.id,
    date: new Date(loss.date),
    productionBatchId: loss.production_batch_id,
    batchNumber: loss.production_batches?.batch_number || "",
    machine: loss.machine as "Moinho" | "Mexedor" | "Tombador" | "Embaladora" | "Outro",
    quantity: loss.quantity,
    unitOfMeasure: loss.unit_of_measure,
    productType: loss.product_type as "Goma" | "Fécula" | "Embalagem" | "Sorbato" | "Produto Acabado" | "Outro",
    notes: loss.notes,
    createdAt: new Date(loss.created_at),
    updatedAt: new Date(loss.updated_at)
  }));
};

export const createLoss = async (
  loss: Omit<Loss, "id" | "createdAt" | "updatedAt">
): Promise<Loss> => {
  const { data, error } = await supabase
    .from("losses")
    .insert({
      date: loss.date instanceof Date ? loss.date.toISOString() : loss.date,
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
    ...data,
    id: data.id,
    date: new Date(data.date),
    productionBatchId: data.production_batch_id,
    batchNumber: loss.batchNumber, // Use the provided batch number
    machine: data.machine as "Moinho" | "Mexedor" | "Tombador" | "Embaladora" | "Outro",
    quantity: data.quantity,
    unitOfMeasure: data.unit_of_measure,
    productType: data.product_type as "Goma" | "Fécula" | "Embalagem" | "Sorbato" | "Produto Acabado" | "Outro",
    notes: data.notes,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
};

export const updateLoss = async (
  id: string,
  loss: Partial<Loss>
): Promise<void> => {
  const updates: any = {};
  
  if (loss.date) {
    updates.date = loss.date instanceof Date ? loss.date.toISOString() : loss.date;
  }
  if (loss.productionBatchId) updates.production_batch_id = loss.productionBatchId;
  if (loss.machine) updates.machine = loss.machine;
  if (loss.quantity !== undefined) updates.quantity = loss.quantity;
  if (loss.unitOfMeasure) updates.unit_of_measure = loss.unitOfMeasure;
  if (loss.productType) updates.product_type = loss.productType;
  if (loss.notes !== undefined) updates.notes = loss.notes;
  
  const { error } = await supabase
    .from("losses")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
};

export const deleteLoss = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("losses")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
};

// Helper function for debugging
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from("products").select("count");
    if (error) {
      console.error("Supabase connection error:", error);
      return false;
    }
    console.log("Supabase connection successful:", data);
    return true;
  } catch (error) {
    console.error("Supabase connection test failed:", error);
    return false;
  }
};

// Helper functions for transactions
export const beginTransaction = async (): Promise<void> => {
  await supabase.rpc('begin_transaction');
};

export const endTransaction = async (): Promise<void> => {
  await supabase.rpc('end_transaction');
};

export const abortTransaction = async (): Promise<void> => {
  await supabase.rpc('abort_transaction');
};
