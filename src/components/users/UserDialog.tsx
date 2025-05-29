
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
  onUserUpdated: () => void;
}

export function UserDialog({ open, onOpenChange, user, onUserUpdated }: UserDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'viewer' as 'admin' | 'editor' | 'viewer'
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.profile.full_name || '',
        username: user.profile.username || '',
        email: user.email || '',
        password: '',
        role: user.role || 'viewer'
      });
    } else {
      setFormData({
        fullName: '',
        username: '',
        email: '',
        password: '',
        role: 'viewer'
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user) {
        // Update existing user
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName,
            username: formData.username,
          })
          .eq('id', user.id);

        if (profileError) throw profileError;

        // Update user role
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: formData.role })
          .eq('user_id', user.id);

        if (roleError) throw roleError;

        toast({
          title: "Usuário atualizado",
          description: "Informações do usuário foram atualizadas com sucesso.",
        });
      } else {
        // Create new user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              username: formData.username,
            },
          },
        });

        if (authError) throw authError;

        if (authData.user) {
          // Update role for new user
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: formData.role })
            .eq('user_id', authData.user.id);

          if (roleError) throw roleError;
        }

        toast({
          title: "Usuário criado",
          description: "Novo usuário foi criado com sucesso.",
        });
      }

      onUserUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível salvar o usuário.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
          <DialogDescription>
            {user 
              ? 'Edite as informações do usuário.' 
              : 'Preencha os dados para criar um novo usuário.'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fullName" className="text-right">
                Nome Completo
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Nome de Usuário
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="col-span-3"
                required
                disabled={!!user}
              />
            </div>
            {!user && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Senha
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Papel
              </Label>
              <Select 
                value={formData.role} 
                onValueChange={(value: 'admin' | 'editor' | 'viewer') => 
                  setFormData(prev => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione um papel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
