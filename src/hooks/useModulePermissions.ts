import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useModulePermissions = () => {
  const { hasRole, user } = useAuth();

  const getModuleAccess = useMemo(() => {
    const checkModuleAccess = (moduleKey: string, customCheck?: () => boolean) => {
      // Verificando acesso ao módulo
      
      // Admin sempre tem acesso
      if (hasRole('admin')) {
        // Admin tem acesso total
        return true;
      }

      // Verificação customizada (para casos especiais como logs)
      if (customCheck) {
        const result = customCheck();
        // Verificação customizada
        return result;
      }

      // Verificar se o usuário tem permissões definidas
      const userPermissions = user?.user_metadata?.permissions;
      // Usuário e permissões
      
      if (!userPermissions) {
        // Usuário não tem permissões definidas
        return false;
      }

      // Verificar se o usuário está ativo
      if (userPermissions.system_status !== 'active') {
        // Usuário inativo
        return false;
      }

      // Verificar acesso ao módulo específico
      const hasModuleAccess = userPermissions.modules_access?.[moduleKey] === true;
      // Acesso ao módulo verificado
      
      if (!hasModuleAccess) {
        // Sem acesso ao módulo
        return false;
      }

      // Acesso permitido
      return true;
    };

    return checkModuleAccess;
  }, [hasRole, user]);

  const getPageAccess = useMemo(() => {
    const checkPageAccess = (pageKey: string) => {
      // Verificando acesso à página
      
      // Admin sempre tem acesso
      if (hasRole('admin')) {
        // Admin tem acesso total
        return true;
      }

      // Verificar se o usuário tem permissões definidas
      const userPermissions = user?.user_metadata?.permissions;
      
      if (!userPermissions) {
        // Usuário não tem permissões definidas
        return false;
      }

      // Verificar se o usuário está ativo
      if (userPermissions.system_status !== 'active') {
        // Usuário inativo
        return false;
      }

      // Verificar acesso à página específica
      const hasPageAccess = userPermissions.pages_access?.[pageKey] === true;
      // Acesso à página verificado
      
      if (!hasPageAccess) {
        // Sem acesso à página
        return false;
      }

      // Acesso permitido
      return true;
    };

    return checkPageAccess;
  }, [hasRole, user]);

  return {
    getModuleAccess,
    getPageAccess
  };
}; 