import { supabase } from "@/integrations/supabase/client";
import { logSystemEvent } from "./logService";
import { beginTransaction, endTransaction, abortTransaction } from "./base/supabaseClient";

export interface StockReduction {
  id?: string;
  date: string;
  materialBatchId: string;
  quantity: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const createStockReduction = async (
  stockReduction: Omit<StockReduction, "id" | "createdAt" | "updatedAt">,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  try {
    await beginTransaction();

    // Primeiro, verificar se o lote de material existe e tem quantidade suficiente
    const { data: materialBatch, error: materialError } = await (supabase as any)
      .from("material_batches")
      .select(`
        id, 
        batch_number, 
        remaining_quantity, 
        unit_of_measure,
        materials:material_id (
          name,
          type
        )
      `)
      .eq("id", stockReduction.materialBatchId)
      .single();

    if (materialError) {
      await abortTransaction();
      throw new Error(`Erro ao verificar lote de material: ${materialError.message}`);
    }

    if (!materialBatch) {
      await abortTransaction();
      throw new Error("Lote de material não encontrado");
    }

    if (stockReduction.quantity > materialBatch.remaining_quantity) {
      await abortTransaction();
      throw new Error(
        `Quantidade insuficiente em estoque. Disponível: ${materialBatch.remaining_quantity} ${materialBatch.unit_of_measure}, Solicitado: ${stockReduction.quantity} ${materialBatch.unit_of_measure}`
      );
    }

    // Inserir registro da baixa de estoque usando SQL direto
    const { data: reductionData, error: reductionError } = await (supabase as any)
      .from("baixas_estoque")
      .insert({
        data: stockReduction.date,
        lote_material_id: stockReduction.materialBatchId,
        quantidade: stockReduction.quantity,
        observacoes: stockReduction.notes || null,
      })
      .select()
      .single();

    if (reductionError) {
      await abortTransaction();
      throw new Error(`Erro ao registrar baixa de estoque: ${reductionError.message}`);
    }

    // Atualizar quantidade restante do lote de material
    const newRemainingQuantity = materialBatch.remaining_quantity - stockReduction.quantity;
    
    const { error: updateError } = await (supabase as any)
      .from("material_batches")
      .update({ remaining_quantity: newRemainingQuantity })
      .eq("id", stockReduction.materialBatchId);

    if (updateError) {
      await abortTransaction();
      throw new Error(`Erro ao atualizar estoque: ${updateError.message}`);
    }

    await endTransaction();

    // Log da operação
    if (userId && userDisplayName) {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'CREATE',
        entityTable: 'baixas_estoque',
        entityId: reductionData.id,
        newData: {
          ...reductionData,
          material_name: materialBatch.materials?.name,
          batch_number: materialBatch.batch_number,
          old_quantity: materialBatch.remaining_quantity,
          new_quantity: newRemainingQuantity
        }
      });
    }

    console.log(`[StockReductionService] Baixa de estoque processada com sucesso: ${reductionData.id}`);
    
  } catch (error) {
    console.error("Error creating stock reduction:", error);
    try {
      await abortTransaction();
    } catch (rollbackError) {
      console.error("Error in rollback:", rollbackError);
    }
    throw error;
  }
};

export const getStockReductions = async () => {
  try {
    const { data, error } = await (supabase as any)
      .from("baixas_estoque")
      .select(`
        *,
        material_batches:lote_material_id (
          id,
          batch_number,
          unit_of_measure,
          remaining_quantity,
          materials:material_id (
            name,
            type
          )
        )
      `)
      .order("data", { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching stock reductions:", error);
    throw error;
  }
};

export const deleteStockReduction = async (
  id: string,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  try {
    await beginTransaction();

    // Buscar dados da baixa antes de excluir
    const { data: reductionData, error: fetchError } = await (supabase as any)
      .from("baixas_estoque")
      .select(`
        *,
        material_batches:lote_material_id (
          id,
          batch_number,
          remaining_quantity,
          unit_of_measure,
          materials:material_id (
            name,
            type
          )
        )
      `)
      .eq("id", id)
      .single();

    if (fetchError) {
      await abortTransaction();
      throw new Error(`Erro ao buscar baixa de estoque: ${fetchError.message}`);
    }

    if (!reductionData) {
      await abortTransaction();
      throw new Error("Baixa de estoque não encontrada");
    }

    // Reverter a quantidade no estoque (adicionar de volta)
    const materialBatch = reductionData.material_batches;
    if (materialBatch) {
      const newRemainingQuantity = materialBatch.remaining_quantity + reductionData.quantidade;
      
      const { error: updateError } = await (supabase as any)
        .from("material_batches")
        .update({ remaining_quantity: newRemainingQuantity })
        .eq("id", reductionData.lote_material_id);

      if (updateError) {
        await abortTransaction();
        throw new Error(`Erro ao reverter estoque: ${updateError.message}`);
      }
    }

    // Excluir registro da baixa
    const { error: deleteError } = await (supabase as any)
      .from("baixas_estoque")
      .delete()
      .eq("id", id);

    if (deleteError) {
      await abortTransaction();
      throw new Error(`Erro ao excluir baixa de estoque: ${deleteError.message}`);
    }

    await endTransaction();

    // Log da operação
    if (userId && userDisplayName) {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'DELETE',
        entityTable: 'baixas_estoque',
        entityId: id,
        oldData: {
          ...reductionData,
          material_name: materialBatch?.materials?.name,
          batch_number: materialBatch?.batch_number
        }
      });
    }

    console.log(`[StockReductionService] Baixa de estoque excluída com sucesso: ${id}`);
    
  } catch (error) {
    console.error("Error deleting stock reduction:", error);
    try {
      await abortTransaction();
    } catch (rollbackError) {
      console.error("Error in rollback:", rollbackError);
    }
    throw error;
  }
};

export const updateStockReduction = async (
  id: string,
  updates: Partial<Omit<StockReduction, "id" | "createdAt" | "updatedAt">>,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  try {
    await beginTransaction();

    // Buscar dados atuais da baixa
    const { data: currentReduction, error: fetchError } = await (supabase as any)
      .from("baixas_estoque")
      .select(`
        *,
        material_batches:lote_material_id (
          id,
          batch_number,
          remaining_quantity,
          unit_of_measure,
          materials:material_id (
            name,
            type
          )
        )
      `)
      .eq("id", id)
      .single();

    if (fetchError) {
      await abortTransaction();
      throw new Error(`Erro ao buscar baixa de estoque: ${fetchError.message}`);
    }

    if (!currentReduction) {
      await abortTransaction();
      throw new Error("Baixa de estoque não encontrada");
    }

    const materialBatch = currentReduction.material_batches;
    if (!materialBatch) {
      await abortTransaction();
      throw new Error("Lote de material não encontrado");
    }

    // Se a quantidade foi alterada, ajustar estoque
    if (updates.quantity !== undefined && updates.quantity !== currentReduction.quantidade) {
      const quantityDifference = updates.quantity - currentReduction.quantidade;
      const newRemainingQuantity = materialBatch.remaining_quantity - quantityDifference;

      // Verificar se há estoque suficiente para o ajuste
      if (newRemainingQuantity < 0) {
        await abortTransaction();
        throw new Error(
          `Estoque insuficiente para esta alteração. Disponível: ${materialBatch.remaining_quantity} ${materialBatch.unit_of_measure}`
        );
      }

      // Atualizar quantidade restante do lote
      const { error: updateStockError } = await (supabase as any)
        .from("material_batches")
        .update({ remaining_quantity: newRemainingQuantity })
        .eq("id", currentReduction.lote_material_id);

      if (updateStockError) {
        await abortTransaction();
        throw new Error(`Erro ao atualizar estoque: ${updateStockError.message}`);
      }
    }

    // Atualizar registro da baixa
    const updateData: any = {};
    if (updates.date) updateData.data = updates.date;
    if (updates.quantity !== undefined) updateData.quantidade = updates.quantity;
    if (updates.notes !== undefined) updateData.observacoes = updates.notes;

    const { data: updatedReduction, error: updateError } = await (supabase as any)
      .from("baixas_estoque")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      await abortTransaction();
      throw new Error(`Erro ao atualizar baixa de estoque: ${updateError.message}`);
    }

    await endTransaction();

    // Log da operação
    if (userId && userDisplayName) {
      await logSystemEvent({
        userId,
        userDisplayName,
        actionType: 'UPDATE',
        entityTable: 'baixas_estoque',
        entityId: id,
        oldData: {
          ...currentReduction,
          material_name: materialBatch.materials?.name,
          batch_number: materialBatch.batch_number
        },
        newData: {
          ...updatedReduction,
          material_name: materialBatch.materials?.name,
          batch_number: materialBatch.batch_number
        }
      });
    }

    console.log(`[StockReductionService] Baixa de estoque atualizada com sucesso: ${id}`);
    
  } catch (error) {
    console.error("Error updating stock reduction:", error);
    try {
      await abortTransaction();
    } catch (rollbackError) {
      console.error("Error in rollback:", rollbackError);
    }
    throw error;
  }
}; 