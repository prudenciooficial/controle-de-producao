
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Edit, Trash, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Supplier } from "@/types";

// Schema for form validation
const supplierFormSchema = z.object({
  name: z.string().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }),
  code: z.string().min(2, { message: "Código deve ter no mínimo 2 caracteres" }),
  contacts: z.string().optional(),
  notes: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

const SuppliersTable = () => {
  const { suppliers, isLoading, addSupplier, updateSupplier, deleteSupplier, refetchSuppliers } = useData();
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const addForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      code: "",
      contacts: "",
      notes: "",
    },
  });
  
  const editForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      code: "",
      contacts: "",
      notes: "",
    },
  });
  
  const filteredSuppliers = suppliers.filter(
    supplier => 
      supplier.name.toLowerCase().includes(search.toLowerCase()) ||
      supplier.code.toLowerCase().includes(search.toLowerCase())
  );
  
  const handleAdd = async (data: SupplierFormValues) => {
    try {
      setLoading(true);
      await addSupplier({
        name: data.name,
        code: data.code,
        contacts: data.contacts,
        notes: data.notes,
      });

      toast({
        title: "Fornecedor adicionado",
        description: `${data.name} foi adicionado com sucesso.`,
      });

      // Reset form and close dialog
      addForm.reset();
      setIsAddDialogOpen(false);
      
      // Refresh suppliers list
      await refetchSuppliers();
    } catch (error) {
      console.error("Error adding supplier:", error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar fornecedor",
        description: "Ocorreu um erro ao adicionar o fornecedor. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = async (data: SupplierFormValues) => {
    if (!selectedSupplier) return;
    
    try {
      setLoading(true);
      await updateSupplier(selectedSupplier, {
        name: data.name,
        code: data.code,
        contacts: data.contacts,
        notes: data.notes,
      });

      toast({
        title: "Fornecedor atualizado",
        description: `${data.name} foi atualizado com sucesso.`,
      });

      // Reset form and close dialog
      editForm.reset();
      setIsEditDialogOpen(false);
      setSelectedSupplier(null);
      
      // Refresh suppliers list
      await refetchSuppliers();
    } catch (error) {
      console.error("Error updating supplier:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar fornecedor",
        description: "Ocorreu um erro ao atualizar o fornecedor. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!selectedSupplier) return;
    
    try {
      setLoading(true);
      await deleteSupplier(selectedSupplier);

      toast({
        title: "Fornecedor excluído",
        description: "Fornecedor foi excluído com sucesso.",
      });

      // Close dialog
      setIsDeleteDialogOpen(false);
      setSelectedSupplier(null);
      
      // Refresh suppliers list
      await refetchSuppliers();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir fornecedor",
        description: "Ocorreu um erro ao excluir o fornecedor. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const openEditDialog = (supplier: Supplier) => {
    // Set the form values
    editForm.reset({
      name: supplier.name,
      code: supplier.code,
      contacts: supplier.contacts || "",
      notes: supplier.notes || "",
    });
    
    // Set the selected supplier and open the dialog
    setSelectedSupplier(supplier.id);
    setIsEditDialogOpen(true);
  };
  
  const openDeleteDialog = (id: string) => {
    setSelectedSupplier(id);
    setIsDeleteDialogOpen(true);
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Buscar fornecedores..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>
      
      {isLoading.suppliers ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Contatos</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.length > 0 ? (
              filteredSuppliers.map(supplier => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.name}</TableCell>
                  <TableCell>{supplier.code}</TableCell>
                  <TableCell>{supplier.contacts || "-"}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(supplier)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(supplier.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Nenhum fornecedor encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
      
      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
            <DialogDescription>
              Adicione um novo fornecedor ao sistema.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAdd)} className="space-y-4 py-4">
              <FormField
                control={addForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addForm.control}
                name="contacts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contatos</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Telefone, email, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações sobre o fornecedor (opcional)"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Fornecedor</DialogTitle>
            <DialogDescription>
              Edite os detalhes do fornecedor.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4 py-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="contacts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contatos</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Telefone, email, etc." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações sobre o fornecedor (opcional)"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Excluir Fornecedor</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuppliersTable;
