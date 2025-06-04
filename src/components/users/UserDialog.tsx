import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logSystemEvent } from '@/services/logService';

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: any;
  onUserUpdated: () => void;
}

export function UserDialog({ open, onOpenChange, user, onUserUpdated }: UserDialogProps) {
  const { toast } = useToast();
  const { getSession } = useAuth();
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
        fullName: user.user_metadata?.full_name || '',
        username: user.user_metadata?.username || '',
        email: user.email || '',
        password: '',
        role: user.user_metadata?.role || 'viewer'
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
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const session = await getSession();
      if (!session) {
        throw new Error("Sessão não encontrada. Por favor, faça login novamente.");
      }

      if (user) {
        const updateData: any = {
          user_metadata: {
            full_name: formData.fullName,
            username: formData.username,
            role: formData.role,
          }
        };
        if (formData.password) {
          updateData.password = formData.password;
        }

        const { error: invokeError } = await supabase.functions.invoke('update-user-admin', {
          body: {
            userId: user.id,
            updateData: updateData
          },
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          }
        });

        if (invokeError) {
          let detailedError = "Falha ao invocar a função de atualização.";
          if (invokeError.context && invokeError.context.responseText) {
            try {
              const errorResponse = JSON.parse(invokeError.context.responseText);
              if (errorResponse.error) {
                detailedError = errorResponse.error;
              }
            } catch (e) { /* Ignora erro de parse */ }
          }
          console.error('Error invoking update-user-admin function:', invokeError);
          throw new Error(detailedError);
        }

        const currentUser = session.user;
        await logSystemEvent({
          userId: currentUser?.id,
          userDisplayName: currentUser?.user_metadata?.full_name || currentUser?.email,
          actionType: 'UPDATE',
          entityTable: 'auth.users',
          entityId: user.id,
          oldData: {
            full_name: user.user_metadata?.full_name,
            username: user.user_metadata?.username,
            role: user.user_metadata?.role
          },
          newData: {
            full_name: formData.fullName,
            username: formData.username,
            role: formData.role,
            password_changed: !!formData.password
          }
        });

        toast({
          title: "Usuário atualizado",
          description: "Informações do usuário foram atualizadas com sucesso.",
        });

      } else {
        const { error: invokeError } = await supabase.functions.invoke('create-user-admin', {
          body: {
          email: formData.email,
          password: formData.password,
            fullName: formData.fullName,
            username: formData.username,
            role: formData.role,
          },
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          }
        });

        if (invokeError) {
          let detailedError = "Falha ao invocar a função de criação.";
          if (invokeError.context && invokeError.context.responseText) {
            try {
              const errorResponse = JSON.parse(invokeError.context.responseText);
              if (errorResponse.error) {
                detailedError = errorResponse.error;
              }
            } catch (e) { /* Ignora erro de parse */ }
          }
          console.error('Error invoking create-user-admin function:', invokeError);
          throw new Error(detailedError);
        }

        const currentUser = session.user;
        await logSystemEvent({
          userId: currentUser?.id,
          userDisplayName: currentUser?.user_metadata?.full_name || currentUser?.email,
          actionType: 'CREATE',
          entityTable: 'auth.users',
          newData: {
            email: formData.email,
            full_name: formData.fullName,
            username: formData.username,
            role: formData.role,
            created_by: currentUser?.id
          }
        });

        toast({
          title: "Usuário criado",
          description: "Novo usuário foi criado com sucesso.",
        });
      }

      onUserUpdated();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error in handleSubmit (UserDialog):', error);
      
      let userFriendlyMessage = "Não foi possível completar a operação. Tente novamente.";

      if (error.message) {
        if (error.message.includes("User already registered") || error.message.includes("email already in use") || error.message.includes("duplicate key value violates unique constraint \"users_email_key\"") ) {
          userFriendlyMessage = "Este endereço de email já está cadastrado.";
        } else if (error.message.includes("Password should be at least 6 characters")) {
          userFriendlyMessage = "A senha deve ter pelo menos 6 caracteres.";
        } else if (error.message.includes("value too long for type character varying(255)")) {
            userFriendlyMessage = "Um dos campos preenchidos é muito longo. Por favor, revise os dados.";
        } else {
          userFriendlyMessage = error.message;
        }
      }

      toast({
        variant: "destructive",
        title: "Erro ao Salvar Usuário",
        description: userFriendlyMessage,
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
              ? 'Edite as informações do usuário. Deixe a senha em branco para não alterá-la.' 
              : 'Preencha os dados para criar um novo usuário.'
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} id="user-form-id">
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
                placeholder={user ? "Deixe em branco para não alterar" : ""}
                required={!user}
                />
              </div>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" form="user-form-id" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
