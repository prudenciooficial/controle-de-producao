import { supabase } from "@/integrations/supabase/client";

export type LogActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'OTHER';

interface LogSystemEventParams {
  userId?: string | null;
  userDisplayName?: string | null;
  actionType: LogActionType;
  entityTable: string;
  entityId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

export async function logSystemEvent({
  userId,
  userDisplayName,
  actionType,
  entityTable,
  entityId,
  oldData,
  newData,
}: LogSystemEventParams) {
  try {
    // Mapeamento para action_type aceito pelo banco
    const mapActionType = (action: LogActionType): 'INSERT' | 'UPDATE' | 'DELETE' => {
      switch (action) {
        case 'CREATE':
        case 'LOGIN':
        case 'LOGOUT':
        case 'OTHER':
          return 'INSERT';
        case 'UPDATE':
          return 'UPDATE';
        case 'DELETE':
          return 'DELETE';
        default:
          return 'INSERT';
      }
    };

    // Preparar dados com contexto adicional se necessário
    const prepareDataWithContext = (data: Record<string, unknown> | null, originalAction: LogActionType): Record<string, unknown> | null => {
      if (!data) return null;
      
      // Se não é uma ação padrão do banco, adicionar contexto
      if (!['UPDATE', 'DELETE'].includes(originalAction)) {
        return {
          ...data,
          _log_context: {
            original_action: originalAction
          }
        };
      }
      
      return data;
    };

    const mappedActionType = mapActionType(actionType);
    
    // Garantir que os dados estejam corretos baseado no action_type
    // para satisfazer a constraint check_data_for_action
    let finalOldData = null;
    let finalNewData = null;

    if (mappedActionType === 'INSERT') {
      // Para INSERT: deve ter new_data (obrigatório pela constraint)
      finalNewData = newData ? prepareDataWithContext(newData, actionType) : prepareDataWithContext({
        action: actionType,
        entity_table: entityTable,
        entity_id: entityId,
        timestamp: new Date().toISOString(),
        user_id: userId,
        user_display_name: userDisplayName
      }, actionType);
      finalOldData = null; // INSERT não deve ter old_data
    } else if (mappedActionType === 'UPDATE') {
      // Para UPDATE: deve ter old_data e new_data (obrigatório pela constraint)
      finalOldData = oldData || { previous_state: 'not_provided' };
      finalNewData = newData || { new_state: 'not_provided' };
    } else if (mappedActionType === 'DELETE') {
      // Para DELETE: deve ter old_data (obrigatório pela constraint)
      finalOldData = oldData || {
        deleted_entity: entityTable,
        deleted_id: entityId,
        timestamp: new Date().toISOString()
      };
      finalNewData = null; // DELETE não deve ter new_data
    }

    const logEntryForSupabase = {
      action_type: mappedActionType,
      entity_schema: 'public', // Schema obrigatório
      entity_table: entityTable || 'unknown',
      // Campos opcionais apenas se tiverem valor
      ...(userId && { user_id: userId }),
      ...(userDisplayName && { user_display_name: userDisplayName }),
      ...(entityId && { entity_id: entityId }),
      // Incluir dados conforme exigido pela constraint
      ...(finalOldData && { old_data: finalOldData }),
      ...(finalNewData && { new_data: finalNewData }),
    };

    const { data, error } = await supabase
      .from("system_logs")
      .insert(logEntryForSupabase)
      .select()
      .single();

    if (error) {
      // Fallback: inserção sem retorno de dados  
      const { error: insertError } = await supabase
        .from("system_logs")
        .insert(logEntryForSupabase);

      if (insertError) {
        console.error("Falha ao registrar log:", insertError);
        return;
      }

      // console.log("Log registrado com inserção alternativa (sem retorno de dados)");
      return;
    }

    if (data) {
      // console.log("Log registrado com sucesso:", data);
    }
  } catch (error) {
    // Sempre fazer fallback silencioso para log de sistema
    // console.log("Tentando registrar log (com dados corrigidos):", logEntryForSupabase);
    console.error("Erro ao registrar log (modo fallback):", error);
  }
} 
