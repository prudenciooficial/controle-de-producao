
import { SystemLog } from "@/types/logs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Calendar, User, Package, Info } from "lucide-react";
import * as React from "react";

type LogCardProps = {
  log: SystemLog;
  actionLabel: string;
  details: string;
};

export function LogCard({ log, actionLabel, details }: LogCardProps) {
  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Calendar className="h-4 w-4" />
        <span>{format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
        <span className="px-2">•</span>
        <User className="h-4 w-4" />
        <span className="truncate max-w-[120px]">{log.user_display_name || log.user_id || "N/A"}</span>
      </div>
      <div className="flex gap-3 items-center">
        <Package className="h-4 w-4 text-primary" />
        <span className="text-primary font-medium truncate">{log.entity_table || "N/A"}</span>
        <span className="bg-muted px-2 rounded text-xs">
          {log.entity_id || "N/A"}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <Info className="h-4 w-4 text-blue-500" />
        <span className="font-semibold text-blue-700 dark:text-blue-300">{actionLabel}</span>
      </div>
      <div className="bg-muted/40 rounded text-xs px-2 py-2 whitespace-pre-wrap max-w-full">
        {details}
      </div>
    </div>
  );
}
