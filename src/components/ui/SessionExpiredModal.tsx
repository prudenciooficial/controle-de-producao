import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface SessionExpiredModalProps {
  open: boolean;
  onReconnect: () => void;
}

export const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({
  open,
  onReconnect,
}) => {
  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <DialogTitle className="text-xl font-bold text-red-600 dark:text-red-400">
            Sessão Expirada
          </DialogTitle>
          <DialogDescription className="text-center text-gray-600 dark:text-gray-400 mt-2">
            Sua sessão foi expirada por motivos de segurança. 
            <br />
            Por favor, reconecte-se ao sistema para continuar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center mt-6">
          <Button 
            onClick={onReconnect}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reconectar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 