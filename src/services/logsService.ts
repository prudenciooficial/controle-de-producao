import { supabase } from '@/integrations/supabase/client';
import { SystemLog } from '@/types/logs'; // Precisaremos definir este tipo

export interface LogFilters {
  userId?: string;
  entityType?: string;
  startDate?: string; // Formato YYYY-MM-DD
  endDate?: string;   // Formato YYYY-MM-DD
  page?: number;
  pageSize?: number;
}

export interface FetchLogsResponse {
  logs: SystemLog[];
  count: number;
}

// Função para buscar os logs do sistema com filtros e paginação
export const fetchSystemLogs = async (filters: LogFilters): Promise<FetchLogsResponse> => {
  let query = supabase
    .from('system_logs')
    .select('*', { count: 'exact' });

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }
  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    // Adiciona 1 dia ao endDate para incluir todos os logs do dia selecionado
    const nextDay = new Date(filters.endDate);
    nextDay.setDate(nextDay.getDate() + 1);
    query = query.lt('created_at', nextDay.toISOString().split('T')[0]);
  }

  // Ordenação padrão: mais recentes primeiro
  query = query.order('created_at', { ascending: false });

  // Paginação
  if (filters.page && filters.pageSize) {
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching system logs:', error);
    throw new Error(error.message || 'Falha ao buscar logs do sistema.');
  }

  return { logs: (data as SystemLog[]) || [], count: count || 0 };
};

// Função para buscar usuários distintos que realizaram ações (para o filtro)
export const fetchLogUsers = async (): Promise<{ id: string; description: string }[]> => {
  const { data, error } = await supabase
    .from('system_logs')
    .select('user_id, user_description')
    // .distinctOn(['user_id', 'user_description']); // distinctOn não é diretamente suportado assim no JS SDK para todas as bases

  if (error) {
    console.error('Error fetching distinct log users:', error);
    throw new Error(error.message || 'Falha ao buscar usuários para filtro de logs.');
  }

  // Processamento para obter valores distintos, já que distinctOn pode não funcionar como esperado
  const uniqueUsersMap = new Map<string, { id: string; description: string }>();
  data?.forEach(item => {
    if (item.user_id && item.user_description && !uniqueUsersMap.has(item.user_id)) {
      uniqueUsersMap.set(item.user_id, { id: item.user_id, description: item.user_description });
    }
  });
  
  return Array.from(uniqueUsersMap.values()).sort((a, b) => a.description.localeCompare(b.description));
};

// Função para buscar tipos de entidade distintos (para o filtro)
export const fetchLogEntityTypes = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('system_logs')
    .select('entity_type');
    // .distinctOn(['entity_type']); // Mesmo caso do distinctOn acima

  if (error) {
    console.error('Error fetching distinct entity types:', error);
    throw new Error(error.message || 'Falha ao buscar tipos de entidade para filtro de logs.');
  }
  
  const uniqueEntityTypes = new Set<string>();
  data?.forEach(item => {
    if (item.entity_type) {
      uniqueEntityTypes.add(item.entity_type);
    }
  });

  return Array.from(uniqueEntityTypes).sort();
}; 