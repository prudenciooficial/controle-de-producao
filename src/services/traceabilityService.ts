import { supabase } from "@/integrations/supabase/client";

export interface ProductTraceability {
  productionDetails: {
    id: string;
    batchNumber: string;
    productionDate: Date;
    mixDay: string;
    mixCount: number;
    notes?: string;
  };
  usedMaterials: Array<{
    id: string;
    materialName: string;
    materialType: string;
    batchNumber: string;
    quantity: number;
    unitOfMeasure: string;
    supplier?: {
      name: string;
      invoiceNumber: string;
    };
    expiryDate?: Date;
    hasReport: boolean;
  }>;
  sales: Array<{
    id: string;
    date: Date;
    customerName: string;
    invoiceNumber: string;
    quantity: number;
    unitOfMeasure: string;
  }>;
  relatedProducts: Array<{
    id: string;
    productName: string;
    batchNumber: string;
    quantity: number;
    unitOfMeasure: string;
  }>;
  reverseTraceability: Array<{
    productionBatchNumber: string;
    productionDate: Date;
    producedItems: Array<{
      productName: string;
      batchNumber: string;
      quantity: number;
    }>;
  }>;
}

export interface MaterialTraceability {
  materialDetails: {
    id: string;
    materialName: string;
    materialType: string;
    batchNumber: string;
    suppliedQuantity: number;
    remainingQuantity: number;
    unitOfMeasure: string;
    expiryDate?: Date;
    hasReport: boolean;
    supplier?: {
      name: string;
      invoiceNumber: string;
      orderDate: Date;
    };
  };
  usedInProductions: Array<{
    productionBatchNumber: string;
    productionDate: Date;
    quantityUsed: number;
    producedItems: Array<{
      productName: string;
      batchNumber: string;
      quantity: number;
    }>;
  }>;
  relatedSales: Array<{
    productName: string;
    productBatchNumber: string;
    saleDate: Date;
    customerName: string;
    invoiceNumber: string;
    quantity: number;
  }>;
}

export const traceProductBatch = async (batchNumber: string): Promise<ProductTraceability | null> => {
  // First, find the produced item
  const { data: producedItem, error: producedItemError } = await supabase
    .from("produced_items")
    .select(`
      *,
      products:product_id (name),
      production_batches:production_batch_id (*)
    `)
    .eq("batch_number", batchNumber)
    .single();

  if (producedItemError || !producedItem) {
    return null;
  }

  const productionBatch = producedItem.production_batches;

  // Get used materials for this production
  const { data: usedMaterials } = await supabase
    .from("used_materials")
    .select(`
      *,
      material_batches:material_batch_id (
        *,
        materials:material_id (name, type)
      )
    `)
    .eq("production_batch_id", productionBatch.id);

  // Get supplier info for each material batch
  const usedMaterialsWithSupplier = await Promise.all(
    (usedMaterials || []).map(async (usedMaterial) => {
      const supplier = await getSupplierFromMaterialBatch(usedMaterial.material_batch_id);
      return {
        id: usedMaterial.id,
        materialName: usedMaterial.material_batches.materials.name,
        materialType: usedMaterial.material_batches.materials.type,
        batchNumber: usedMaterial.material_batches.batch_number,
        quantity: usedMaterial.quantity,
        unitOfMeasure: usedMaterial.unit_of_measure,
        supplier,
        expiryDate: usedMaterial.material_batches.expiry_date ? new Date(usedMaterial.material_batches.expiry_date) : undefined,
        hasReport: usedMaterial.material_batches.has_report || false,
      };
    })
  );

  // Get sales for this produced item
  const { data: saleItems } = await supabase
    .from("sale_items")
    .select(`
      *,
      sales:sale_id (*)
    `)
    .eq("produced_item_id", producedItem.id);

  const sales = (saleItems || []).map(item => ({
    id: item.id,
    date: new Date(item.sales.date),
    customerName: item.sales.customer_name,
    invoiceNumber: item.sales.invoice_number,
    quantity: item.quantity,
    unitOfMeasure: item.unit_of_measure,
  }));

  // Get other products from the same production batch
  const { data: relatedProducedItems } = await supabase
    .from("produced_items")
    .select(`
      *,
      products:product_id (name)
    `)
    .eq("production_batch_id", productionBatch.id)
    .neq("id", producedItem.id);

  const relatedProducts = (relatedProducedItems || []).map(item => ({
    id: item.id,
    productName: item.products.name,
    batchNumber: item.batch_number,
    quantity: item.quantity,
    unitOfMeasure: item.unit_of_measure,
  }));

  // Get reverse traceability - other productions that used the same material batches
  const materialBatchIds = (usedMaterials || []).map(um => um.material_batch_id);
  const reverseTraceability = await getReverseTraceability(materialBatchIds, productionBatch.id);

  return {
    productionDetails: {
      id: productionBatch.id,
      batchNumber: productionBatch.batch_number,
      productionDate: new Date(productionBatch.production_date),
      mixDay: productionBatch.mix_day,
      mixCount: productionBatch.mix_count,
      notes: productionBatch.notes,
    },
    usedMaterials: usedMaterialsWithSupplier,
    sales,
    relatedProducts,
    reverseTraceability,
  };
};

export const traceMaterialBatch = async (batchNumber: string): Promise<MaterialTraceability | null> => {
  // First, find the material batch
  const { data: materialBatch, error: materialBatchError } = await supabase
    .from("material_batches")
    .select(`
      *,
      materials:material_id (name, type)
    `)
    .eq("batch_number", batchNumber)
    .single();

  if (materialBatchError || !materialBatch) {
    return null;
  }

  // Get supplier info
  const supplier = await getSupplierFromMaterialBatch(materialBatch.id);

  // Get productions that used this material batch
  const { data: usedMaterials } = await supabase
    .from("used_materials")
    .select(`
      *,
      production_batches:production_batch_id (*)
    `)
    .eq("material_batch_id", materialBatch.id);

  // For each production, get the produced items
  const usedInProductions = await Promise.all(
    (usedMaterials || []).map(async (usedMaterial) => {
      const { data: producedItems } = await supabase
        .from("produced_items")
        .select(`
          *,
          products:product_id (name)
        `)
        .eq("production_batch_id", usedMaterial.production_batch_id);

      return {
        productionBatchNumber: usedMaterial.production_batches.batch_number,
        productionDate: new Date(usedMaterial.production_batches.production_date),
        quantityUsed: usedMaterial.quantity,
        producedItems: (producedItems || []).map(item => ({
          productName: item.products.name,
          batchNumber: item.batch_number,
          quantity: item.quantity,
        })),
      };
    })
  );

  // Get sales of products that used this material - fixed query structure
  const relatedSales: MaterialTraceability['relatedSales'] = [];
  
  for (const production of usedInProductions) {
    const { data: producedItems } = await supabase
      .from("produced_items")
      .select(`
        id,
        batch_number,
        products:product_id (name),
        sale_items (
          *,
          sales:sale_id (*)
        )
      `)
      .eq("production_batch_id", (usedMaterials || []).find(um => 
        um.production_batches.batch_number === production.productionBatchNumber
      )?.production_batch_id);

    for (const producedItem of producedItems || []) {
      for (const saleItem of producedItem.sale_items || []) {
        relatedSales.push({
          productName: producedItem.products.name,
          productBatchNumber: producedItem.batch_number,
          saleDate: new Date(saleItem.sales.date),
          customerName: saleItem.sales.customer_name,
          invoiceNumber: saleItem.sales.invoice_number,
          quantity: saleItem.quantity,
        });
      }
    }
  }

  return {
    materialDetails: {
      id: materialBatch.id,
      materialName: materialBatch.materials.name,
      materialType: materialBatch.materials.type,
      batchNumber: materialBatch.batch_number,
      suppliedQuantity: materialBatch.supplied_quantity,
      remainingQuantity: materialBatch.remaining_quantity,
      unitOfMeasure: materialBatch.unit_of_measure,
      expiryDate: materialBatch.expiry_date ? new Date(materialBatch.expiry_date) : undefined,
      hasReport: materialBatch.has_report || false,
      supplier,
    },
    usedInProductions,
    relatedSales,
  };
};

export const getSupplierFromMaterialBatch = async (materialBatchId: string) => {
  const { data: orderItems } = await supabase
    .from("order_items")
    .select(`
      *,
      orders:order_id (
        *,
        suppliers:supplier_id (name)
      )
    `)
    .eq("material_id", materialBatchId);

  if (orderItems && orderItems.length > 0) {
    const orderItem = orderItems[0];
    return {
      name: orderItem.orders.suppliers.name,
      invoiceNumber: orderItem.orders.invoice_number,
      orderDate: new Date(orderItem.orders.date),
    };
  }
  
  return undefined;
};

const getReverseTraceability = async (materialBatchIds: string[], excludeProductionBatchId: string) => {
  if (materialBatchIds.length === 0) return [];

  const { data: reverseUsedMaterials } = await supabase
    .from("used_materials")
    .select(`
      production_batch_id,
      production_batches:production_batch_id (*)
    `)
    .in("material_batch_id", materialBatchIds)
    .neq("production_batch_id", excludeProductionBatchId);

  const reverseTraceability = await Promise.all(
    (reverseUsedMaterials || []).map(async (usedMaterial) => {
      const { data: producedItems } = await supabase
        .from("produced_items")
        .select(`
          *,
          products:product_id (name)
        `)
        .eq("production_batch_id", usedMaterial.production_batch_id);

      return {
        productionBatchNumber: usedMaterial.production_batches.batch_number,
        productionDate: new Date(usedMaterial.production_batches.production_date),
        producedItems: (producedItems || []).map(item => ({
          productName: item.products.name,
          batchNumber: item.batch_number,
          quantity: item.quantity,
        })),
      };
    })
  );

  return reverseTraceability;
};

export const findRelatedBatches = async (batchNumber: string): Promise<{type: 'product' | 'material', exists: boolean}> => {
  // Check if it's a product batch
  const { data: producedItem } = await supabase
    .from("produced_items")
    .select("id")
    .eq("batch_number", batchNumber)
    .single();

  if (producedItem) {
    return { type: 'product', exists: true };
  }

  // Check if it's a material batch
  const { data: materialBatch } = await supabase
    .from("material_batches")
    .select("id")
    .eq("batch_number", batchNumber)
    .single();

  if (materialBatch) {
    return { type: 'material', exists: true };
  }

  return { type: 'product', exists: false };
};
