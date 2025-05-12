import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { History, Plus, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTodayDateString, parseDateString } from "@/components/helpers/dateUtils";

// Schema for form validation
const ordersFormSchema = z.object({
  date: z.string().nonempty({ message: "Data é obrigatória" }),
  invoiceNumber: z.string().nonempty({ message: "Número da nota fiscal é obrigatório" }),
  supplierId: z.string().nonempty({ message: "Fornecedor é obrigatório" }),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      materialId: z.string().nonempty({ message: "Material é obrigatório" }),
      quantity: z
        .number()
        .positive({ message: "Quantidade deve ser maior que zero" }),
      batchNumber: z.string().nonempty({ message: "Lote é obrigatório" }),
      expiryDate: z.string().optional(),
      hasReport: z.boolean().default(false),
    })
  ).nonempty({ message: "Adicione pelo menos um insumo" }),
});

type OrdersFormValues = z.infer<typeof ordersFormSchema>;

const Orders = () => {
  const { suppliers, materials, addOrder } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const form = useForm<OrdersFormValues>({
    resolver: zodResolver(ordersFormSchema),
    defaultValues: {
      date: getTodayDateString(),
      invoiceNumber: "",
      supplierId: "",
      notes: "",
      items: [
        { 
          materialId: "", 
          quantity: 0, 
          batchNumber: "", 
          expiryDate: undefined, 
          hasReport: false 
        }
      ],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  // Get material details
  const getMaterialDetails = (materialId: string) => {
    return materials.find((m) => m.id === materialId);
  };
  
  // Get supplier details
  const getSupplierDetails = (supplierId: string) => {
    return suppliers.find((s) => s.id === supplierId);
  };
  
  const onSubmit = (data: OrdersFormValues) => {
    try {
      const supplier = getSupplierDetails(data.supplierId);
      
      if (!supplier) {
        throw new Error(`Fornecedor não encontrado: ${data.supplierId}`);
      }
      
      // Prepare order items with additional data
      const orderItems = data.items.map((item) => {
        const material = getMaterialDetails(item.materialId);
        
        if (!material) {
          throw new Error(`Insumo não encontrado: ${item.materialId}`);
        }
        
        return {
          id: Math.random().toString(36).substring(2, 15),
          materialId: item.materialId,
          materialName: material.name,
          materialType: material.type,
          quantity: item.quantity,
          unitOfMeasure: material.unitOfMeasure,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate ? new Date(item.expiryDate) : undefined,
          hasReport: item.hasReport,
        };
      });
      
      // Create and add order
      const order = {
        date: parseDateString(data.date),
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplierId,
        supplierName: supplier.name,
        notes: data.notes,
        items: orderItems,
      };
      
      addOrder(order);
      
      toast({
        title: "Pedido registrado",
        description: `Pedido ${data.invoiceNumber} para ${supplier.name} registrado com sucesso.`,
      });
      
      // Reset form
      form.reset({
        date: getTodayDateString(),
        invoiceNumber: "",
        supplierId: "",
        notes: "",
        items: [
          { 
            materialId: "", 
            quantity: 0, 
            batchNumber: "", 
            expiryDate: undefined, 
            hasReport: false 
          }
        ],
      });
    } catch (error) {
      console.error("Erro ao registrar pedido:", error);
      toast({
        variant: "destructive",
        title: "Erro ao registrar pedido",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao registrar o pedido.",
      });
    }
  };
  
  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate("/pedidos/historico")}>
            <History className="mr-2 h-4 w-4" />
            Histórico
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="novo-pedido" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="novo-pedido">Novo Pedido</TabsTrigger>
        </TabsList>
        
        <TabsContent value="novo-pedido">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Novo Pedido</CardTitle>
              <CardDescription>
                Registre os detalhes do pedido e os insumos recebidos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Order details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Entrada</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="invoiceNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nota Fiscal</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fornecedor</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o fornecedor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id}>
                                  {supplier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Order items */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Insumos</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ 
                          materialId: "", 
                          quantity: 0, 
                          batchNumber: "", 
                          expiryDate: undefined, 
                          hasReport: false 
                        })}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Insumo
                      </Button>
                    </div>
                    
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 gap-4 p-4 border rounded-md"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.materialId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Insumo</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione o insumo" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {materials.map((material) => (
                                      <SelectItem key={material.id} value={material.id}>
                                        {material.name} ({material.type})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantidade</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`items.${index}.batchNumber`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Lote do Insumo</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.expiryDate`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Data de Validade</FormLabel>
                                <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(e.target.value || undefined)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`items.${index}.hasReport`}
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Possui Laudo</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {index > 0 && (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => remove(index)}
                            >
                              <Trash className="h-5 w-5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Observações sobre o pedido"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full">
                    Registrar Pedido
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Orders;
