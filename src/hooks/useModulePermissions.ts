import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useModulePermissions = () => {
  const { hasRole, hasPermission, canViewSystemLogs, user } = useAuth();

  const getModuleAccess = useMemo(() => {
    const checkModuleAccess = (moduleKey: string, customCheck?: () => boolean) => {
      console.log(`🔍 Verificando acesso ao módulo: ${moduleKey}`);
      
      // Admin sempre tem acesso
      if (hasRole('admin')) {
        console.log(`✅ ${moduleKey}: Admin tem acesso total`);
        return true;
      }

      // Verificação customizada (para casos especiais como logs)
      if (customCheck) {
        const result = customCheck();
        console.log(`🔧 ${moduleKey}: Verificação customizada = ${result}`);
        return result;
      }

      // Verificar se o usuário tem permissões definidas
      const userPermissions = user?.user_metadata?.permissions;
      console.log(`👤 Usuário: ${user?.email}`);
      console.log(`📋 Permissões do usuário:`, userPermissions);

      if (!userPermissions) {
        console.log(`❌ ${moduleKey}: Usuário não tem permissões definidas`);
        return false;
      }

      // Verificar status do sistema
      if (userPermissions.system_status !== 'active') {
        console.log(`❌ ${moduleKey}: Usuário inativo (${userPermissions.system_status})`);
        return false;
      }

      // Verificar acesso ao módulo
      const hasModuleAccess = userPermissions.modules_access?.[moduleKey] === true;
      console.log(`🎯 ${moduleKey}: modules_access[${moduleKey}] = ${hasModuleAccess}`);
      
      if (!hasModuleAccess) {
        console.log(`❌ ${moduleKey}: Sem acesso ao módulo`);
        return false;
      }

      // Verificar se o módulo tem ações específicas e se tem permissão de leitura
      const moduleActions = userPermissions.module_actions?.[moduleKey];
      console.log(`⚙️ ${moduleKey}: module_actions =`, moduleActions);

      // Se não tem ações específicas definidas, permitir acesso
      if (!moduleActions) {
        console.log(`✅ ${moduleKey}: Sem ações específicas, acesso permitido`);
        return true;
      }

      // Se tem ações específicas, verificar se tem permissão de leitura
      const canRead = moduleActions.read === true;
      console.log(`📖 ${moduleKey}: Permissão de leitura = ${canRead}`);

      if (!canRead) {
        console.log(`❌ ${moduleKey}: Sem permissão de leitura`);
        return false;
      }

      console.log(`✅ ${moduleKey}: Acesso permitido!`);
      return true;
    };

    return checkModuleAccess;
  }, [hasRole, hasPermission, canViewSystemLogs, user]);

  return { getModuleAccess };
}; 