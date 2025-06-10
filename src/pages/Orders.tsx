import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { History, Plus, Trash, ClipboardList, Factory, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getTodayDateString, parseDateString } from "@/components/helpers/dateUtils";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Combobox } from "@/components/ui/combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { format, addYears } from "date-fns";

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
        .union([z.number(), z.null()])
        .refine((val) => val != null && val > 0, { message: "Quantidade deve ser maior que zero" }),
      batchNumber: z.string().nonempty({ message: "Lote é obrigatório" }),
      expiryDate: z.string().optional(),
      hasReport: z.boolean().default(false),
    })
  ).nonempty({ message: "Adicione pelo menos um insumo" }),
});

type OrdersFormValues = z.infer<typeof ordersFormSchema>;

// Definindo os passos/abas
const ORDER_TABS = [
  { id: "orderInfo", name: "Informações do Pedido", fields: ["date", "invoiceNumber", "supplierId", "notes"] as const, icon: ClipboardList },
  { id: "orderItems", name: "Insumos Recebidos", fields: ["items"] as const, icon: Factory },
];

const Orders = () => {
  const { suppliers, materials, addOrder, refetchOrders, refetchMaterialBatches } = useData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const isMobile = useIsMobile();
  const [activeTabId, setActiveTabId] = React.useState<string>(ORDER_TABS[0].id);
  const [conservantConversions, setConservantConversions] = React.useState<Array<{itemIndex: number, originalQty: number, convertedQty: number}>>([]);
  const [conservantConversionFactor, setConservantConversionFactor] = React.useState<number | null>(null);
  const [isLoadingFactor, setIsLoadingFactor] = React.useState<boolean>(true);
  
  React.useEffect(() => {
    const fetchConservantFactor = async () => {
      setIsLoadingFactor(true);
      try {
        const { data, error } = await supabase
          .from("global_settings")
          .select("conservant_conversion_factor")
          .limit(1)
          .single();

        if (error) {
          console.error("Error fetching conservant conversion factor:", error);
          toast({
            variant: "destructive",
            title: "Erro ao buscar fator",
            description: "Não foi possível buscar o fator de conversão de conservante.",
          });
          setConservantConversionFactor(1);
        } else if (data) {
          setConservantConversionFactor(data.conservant_conversion_factor);
        } else {
           setConservantConversionFactor(1);
           toast({
            title: "Fator não encontrado",
            description: "Fator de conversão de conservante não encontrado. Usando valor padrão (1).",
          });
        }
      } catch (err) {
        console.error("Unexpected error fetching factor:", err);
        toast({
          variant: "destructive",
          title: "Erro inesperado",
          description: "Ocorreu um erro ao buscar o fator de conversão.",
        });
        setConservantConversionFactor(1);
      } finally {
        setIsLoadingFactor(false);
      }
    };

    fetchConservantFactor();
  }, [toast]);
  
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
          quantity: null as any, 
          batchNumber: "", 
          expiryDate: "", 
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

  // Check for conservant conversions when quantity changes
  const handleQuantityChange = (itemIndex: number, value: number, materialId: string) => {
    const material = getMaterialDetails(materialId);
    
    if (material?.type === "Conservante" && value > 0) {
      const convertedQty = value * (conservantConversionFactor || 1);
      
      setConservantConversions(prev => {
        const filtered = prev.filter(c => c.itemIndex !== itemIndex);
        return [...filtered, { itemIndex, originalQty: value, convertedQty }];
      });
    } else {
      setConservantConversions(prev => prev.filter(c => c.itemIndex !== itemIndex));
    }
  };
  
  const onSubmit = async (data: OrdersFormValues) => {
    if (!hasPermission('orders', 'create')) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você não tem permissão para registrar novos pedidos.",
      });
      return;
    }

    try {
      const supplier = getSupplierDetails(data.supplierId);
      
      if (!supplier) {
        throw new Error(`Fornecedor não encontrado: ${data.supplierId}`);
      }
      
      const hasConversions = conservantConversions.length > 0;
      
      const orderItems = data.items.map((item, index) => {
        const material = getMaterialDetails(item.materialId);
        
        if (!material) {
          throw new Error(`Insumo não encontrado: ${item.materialId}`);
        }

        // Ensure quantity is a valid number
        const quantity = item.quantity || 0;
        let finalQuantity = quantity;
        let finalUnitOfMeasure = material.unitOfMeasure;

        if (material.type === "Conservante") {
          const conversion = conservantConversions.find(c => c.itemIndex === index);
          if (conversion) {
            finalQuantity = conversion.convertedQty;
            finalUnitOfMeasure = "kg";
          } else {
            console.warn(`Conversão não encontrada para o conservante no índice ${index}. Usando quantidade original.`);
          }
        }
        
        return {
          id: Math.random().toString(36).substring(2, 15),
          materialId: item.materialId,
          materialName: material.name,
          materialType: material.type,
          quantity: finalQuantity,
          unitOfMeasure: finalUnitOfMeasure,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate ? parseDateString(item.expiryDate) : undefined,
          hasReport: item.hasReport,
        };
      });
      
      const order = {
        date: parseDateString(data.date),
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplierId,
        supplierName: supplier.name,
        notes: data.notes,
        items: orderItems,
      };
      
      addOrder(order);
      
      // Refetch dados atualizados imediatamente
      await Promise.all([
        refetchOrders(),
        refetchMaterialBatches()
      ]);
      
      if (hasConversions) {
        toast({
          title: "Conversão Automática Aplicada",
          description: "Conservantes foram automaticamente convertidos de caixas para kg.",
        });
      }
      
      form.reset({
        date: getTodayDateString(),
        invoiceNumber: "",
        supplierId: "",
        notes: "",
        items: [
          { 
            materialId: "", 
            quantity: null as any, 
            batchNumber: "", 
            expiryDate: "", 
            hasReport: false 
          }
        ],
      });

      setActiveTabId(ORDER_TABS[0].id);
      setConservantConversions([]);
    } catch (error) {
      console.error("Erro ao registrar pedido:", error);
      toast({
        variant: "destructive",
        title: "Erro ao registrar pedido",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao registrar o pedido.",
      });
    }
  };

  const handleNext = async () => {
    const currentTabIndex = ORDER_TABS.findIndex(tab => tab.id === activeTabId);
    const currentTabFields = ORDER_TABS[currentTabIndex].fields;
    const isValid = await form.trigger(currentTabFields as any);
    if (isValid && currentTabIndex < ORDER_TABS.length - 1) {
      setActiveTabId(ORDER_TABS[currentTabIndex + 1].id);
    }
  };

  const handlePrevious = () => {
    const currentIndex = ORDER_TABS.findIndex((tab) => tab.id === activeTabId);
    if (currentIndex > 0) {
      setActiveTabId(ORDER_TABS[currentIndex - 1].id);
    }
  };

  const currentTabIndex = ORDER_TABS.findIndex(tab => tab.id === activeTabId);

  const suggestExpiryDate = (entryDate: string) => {
    if (!entryDate) return "";
    try {
      const entryDateTime = new Date(entryDate);
      const suggestedDate = addYears(entryDateTime, 1);
      return format(suggestedDate, "yyyy-MM-dd");
    } catch (error) {
      console.error("Error calculating suggested expiry date:", error);
      return "";
    }
  };

  const watchedDate = form.watch("date");

  useEffect(() => {
    if (watchedDate) {
      const suggestedDate = suggestExpiryDate(watchedDate);
      if (suggestedDate) {
        const currentItems = form.getValues("items");
        currentItems.forEach((item, index) => {
          if (!item.expiryDate) {
            form.setValue(`items.${index}.expiryDate`, suggestedDate);
          }
        });
      }
    }
  }, [watchedDate, form]);

  const handleAppendItem = () => {
    const suggestedDate = watchedDate ? suggestExpiryDate(watchedDate) : "";
    append({ 
      materialId: "", 
      quantity: null as any, 
      batchNumber: "", 
      expiryDate: suggestedDate, 
      hasReport: false 
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <h1 className="text-2xl font-bold">Registrar Novo Pedido</h1>
        <Button variant="outline" onClick={() => navigate("/pedidos/historico")}>
          <History className="mr-2 h-4 w-4" />
          Histórico de Pedidos
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs value={activeTabId} onValueChange={setActiveTabId} className="w-full">
            <TabsList className={cn("grid w-full mb-6", isMobile ? "grid-cols-1 h-auto" : `grid-cols-${ORDER_TABS.length}`)}>
              {ORDER_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} disabled={tab.id !== activeTabId} onClick={() => setActiveTabId(tab.id)}>
                  <tab.icon className="mr-2 h-4 w-4" /> {tab.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="orderInfo" forceMount className={cn(activeTabId !== "orderInfo" && "hidden")}>
              <Card>
                <CardHeader>
                  <CardTitle>Detalhes do Pedido</CardTitle>
                  <CardDescription>Forneça os detalhes básicos do pedido/compra.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", isMobile && "grid-cols-1")}>
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Entrada</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
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
                          <FormControl><Input placeholder="Número da NF" {...field} /></FormControl>
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
                           <Combobox
                            options={suppliers.map(supplier => ({ value: supplier.id, label: supplier.name }))}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Selecione um fornecedor"
                            searchPlaceholder="Buscar fornecedor..."
                            notFoundMessage="Nenhum fornecedor encontrado."
                          />
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
                        <FormControl><Textarea placeholder="Observações sobre o pedido..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orderItems" forceMount className={cn(activeTabId !== "orderItems" && "hidden")}>
              <Card>
                <CardHeader>
                  <CardTitle>Insumos do Pedido</CardTitle>
                  <CardDescription>Liste os insumos recebidos, lotes e validades.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {conservantConversions.length > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Conversão Automática:</strong> Conservantes serão automaticamente convertidos de caixas para kg no estoque.
                        {conservantConversions.map((conv, idx) => (
                          <div key={idx} className="text-sm mt-1">
                            • Item {conv.itemIndex + 1}: {conv.originalQty} caixas → {conv.convertedQty} kg
                          </div>
                        ))}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {fields.map((item, index) => (
                    <Card key={item.id} className="p-4 relative bg-muted/30">
                      <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                        <Trash className="h-4 w-4" />
                      </Button>
                      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end", isMobile && "grid-cols-1")}>
                        <FormField
                          control={form.control}
                          name={`items.${index}.materialId`}
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Material</FormLabel>
                              <Combobox
                                options={materials.map(material => ({ value: material.id, label: `${material.name} (${material.unitOfMeasure})` }))}
                                value={field.value}
                                onValueChange={field.onChange}
                                placeholder="Selecione um material"
                                searchPlaceholder="Buscar material..."
                                notFoundMessage="Nenhum material encontrado."
                              />
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => {
                            const material = getMaterialDetails(form.watch(`items.${index}.materialId`));
                            const isConservant = material?.type === "Conservante";
                            
                            return (
                              <FormItem>
                                <FormLabel>
                                  Quantidade Recebida
                                  {isConservant && (
                                    <span className="text-sm text-muted-foreground ml-1">(caixas)</span>
                                  )}
                                </FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    placeholder="0" 
                                    value={field.value == null || field.value === 0 ? "" : field.value}
                                    onChange={e => {
                                      const inputValue = e.target.value;
                                      if (inputValue === "") {
                                        field.onChange(null);
                                        handleQuantityChange(index, 0, form.watch(`items.${index}.materialId`));
                                      } else {
                                        const value = parseFloat(inputValue) || 0;
                                        field.onChange(value);
                                        handleQuantityChange(index, value, form.watch(`items.${index}.materialId`));
                                      }
                                    }}
                                    onBlur={e => {
                                      const inputValue = e.target.value;
                                      if (inputValue === "") {
                                        field.onChange(0);
                                      } else {
                                        const value = parseFloat(inputValue) || 0;
                                        field.onChange(value);
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                        <FormField
                          control={form.control}
                          name={`items.${index}.batchNumber`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Lote do Insumo</FormLabel>
                              <FormControl><Input placeholder="Lote do fabricante" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 items-center", isMobile && "grid-cols-1")}>
                        <FormField
                          control={form.control}
                          name={`items.${index}.expiryDate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Data de Validade (Opcional)
                                {watchedDate && (
                                  <span className="text-xs text-muted-foreground ml-1">
                                    (Sugerida: {suggestExpiryDate(watchedDate)})
                                  </span>
                                )}
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field} 
                                  placeholder={watchedDate ? suggestExpiryDate(watchedDate) : ""}
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
                            <FormItem className="flex flex-row items-center space-x-2 pt-5">
                              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                              <FormLabel className="font-normal">Possui Laudo?</FormLabel>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </Card>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAppendItem} 
                    className="mt-4 w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Insumo
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between mt-8">
            {currentTabIndex > 0 && (
              <Button type="button" variant="outline" onClick={handlePrevious} className="md:w-auto">
                Voltar
              </Button>
            )}
            {currentTabIndex < ORDER_TABS.length - 1 ? (
              <Button type="button" onClick={handleNext} className="ml-auto md:w-auto">
                Avançar
              </Button>
            ) : (
              <Button type="submit" disabled={form.formState.isSubmitting || isLoadingFactor} className="ml-auto md:w-auto">
                {form.formState.isSubmitting ? "Salvando..." : "Salvar Pedido"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default Orders;