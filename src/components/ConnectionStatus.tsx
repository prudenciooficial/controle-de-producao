import React from 'react';
import { useConnectivity } from '@/hooks/useOfflineData';
import { syncPendingMaterials } from '@/services/materialsService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

interface ConnectionStatusProps {
  className?: string;
  showSyncButton?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className = "",
  showSyncButton = true 
}) => {
  const { isOnline, pendingOperations } = useConnectivity();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    if (!isOnline) return;
    
    setIsSyncing(true);
    try {
      await syncPendingMaterials();
      console.log('✅ Sincronização manual concluída');
    } catch (error) {
      console.error('❌ Erro na sincronização manual:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusConfig = () => {
    if (isOnline) {
      return {
        icon: Wifi,
        text: 'Online',
        color: 'bg-green-500',
        badgeVariant: 'default' as const,
        textColor: 'text-green-700'
      };
    } else {
      return {
        icon: WifiOff,
        text: 'Offline',
        color: 'bg-red-500',
        badgeVariant: 'destructive' as const,
        textColor: 'text-red-700'
      };
    }
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Indicador de Status */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${status.color} animate-pulse`}></div>
        <StatusIcon className={`h-4 w-4 ${status.textColor}`} />
        <span className={`text-sm font-medium ${status.textColor}`}>
          {status.text}
        </span>
      </div>

      {/* Operações Pendentes */}
      {pendingOperations > 0 && (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {pendingOperations} pendente{pendingOperations > 1 ? 's' : ''}
        </Badge>
      )}

      {/* Botão de Sincronização Manual */}
      {showSyncButton && isOnline && pendingOperations > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      )}

      {/* Status de Sincronização */}
      {isOnline && pendingOperations === 0 && (
        <Badge variant="outline" className="flex items-center gap-1 text-green-600">
          <CheckCircle className="h-3 w-3" />
          Sincronizado
        </Badge>
      )}

      {/* Alerta quando offline com pendências */}
      {!isOnline && pendingOperations > 0 && (
        <Badge variant="outline" className="flex items-center gap-1 text-amber-600">
          <AlertCircle className="h-3 w-3" />
          Dados pendentes
        </Badge>
      )}
    </div>
  );
};

// Componente compacto para header
export const CompactConnectionStatus: React.FC = () => {
  const { isOnline, pendingOperations } = useConnectivity();

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
      
      {pendingOperations > 0 && (
        <Badge variant="secondary" className="text-xs">
          {pendingOperations}
        </Badge>
      )}
    </div>
  );
};

// Toast de notificação quando volta online
export const useOnlineNotification = () => {
  const { isOnline } = useConnectivity();
  const [wasOffline, setWasOffline] = React.useState(false);

  React.useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      // Voltou online após estar offline
      console.log('🟢 Conectividade restaurada - dados sendo sincronizados');
      setWasOffline(false);
    }
  }, [isOnline, wasOffline]);

  return { isOnline, justCameOnline: isOnline && wasOffline };
}; 