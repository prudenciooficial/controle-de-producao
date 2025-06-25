import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Permission {
  id: string;
  [key: string]: unknown;
}

const usePermissionManager = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<Record<string, Permission>>({});

  const refreshPermissions = useCallback(async () => {
    if (!user?.user_metadata?.permissions) {
      // console.log('[Permission Manager] Usuário sem permissões definidas');
      return;
    }

    // console.log('[Permission Manager] Atualizando permissões do usuário');
    
    const newPermissions: Record<string, Permission> = {};
    
    const userPermissions = user.user_metadata.permissions as Record<string, Permission>;
    for (const permission of Object.values(userPermissions)) {
      if (permission && typeof permission === 'object' && 'id' in permission) {
        newPermissions[permission.id] = permission;
      }
    }
    
    setPermissions(newPermissions);
    // console.log('[Permission Manager] Permissões atualizadas:', Object.keys(newPermissions));
  }, [user]);

  // Inicializar permissões quando o usuário mudar
  useEffect(() => {
    // console.log('[Permission Manager] Inicializando permissões...');
    refreshPermissions();
  }, [refreshPermissions]);

  return {
    permissions,
    refreshPermissions
  };
};

export default usePermissionManager; 