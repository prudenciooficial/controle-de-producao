export interface SystemLog {
  id: string; // uuid
  created_at: string; // timestamptz
  user_id: string | null; // uuid, pode ser null para ações do sistema
  user_description: string | null; // text
  action_type: 'INSERT' | 'UPDATE' | 'DELETE' | string; // text (string genérico para flexibilidade)
  entity_type: string; // text (nome da tabela)
  entity_id: string | null; // text (ID da entidade afetada)
  details: {
    old_data?: any; // jsonb - dados antigos (para UPDATE, DELETE)
    new_data?: any; // jsonb - dados novos (para INSERT, UPDATE)
  } | null; // jsonb
} 