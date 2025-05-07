import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash } from "lucide-react";

// Form schemas
const productFormSchema = z.object({
  name: z.string().nonempty({ message: "Nome é obrigatório" }),
  code: z.string().nonempty({ message: "Código é obrigatório" }),
  unitOfMeasure: z.string().nonempty({ message: "Unidade de medida é obrigatória" }),
  description: z.string().optional(),
});

const materialFormSchema = z.object({
  name: z.string().nonempty({ message: "Nome é obrigatório" }),
  code: z.string().nonempty({ message: "Código é obrigatório" }),
  type: z.string().nonempty({ message: "Tipo é obrigatório" }),
  unitOfMeasure: z.string().nonempty({ message: "Unidade de medida é obrigatória" }),
  description: z.string().optional(),
});

const supplierFormSchema = z.object({
  name: z.string().nonempty({ message: "Nome é obrigatório" }),
  code: z.string().nonempty({ message: "Código é obrigatório" }),
  contacts: z.string().optional(),
  notes: z.string().optional(),
});

// Form value types
type ProductFormValues = z.infer<typeof productFormSchema>;
type MaterialFormValues = z.infer<typeof materialFormSchema>;
type SupplierFormValues = z.infer<typeof supplierFormSchema>;

const Registration = () => {
  const { 
    products, 
    materials, 
    suppliers, 
    addProduct, 
    addMaterial, 
    addSupplier,
    deleteProduct,
    deleteMaterial,
    deleteSupplier
  } = useData();
  const { toast } = useToast();

  // Dialog states
  const [showDeleteProductDialog, setShowDeleteProductDialog] = useState(false);
  const [showDeleteMaterialDialog, setShowDeleteMaterialDialog] = useState(false);
  const [showDeleteSupplierDialog, setShowDeleteSupplierDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  
  // Forms
  const productForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      code: "",
      unitOfMeasure: "kg",
      description: "",
    },
  });
  
  const materialForm = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      name: "",
      code: "",
      type: "",
      unitOfMeasure: "kg",
      description: "",
    },
  });
  
  const supplierForm = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      code: "",
      contacts: "",
      notes: "",
    },
  });
  
  // Submit handlers
  const onProductSubmit = (data: ProductFormValues) => {
    // Ensure all required fields are present for the Product type
    const productData = {
      name: data.name,
      code: data.code,
      unitOfMeasure: data.unitOfMeasure,
      description: data.description
    };
    
    addProduct(productData);
    toast({
      title: "Produto cadastrado",
      description: `Produto ${data.name} cadastrado com sucesso.`,
    });
    productForm.reset();
  };
  
  const onMaterialSubmit = (data: MaterialFormValues) => {
    // Cast the type to match the expected Material type values
    const materialType = data.type as "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro";
    
    // Ensure all required fields are present for the Material type
    const materialData = {
      name: data.name,
      code: data.code,
      type: materialType,
      unitOfMeasure: data.unitOfMeasure,
      description: data.description
    };
    
    addMaterial(materialData);
    toast({
      title: "Insumo cadastrado",
      description: `Insumo ${data.name} cadastrado com sucesso.`,
    });
    materialForm.reset();
  };
  
  const onSupplierSubmit = (data: SupplierFormValues) => {
    // Ensure all required fields are present for the Supplier type
    const supplierData = {
      name: data.name,
      code: data.code,
      contacts: data.contacts,
      notes: data.notes
    };
    
    addSupplier(supplierData);
    toast({
      title: "Fornecedor cadastrado",
      description: `Fornecedor ${data.name} cadastrado com sucesso.`,
    });
    supplierForm.reset();
  };
  
  // Delete handlers
  const handleDeleteProduct = () => {
    if (selectedProductId) {
      deleteProduct(selectedProductId);
      setShowDeleteProductDialog(false);
      toast({
        title: "Produto excluído",
        description: "O produto foi excluído com sucesso.",
      });
    }
  };
  
  const handleDeleteMaterial = () => {
    if (selectedMaterialId) {
      deleteMaterial(selectedMaterialId);
      setShowDeleteMaterialDialog(false);
      toast({
        title: "Insumo excluído",
        description: "O insumo foi excluído com sucesso.",
      });
    }
  };
  
  const handleDeleteSupplier = () => {
    if (selectedSupplierId) {
      deleteSupplier(selectedSupplierId);
      setShowDeleteSupplierDialog(false);
      toast({
        title: "Fornecedor excluído",
        description: "O fornecedor foi excluído com sucesso.",
      });
    }
  };
  
  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cadastro</h1>
      </div>
      
      <Tabs defaultValue="produtos" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="insumos">Insumos</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        </TabsList>
        
        {/* Products Tab */}
        <TabsContent value="produtos">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cadastrar Novo Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...productForm}>
                  <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-6">
                    <FormField
                      control={productForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Produto</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={productForm.control}
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
                      control={productForm.control}
                      name="unitOfMeasure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unidade de Medida</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a unidade" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="kg">Quilograma (kg)</SelectItem>
                              <SelectItem value="g">Grama (g)</SelectItem>
                              <SelectItem value="L">Litro (L)</SelectItem>
                              <SelectItem value="mL">Mililitro (mL)</SelectItem>
                              <SelectItem value="unidade">Unidade</SelectItem>
                              <SelectItem value="caixa">Caixa</SelectItem>
                              <SelectItem value="pacote">Pacote</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={productForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full">
                      Cadastrar Produto
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Produtos Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Un.</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length > 0 ? (
                      products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.code}</TableCell>
                          <TableCell>{product.unitOfMeasure}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => {
                                setSelectedProductId(product.id);
                                setShowDeleteProductDialog(true);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          Nenhum produto cadastrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Materials Tab */}
        <TabsContent value="insumos">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cadastrar Novo Insumo</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...materialForm}>
                  <form onSubmit={materialForm.handleSubmit(onMaterialSubmit)} className="space-y-6">
                    <FormField
                      control={materialForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Insumo</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={materialForm.control}
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
                      control={materialForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      control={materialForm.control}
                      name="unitOfMeasure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unidade de Medida</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a unidade" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="kg">Quilograma (kg)</SelectItem>
                              <SelectItem value="g">Grama (g)</SelectItem>
                              <SelectItem value="L">Litro (L)</SelectItem>
                              <SelectItem value="mL">Mililitro (mL)</SelectItem>
                              <SelectItem value="unidade">Unidade</SelectItem>
                              <SelectItem value="caixa">Caixa</SelectItem>
                              <SelectItem value="pacote">Pacote</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={materialForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full">
                      Cadastrar Insumo
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Insumos Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Un.</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materials.length > 0 ? (
                      materials.map((material) => (
                        <TableRow key={material.id}>
                          <TableCell>{material.name}</TableCell>
                          <TableCell>{material.type}</TableCell>
                          <TableCell>{material.unitOfMeasure}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => {
                                setSelectedMaterialId(material.id);
                                setShowDeleteMaterialDialog(true);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          Nenhum insumo cadastrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Suppliers Tab */}
        <TabsContent value="fornecedores">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cadastrar Novo Fornecedor</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...supplierForm}>
                  <form onSubmit={supplierForm.handleSubmit(onSupplierSubmit)} className="space-y-6">
                    <FormField
                      control={supplierForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Fornecedor</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={supplierForm.control}
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
                      control={supplierForm.control}
                      name="contacts"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contatos</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Telefones, e-mails, etc.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={supplierForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full">
                      Cadastrar Fornecedor
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Fornecedores Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Contatos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliers.length > 0 ? (
                      suppliers.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell>{supplier.name}</TableCell>
                          <TableCell>{supplier.code}</TableCell>
                          <TableCell>{supplier.contacts || "-"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => {
                                setSelectedSupplierId(supplier.id);
                                setShowDeleteSupplierDialog(true);
                              }}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          Nenhum fornecedor cadastrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Delete Product Dialog */}
      <Dialog open={showDeleteProductDialog} onOpenChange={setShowDeleteProductDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este produto?
              <br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteProduct}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Material Dialog */}
      <Dialog open={showDeleteMaterialDialog} onOpenChange={setShowDeleteMaterialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este insumo?
              <br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteMaterial}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Supplier Dialog */}
      <Dialog open={showDeleteSupplierDialog} onOpenChange={setShowDeleteSupplierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este fornecedor?
              <br />
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeleteSupplier}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Registration;
