export type LogActionType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface SystemLog {
  id: string; // UUID
  created_at: string; // TIMESTAMPTZ - pode ser string ou Date dependendo da transformação
  user_id: string | null; // UUID do auth.users
  user_display_name: string | null; // Adicionada a nova coluna
  // user_description: string | null; // Removido - não existe na tabela system_logs
  action_type: LogActionType;
  entity_schema: string; // Adicionado - existe na tabela
  entity_table: string;  // Confirmado como entity_table
  entity_id: string | null; // Pode ser UUID ou outro tipo de ID como TEXT
  old_data: Record<string, any> | null; // Coluna separada
  new_data: Record<string, any> | null; // Coluna separada
  
  // Campos opcionais que podem ser populados no frontend após buscar o usuário (se necessário)
  // user_email?: string; 
  // user_full_name?: string; 
}

// Interface para os filtros da página de logs
export interface LogFilters {
  userId?: string | null; // Permitir null para "todos os usuários"
  entityTable?: string | null;    // Alterado de volta para entityTable
  actionType?: LogActionType | null; // Permitir null para "todos os tipos de ação"
  dateFrom?: string; // Formato YYYY-MM-DD
  dateTo?: string;   // Formato YYYY-MM-DD
  page?: number;
  pageSize?: number;
}

// Opcional: para popular dropdowns de filtro
export interface UserSelectItem {
  id: string;
  display_name: string; // Agora virá de user_display_name (com fallback)
}

export interface EntityTableSelectItem { // Alterado de volta para EntityTableSelectItem
  name: string;
}
