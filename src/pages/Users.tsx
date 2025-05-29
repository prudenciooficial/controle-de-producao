
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Edit, Trash2, Ban, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserDialog } from '@/components/users/UserDialog';
import { UserPermissionsDialog } from '@/components/users/UserPermissionsDialog';
import { User } from '@supabase/supabase-js';

interface UserData {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    username?: string;
    role?: 'admin' | 'editor' | 'viewer';
  };
  created_at: string;
  banned_until?: string;
}

export default function Users() {
  const { hasRole } = useAuth();
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
      
      const { data: authUsers, error } = await supabase.auth.admin.listUsers();

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      // Transform Supabase User type to our UserData type
      const transformedUsers: UserData[] = authUsers.users.map((user: User) => ({
        id: user.id,
        email: user.email || '', // Handle optional email
        user_metadata: user.user_metadata || {},
        created_at: user.created_at,
        banned_until: user.banned_until || undefined,
      }));

      setUsers(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
      });
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
    try {
      const isBanned = !!user.banned_until;
      
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        ban_duration: isBanned ? 'none' : '24h'
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Status atualizado",
        description: `Usuário ${isBanned ? 'ativado' : 'desativado'} com sucesso.`,
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível alterar o status do usuário.",
      });
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (error) {
        throw error;
      }

      toast({
        title: "Usuário excluído",
        description: "Usuário removido do sistema com sucesso.",
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível excluir o usuário.",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'editor':
        return 'default';
      case 'viewer':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'editor':
        return 'Editor';
      case 'viewer':
        return 'Visualizador';
      default:
        return role || 'Visualizador';
    }
  };

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
          <Button onClick={() => setShowUserDialog(true)}>
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
                        {user.user_metadata?.full_name || user.email}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.user_metadata?.username || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.user_metadata?.role || 'viewer')}>
                          {getRoleLabel(user.user_metadata?.role || 'viewer')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.banned_until ? 'secondary' : 'default'}>
                          {user.banned_until ? 'Inativo' : 'Ativo'}
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
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleManagePermissions(user)}
                          >
                            Permissões
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.banned_until ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <Ban className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
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

        <UserDialog
          open={showUserDialog}
          onOpenChange={setShowUserDialog}
          user={selectedUser}
          onUserUpdated={() => {
            fetchUsers();
            setSelectedUser(null);
          }}
        />

        <UserPermissionsDialog
          open={showPermissionsDialog}
          onOpenChange={setShowPermissionsDialog}
          user={selectedUser}
          onPermissionsUpdated={() => {
            fetchUsers();
            setSelectedUser(null);
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
