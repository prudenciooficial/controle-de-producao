import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader, Plus, UserPlus, Edit, Trash, Users as UsersIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UserData {
  id: string;
  email?: string;
  user_metadata?: {
    [key: string]: unknown;
    full_name?: string;
    permissions?: NewDetailedPermissions;
    role?: string;
  };
}

interface NewDetailedPermissions {
  production: { module: boolean; page: boolean };
  inventory: { module: boolean; page: boolean };
  quality: { module: boolean; page: boolean };
  maintenance: { module: boolean; page: boolean };
  commercial: { module: boolean; page: boolean };
  financial: { module: boolean; page: boolean };
  admin: { module: boolean; page: boolean };
}

const userFormSchema = z.object({
  full_name: z.string().min(2, {
    message: "Nome completo deve ter pelo menos 2 caracteres.",
  }),
  role: z.string().min(2, {
    message: "Função deve ter pelo menos 2 caracteres.",
  }),
  production_module: z.boolean().default(false),
  production_page: z.boolean().default(false),
  inventory_module: z.boolean().default(false),
  inventory_page: z.boolean().default(false),
  quality_module: z.boolean().default(false),
  quality_page: z.boolean().default(false),
  maintenance_module: z.boolean().default(false),
  maintenance_page: z.boolean().default(false),
  commercial_module: z.boolean().default(false),
  commercial_page: z.boolean().default(false),
  financial_module: z.boolean().default(false),
  financial_page: z.boolean().default(false),
  admin_module: z.boolean().default(false),
  admin_page: z.boolean().default(false),
});

type UserFormValues = z.infer<typeof userFormSchema>;

const Users = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      full_name: "",
      role: "",
      production_module: false,
      production_page: false,
      inventory_module: false,
      inventory_page: false,
      quality_module: false,
      quality_page: false,
      maintenance_module: false,
      maintenance_page: false,
      commercial_module: false,
      commercial_page: false,
      financial_module: false,
      financial_page: false,
      admin_module: false,
      admin_page: false,
    },
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.admin.listUsers();

      if (error) throw error;

      const usersFormatted = data.users.map(user => ({
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      }));

      setUsers(usersFormatted);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Falha ao carregar lista de usuários.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (data: UserFormValues) => {
    try {
      setIsCreating(true);

      const { data: newUser, error } = await supabase.auth.admin.createUser({
        email: `${data.full_name.replace(/\s/g, '.').toLowerCase()}@starchfactory.com.br`,
        password: 'changeme',
        user_metadata: {
          full_name: data.full_name,
          role: data.role,
          permissions: {
            production: { module: data.production_module, page: data.production_page },
            inventory: { module: data.inventory_module, page: data.inventory_page },
            quality: { module: data.quality_module, page: data.quality_page },
            maintenance: { module: data.maintenance_module, page: data.maintenance_page },
            commercial: { module: data.commercial_module, page: data.commercial_page },
            financial: { module: data.financial_module, page: data.financial_page },
            admin: { module: data.admin_module, page: data.admin_page },
          }
        },
        email_confirm: false,
      });

      if (error) throw error;

      toast({
        title: "Usuário criado",
        description: "Usuário criado com sucesso. A senha padrão é 'changeme'.",
      });

      setIsCreateDialogOpen(false);
      form.reset();
      fetchUsers();
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao criar usuário.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateUser = async (userData: UserData) => {
    try {
      setIsUpdating(true);
      
      if (!userData.email) {
        throw new Error("Email é obrigatório");
      }

      const userToUpdate = {
        id: userData.id,
        email: userData.email,
        user_metadata: userData.user_metadata
      };

      const { error } = await supabase.auth.admin.updateUserById(
        userData.id,
        userToUpdate
      );

      if (error) throw error;

      toast({
        title: "Usuário atualizado",
        description: "As informações do usuário foram atualizadas com sucesso.",
      });

      setIsEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao atualizar usuário.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      setIsUpdating(true);

      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso.",
      });

      fetchUsers();
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao excluir usuário.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">Crie, edite e gerencie os usuários do sistema</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Visualize e gerencie os usuários cadastrados no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader className="w-8 h-8 animate-spin" />
              <span className="ml-2">Carregando usuários...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.user_metadata?.full_name || "N/A"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{user.user_metadata?.role || "N/A"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setSelectedUser(user);
                          setIsEditDialogOpen(true);
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.id !== this.user?.id && (
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para criar um novo usuário. Um email será enviado
              para o usuário com as instruções de primeiro acesso.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome Completo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Função</FormLabel>
                      <FormControl>
                        <Input placeholder="Função" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="production_module"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Produção (Módulo)</FormLabel>
                        <FormDescription>Acesso total ao módulo de produção.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="production_page"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Produção (Página)</FormLabel>
                        <FormDescription>Acesso à página de produção.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="inventory_module"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Estoque (Módulo)</FormLabel>
                        <FormDescription>Acesso total ao módulo de estoque.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="inventory_page"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Estoque (Página)</FormLabel>
                        <FormDescription>Acesso à página de estoque.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="quality_module"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Qualidade (Módulo)</FormLabel>
                        <FormDescription>Acesso total ao módulo de qualidade.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quality_page"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Qualidade (Página)</FormLabel>
                        <FormDescription>Acesso à página de qualidade.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maintenance_module"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Manutenção (Módulo)</FormLabel>
                        <FormDescription>Acesso total ao módulo de manutenção.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maintenance_page"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Manutenção (Página)</FormLabel>
                        <FormDescription>Acesso à página de manutenção.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="commercial_module"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Comercial (Módulo)</FormLabel>
                        <FormDescription>Acesso total ao módulo comercial.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="commercial_page"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Comercial (Página)</FormLabel>
                        <FormDescription>Acesso à página comercial.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="financial_module"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Financeiro (Módulo)</FormLabel>
                        <FormDescription>Acesso total ao módulo financeiro.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="financial_page"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Financeiro (Página)</FormLabel>
                        <FormDescription>Acesso à página financeira.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="admin_module"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Admin (Módulo)</FormLabel>
                        <FormDescription>Acesso total ao módulo de administração.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="admin_page"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Admin (Página)</FormLabel>
                        <FormDescription>Acesso à página de administração.</FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Usuário"
                )}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere as informações do usuário.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <FormLabel htmlFor="name" className="text-right">
                  Nome
                </FormLabel>
                <Input
                  id="name"
                  defaultValue={selectedUser.user_metadata?.full_name || ""}
                  className="col-span-3"
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    user_metadata: {
                      ...selectedUser.user_metadata,
                      full_name: e.target.value
                    }
                  })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <FormLabel htmlFor="email" className="text-right">
                  Email
                </FormLabel>
                <Input
                  id="email"
                  defaultValue={selectedUser.email || ""}
                  className="col-span-3"
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    email: e.target.value
                  })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <FormLabel htmlFor="role" className="text-right">
                  Função
                </FormLabel>
                <Input
                  id="role"
                  defaultValue={selectedUser.user_metadata?.role || ""}
                  className="col-span-3"
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    user_metadata: {
                      ...selectedUser.user_metadata,
                      role: e.target.value
                    }
                  })}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  handleUpdateUser(selectedUser);
                }
              }}
            >
              {isUpdating ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
