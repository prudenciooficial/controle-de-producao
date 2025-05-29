
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
  onPermissionsUpdated: () => void;
}

const modules = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'producao', label: 'Produção' },
  { key: 'vendas', label: 'Vendas' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'estoque', label: 'Estoque' },
  { key: 'perdas', label: 'Perdas' },
  { key: 'rastreabilidade', label: 'Rastreabilidade' },
  { key: 'cadastro', label: 'Cadastros' },
  { key: 'usuarios', label: 'Usuários' },
];

const permissions = [
  { key: 'view', label: 'Visualizar' },
  { key: 'create', label: 'Criar' },
  { key: 'edit', label: 'Editar' },
  { key: 'delete', label: 'Excluir' },
];

export function UserPermissionsDialog({ open, onOpenChange, user, onPermissionsUpdated }: UserPermissionsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userPermissions, setUserPermissions] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (user && open) {
      // Initialize permissions based on user role
      const permissionsMap: Record<string, Record<string, boolean>> = {};
      const userRole = user.user_metadata?.role || 'viewer';
      
      modules.forEach(module => {
        permissionsMap[module.key] = {};
        permissions.forEach(permission => {
          // Set default permissions based on role
          if (userRole === 'admin') {
            permissionsMap[module.key][permission.key] = true;
          } else if (userRole === 'editor') {
            permissionsMap[module.key][permission.key] = permission.key !== 'delete';
          } else {
            permissionsMap[module.key][permission.key] = permission.key === 'view';
          }
        });
      });

      setUserPermissions(permissionsMap);
    }
  }, [user, open]);

  const handlePermissionChange = (moduleKey: string, permissionKey: string, checked: boolean) => {
    setUserPermissions(prev => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [permissionKey]: checked
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      // Update user metadata with permissions
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          permissions: userPermissions
        }
      });

      if (error) throw error;

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
        title: "Erro",
        description: "Não foi possível atualizar as permissões.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Permissões</DialogTitle>
          <DialogDescription>
            Configure as permissões de acesso para {user?.user_metadata?.full_name || user?.email}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            {modules.map(module => (
              <div key={module.key} className="space-y-3">
                <h4 className="font-medium text-sm">{module.label}</h4>
                <div className="grid grid-cols-2 gap-3 ml-4">
                  {permissions.map(permission => (
                    <div key={permission.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${module.key}-${permission.key}`}
                        checked={userPermissions[module.key]?.[permission.key] || false}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(module.key, permission.key, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`${module.key}-${permission.key}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {permission.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
