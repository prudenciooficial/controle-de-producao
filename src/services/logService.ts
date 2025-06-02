
import { supabase } from "@/integrations/supabase/client";
import type { LogEntry } from "../types";

interface CreateLogEntryPayload {
  user_id?: string;
  user_description?: string;
  action_type: LogEntry['action_type'];
  entity_type?: string;
  entity_id?: string;
  details: string | Record<string, any>;
}

export const createLogEntry = async (payload: CreateLogEntryPayload): Promise<void> => {
  const { data, error } = await (supabase as any)
    .from("system_logs")
    .insert([{
      user_id: payload.user_id,
      user_description: payload.user_description,
      action_type: payload.action_type,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      details: typeof payload.details === 'string' ? { message: payload.details } : payload.details,
    }]);

  if (error) {
    console.error("Error creating log entry:", error);
    // Consider how to handle logging errors. For now, we'll just log to console.
    // Throwing an error here might interrupt critical operations if logging fails.
  }
}; 
