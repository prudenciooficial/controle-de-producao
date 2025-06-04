export type LogActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'INSERT' | 'LOGIN' | 'LOGOUT' | 'OTHER';

export interface SystemLog {
  id: string; // UUID
  created_at: string; // TIMESTAMPTZ - pode ser string ou Date dependendo da transformação
  user_id: string | null; // UUID do auth.users
  user_display_name: string | null; // Nome de exibição do usuário
  // user_description: string | null; // Removido - não existe na tabela system_logs
  action_type: 'INSERT' | 'UPDATE' | 'DELETE'; // Tipos aceitos pelo banco de dados
  entity_schema: string; // Schema da tabela (ex: 'public')
  entity_table: string;  // Nome da tabela
  entity_id: string | null; // ID da entidade afetada
  old_data: Record<string, any> | null; // Dados antes da alteração
  new_data: Record<string, any> | null; // Dados após a alteração
  
  // Campos opcionais que podem ser populados no frontend após buscar o usuário (se necessário)
  // user_email?: string; 
  // user_full_name?: string; 
}

// Interface para os filtros da página de logs
export interface LogFilters {
  userId?: string | null; // Permitir null para "todos os usuários"
  entityTable?: string | null;
  actionType?: 'INSERT' | 'UPDATE' | 'DELETE' | null; // Tipos aceitos pelo banco
  dateFrom?: string; // Formato YYYY-MM-DD
  dateTo?: string;   // Formato YYYY-MM-DD
  page?: number;
  pageSize?: number;
}

// Para popular dropdowns de filtro
export interface UserSelectItem {
  id: string;
  display_name: string; // Nome de exibição do usuário
}

export interface EntityTableSelectItem {
  name: string;
}
