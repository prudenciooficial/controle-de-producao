import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProductsTable from "@/components/registration/ProductsTable";
import MaterialsTable from "@/components/registration/MaterialsTable";
import SuppliersTable from "@/components/registration/SuppliersTable";
import ProductPredictabilityTable from "@/components/registration/ProductPredictabilityTable";
import CalcTable from "@/components/registration/CalcTable";
import { useData } from "@/context/DataContext";
import { Loader2 } from "lucide-react";

const Registration = () => {
  const { isLoading } = useData();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Cadastros</h1>
      </div>
      
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="mb-6 bg-muted/70 p-1 rounded-lg w-full sm:w-auto flex flex-wrap justify-center">
          <TabsTrigger value="products" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Produtos</TabsTrigger>
          <TabsTrigger value="materials" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Matérias-Primas</TabsTrigger>
          <TabsTrigger value="suppliers" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Fornecedores</TabsTrigger>
          <TabsTrigger value="predictability" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Previsibilidade</TabsTrigger>
          <TabsTrigger value="calculations" className="rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">Cálculos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="products" className="animate-fade-in">
          <Card>
            <CardHeader className="bg-muted/20 rounded-t-lg border-b">
              <CardTitle>Produtos</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading.products ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ProductsTable />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="materials" className="animate-fade-in">
          <Card>
            <CardHeader className="bg-muted/20 rounded-t-lg border-b">
              <CardTitle>Matérias-Primas</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading.materials ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <MaterialsTable />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="suppliers" className="animate-fade-in">
          <Card>
            <CardHeader className="bg-muted/20 rounded-t-lg border-b">
              <CardTitle>Fornecedores</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading.suppliers ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <SuppliersTable />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="predictability" className="animate-fade-in">
          <Card>
            <CardHeader className="bg-muted/20 rounded-t-lg border-b">
              <CardTitle>Previsibilidade</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading.products ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <ProductPredictabilityTable />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="calculations" className="animate-fade-in">
          <Card>
            <CardHeader className="bg-muted/20 rounded-t-lg border-b">
              <CardTitle>Cálculos</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <CalcTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Registration;
