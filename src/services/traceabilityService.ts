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
  console.log(`[traceProductBatch] Iniciando rastreabilidade para o lote de produção: ${batchNumber}`);

  // 1. Buscar o lote de produção principal
  const { data: productionBatch, error: pbError } = await supabase
    .from("production_batches")
    .select("*")
    .eq("batch_number", batchNumber)
    .single();

  if (pbError || !productionBatch) {
    console.error(`[traceProductBatch] Erro ao buscar lote de produção ${batchNumber}:`, pbError);
    return null;
  }
  console.log(`[traceProductBatch] Lote de produção encontrado:`, productionBatch);

  // 2. Buscar todos os itens produzidos neste lote de produção
  const { data: allProducedItemsInBatch, error: allPIError } = await supabase
    .from("produced_items")
    .select(`
      *,
      products:product_id (name, unit_of_measure)
    `)
    .eq("production_batch_id", productionBatch.id);

  if (allPIError) {
    console.error(`[traceProductBatch] Erro ao buscar itens produzidos para o lote ${productionBatch.id}:`, allPIError);
    // Continuar mesmo se houver erro, pode não haver itens ou o erro é em um item específico
  }
  if (!allProducedItemsInBatch || allProducedItemsInBatch.length === 0) {
    console.warn(`[traceProductBatch] Nenhum item produzido encontrado para o lote de produção ${productionBatch.id}. A rastreabilidade pode estar incompleta.`);
    // Retornar null ou uma rastreabilidade parcial? Por enquanto, continua.
  }
  console.log(`[traceProductBatch] Itens produzidos no lote:`, allProducedItemsInBatch);

  // 3. Materiais Utilizados (já usava productionBatch.id, o que está correto)
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
  console.log(`[traceProductBatch] Dados brutos de materiais utilizados:`, usedMaterialsData);

  const usedMaterialsWithSupplier = await Promise.all(
    (usedMaterialsData || []).map(async (usedMaterial) => {
      const supplierInfo = await getSupplierFromMaterialBatch(usedMaterial.material_batch_id);
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
  console.log(`[traceProductBatch] Materiais utilizados com fornecedor:`, usedMaterialsWithSupplier);

  // 4. Vendas (precisa buscar para todos os produced_item_ids do lote)
  let sales: ProductTraceability['sales'] = [];
  if (allProducedItemsInBatch && allProducedItemsInBatch.length > 0) {
    const producedItemIds = allProducedItemsInBatch.map(pi => pi.id);
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select(`
        *,
        sales:sale_id (*),
        produced_items:produced_item_id(products:product_id(unit_of_measure))
      `)
      .in("produced_item_id", producedItemIds);
    
    console.log(`[traceProductBatch] Itens de venda encontrados:`, saleItems);
    sales = (saleItems || []).map(item => ({
      id: item.id,
      date: new Date(item.sales.date),
      customerName: item.sales.customer_name,
      invoiceNumber: item.sales.invoice_number,
      quantity: item.quantity,
      // Tentar obter a unidade de medida do produto vendido, se não, usar a do sale_item (se existir)
      unitOfMeasure: item.produced_items?.products?.unit_of_measure || item.unit_of_measure || 'Unidade Indisponível',
    }));
  }
  console.log(`[traceProductBatch] Vendas processadas:`, sales);

  // 5. "Related Products" agora são basicamente todos os itens no lote
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
  console.log(`[traceProductBatch] Produtos relacionados (todos no lote):`, relatedProducts);

  // 6. Rastreabilidade Reversa (já usava material_batch_ids, o que é bom)
  const materialBatchIds = (usedMaterialsData || []).map(um => um.material_batch_id).filter(id => id != null) as string[];
  const reverseTraceability = await getReverseTraceability(materialBatchIds, productionBatch.id);
  console.log(`[traceProductBatch] Rastreabilidade reversa:`, reverseTraceability);

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

export const getSupplierFromMaterialBatch = async (materialBatchId: string): Promise<{ name: string; invoiceNumber: string; orderDate: Date } | undefined> => {
  console.log(`[getSupplierFromMaterialBatch] Buscando fornecedor para o lote de material ID: ${materialBatchId}`);
  
  if (!materialBatchId) {
    console.warn('[getSupplierFromMaterialBatch] ID do lote de material não fornecido.');
    return undefined;
  }

  // 1. Buscar o order_id diretamente da tabela material_batches
  const { data: matBatchData, error: matBatchErr } = await supabase
    .from("material_batches")
    .select("order_id") // Selecionar order_id
    .eq("id", materialBatchId)
    .single();

  if (matBatchErr || !matBatchData) {
    console.error(`[getSupplierFromMaterialBatch] Lote de material ID ${materialBatchId} não encontrado ou erro:`, matBatchErr);
    return undefined;
  }

  // Usando type casting (as any) temporariamente devido a possíveis tipos desatualizados
  const orderId = (matBatchData as any).order_id;

  if (!orderId) {
    console.warn(`[getSupplierFromMaterialBatch] Lote de material ID ${materialBatchId} não possui order_id associado. matBatchData:`, matBatchData);
    return undefined;
  }
  console.log(`[getSupplierFromMaterialBatch] Lote de material ${materialBatchId} associado ao order_id: ${orderId}`);

  // 2. Buscar o pedido (order) usando o order_id obtido
  const { data: orderData, error: orderErr } = await supabase
    .from("orders")
    .select(`
      date, 
      invoice_number,
      supplier_id, 
      suppliers:supplier_id (name)
    `)
    .eq("id", orderId) // Usar a variável orderId
    .single();

  if (orderErr || !orderData) {
    console.error(`[getSupplierFromMaterialBatch] Pedido não encontrado para order_id ${orderId}:`, orderErr);
    return undefined;
  }

  // Verificar se o supplier foi carregado corretamente (supabase aninha os dados)
  if (!orderData.suppliers) {
    console.error(`[getSupplierFromMaterialBatch] Fornecedor não encontrado para o pedido ${orderId} (supplier_id: ${orderData.supplier_id}). Verifique a relação e os dados do fornecedor.`);
    // Tentar buscar o fornecedor separadamente se a junção falhou ou não retornou o esperado
    if (orderData.supplier_id) {
      const { data: supplierData, error: supplierErr } = await supabase
        .from('suppliers')
        .select('name')
        .eq('id', orderData.supplier_id)
        .single();
      if (supplierErr || !supplierData) {
         console.error(`[getSupplierFromMaterialBatch] Falha ao buscar fornecedor separadamente com ID: ${orderData.supplier_id}`);
         return undefined;
      }
      console.log(`[getSupplierFromMaterialBatch] Fornecedor buscado separadamente:`, supplierData);
      return {
        name: supplierData.name,
        invoiceNumber: orderData.invoice_number,
        orderDate: new Date(orderData.date),
      };
    }
    return undefined; // Se não há supplier_id, não podemos prosseguir
  }
  
  console.log(`[getSupplierFromMaterialBatch] Informações do pedido e fornecedor encontradas:`, orderData);

  return {
    name: orderData.suppliers.name,
    invoiceNumber: orderData.invoice_number,
    orderDate: new Date(orderData.date),
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

export const findRelatedBatches = async (batchNumber: string): Promise<{type: 'product' | 'material', exists: boolean, id?: string}> => {
  console.log(`[findRelatedBatches] Buscando lote: ${batchNumber}`);
  // 1. Verificar em produced_items (mais específico para um item de produto já fabricado com esse lote)
  // Se encontrarmos aqui, ele já é um produto e tem um production_batch_id associado.
  let { data: producedItem, error: piError } = await supabase
    .from("produced_items")
    .select("id, production_batch_id")
    .eq("batch_number", batchNumber)
    .maybeSingle(); // Usar maybeSingle para não dar erro se não encontrar

  if (piError) console.warn('[findRelatedBatches] Erro ao buscar em produced_items:', piError);
  
  if (producedItem) {
    console.log(`[findRelatedBatches] Encontrado em produced_items:`, producedItem);
    return { type: 'product', exists: true, id: producedItem.production_batch_id || producedItem.id };
  }

  // 2. Verificar em production_batches (se o batchNumber é de um lote de produção geral)
  let { data: productionBatch, error: pbError } = await supabase
    .from("production_batches")
    .select("id")
    .eq("batch_number", batchNumber)
    .maybeSingle();
  
  if (pbError) console.warn('[findRelatedBatches] Erro ao buscar em production_batches:', pbError);

  if (productionBatch) {
    console.log(`[findRelatedBatches] Encontrado em production_batches:`, productionBatch);
    return { type: 'product', exists: true, id: productionBatch.id };
  }

  // 3. Verificar em material_batches
  let { data: materialBatch, error: mbError } = await supabase
    .from("material_batches")
    .select("id")
    .eq("batch_number", batchNumber)
    .maybeSingle();

  if (mbError) console.warn('[findRelatedBatches] Erro ao buscar em material_batches:', mbError);

  if (materialBatch) {
    console.log(`[findRelatedBatches] Encontrado em material_batches:`, materialBatch);
    return { type: 'material', exists: true, id: materialBatch.id };
  }
  
  console.log(`[findRelatedBatches] Lote ${batchNumber} não encontrado em nenhuma tabela principal.`);
  return { type: 'product', exists: false }; // Default para product se não encontrado, mas com exists: false
};
