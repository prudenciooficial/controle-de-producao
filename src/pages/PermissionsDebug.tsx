import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, User, Shield, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserData {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    username?: string;
    role?: string;
    permissions?: {
      system_status: 'active' | 'inactive';
      modules_access: { [moduleKey: string]: boolean };
      pages_access: { [pageKey: string]: boolean };
      can_view_system_logs?: boolean;
    };
  };
}

export default function PermissionsDebug() {
  const { user, hasPermission, hasRole, getSession } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const modules = [
    'dashboard',        // Apenas visualização
    'production',       // CRUD completo
    'sales',           // CRUD completo
    'orders',          // CRUD completo
    'inventory',       // CRUD completo
    'losses',          // CRUD completo
    'quality',         // CRUD completo
    'general_settings', // CRUD completo
    'human_resources', // CRUD completo
    'user_management'  // CRUD completo
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      if (!hasRole('admin')) {
        toast({
          variant: "destructive",
          title: "Acesso Negado",
          description: "Apenas administradores podem visualizar outros usuários."
        });
        
        // Para não-admins, mostrar apenas o usuário atual
        if (user) {
          setUsers([{
            id: user.id,
            email: user.email || '',
            user_metadata: user.user_metadata || {}
          }]);
        }
        return;
      }

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
      
      const formattedUsers = (data || []).map((authUser: UserData) => ({
        id: authUser.id,
        email: authUser.email || '',
        user_metadata: authUser.user_metadata || {}
      }));

      setUsers(formattedUsers);
      
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao carregar usuários. Verifique se as functions estão configuradas."
      });
      
      // Fallback: mostrar apenas o usuário atual
      if (user) {
        setUsers([{
          id: user.id,
          email: user.email || '',
          user_metadata: user.user_metadata || {}
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.user_metadata.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.user_metadata.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const checkUserPermission = (userData: UserData, module: string, action: string) => {
    if (!userData.user_metadata) return false;
    if (userData.user_metadata.role === 'admin') return true;

    const permissions = userData.user_metadata.permissions;
    if (!permissions || permissions.system_status !== 'active') return false;
    
    // Para a nova estrutura, verificar acesso ao módulo
    if (permissions.modules_access?.[module] !== true) return false;

    // Para ações específicas, sempre retornar true se tem acesso ao módulo
    // Na nova estrutura, as permissões são por página, não por ação CRUD
    return true;
  };

  const UserPermissionsCard = ({ userData }: { userData: UserData }) => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>ID:</strong> {userData.id}
          </div>
          <div>
            <strong>Email:</strong> {userData.email}
          </div>
          <div>
            <strong>Nome:</strong> {userData.user_metadata.full_name || 'Não informado'}
          </div>
          <div>
            <strong>Username:</strong> {userData.user_metadata.username || 'Não informado'}
          </div>
          <div>
            <strong>Role:</strong> {userData.user_metadata.role || 'Não definido'}
          </div>
          <div>
            <strong>É Admin:</strong> {userData.user_metadata.role === 'admin' ? 'Sim' : 'Não'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissões Detalhadas (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-60">
            {JSON.stringify(userData.user_metadata.permissions, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Verificação de Permissões por Módulo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(module => {
              const hasView = checkUserPermission(userData, module, 'view');
              return (
                <div key={module} className="border p-3 rounded">
                  <div className="font-medium">{module}</div>
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between">
                      <span>View:</span>
                      <Badge variant={hasView ? 'default' : 'destructive'}>
                        {hasView ? 'Sim' : 'Não'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Create:</span>
                      <Badge variant={checkUserPermission(userData, module, 'create') ? 'default' : 'destructive'}>
                        {checkUserPermission(userData, module, 'create') ? 'Sim' : 'Não'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Update:</span>
                      <Badge variant={checkUserPermission(userData, module, 'update') ? 'default' : 'destructive'}>
                        {checkUserPermission(userData, module, 'update') ? 'Sim' : 'Não'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Delete:</span>
                      <Badge variant={checkUserPermission(userData, module, 'delete') ? 'default' : 'destructive'}>
                        {checkUserPermission(userData, module, 'delete') ? 'Sim' : 'Não'}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Debug de Permissões
        </h1>
        <p className="text-muted-foreground">
          Informações detalhadas sobre permissões de usuários do sistema
        </p>
      </div>

      <Tabs defaultValue="current-user" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current-user" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Usuário Atual
          </TabsTrigger>
          <TabsTrigger value="other-users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Outros Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current-user">
          {user && <UserPermissionsCard userData={user as UserData} />}
        </TabsContent>

        <TabsContent value="other-users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Buscar Usuário</CardTitle>
              <CardDescription>
                Selecione um usuário para visualizar suas permissões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por email, nome ou username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={loadUsers} disabled={loading}>
                  {loading ? 'Carregando...' : 'Atualizar'}
                </Button>
              </div>

              <Select 
                value={selectedUser?.id || ''} 
                onValueChange={(value) => {
                  const user = users.find(u => u.id === value);
                  setSelectedUser(user || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredUsers.map((userData) => (
                    <SelectItem key={userData.id} value={userData.id}>
                      <div className="flex flex-col">
                        <span>{userData.email}</span>
                        {userData.user_metadata.full_name && (
                          <span className="text-sm text-muted-foreground">
                            {userData.user_metadata.full_name}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {filteredUsers.length === 0 && searchTerm && (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum usuário encontrado com o termo "{searchTerm}"
                </p>
              )}
            </CardContent>
          </Card>

          {selectedUser && <UserPermissionsCard userData={selectedUser} />}
        </TabsContent>
      </Tabs>
    </div>
  );
} 