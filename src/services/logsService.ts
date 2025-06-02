
import { supabase } from "@/integrations/supabase/client";
import type { LogEntry } from "../types";

export interface LogFilters {
  userId?: string;
  entityType?: string;
  actionType?: string;
  startDate?: Date;
  endDate?: Date;
  searchText?: string;
}

export interface LogsResponse {
  logs: LogEntry[];
  totalCount: number;
}

export const fetchSystemLogs = async (
  filters: LogFilters = {},
  page: number = 1,
  pageSize: number = 50
): Promise<LogsResponse> => {
  let query = supabase
    .from("system_logs")
    .select("*", { count: 'exact' })
    .order("created_at", { ascending: false });

  // Aplicar filtros
  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }

  if (filters.actionType) {
    query = query.eq("action_type", filters.actionType);
  }

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate.toISOString());
  }

  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate.toISOString());
  }

  if (filters.searchText) {
    query = query.or(`user_description.ilike.%${filters.searchText}%,details->>message.ilike.%${filters.searchText}%`);
  }

  // Paginação
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;

  const logs: LogEntry[] = data.map(log => ({
    id: log.id,
    created_at: log.created_at,
    user_id: log.user_id,
    user_description: log.user_description,
    action_type: log.action_type as LogEntry['action_type'],
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    details: log.details
  }));

  return {
    logs,
    totalCount: count || 0
  };
};

export const getEntityTypes = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from("system_logs")
    .select("entity_type")
    .not("entity_type", "is", null);

  if (error) throw error;

  const uniqueTypes = [...new Set(data.map(item => item.entity_type))].filter(Boolean);
  return uniqueTypes.sort();
};

export const getUsersFromLogs = async (): Promise<Array<{id: string, description: string}>> => {
  const { data, error } = await supabase
    .from("system_logs")
    .select("user_id, user_description")
    .not("user_id", "is", null)
    .not("user_description", "is", null);

  if (error) throw error;

  const uniqueUsers = data.reduce((acc, item) => {
    if (!acc.find(u => u.id === item.user_id)) {
      acc.push({ id: item.user_id, description: item.user_description });
    }
    return acc;
  }, [] as Array<{id: string, description: string}>);

  return uniqueUsers.sort((a, b) => a.description.localeCompare(b.description));
};
