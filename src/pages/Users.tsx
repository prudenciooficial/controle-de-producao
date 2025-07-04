import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Edit, Trash2, Ban, CheckCircle, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserDialog } from '@/components/users/UserDialog';
import { UserPermissionsDialog } from '@/components/users/UserPermissionsDialog';
import { logSystemEvent } from '@/services/logService';

interface UserData {
  id: string;
  email?: string;
  user_metadata: {
    full_name?: string;
    username?: string;
    role?: 'admin' | 'editor' | 'viewer';
  };
  created_at: string;
  banned_until?: string;
  aud?: string;
  confirmed_at?: string;
  email_confirmed_at?: string;
  phone?: string;
  last_sign_in_at?: string;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  identities?: any[];
}

export default function Users() {
  const { hasRole, getSession } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const session = await getSession();
      if (!session) {
        throw new Error("Sessão não encontrada, não é possível buscar usuários.");
      }
      
      const { data, error } = await supabase.functions.invoke('get-users-admin', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        console.error('Error fetching users via function:', error);
        throw error;
      }
      
      setUsers(data || []);

    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Erro ao Carregar Usuários",
        description: error.message || "Não foi possível carregar a lista de usuários.",
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };

  const handleManagePermissions = (user: UserData) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
  };

  const handleToggleStatus = async (user: UserData) => {
    if (!hasRole('admin')) {
      toast({ variant: "destructive", title: "Acesso Negado", description: "Você não tem permissão para alterar status de usuários." });
      return;
    }
    try {
      setLoading(true);
      const session = await getSession();
      if (!session) {
        throw new Error("Sessão não encontrada.");
      }

      const isCurrentlyBanned = user.banned_until && new Date(user.banned_until) > new Date();
      const updatePayload = {
        userId: user.id,
        updateData: {
          ban_duration: isCurrentlyBanned ? 'none' : `${100 * 365 * 24}h`,
        }
      };

      const { error: invokeError } = await supabase.functions.invoke('update-user-admin', {
        body: updatePayload,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (invokeError) {
        console.error('Error invoking update-user-admin:', invokeError);
        throw invokeError;
      }

      // Registrar log da alteração de status
      const currentUser = await getSession().then(s => s?.user);
      await logSystemEvent({
        userId: currentUser?.id,
        userDisplayName: currentUser?.user_metadata?.full_name || currentUser?.email,
        actionType: 'UPDATE',
        entityTable: 'auth.users',
        entityId: user.id,
        oldData: {
          status: isCurrentlyBanned ? 'inativo' : 'ativo',
          banned_until: user.banned_until
        },
        newData: {
          status: isCurrentlyBanned ? 'ativo' : 'inativo',
          ban_duration: updatePayload.updateData.ban_duration
        }
      });

      toast({
        title: "Status atualizado",
        description: `Usuário ${isCurrentlyBanned ? 'ativado' : 'desativado'} com sucesso.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        variant: "destructive",
        title: "Erro ao Atualizar Status",
        description: error.message || "Não foi possível alterar o status do usuário.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    if (!hasRole('admin')) {
      toast({ variant: "destructive", title: "Acesso Negado", description: "Você não tem permissão para excluir usuários." });
      return;
    }
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading(true);
      const session = await getSession();
      if (!session) {
        throw new Error("Sessão não encontrada.");
      }

      const deletePayload = { userId: user.id };

      const { error: invokeError } = await supabase.functions.invoke('delete-user-admin', {
        body: deletePayload,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });
      
      if (invokeError) {
        console.error('Error invoking delete-user-admin:', invokeError);
        throw invokeError;
      }

      // Registrar log da exclusão de usuário
      const currentUser = await getSession().then(s => s?.user);
      await logSystemEvent({
        userId: currentUser?.id,
        userDisplayName: currentUser?.user_metadata?.full_name || currentUser?.email,
        actionType: 'DELETE',
        entityTable: 'auth.users',
        entityId: user.id,
        oldData: {
          email: user.email,
          full_name: user.user_metadata?.full_name,
          username: user.user_metadata?.username,
          role: user.user_metadata?.role,
          created_at: user.created_at
        }
      });

      toast({
        title: "Usuário excluído",
        description: "Usuário removido do sistema com sucesso.",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        variant: "destructive",
        title: "Erro ao Excluir Usuário",
        description: error.message || "Não foi possível excluir o usuário.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'editor':
        return 'default';
      case 'viewer':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Visualizador';
      default:
        return role || 'Não Definido';
    }
  };

  const isActionDisabled = !hasRole('admin');

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
            <p className="text-muted-foreground">
              Gerencie usuários e suas permissões no sistema
            </p>
          </div>
          <Button onClick={() => setShowUserDialog(true)} disabled={isActionDisabled}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              Todos os usuários cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Carregando usuários...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">Nenhum usuário encontrado.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Nome de Usuário</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.user_metadata?.full_name || user.email || 'N/A'}
                      </TableCell>
                      <TableCell>{user.email || 'N/A'}</TableCell>
                      <TableCell>{user.user_metadata?.username || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.user_metadata?.role)}>
                          {getRoleLabel(user.user_metadata?.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.banned_until && new Date(user.banned_until) > new Date() ? 'secondary' : 'default'}>
                          {user.banned_until && new Date(user.banned_until) > new Date() ? 'Inativo' : 'Ativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            disabled={isActionDisabled}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManagePermissions(user)}
                            disabled={isActionDisabled}
                          >
                            Permissões
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                            disabled={isActionDisabled}
                          >
                            {user.banned_until && new Date(user.banned_until) > new Date() ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            disabled={isActionDisabled}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {showUserDialog && (
        <UserDialog
          open={showUserDialog}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setShowUserDialog(false);
                setSelectedUser(null);
            fetchUsers();
              } else {
                setShowUserDialog(true);
              }
          }}
            user={selectedUser}
            onUserUpdated={fetchUsers}
        />
        )}

        {showPermissionsDialog && selectedUser && (
        <UserPermissionsDialog
          open={showPermissionsDialog}
            onOpenChange={(isOpen) => {
              if (!isOpen) {
                setShowPermissionsDialog(false);
                setSelectedUser(null);
            fetchUsers();
              } else {
                setShowPermissionsDialog(true);
              }
          }}
            user={selectedUser}
            onPermissionsUpdated={fetchUsers}
        />
        )}
      </div>
    </ProtectedRoute>
  );
}
