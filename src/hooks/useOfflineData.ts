import { useState, useEffect } from 'react';
import { materialsAdapter } from '@/services/database/MaterialsAdapter';

export interface OfflineDataState<T> {
  data: T[];
  loading: boolean;
  isOnline: boolean;
  error: string | null;
  pendingOperations: number;
  lastSync: Date | null;
}

export const useOfflineData = <T>(
  fetchFunction: () => Promise<T[]>,
  dependencies: unknown[] = [],
  syncInterval: number = 30000 // 30 segundos
): OfflineDataState<T> => {
  const [state, setState] = useState<OfflineDataState<T>>({
    data: [],
    loading: true,
    isOnline: true,
    error: null,
    pendingOperations: 0,
    lastSync: null
  });

  // Função para carregar dados
  const loadData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const data = await fetchFunction();
      const isOnline = await materialsAdapter.isOnline();
      
      setState(prev => ({
        ...prev,
        data,
        isOnline,
        loading: false,
        lastSync: new Date()
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false
      }));
    }
  };

  // Função para verificar status de conectividade
  const checkConnectivity = async () => {
    try {
      const isOnline = await materialsAdapter.isOnline();
      setState(prev => ({ ...prev, isOnline }));
      
      // Se voltou online, tentar sincronizar
      if (isOnline && !state.isOnline) {
        console.log('🔄 Voltou online - iniciando sincronização...');
        await materialsAdapter.syncPendingOperations();
        await loadData(); // Recarregar dados após sync
      }
    } catch (error) {
      console.error('Erro ao verificar conectividade:', error);
    }
  };

  // Carregamento inicial
  useEffect(() => {
    loadData();
  }, dependencies);

  // Verificação periódica de conectividade
  useEffect(() => {
    const interval = setInterval(checkConnectivity, 10000); // Verifica a cada 10s
    return () => clearInterval(interval);
  }, [state.isOnline]);

  // Sincronização automática quando online
  useEffect(() => {
    if (!state.isOnline || syncInterval <= 0) return;

    const syncTimer = setInterval(async () => {
      if (await materialsAdapter.isOnline()) {
        try {
          await materialsAdapter.syncPendingOperations();
          // Recarregar dados após sincronização bem-sucedida
          await loadData();
        } catch (error) {
          console.error('Erro na sincronização automática:', error);
        }
      }
    }, syncInterval);

    return () => clearInterval(syncTimer);
  }, [state.isOnline, syncInterval]);

  return state;
};

// Hook específico para materials
export const useMaterials = () => {
  return useOfflineData(
    () => materialsAdapter.getMaterials(),
    [],
    30000 // Sincronizar a cada 30 segundos
  );
};

// Hook para verificar apenas conectividade
export const useConnectivity = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingOperations, setPendingOperations] = useState<number>(0);

  useEffect(() => {
    const checkStatus = async () => {
      const online = await materialsAdapter.isOnline();
      setIsOnline(online);
      
      if (!online) {
        // Buscar número de operações pendentes quando offline
        try {
          const pending = await materialsAdapter.getPendingOperations();
          setPendingOperations(pending.length);
        } catch (error) {
          console.error('Erro ao buscar operações pendentes:', error);
        }
      } else {
        setPendingOperations(0);
      }
    };

    // Verificação inicial
    checkStatus();

    // Verificação periódica
    const interval = setInterval(checkStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  return { isOnline, pendingOperations };
}; 