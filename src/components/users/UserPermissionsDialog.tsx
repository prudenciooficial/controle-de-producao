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
import { ChevronDown, ChevronRight } from 'lucide-react';

interface SubPage {
  key: string;
  label: string;
  path: string;
}

interface MainModule {
  key: string;
  label: string;
  subPages: SubPage[];
}

interface NewDetailedPermissions {
  system_status: 'active' | 'inactive';
  modules_access: { [moduleKey: string]: boolean };
  pages_access: { [pageKey: string]: boolean };
  can_view_system_logs?: boolean;
}

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      permissions?: NewDetailedPermissions;
      role?: string;
      [key: string]: unknown;
    };
  };
  onPermissionsUpdated: () => void;
}

const MAIN_MODULES: MainModule[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    subPages: [
      { key: 'dashboard', label: 'Painel Principal', path: '/dashboard' }
    ]
  },
  {
    key: 'production',
    label: 'Produção',
    subPages: [
      { key: 'mexida', label: 'Mexidas', path: '/mexida' },
      { key: 'producao', label: 'Produção', path: '/producao' },
      { key: 'vendas', label: 'Vendas', path: '/vendas' },
      { key: 'pedidos', label: 'Pedidos', path: '/pedidos' },
      { key: 'estoque', label: 'Estoque', path: '/estoque' },
      { key: 'perdas', label: 'Perdas', path: '/perdas' },
      { key: 'cadastro', label: 'Cadastro', path: '/cadastro' }
    ]
  },
  {
    key: 'human_resources',
    label: 'RH',
    subPages: [
      { key: 'recursos_humanos', label: 'Ponto', path: '/recursos-humanos' }
    ]
  },
  {
    key: 'quality',
    label: 'Qualidade',
    subPages: [
      { key: 'reclamacoes', label: 'Reclamações', path: '/qualidade/reclamacoes' },
      { key: 'contra_provas', label: 'Contra-provas', path: '/qualidade/contra-provas' },
      { key: 'analise_qualidade', label: 'Análises de Qualidade', path: '/qualidade/analise' },
      { key: 'laudos', label: 'Laudos', path: '/qualidade/laudos' },
      { key: 'rastreabilidade', label: 'Rastreabilidade', path: '/rastreabilidade' }
    ]
  },
  {
    key: 'marketing',
    label: 'Marketing',
    subPages: [
      { key: 'marketing_cronograma', label: 'Cronograma', path: '/marketing/cronograma' }
    ]
  },
  {
    key: 'administrator',
    label: 'Administrador',
    subPages: [
      { key: 'usuarios', label: 'Usuários', path: '/usuarios' },
      { key: 'logs', label: 'Logs do Sistema', path: '/logs' },
      { key: 'debug_permissions', label: 'Debug Permissões', path: '/debug-permissions' }
    ]
  }
];

const getDefaultPermissions = (): NewDetailedPermissions => {
  const defaultModulesAccess: { [moduleKey: string]: boolean } = {};
  const defaultPagesAccess: { [pageKey: string]: boolean } = {};

  MAIN_MODULES.forEach(module => {
    defaultModulesAccess[module.key] = false;
    module.subPages.forEach(page => {
      defaultPagesAccess[page.key] = false;
    });
  });

  return {
    system_status: 'active',
    modules_access: defaultModulesAccess,
    pages_access: defaultPagesAccess,
    can_view_system_logs: false,
  };
};

export function UserPermissionsDialog({ open, onOpenChange, user, onPermissionsUpdated }: UserPermissionsDialogProps) {
  const { toast } = useToast();
  const { getSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentPermissions, setCurrentPermissions] = useState<NewDetailedPermissions | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user && open) {
      if (user.user_metadata?.permissions) {
        const loadedPermissions = user.user_metadata.permissions as NewDetailedPermissions;
        const defaultPerms = getDefaultPermissions();
        
        const mergedPermissions: NewDetailedPermissions = {
          system_status: loadedPermissions.system_status || defaultPerms.system_status,
          modules_access: { ...defaultPerms.modules_access },
          pages_access: { ...defaultPerms.pages_access },
          can_view_system_logs: typeof loadedPermissions.can_view_system_logs === 'boolean' 
            ? loadedPermissions.can_view_system_logs 
            : defaultPerms.can_view_system_logs,
        };

        // Merge existing permissions
        if (loadedPermissions.modules_access) {
          Object.keys(loadedPermissions.modules_access).forEach(key => {
            if (typeof loadedPermissions.modules_access[key] === 'boolean') {
              mergedPermissions.modules_access[key] = loadedPermissions.modules_access[key];
            }
          });
        }

        if (loadedPermissions.pages_access) {
          Object.keys(loadedPermissions.pages_access).forEach(key => {
            if (typeof loadedPermissions.pages_access[key] === 'boolean') {
              mergedPermissions.pages_access[key] = loadedPermissions.pages_access[key];
            }
          });
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
      const newPagesAccess = { ...prev.pages_access };
      
      // Encontrar as páginas deste módulo
      const module = MAIN_MODULES.find(m => m.key === moduleKey);
      if (module) {
        module.subPages.forEach(page => {
          if (!checked) {
            // Se o módulo foi desmarcado, desmarcar todas as páginas
            newPagesAccess[page.key] = false;
          }
          // Se o módulo foi marcado, não marcar automaticamente as páginas
          // Deixar o admin escolher quais páginas quer habilitar
        });
      }
      
      return { ...prev, modules_access: newModulesAccess, pages_access: newPagesAccess };
    });
  };

  const handlePageAccessChange = (pageKey: string, checked: boolean) => {
    setCurrentPermissions(prev => {
      if (!prev) return null;
      
      const newPagesAccess = { ...prev.pages_access, [pageKey]: checked };
      const newModulesAccess = { ...prev.modules_access };
      
      // Encontrar qual módulo contém esta página
      const parentModule = MAIN_MODULES.find(module => 
        module.subPages.some(page => page.key === pageKey)
      );
      
      if (parentModule) {
        if (checked && !newModulesAccess[parentModule.key]) {
          // Se uma página foi marcada, marcar automaticamente o módulo pai
          newModulesAccess[parentModule.key] = true;
        } else if (!checked) {
          // Se uma página foi desmarcada, verificar se ainda há páginas marcadas no módulo
          const hasOtherPagesEnabled = parentModule.subPages.some(page => 
            page.key !== pageKey && newPagesAccess[page.key]
          );
          if (!hasOtherPagesEnabled) {
            // Se não há mais páginas marcadas, desmarcar o módulo
            newModulesAccess[parentModule.key] = false;
          }
        }
      }
      
      return { ...prev, modules_access: newModulesAccess, pages_access: newPagesAccess };
    });
  };

  const handleCanViewSystemLogsChange = (checked: boolean) => {
    setCurrentPermissions(prev => 
      prev ? { ...prev, can_view_system_logs: checked } : null
    );
  };

  const toggleModuleExpansion = (moduleKey: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleKey)) {
        newSet.delete(moduleKey);
      } else {
        newSet.add(moduleKey);
      }
      return newSet;
    });
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
        oldData: (user.user_metadata?.permissions || {}) as Record<string, unknown>,
        newData: currentPermissions as unknown as Record<string, unknown>
      });

      toast({
        title: "Permissões atualizadas",
        description: "As permissões do usuário foram atualizadas com sucesso.",
      });

      onPermissionsUpdated();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error('Error updating permissions:', error);
      toast({
        variant: "destructive",
        title: "Erro ao Salvar Permissões",
        description: error instanceof Error ? error.message : "Não foi possível atualizar as permissões.",
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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Gerenciar Permissões de {user?.user_metadata?.full_name || user?.email}</DialogTitle>
          <DialogDescription>
            Configure o acesso aos módulos e páginas específicas do sistema.
          </DialogDescription>
        </DialogHeader>
        
        <form 
          onSubmit={handleSubmit} 
          className="flex-grow overflow-y-auto space-y-6 p-1 pr-3"
          onKeyDown={(e) => {
            // Prevenir submit quando Enter é pressionado, exceto no botão submit
            if (e.key === 'Enter' && e.target !== document.activeElement) {
              e.preventDefault();
            }
          }}
        >
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

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Módulos e Páginas</h3>
            <div className="space-y-3">
              {MAIN_MODULES.map(module => {
                const isModuleEnabled = currentPermissions.modules_access[module.key] || false;
                const isExpanded = expandedModules.has(module.key);
                
                return (
                  <div key={module.key} className="border rounded-lg overflow-hidden">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={`module-${module.key}`}
                            checked={isModuleEnabled}
                            onCheckedChange={(checked) => handleModuleAccessChange(module.key, checked as boolean)}
                          />
                          <Label htmlFor={`module-${module.key}`} className="text-base font-semibold">
                            {module.label}
                          </Label>
                        </div>
                        
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm" 
                          className="p-2"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleModuleExpansion(module.key);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 bg-white dark:bg-gray-900 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {module.subPages.map(page => (
                            <div key={page.key} className="flex items-center space-x-2">
                              <Checkbox
                                id={`page-${page.key}`}
                                checked={currentPermissions.pages_access[page.key] || false}
                                onCheckedChange={(checked) => handlePageAccessChange(page.key, checked as boolean)}
                                disabled={!isModuleEnabled}
                              />
                              <Label 
                                htmlFor={`page-${page.key}`} 
                                className={`text-sm ${!isModuleEnabled ? 'text-muted-foreground' : ''}`}
                              >
                                {page.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {module.subPages.length === 0 && (
                          <p className="text-sm text-muted-foreground italic">
                            Nenhuma sub-página disponível para este módulo.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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
