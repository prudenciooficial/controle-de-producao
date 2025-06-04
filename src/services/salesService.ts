import { supabase } from "@/integrations/supabase/client";
import { Sale, SaleItem } from "../types";
import { beginTransaction, endTransaction, abortTransaction } from "./base/supabaseClient";
import { logSystemEvent } from "./logService";

export const fetchSales = async (): Promise<Sale[]> => {
  console.log("Fetching sales...");
  
  // First, fetch the sales
  const { data: salesData, error: salesError } = await supabase
    .from("sales")
    .select("*")
    .order("date", { ascending: false });
  
  if (salesError) {
    console.error("Error fetching sales:", salesError);
    throw salesError;
  }
  
  console.log(`Found ${salesData?.length || 0} sales`);
  
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
    
    if (saleItemsError) {
      console.error("Error fetching sale items for sale:", sale.id, saleItemsError);
      throw saleItemsError;
    }
    
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
  
  console.log("Sales fetched successfully");
  return sales;
};

export const createSale = async (
  sale: Omit<Sale, "id" | "createdAt" | "updatedAt">,
  userId?: string,
  userDisplayName?: string
): Promise<Sale> => {
  console.log("Creating sale:", sale);
  
  try {
    // Start a transaction
    await beginTransaction();
    console.log("Transaction started");
    
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
    
    if (saleError) {
      console.error("Error creating sale:", saleError);
      throw saleError;
    }
    
    console.log("Sale created:", saleData);
    const saleId = saleData.id;
    
    // Insert sale items - let Supabase generate the IDs
    for (let i = 0; i < sale.items.length; i++) {
      const item = sale.items[i];
      console.log(`Processing sale item ${i + 1}/${sale.items.length}:`, item);
      
      // Check available quantity before processing
      const { data: producedItem, error: checkError } = await supabase
        .from("produced_items")
        .select("remaining_quantity")
        .eq("id", item.producedItemId)
        .single();
      
      if (checkError) {
        console.error("Error checking produced item:", checkError);
        throw new Error(`Erro ao verificar produto: ${checkError.message}`);
      }
      
      if (producedItem.remaining_quantity < item.quantity) {
        throw new Error(`Quantidade insuficiente do produto ${item.productName}. Disponível: ${producedItem.remaining_quantity}, Solicitado: ${item.quantity}`);
      }
      
      // Insert sale item
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
      
      if (itemError) {
        console.error("Error creating sale item:", itemError);
        throw new Error(`Erro ao inserir item da venda: ${itemError.message}`);
      }
    }
    
    // Commit the transaction
    await endTransaction();
    console.log("Transaction committed successfully");
    
    // Log the operation (non-blocking)
    await logSystemEvent({
      userId: userId!,
      userDisplayName: userDisplayName!,
      actionType: 'CREATE',
      entityTable: 'sales',
      entityId: saleId,
      newData: saleData
    });
    
    // Fetch the inserted sale items to get their IDs
    const { data: insertedItems, error: fetchItemsError } = await supabase
      .from("sale_items")
      .select(`
        *,
        products:product_id (name),
        produced_items:produced_item_id (batch_number)
      `)
      .eq("sale_id", saleId);
    
    if (fetchItemsError) {
      console.error("Error fetching inserted items:", fetchItemsError);
      throw fetchItemsError;
    }
    
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
    const completeSale = {
      ...sale,
      id: saleId,
      items,
      createdAt: new Date(saleData.created_at),
      updatedAt: new Date(saleData.updated_at)
    };
    
    console.log("Sale created successfully:", completeSale);
    return completeSale;
  } catch (error) {
    // Rollback on error
    console.error("Error in createSale, rolling back:", error);
    await abortTransaction();
    throw error;
  }
};

export const updateSale = async (
  id: string,
  sale: Partial<Sale>,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  let originalSaleDataForLog: any = { id }; // Fallback para o log
  try {
    await beginTransaction();

    // Buscar dados da venda ANTES de qualquer modificação para oldData no log
    const { data: fetchedSale, error: fetchInitialError } = await supabase
      .from("sales")
      .select("*, sale_items(*)") // Inclui itens para um log mais completo
      .eq("id", id)
      .single();

    if (fetchedSale) {
      originalSaleDataForLog = fetchedSale;
    } else if (fetchInitialError) {
      console.warn(`Sale (ID: ${id}) not found before update, or other fetch error: ${fetchInitialError.message}`);
    }
    
    // Update basic sale info
    const updates: any = {};
    if (sale.date) {
      updates.date = sale.date instanceof Date ? sale.date.toISOString() : sale.date;
    }
    if (sale.invoiceNumber) updates.invoice_number = sale.invoiceNumber;
    if (sale.customerName) updates.customer_name = sale.customerName;
    if (sale.type) updates.type = sale.type;
    if (sale.notes !== undefined) updates.notes = sale.notes;
    
    if (Object.keys(updates).length > 0) {
        const { error } = await supabase
        .from("sales")
        .update(updates)
        .eq("id", id);
        if (error) throw error;
    }
    
    // Se houver itens para atualizar
    if (sale.items && sale.items.length > 0) {
      let currentItemsForLogic: any[] = originalSaleDataForLog.sale_items || [];
      
      const currentItemIds = new Set(currentItemsForLogic.map(item => item.id));
      const updatedItemIds = new Set(sale.items.filter(item => item.id).map(item => item.id!));
      
      const itemsToDelete = currentItemsForLogic.filter(item => !updatedItemIds.has(item.id));
      const itemsToUpdate = sale.items.filter(item => item.id && currentItemIds.has(item.id));
      const itemsToAdd = sale.items.filter(item => !item.id || !currentItemIds.has(item.id));
      
      for (const item of itemsToDelete) {
        const { error: deleteError } = await supabase.from("sale_items").delete().eq("id", item.id);
        if (deleteError) throw deleteError;
      }
      
      for (const itemUpdate of itemsToUpdate) {
        if (!itemUpdate.id) continue;
        const originalItem = currentItemsForLogic.find(ci => ci.id === itemUpdate.id);
        if (originalItem) {
          const { error: updateError } = await supabase.from("sale_items").update({
            product_id: itemUpdate.productId || originalItem.product_id,
            produced_item_id: itemUpdate.producedItemId || originalItem.produced_item_id,
            quantity: itemUpdate.quantity,
            unit_of_measure: itemUpdate.unitOfMeasure
          }).eq("id", itemUpdate.id);
          if (updateError) throw updateError;
        }
      }
      
      for (const itemToAdd of itemsToAdd) {
        const { error: insertError } = await supabase.from("sale_items").insert({
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
    await logSystemEvent({
      userId: userId!,
      userDisplayName: userDisplayName!,
      actionType: 'UPDATE',
      entityTable: 'sales',
      entityId: id,
      oldData: originalSaleDataForLog, // Dados antes da atualização
      newData: sale // O objeto 'sale' contém as atualizações que foram aplicadas
    });
  } catch (error) {
    await abortTransaction();
    throw error;
  }
};

export const deleteSale = async (id: string, userId?: string, userDisplayName?: string): Promise<void> => {
  let saleToDeleteForLog: any = { id }; // Fallback para o log
  try {
    await beginTransaction();

    // Buscar dados da venda ANTES de deletar para oldData no log
    const { data: fetchedSale, error: fetchError } = await supabase
      .from("sales")
      .select("*, sale_items(*)") // Inclui itens para um log mais completo
      .eq("id", id)
      .single();

    if (fetchedSale) {
      saleToDeleteForLog = fetchedSale;
    } else if (fetchError) {
      console.warn(`Sale (ID: ${id}) not found before deletion, or other fetch error: ${fetchError.message}`);
    }

    // Delete sale items
    const { error: saleItemsError } = await supabase.from("sale_items").delete().eq("sale_id", id);
    if (saleItemsError) { await abortTransaction(); throw saleItemsError; }
    
    // Delete the sale
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) { await abortTransaction(); throw error; }
    
    await endTransaction();
    await logSystemEvent({
      userId: userId!,
      userDisplayName: userDisplayName!,
      actionType: 'DELETE',
      entityTable: 'sales',
      entityId: id,
      oldData: saleToDeleteForLog
    });
  } catch (error) {
    await abortTransaction();
    throw error;
  }
};
