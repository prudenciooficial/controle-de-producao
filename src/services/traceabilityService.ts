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
      orderDate?: Date;
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
    productName?: string;
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
  // console.log(`[traceProductBatch] Iniciando rastreabilidade para o lote de produção: ${batchNumber}`);
  
  // 1. Buscar o lote de produção
  const { data: productionBatch, error: pbError } = await supabase
    .from("production_batches")
    .select("*")
    .eq("batch_number", batchNumber)
    .single();

  if (pbError || !productionBatch) {
    console.error(`[traceProductBatch] Erro ao buscar lote de produção ${batchNumber}:`, pbError);
    return null;
  }

  // console.log(`[traceProductBatch] Lote de produção encontrado:`, productionBatch);

  // 2. Buscar TODOS os itens produzidos neste lote de produção
  const { data: allProducedItemsInBatch, error: allPIError } = await supabase
    .from("produced_items")
    .select(`
      *,
      products:product_id (name, unit_of_measure)
    `)
    .eq("production_batch_id", productionBatch.id);

  if (allPIError) {
    console.error(`[traceProductBatch] Erro ao buscar itens produzidos para o lote ${productionBatch.id}:`, allPIError);
    return null;
  }

  if (!allProducedItemsInBatch || allProducedItemsInBatch.length === 0) {
    // console.warn(`[traceProductBatch] Nenhum item produzido encontrado para o lote de produção ${productionBatch.id}. A rastreabilidade pode estar incompleta.`);
  }
  
  // console.log(`[traceProductBatch] Itens produzidos no lote:`, allProducedItemsInBatch);

  // 3. Materiais Utilizados - buscar da produção direta
  const { data: usedMaterialsData } = await supabase
    .from("used_materials")
    .select(`
      *,
      material_batches:material_batch_id (
        *,
        materials:material_id (name, type)
      )
    `)
    .eq("production_batch_id", productionBatch.id);
  // console.log(`[traceProductBatch] Dados brutos de materiais utilizados na produção:`, usedMaterialsData);

  // 4. Buscar materiais utilizados na mexida vinculada (se houver)
  let usedMaterialsFromMix: typeof usedMaterialsData = [];
  if (productionBatch.mix_batch_id) {
    const { data: mixUsedMaterialsData } = await supabase
      .from("used_materials_mix")
      .select(`
        *,
        material_batches:material_batch_id (
          *,
          materials:material_id (name, type)
        )
      `)
      .eq("mix_batch_id", productionBatch.mix_batch_id);
    
    // console.log(`[traceProductBatch] Dados brutos de materiais utilizados na mexida vinculada:`, mixUsedMaterialsData);
    // Mapear dados de used_materials_mix para a mesma estrutura de used_materials
    usedMaterialsFromMix = (mixUsedMaterialsData || []).map(item => ({
      ...item,
      production_batch_id: productionBatch.id, // Adicionar o production_batch_id atual
    }));
  }

  // 5. Combinar todos os materiais utilizados (produção + mexida)
  const allUsedMaterials = [...(usedMaterialsData || []), ...usedMaterialsFromMix];
  
  // Remover duplicatas baseado no material_batch_id
  const uniqueUsedMaterials = allUsedMaterials.filter((material, index, self) => 
    index === self.findIndex(m => m.material_batch_id === material.material_batch_id)
  );

  const usedMaterialsWithSupplier = await Promise.all(
    uniqueUsedMaterials.map(async (usedMaterial) => {
      const supplierInfo = await getSupplierForMaterialBatch(usedMaterial.material_batch_id);
      return {
        id: usedMaterial.id,
        materialName: usedMaterial.material_batches?.materials?.name || 'Nome Indisponível',
        materialType: usedMaterial.material_batches?.materials?.type || 'Tipo Indisponível',
        batchNumber: usedMaterial.material_batches?.batch_number || 'Lote Indisponível',
        quantity: usedMaterial.quantity,
        unitOfMeasure: usedMaterial.unit_of_measure, // Esta unidade de medida é do used_material
        supplier: supplierInfo, // Contém nome, invoiceNumber, orderDate
        expiryDate: usedMaterial.material_batches?.expiry_date ? new Date(usedMaterial.material_batches.expiry_date) : undefined,
        hasReport: usedMaterial.material_batches?.has_report || false,
      };
    })
  );
  // console.log(`[traceProductBatch] Materiais utilizados com fornecedor (produção + mexida):`, usedMaterialsWithSupplier);

  // 6. Vendas (precisa buscar para todos os produced_item_ids do lote)
  let sales: ProductTraceability['sales'] = [];
  if (allProducedItemsInBatch && allProducedItemsInBatch.length > 0) {
    const producedItemIds = allProducedItemsInBatch.map(pi => pi.id);
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select(`
        *,
        sales:sale_id (*),
        produced_items:produced_item_id(products:product_id(name, unit_of_measure))
      `)
      .in("produced_item_id", producedItemIds);
    
    // console.log(`[traceProductBatch] Itens de venda encontrados:`, saleItems);
    sales = (saleItems || []).map(item => ({
      id: item.id,
      date: new Date(item.sales.date),
      customerName: item.sales.customer_name,
      invoiceNumber: item.sales.invoice_number,
      quantity: item.quantity,
      productName: item.produced_items?.products?.name || 'Produto Indisponível',
      // Tentar obter a unidade de medida do produto vendido, se não, usar a do sale_item (se existir)
      unitOfMeasure: item.produced_items?.products?.unit_of_measure || item.unit_of_measure || 'Unidade Indisponível',
    }));
  }
  // console.log(`[traceProductBatch] Vendas processadas:`, sales);

  // 7. "Related Products" agora são basicamente todos os itens no lote
  // A interface `ProductTraceability` pode precisar ser repensada se não houver um "produto principal" 
  // quando se rastreia um lote de produção inteiro.
  // Por ora, vamos listar todos os itens produzidos como "relatedProducts" se houver mais de um,
  // ou apenas o único item se for o caso.
  // O `productionDetails` já se refere ao lote de produção.
  const relatedProducts = (allProducedItemsInBatch || []).map(item => ({
    id: item.id,
    productName: item.products?.name || 'Nome Indisponível',
    batchNumber: item.batch_number, // Este é o batch_number do produced_item, que deve ser o mesmo do production_batch
    quantity: item.quantity,
    unitOfMeasure: item.products?.unit_of_measure || item.unit_of_measure || 'Unidade Indisponível',
  }));
  // console.log(`[traceProductBatch] Produtos relacionados (todos no lote):`, relatedProducts);

  // 8. Rastreabilidade Reversa (agora usa todos os materiais: produção + mexida)
  const materialBatchIds = uniqueUsedMaterials.map(um => um.material_batch_id).filter(id => id != null) as string[];
  const reverseTraceability = await getReverseTraceability(materialBatchIds, productionBatch.id);
  // console.log(`[traceProductBatch] Rastreabilidade reversa:`, reverseTraceability);

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
    // Se a ideia é mostrar OUTROS produtos, talvez seja melhor filtrar o "principal",
    // mas como estamos rastreando o LOTE, todos os produtos são igualmente parte dele.
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
  const supplier = await getSupplierForMaterialBatch(materialBatch.id);

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

const getSupplierForMaterialBatch = async (materialBatchId: string) => {
  if (!materialBatchId) {
    // console.warn('[GSFMB] materialBatchId não fornecido.');
    return { name: "Fornecedor Desconhecido", invoiceNumber: "N/A", orderDate: new Date() };
  }

  // Busca lote de material específico
  const { data: matBatchDetails, error: matBatchErr } = await supabase
    .from("material_batches")
    .select("batch_number")
    .eq("id", materialBatchId)
    .single();

  if (matBatchErr) {
    // console.error(`[GSFMB] Erro ao buscar detalhes do lote de material (ID: ${materialBatchId}):`, matBatchErr);
    return { name: "Fornecedor Desconhecido", invoiceNumber: "N/A", orderDate: new Date() };
  }

  const textualBatchNumber = matBatchDetails?.batch_number;
  if (!textualBatchNumber) {
    // console.warn(`[GSFMB] Lote de material (ID: ${materialBatchId}) não possui um batch_number textual associado. matBatchDetails:`, matBatchDetails);
    return { name: "Fornecedor Desconhecido", invoiceNumber: "N/A", orderDate: new Date() };
  }

  // console.log(`[GSFMB] Lote de material (ID: ${materialBatchId}) tem batch_number textual: ${textualBatchNumber}`);

  // Busca order_item associado pelo batch_number
  const { data: orderItem, error: orderItemErr } = await supabase
    .from("order_items")
    .select("order_id")
    .eq("batch_number", textualBatchNumber)
    .single();

  if (orderItemErr) {
    // console.error(`[GSFMB] Erro ao buscar order_item com batch_number ${textualBatchNumber}:`, orderItemErr);
    return { name: "Fornecedor Desconhecido", invoiceNumber: "N/A", orderDate: new Date() };
  }

  if (!orderItem) {
    // console.warn(`[GSFMB] Nenhum order_item encontrado com batch_number: ${textualBatchNumber}`);
    return { name: "Fornecedor Desconhecido", invoiceNumber: "N/A", orderDate: new Date() };
  }

  const orderIdFromOrderItem = orderItem.order_id;
  if (!orderIdFromOrderItem) {
    // console.warn(`[GSFMB] order_item encontrado para batch_number ${textualBatchNumber}, mas não possui order_id. OrderItem:`, orderItem);
    return { name: "Fornecedor Desconhecido", invoiceNumber: "N/A", orderDate: new Date() };
  }

  // console.log(`[GSFMB] order_item para batch_number ${textualBatchNumber} tem order_id: ${orderIdFromOrderItem}`);

  // Busca informações do pedido usando campos corretos da tabela orders
  const { data: orderData, error: orderErr } = await supabase
    .from("orders")
    .select(`
      supplier_id,
      invoice_number,
      date,
      suppliers:supplier_id (
        name
      )
    `)
    .eq("id", orderIdFromOrderItem)
    .single();

  if (orderErr) {
    // console.error(`[GSFMB] Erro ao buscar pedido com ID ${orderIdFromOrderItem}:`, orderErr);
    return { name: "Fornecedor Desconhecido", invoiceNumber: "N/A", orderDate: new Date() };
  }

  if (!orderData) {
    return { name: "Fornecedor Desconhecido", invoiceNumber: "N/A", orderDate: new Date() };
  }

  let supplierName = orderData.suppliers?.name || "Fornecedor Desconhecido";
  const invoiceNumberFromOrder = orderData.invoice_number || "N/A";
  const dateFromOrder = orderData.date || "N/A";

  // Se supplier name não foi encontrado via join, tenta buscar o fornecedor diretamente
  if (!orderData.suppliers?.name && orderData.supplier_id) {
    // console.log(`[GSFMB] Tentando buscar fornecedor separadamente com supplier_id: ${orderData.supplier_id}`);
    
    const { data: directSupplier, error: directSupplierErr } = await supabase
      .from("suppliers")
      .select("name")
      .eq("id", orderData.supplier_id)
      .single();

    if (directSupplierErr) {
      // console.error(`[GSFMB] Falha ao buscar fornecedor diretamente com ID: ${orderData.supplier_id}`, directSupplierErr);
    } else if (directSupplier?.name) {
      // console.log(`[GSFMB] Fornecedor encontrado diretamente: ${directSupplier.name}`);
      supplierName = directSupplier.name;
    }
  }

  if (supplierName !== "Fornecedor Desconhecido") {
    // console.log(`[GSFMB] Informações completas encontradas para materialBatchId ${materialBatchId}: Fornecedor: ${supplierName}, NF: ${invoiceNumberFromOrder}, Data: ${dateFromOrder}`);
  }

  return {
    name: supplierName,
    invoiceNumber: invoiceNumberFromOrder,
    orderDate: dateFromOrder !== "N/A" ? new Date(dateFromOrder) : new Date()
  };
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

interface RelatedBatch {
  type: 'product' | 'production' | 'material';
  data: unknown;
}

export const findRelatedBatches = async (batchNumber: string): Promise<RelatedBatch | null> => {
  // console.log(`[findRelatedBatches] Buscando lote: ${batchNumber}`);

  // Buscar em produced_items
  const { data: producedItem, error: piError } = await supabase
    .from("produced_items")
    .select("*")
    .eq("batch_number", batchNumber)
    .single();

  if (piError) { 
    // console.warn('[findRelatedBatches] Erro ao buscar em produced_items:', piError);
  } else if (producedItem) {
    // console.log(`[findRelatedBatches] Encontrado em produced_items:`, producedItem);
    return { type: "product", data: producedItem };
  }

  // Buscar em production_batches
  const { data: productionBatch, error: pbError } = await supabase
    .from("production_batches")
    .select("*")
    .eq("batch_number", batchNumber)
    .single();

  if (pbError) { 
    // console.warn('[findRelatedBatches] Erro ao buscar em production_batches:', pbError);
  } else if (productionBatch) {
    // console.log(`[findRelatedBatches] Encontrado em production_batches:`, productionBatch);
    return { type: "production", data: productionBatch };
  }

  // Buscar em material_batches
  const { data: materialBatch, error: mbError } = await supabase
    .from("material_batches")
    .select("*")
    .eq("batch_number", batchNumber)
    .single();

  if (mbError) { 
    // console.warn('[findRelatedBatches] Erro ao buscar em material_batches:', mbError);
  } else if (materialBatch) {
    // console.log(`[findRelatedBatches] Encontrado em material_batches:`, materialBatch);
    return { type: "material", data: materialBatch };
  }

  // console.log(`[findRelatedBatches] Lote ${batchNumber} não encontrado em nenhuma tabela principal.`);
  return null;
};
