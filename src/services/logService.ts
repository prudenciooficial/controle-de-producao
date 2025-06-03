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
  try {
    // Prepare the log entry data with proper validation
    const logData = {
      user_id: payload.user_id || null,
      user_description: payload.user_description || null,
      action_type: payload.action_type,
      entity_type: payload.entity_type || null,
      entity_id: payload.entity_id || null,
      details: typeof payload.details === 'string' 
        ? { message: payload.details } 
        : (payload.details || {}),
    };

    console.log("Skipping log entry creation (system_logs table removed):", logData);

    /*
    const { data, error } = await supabase
      .from("system_logs")
      .insert([logData]);

    if (error) {
      console.error("Error creating log entry:", error);
      // Don't throw here to avoid interrupting critical operations
      // Just log the error for debugging purposes
    } else {
      console.log("Log entry created successfully:", data);
    }
    */
  } catch (error) {
    console.error("Unexpected error creating log entry:", error);
    // Silent fail to not interrupt main operations
  }
}; 
