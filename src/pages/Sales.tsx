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
import { History, Plus, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTodayDateString, parseDateString } from "@/components/helpers/dateUtils";

// Schema for form validation
const salesFormSchema = z.object({
  date: z.string().nonempty({ message: "Data é obrigatória" }),
  invoiceNumber: z.string().nonempty({ message: "Número da nota fiscal é obrigatório" }),
  customerName: z.string().nonempty({ message: "Nome do cliente é obrigatório" }),
  type: z.string().nonempty({ message: "Tipo de saída é obrigatório" }),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      producedItemId: z.string().nonempty({ message: "Produto é obrigatório" }),
      quantity: z
        .number()
        .positive({ message: "Quantidade deve ser maior que zero" }),
    })
  ).nonempty({ message: "Adicione pelo menos um produto" }),
});

type SalesFormValues = z.infer<typeof salesFormSchema>;

const Sales = () => {
  const { getAvailableProducts, addSale } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const availableProducts = getAvailableProducts();
  
  const form = useForm<SalesFormValues>({
    resolver: zodResolver(salesFormSchema),
    defaultValues: {
      date: getTodayDateString(),
      invoiceNumber: "",
      customerName: "",
      type: "Venda",
      notes: "",
      items: [{ producedItemId: "", quantity: 0 }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  
  const getProductDetails = (producedItemId: string) => {
    return availableProducts.find((p) => p.id === producedItemId);
  };
  
  const onSubmit = (data: SalesFormValues) => {
    try {
      // Prepare sale items with additional data
      const saleItems = data.items.map((item) => {
        const productDetails = getProductDetails(item.producedItemId);
        
        if (!productDetails) {
          throw new Error(`Produto não encontrado: ${item.producedItemId}`);
        }
        
        if (productDetails.remainingQuantity < item.quantity) {
          throw new Error(`Quantidade insuficiente do produto ${productDetails.productName} no lote ${productDetails.batchNumber}`);
        }
        
        return {
          id: Math.random().toString(36).substring(2, 15),
          productId: productDetails.productId,
          productName: productDetails.productName,
          producedItemId: item.producedItemId,
          batchNumber: productDetails.batchNumber,
          quantity: item.quantity,
          unitOfMeasure: productDetails.unitOfMeasure,
        };
      });
      
      // Create and add sale
      const sale = {
        date: parseDateString(data.date),
        invoiceNumber: data.invoiceNumber,
        customerName: data.customerName,
        type: data.type as "Venda" | "Doação" | "Descarte" | "Devolução" | "Outro",
        notes: data.notes,
        items: saleItems,
      };
      
      addSale(sale);
      
      toast({
        title: "Venda registrada",
        description: `Venda ${data.invoiceNumber} para ${data.customerName} registrada com sucesso.`,
      });
      
      // Reset form
      form.reset({
        date: getTodayDateString(),
        invoiceNumber: "",
        customerName: "",
        type: "Venda",
        notes: "",
        items: [{ producedItemId: "", quantity: 0 }],
      });
    } catch (error) {
      console.error("Erro ao registrar venda:", error);
      toast({
        variant: "destructive",
        title: "Erro ao registrar venda",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao registrar a venda.",
      });
    }
  };
  
  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate("/vendas/historico")}>
            <History className="mr-2 h-4 w-4" />
            Histórico
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="nova-venda" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="nova-venda">Nova Venda</TabsTrigger>
        </TabsList>
        
        <TabsContent value="nova-venda">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Nova Venda</CardTitle>
              <CardDescription>
                Registre os detalhes da venda e os produtos vendidos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Sale details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data da Saída/Venda</FormLabel>
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
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Cliente</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Saída</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Venda">Venda</SelectItem>
                              <SelectItem value="Doação">Doação</SelectItem>
                              <SelectItem value="Descarte">Descarte</SelectItem>
                              <SelectItem value="Devolução">Devolução</SelectItem>
                              <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Sale items */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">Produtos</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ producedItemId: "", quantity: 0 })}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Produto
                      </Button>
                    </div>
                    
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md"
                      >
                        <FormField
                          control={form.control}
                          name={`items.${index}.producedItemId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Produto (Lote)</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o produto" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableProducts.map((product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id}
                                    >
                                      {product.productName} - {product.batchNumber} ({product.remainingQuantity} {product.unitOfMeasure})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="flex space-x-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
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
                          
                          {index > 0 && (
                            <div className="flex items-end mb-2">
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
                            placeholder="Observações sobre a venda"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full">
                    Registrar Venda
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

export default Sales;
