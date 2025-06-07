import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logSystemEvent } from '@/services/logService';

interface ModuleActions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

interface DetailedPermissions {
  system_status: 'active' | 'inactive';
  modules_access: { [moduleKey: string]: boolean };
  module_actions: { [moduleKey: string]: ModuleActions };
  can_view_system_logs?: boolean;
}

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
  onPermissionsUpdated: () => void;
}

const ALL_MODULES = [
  { key: 'dashboard', label: 'Dashboard', has_actions: false },
  { key: 'production', label: 'Produção', has_actions: true },
  { key: 'sales', label: 'Vendas', has_actions: true },
  { key: 'orders', label: 'Pedidos', has_actions: true },
  { key: 'inventory', label: 'Estoque', has_actions: true },
  { key: 'losses', label: 'Perdas', has_actions: true },
  { key: 'traceability', label: 'Rastreabilidade', has_actions: false },
  { key: 'general_settings', label: 'Cadastros (Geral)', has_actions: true },
  { key: 'human_resources', label: 'Recursos Humanos', has_actions: true },
  { key: 'user_management', label: 'Gerenciamento de Usuários', has_actions: true },
];

const ACTION_KEYS: (keyof ModuleActions)[] = ['create', 'read', 'update', 'delete'];
const ACTION_LABELS: Record<keyof ModuleActions, string> = {
  create: 'Criar',
  read: 'Visualizar',
  update: 'Editar',
  delete: 'Excluir',
};

const getDefaultPermissions = (): DetailedPermissions => {
  const defaultModulesAccess: { [moduleKey: string]: boolean } = {};
  const defaultModuleActions: { [moduleKey: string]: ModuleActions } = {};

  ALL_MODULES.forEach(module => {
    defaultModulesAccess[module.key] = false;
    if (module.has_actions) {
      defaultModuleActions[module.key] = {
        create: false,
        read: false,
        update: false,
        delete: false,
      };
    }
  });

  return {
    system_status: 'active',
    modules_access: defaultModulesAccess,
    module_actions: defaultModuleActions,
    can_view_system_logs: false,
  };
};

export function UserPermissionsDialog({ open, onOpenChange, user, onPermissionsUpdated }: UserPermissionsDialogProps) {
  const { toast } = useToast();
  const { getSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentPermissions, setCurrentPermissions] = useState<DetailedPermissions | null>(null);

  useEffect(() => {
    if (user && open) {
      if (user.user_metadata?.permissions) {
        const loadedPermissions = user.user_metadata.permissions as DetailedPermissions;
        const defaultPerms = getDefaultPermissions();
        
        const mergedPermissions: DetailedPermissions = {
          system_status: loadedPermissions.system_status || defaultPerms.system_status,
          modules_access: { ...defaultPerms.modules_access },
          module_actions: { ...defaultPerms.module_actions },
          can_view_system_logs: typeof loadedPermissions.can_view_system_logs === 'boolean' 
            ? loadedPermissions.can_view_system_logs 
            : defaultPerms.can_view_system_logs,
        };

        for (const module of ALL_MODULES) {
          if (loadedPermissions.modules_access && typeof loadedPermissions.modules_access[module.key] === 'boolean') {
            mergedPermissions.modules_access[module.key] = loadedPermissions.modules_access[module.key];
          }
          if (module.has_actions) {
            if (!mergedPermissions.module_actions[module.key]) {
                mergedPermissions.module_actions[module.key] = { ...defaultPerms.module_actions[module.key] };
            }
            if (loadedPermissions.module_actions && loadedPermissions.module_actions[module.key]) {
              ACTION_KEYS.forEach(action => {
                if (typeof loadedPermissions.module_actions[module.key][action] === 'boolean') {
                  mergedPermissions.module_actions[module.key][action] = loadedPermissions.module_actions[module.key][action];
                }
              });
            }
          }
        }
        setCurrentPermissions(mergedPermissions);
      } else {
        setCurrentPermissions(getDefaultPermissions());
      }
    } else if (!open) {
      setCurrentPermissions(null);
    }
  }, [user, open]);

  const handleSystemStatusChange = (checked: boolean) => {
    setCurrentPermissions(prev => prev ? { ...prev, system_status: checked ? 'active' : 'inactive' } : null);
  };

  const handleModuleAccessChange = (moduleKey: string, checked: boolean) => {
    setCurrentPermissions(prev => {
      if (!prev) return null;
      const newModulesAccess = { ...prev.modules_access, [moduleKey]: checked };
      let newModuleActions = { ...prev.module_actions };
      if (!checked && newModuleActions[moduleKey]) {
        newModuleActions[moduleKey] = {
          create: false, read: false, update: false, delete: false
        };
      }
      return { ...prev, modules_access: newModulesAccess, module_actions: newModuleActions };
    });
  };

  const handleModuleActionChange = (moduleKey: string, actionKey: keyof ModuleActions, checked: boolean) => {
    setCurrentPermissions(prev => {
      if (!prev || !prev.module_actions[moduleKey]) return null;
      const newModulesAccess = checked && !prev.modules_access[moduleKey] 
        ? { ...prev.modules_access, [moduleKey]: true } 
        : prev.modules_access;

      const newModuleActions = {
        ...prev.module_actions,
        [moduleKey]: {
          ...prev.module_actions[moduleKey],
          [actionKey]: checked,
        },
      };
      return { ...prev, modules_access: newModulesAccess, module_actions: newModuleActions };
    });
  };

  const handleCanViewSystemLogsChange = (checked: boolean) => {
    setCurrentPermissions(prev => 
      prev ? { ...prev, can_view_system_logs: checked } : null
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentPermissions) return;

    setLoading(true);
    try {
      const session = await getSession();
      if (!session) {
        throw new Error("Sessão não encontrada. Faça login novamente.");
      }

      const payload = {
        userId: user.id,
        updateData: {
          user_metadata: {
            ...user.user_metadata,
            permissions: currentPermissions
          }
        }
      };

      const { error: invokeError } = await supabase.functions.invoke('update-user-admin', {
        body: payload,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (invokeError) {
        let detailedError = "Falha ao salvar permissões.";
        if (invokeError.context && invokeError.context.responseText) {
            try {
                const errorResponse = JSON.parse(invokeError.context.responseText);
                if (errorResponse.error) detailedError = errorResponse.error;
            } catch (e) { /* ignora erro de parse */ }
        }
        console.error('Error invoking update-user-admin for permissions:', invokeError);
        throw new Error(detailedError);
      }

      // Registrar log da alteração de permissões
      const currentUserSession = session.user;
      await logSystemEvent({
        userId: currentUserSession?.id,
        userDisplayName: currentUserSession?.user_metadata?.full_name || currentUserSession?.email,
        actionType: 'UPDATE',
        entityTable: 'auth.users.permissions',
        entityId: user.id,
        oldData: user.user_metadata?.permissions || {},
        newData: currentPermissions
      });

      toast({
        title: "Permissões atualizadas",
        description: "As permissões do usuário foram atualizadas com sucesso.",
      });

      onPermissionsUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating permissions:', error);
      toast({
        variant: "destructive",
        title: "Erro ao Salvar Permissões",
        description: error.message || "Não foi possível atualizar as permissões.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentPermissions) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Permissões de {user?.user_metadata?.full_name || user?.email}</DialogTitle>
          <DialogDescription>
            Ajuste o status e as permissões de acesso do usuário aos módulos do sistema.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto space-y-6 p-1 pr-3">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Status do Usuário</h3>
            <div className="flex items-center space-x-2 p-4 border rounded-md">
              <Switch
                id="system_status"
                checked={currentPermissions.system_status === 'active'}
                onCheckedChange={handleSystemStatusChange}
              />
              <Label htmlFor="system_status" className="text-base">
                {currentPermissions.system_status === 'active' ? 'Ativo' : 'Inativo'}
              </Label>
              <p className="text-sm text-muted-foreground ml-auto">
                Usuários inativos não podem acessar o sistema.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Permissões Gerais</h3>
            <div className="p-4 border rounded-md space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_view_system_logs"
                  checked={!!currentPermissions.can_view_system_logs}
                  onCheckedChange={handleCanViewSystemLogsChange}
                  disabled={loading || user?.user_metadata?.role === 'admin'}
                />
                <Label htmlFor="can_view_system_logs" className="text-sm font-normal">
                  Visualizar Logs do Sistema
                </Label>
                {user?.user_metadata?.role === 'admin' && (
                  <p className="text-xs text-muted-foreground ml-auto">
                    (Administradores sempre têm acesso aos logs)
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Acesso aos Módulos</h3>
            <div className="p-4 border rounded-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ALL_MODULES.map(module => (
                <div key={module.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`access-${module.key}`}
                    checked={currentPermissions.modules_access[module.key] || false}
                    onCheckedChange={(checked) => handleModuleAccessChange(module.key, checked as boolean)}
                  />
                  <Label htmlFor={`access-${module.key}`} className="text-sm font-medium">
                    {module.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Permissões de Ações nos Módulos</h3>
            <div className="space-y-4">
              {ALL_MODULES.filter(m => m.has_actions).map(module => (
                <div key={`actions-${module.key}`} className="p-4 border rounded-md">
                  <h4 className="text-md font-semibold mb-3">{module.label}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                    {ACTION_KEYS.map(actionKey => (
                      <div key={`${module.key}-${actionKey}`} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${module.key}-action-${actionKey}`}
                          checked={currentPermissions.module_actions[module.key]?.[actionKey] || false}
                          onCheckedChange={(checked) => 
                            handleModuleActionChange(module.key, actionKey, checked as boolean)
                          }
                          disabled={!currentPermissions.modules_access[module.key]}
                        />
                        <Label 
                          htmlFor={`${module.key}-action-${actionKey}`} 
                          className={`text-sm font-medium ${!currentPermissions.modules_access[module.key] ? 'text-muted-foreground' : ''}`}
                        >
                          {ACTION_LABELS[actionKey]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 bg-background pt-4 pb-1 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !currentPermissions}>
              {loading ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
