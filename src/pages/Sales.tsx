import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { History, Plus, Trash, ShoppingBag, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTodayDateString, parseDateString } from "@/components/helpers/dateUtils";
import { Combobox } from "@/components/ui/combobox";

// Schema for form validation
const salesFormSchema = z.object({
  date: z.string().nonempty({ message: "Data é obrigatória" }),
  invoiceNumber: z.string(),
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
}).refine(data => {
  if (data.type === "Venda") {
    return data.invoiceNumber.trim() !== "";
  }
  return true;
}, {
  message: "Número da nota fiscal é obrigatório para vendas",
  path: ["invoiceNumber"],
});

type SalesFormValues = z.infer<typeof salesFormSchema>;

// Definindo os passos/abas
const SALE_TABS = [
  { id: "saleInfo", name: "Informações da Venda", fields: ["date", "invoiceNumber", "customerName", "type", "notes"] as const, icon: ClipboardList },
  { id: "saleItems", name: "Itens da Venda", fields: ["items"] as const, icon: ShoppingBag },
];

const Sales = () => {
  const { getAvailableProducts, addSale } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [activeTabId, setActiveTabId] = React.useState<string>(SALE_TABS[0].id);
  
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
    if (!hasPermission('sales', 'create')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para registrar novas vendas.",
      });
      return;
    }

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
          batchNumber: productDetails.batchNumber, // This should already be clean since it comes from produced items
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
      
      // Reset form
      form.reset({
        date: getTodayDateString(),
        invoiceNumber: "",
        customerName: "",
        type: "Venda",
        notes: "",
        items: [{ producedItemId: "", quantity: 0 }],
      });

      setActiveTabId(SALE_TABS[0].id); // Reset para a primeira aba
    } catch (error) {
      console.error("Erro ao registrar venda:", error);
      toast({
        variant: "destructive",
        title: "Erro ao registrar venda",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao registrar a venda.",
      });
    }
  };

  const handleNext = async () => {
    const currentTabIndex = SALE_TABS.findIndex(tab => tab.id === activeTabId);
    const currentTabFields = SALE_TABS[currentTabIndex].fields;
    // @ts-ignore
    const isValid = await form.trigger(currentTabFields);
    if (isValid && currentTabIndex < SALE_TABS.length - 1) {
      setActiveTabId(SALE_TABS[currentTabIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    const currentTabIndex = SALE_TABS.findIndex(tab => tab.id === activeTabId);
    if (currentTabIndex > 0) {
      setActiveTabId(SALE_TABS[currentTabIndex - 1].id);
    }
  };

  const currentTabIndex = SALE_TABS.findIndex(tab => tab.id === activeTabId);

  return (
    <div className="container mx-auto py-6 px-4 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Registrar Nova Saída/Venda</h1>
        <Button variant="outline" onClick={() => navigate("/vendas/historico")}>
          <History className="mr-2 h-4 w-4" />
          Histórico de Vendas
        </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
            <TabsList className={cn("grid w-full mb-6", isMobile ? "grid-cols-1 h-auto" : `grid-cols-${SALE_TABS.length}`)}>
              {SALE_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} disabled={tab.id !== activeTabId} onClick={() => setActiveTabId(tab.id)}>
                  <tab.icon className="mr-2 h-4 w-4" /> {tab.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Aba de Informações da Venda */}
            <TabsContent value="saleInfo" forceMount className={cn(activeTabId !== "saleInfo" && "hidden")}>
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes da Saída/Venda</CardTitle>
                  <CardDescription>
                    Forneça os detalhes básicos da transação.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", isMobile && "grid-cols-1")}>
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
                            <Input placeholder="Nº da NF (opcional se não for venda)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", isMobile && "grid-cols-1")}>
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Cliente/Destino</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do cliente ou destino" {...field} />
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
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Alguma observação relevante sobre a saída..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba de Itens da Venda */}
            <TabsContent value="saleItems" forceMount className={cn(activeTabId !== "saleItems" && "hidden")}>
              <Card>
                <CardHeader>
                  <CardTitle>Produtos da Saída/Venda</CardTitle>
                  <CardDescription>
                    Liste os produtos e quantidades.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="p-4 relative bg-muted/30">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 items-end", isMobile && "grid-cols-1")}>
                        <FormField
                          control={form.control}
                          name={`items.${index}.producedItemId`}
                          render={({ field: formField }) => {
                            const productDetails = getProductDetails(formField.value);
                            return (
                              <FormItem className="flex flex-col">
                                <FormLabel>Produto (Lote)</FormLabel>
                                <Combobox
                                  options={availableProducts.map((product) => ({
                                    value: product.id,
                                    label: `${product.productName} (Lote: ${product.batchNumber}, Disp: ${product.remainingQuantity} ${product.unitOfMeasure})`,
                                    disabled: product.remainingQuantity <= 0 && product.id !== formField.value
                                  }))}
                                  value={formField.value}
                                  onValueChange={formField.onChange}
                                  placeholder="Selecione um produto"
                                  searchPlaceholder="Buscar produto..."
                                  notFoundMessage="Nenhum produto encontrado."
                                />
                                {productDetails && (
                                  <FormDescription className="text-xs mt-1">
                                    Estoque disponível: {productDetails.remainingQuantity} {productDetails.unitOfMeasure}
                                  </FormDescription>
                                )}
                                <FormMessage /> 
                              </FormItem>
                            );
                          }}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field: formField }) => { // Renomeado
                            const selectedProducedItemId = form.watch(`items.${index}.producedItemId`);
                            React.useEffect(() => {
                              if (selectedProducedItemId && typeof formField.value === 'number') {
                                const product = getProductDetails(selectedProducedItemId);
                                if (product) {
                                  if (formField.value > product.remainingQuantity) {
                                    form.setError(`items.${index}.quantity`, {
                                      type: 'manual',
                                      message: `Máx: ${product.remainingQuantity} ${product.unitOfMeasure}`,
                                    });
                                  } else {
                                    const errors = form.formState.errors.items?.[index]?.quantity;
                                    if (errors && errors.type === 'manual') {
                                       form.clearErrors(`items.${index}.quantity`);
                                    }
                                  }
                                }
                              }
                            }, [selectedProducedItemId, formField.value, index, form, getProductDetails]);
                            return (
                              <FormItem>
                                <FormLabel>Quantidade</FormLabel>
                                <FormControl>
                                  <Input type="number" placeholder="0" {...formField} onChange={e => formField.onChange(parseFloat(e.target.value) || 0)} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>
                    </Card>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ producedItemId: "", quantity: 0 })}
                    className="mt-4 w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Produto
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Botões de Navegação e Submissão */}
          <div className="flex justify-between mt-8">
            {currentTabIndex > 0 && (
              <Button type="button" variant="outline" onClick={handlePrevious} className="md:w-auto">
                Voltar
              </Button>
            )}
            {currentTabIndex < SALE_TABS.length - 1 && (
              <Button type="button" onClick={handleNext} className="ml-auto md:w-auto">
                Avançar
              </Button>
            )}
            {currentTabIndex === SALE_TABS.length - 1 && (
              <Button type="submit" disabled={form.formState.isSubmitting} className="ml-auto md:w-auto">
                {form.formState.isSubmitting ? "Salvando..." : "Salvar Venda"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default Sales;
