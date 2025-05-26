import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData } from "@/context/DataContext";
import { Material } from "@/types"; // Add this import for the Material type
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Edit, Trash, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Schema for form validation - removed code field
const materialFormSchema = z.object({
  name: z.string().min(2, { message: "Nome deve ter no mínimo 2 caracteres" }),
  type: z.string().min(1, { message: "Tipo é obrigatório" }),
  unitOfMeasure: z.string().min(1, { message: "Unidade de medida é obrigatória" }),
  description: z.string().optional(),
});

type MaterialFormValues = z.infer<typeof materialFormSchema>;

const MaterialsTable = () => {
  const { materials, isLoading, addMaterial, updateMaterial, deleteMaterial, refetchMaterials } = useData();
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const addForm = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      name: "",
      type: "",
      unitOfMeasure: "kg",
      description: "",
    },
  });
  
  const editForm = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      name: "",
      type: "",
      unitOfMeasure: "kg",
      description: "",
    },
  });
  
  // Updated filter to exclude code field
  const filteredMaterials = materials.filter(
    material => 
      material.name.toLowerCase().includes(search.toLowerCase()) ||
      material.type.toLowerCase().includes(search.toLowerCase())
  );
  
  const getMaterialTypeColor = (type: string) => {
    switch (type) {
      case "Fécula":
        return "bg-blue-500";
      case "Conservante":
        return "bg-green-500";
      case "Embalagem":
        return "bg-yellow-500";
      case "Saco":
        return "bg-purple-500";
      case "Caixa":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };
  
  const handleAdd = async (data: MaterialFormValues) => {
    try {
      setLoading(true);
      await addMaterial({
        name: data.name,
        code: "", // Set empty code since we're removing this field
        type: data.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro",
        unitOfMeasure: data.unitOfMeasure,
        description: data.description,
      });

      toast({
        title: "Material adicionado",
        description: `${data.name} foi adicionado com sucesso.`,
      });

      // Reset form and close dialog
      addForm.reset();
      setIsAddDialogOpen(false);
      
      // Refresh materials list
      await refetchMaterials();
    } catch (error) {
      console.error("Error adding material:", error);
      toast({
        variant: "destructive",
        title: "Erro ao adicionar material",
        description: "Ocorreu um erro ao adicionar o material. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = async (data: MaterialFormValues) => {
    if (!selectedMaterial) return;
    
    try {
      setLoading(true);
      await updateMaterial(selectedMaterial, {
        name: data.name,
        code: "", // Set empty code since we're removing this field
        type: data.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro",
        unitOfMeasure: data.unitOfMeasure,
        description: data.description,
      });

      toast({
        title: "Material atualizado",
        description: `${data.name} foi atualizado com sucesso.`,
      });

      // Reset form and close dialog
      editForm.reset();
      setIsEditDialogOpen(false);
      setSelectedMaterial(null);
      
      // Refresh materials list
      await refetchMaterials();
    } catch (error) {
      console.error("Error updating material:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar material",
        description: "Ocorreu um erro ao atualizar o material. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!selectedMaterial) return;
    
    try {
      setLoading(true);
      await deleteMaterial(selectedMaterial);

      toast({
        title: "Material excluído",
        description: "Material foi excluído com sucesso.",
      });

      // Close dialog
      setIsDeleteDialogOpen(false);
      setSelectedMaterial(null);
      
      // Refresh materials list
      await refetchMaterials();
    } catch (error) {
      console.error("Error deleting material:", error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir material",
        description: "Ocorreu um erro ao excluir o material. Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const openEditDialog = (material: Material) => {
    // Set the form values - removed code field
    editForm.reset({
      name: material.name,
      type: material.type,
      unitOfMeasure: material.unitOfMeasure,
      description: material.description || "",
    });
    
    // Set the selected material and open the dialog
    setSelectedMaterial(material.id);
    setIsEditDialogOpen(true);
  };
  
  const openDeleteDialog = (id: string) => {
    setSelectedMaterial(id);
    setIsDeleteDialogOpen(true);
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Buscar matérias-primas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Matéria-Prima
        </Button>
      </div>
      
      {isLoading.materials ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaterials.length > 0 ? (
              filteredMaterials.map(material => (
                <TableRow key={material.id}>
                  <TableCell>{material.name}</TableCell>
                  <TableCell>
                    <Badge className={getMaterialTypeColor(material.type)}>
                      {material.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{material.unitOfMeasure}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(material)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(material.id)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center">
                  Nenhuma matéria-prima encontrada
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
      
      {/* Add Dialog - removed code field */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Nova Matéria-Prima</DialogTitle>
            <DialogDescription>
              Adicione uma nova matéria-prima ao sistema.
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Fécula">Fécula</SelectItem>
                        <SelectItem value="Conservante">Conservante</SelectItem>
                        <SelectItem value="Embalagem">Embalagem</SelectItem>
                        <SelectItem value="Saco">Saco</SelectItem>
                        <SelectItem value="Caixa">Caixa</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addForm.control}
                name="unitOfMeasure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade de Medida</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a unidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="unidade">unidade</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={addForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição do material (opcional)"
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
      
      {/* Edit Dialog - removed code field */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Matéria-Prima</DialogTitle>
            <DialogDescription>
              Edite os detalhes da matéria-prima.
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Fécula">Fécula</SelectItem>
                        <SelectItem value="Conservante">Conservante</SelectItem>
                        <SelectItem value="Embalagem">Embalagem</SelectItem>
                        <SelectItem value="Saco">Saco</SelectItem>
                        <SelectItem value="Caixa">Caixa</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="unitOfMeasure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade de Medida</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a unidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="unidade">unidade</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição do material (opcional)"
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
            <DialogTitle>Excluir Matéria-Prima</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta matéria-prima? Esta ação não pode ser desfeita.
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

export default MaterialsTable;
