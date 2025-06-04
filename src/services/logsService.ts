import { supabase } from '@/integrations/supabase/client';
import type { SystemLog, LogFilters, LogActionType, UserSelectItem, EntityTableSelectItem } from '@/types/logs';

export interface FetchLogsResponse {
  logs: SystemLog[];
  count: number;
}

// Função para buscar os logs do sistema com filtros e paginação
export const fetchSystemLogs = async (filters: LogFilters): Promise<FetchLogsResponse> => {
  console.log('fetchSystemLogs called with filters:', filters);
  
  let query = supabase
    .from('system_logs')
    .select(`
      id,
      created_at,
      user_id,
      user_display_name,
      action_type,
      entity_schema,
      entity_table,
      entity_id,
      old_data,
      new_data
    `, { count: 'exact' });

  // Debug: primeiro vamos testar sem filtros
  console.log('Initial query built');

  if (filters.userId) {
    console.log('Adding userId filter:', filters.userId);
    query = query.eq('user_id', filters.userId);
  }
  if (filters.entityTable) {
    console.log('Adding entityTable filter:', filters.entityTable);
    query = query.eq('entity_table', filters.entityTable);
  }
  if (filters.actionType) {
    console.log('Adding actionType filter:', filters.actionType);
    query = query.eq('action_type', filters.actionType);
  }
  if (filters.dateFrom) {
    console.log('Adding dateFrom filter:', filters.dateFrom);
    query = query.gte('created_at', filters.dateFrom);
  }
  if (filters.dateTo) {
    console.log('Adding dateTo filter:', filters.dateTo);
    const nextDay = new Date(filters.dateTo);
    nextDay.setDate(nextDay.getDate() + 1);
    query = query.lt('created_at', nextDay.toISOString().split('T')[0]);
  }

  query = query.order('created_at', { ascending: false });

  if (filters.page && filters.pageSize) {
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    console.log('Adding pagination:', { from, to });
    query = query.range(from, to);
  }

  console.log('Executing query...');
  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching system logs:', error);
    throw new Error(error.message || 'Falha ao buscar logs do sistema.');
  }

  console.log('Query result:', { data, count });

  const logs: SystemLog[] = (data || []).map(item => {
    console.log('Processing log item:', item);
    return {
      id: item.id,
      created_at: item.created_at,
      user_id: item.user_id,
      user_display_name: item.user_display_name,
      action_type: item.action_type as 'INSERT' | 'UPDATE' | 'DELETE',
      entity_schema: item.entity_schema,
      entity_table: item.entity_table,
      entity_id: item.entity_id,
      old_data: (typeof item.old_data === 'object' && item.old_data !== null) ? item.old_data as Record<string, any> : null,
      new_data: (typeof item.new_data === 'object' && item.new_data !== null) ? item.new_data as Record<string, any> : null,
    };
  });

  console.log('Processed logs:', logs);
  return { logs, count: count || 0 };
};

// Função para buscar user_ids distintos que realizaram ações
export const fetchLogUsers = async (): Promise<UserSelectItem[]> => {
  const { data, error } = await supabase
    .from('system_logs')
    .select('user_id, user_display_name')
    .not('user_id', 'is', null);

  if (error) {
    console.error('Error fetching distinct log users:', error);
    throw new Error(error.message || 'Falha ao buscar usuários para filtro de logs.');
  }

  const uniqueUsers = new Map<string, string>();
  (data || []).forEach(item => {
    if (item.user_id) {
      const displayName = item.user_display_name?.trim() ? item.user_display_name.trim() : item.user_id;
      if (!uniqueUsers.has(item.user_id)) {
         uniqueUsers.set(item.user_id, displayName);
      }
    }
  });
  
  return Array.from(uniqueUsers.entries())
    .map(([id, displayName]) => ({ id: id, display_name: displayName }))
    .sort((a,b) => a.display_name.localeCompare(b.display_name));
};

// Função para buscar tipos de entidade (nomes de tabela) distintos
export const fetchLogEntityTables = async (): Promise<EntityTableSelectItem[]> => {
  const { data, error } = await supabase
    .from('system_logs')
    .select('entity_table')
    .not('entity_table', 'is', null);

  if (error) {
    console.error('Error fetching distinct entity tables:', error);
    throw new Error(error.message || 'Falha ao buscar tabelas para filtro de logs.');
  }
  
  const uniqueEntityTables = new Set<string>();
  (data || []).forEach(item => {
    if (item.entity_table) {
      uniqueEntityTables.add(item.entity_table);
    }
  });

  return Array.from(uniqueEntityTables).map(name => ({ name })).sort((a,b) => a.name.localeCompare(b.name));
}; 