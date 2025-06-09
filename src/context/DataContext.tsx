import React, { createContext, useContext, useState, useEffect } from "react";
import {
  ProductionBatch,
  Sale,
  Order,
  Loss,
  Product,
  Material,
  Supplier,
  MaterialBatch,
  ProducedItem,
  DashboardStats,
  GlobalSettings
} from "../types";
import { 
  fetchProducts, 
  createProduct,
  updateProduct as updateProductApi,
  deleteProduct as deleteProductApi,
  fetchMaterials, 
  createMaterial,
  updateMaterial as updateMaterialApi,
  deleteMaterial as deleteMaterialApi,
  fetchMaterialBatchesWithDetails,
  fetchSuppliers,
  createSupplier,
  updateSupplier as updateSupplierApi,
  deleteSupplier as deleteSupplierApi,
  fetchProductionBatches,
  createProductionBatch as createProductionBatchApi,
  updateProductionBatch as updateProductionBatchApi,
  deleteProductionBatch as deleteProductionBatchApi,
  fetchSales,
  createSale as createSaleApi,
  updateSale as updateSaleApi,
  deleteSale as deleteSaleApi,
  fetchOrders,
  createOrder as createOrderApi,
  updateOrder as updateOrderApi,
  deleteOrder as deleteOrderApi,
  fetchLossesWithDetails,
  createLoss as createLossApi,
  updateLoss as updateLossApi,
  deleteLoss as deleteLossApi,
  fetchGlobalSettings
} from "../services";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { useAuth } from "@/contexts/AuthContext";

interface DataContextType {
  // Data collections
  productionBatches: ProductionBatch[];
  sales: Sale[];
  orders: Order[];
  losses: Loss[];
  products: Product[];
  materials: Material[];
  suppliers: Supplier[];
  materialBatches: MaterialBatch[];
  globalSettings: GlobalSettings | null;
  
  // Loading states
  isLoading: {
    products: boolean;
    materials: boolean;
    suppliers: boolean;
    materialBatches: boolean;
    productionBatches: boolean;
    sales: boolean;
    orders: boolean;
    losses: boolean;
    globalSettings: boolean;
  };
  
  // Stats
  dashboardStats: DashboardStats;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  
  // Refetch functions
  refetchProducts: () => Promise<void>;
  refetchMaterials: () => Promise<void>;
  refetchSuppliers: () => Promise<void>;
  refetchMaterialBatches: () => Promise<void>;
  refetchProductionBatches: () => Promise<void>;
  refetchSales: () => Promise<void>;
  refetchOrders: () => Promise<void>;
  refetchLosses: () => Promise<void>;
  refetchGlobalSettings: () => Promise<void>;
  
  // CRUD operations
  addProductionBatch: (batch: Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateProductionBatch: (id: string, batch: Partial<ProductionBatch>) => Promise<void>;
  deleteProductionBatch: (id: string) => Promise<void>;
  
  addSale: (sale: Omit<Sale, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateSale: (id: string, sale: Partial<Sale>) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;
  
  addOrder: (order: Omit<Order, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateOrder: (id: string, order: Partial<Order>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  
  addLoss: (loss: Omit<Loss, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateLoss: (id: string, loss: Partial<Loss>) => Promise<void>;
  deleteLoss: (id: string) => Promise<void>;
  
  addProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  addMaterial: (material: Omit<Material, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateMaterial: (id: string, material: Partial<Material>) => Promise<void>;
  deleteMaterial: (id: string) => Promise<void>;
  
  addSupplier: (supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  
  // Helper methods
  getAvailableMaterials: () => MaterialBatch[];
  getAvailableProducts: () => ProducedItem[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Mock data for initial state
const mockSales: Sale[] = [
  {
    id: "s1",
    date: new Date("2023-10-15"),
    invoiceNumber: "NF-001",
    customerName: "Supermercado ABC",
    type: "Venda",
    notes: "Cliente regular",
    items: [
      {
        id: "si1",
        productId: "p1",
        productName: "Polvilho Doce",
        producedItemId: "pi1",
        batchNumber: "PROD-2023-001-P1",
        quantity: 150,
        unitOfMeasure: "kg"
      }
    ],
    createdAt: new Date("2023-10-15"),
    updatedAt: new Date("2023-10-15")
  }
];

// Sample orders
const mockOrders: Order[] = [
  {
    id: "o1",
    date: new Date("2023-09-01"),
    invoiceNumber: "NF-SUP-001",
    supplierId: "s1",
    supplierName: "Fornecedor de Fécula LTDA",
    notes: "Pedido normal",
    items: [
      {
        id: "oi1",
        materialId: "m1",
        materialName: "Fécula de Mandioca",
        materialType: "Fécula",
        quantity: 1000,
        unitOfMeasure: "kg",
        batchNumber: "FEC-2023-001",
        expiryDate: new Date("2025-12-31"),
        hasReport: true
      }
    ],
    createdAt: new Date("2023-09-01"),
    updatedAt: new Date("2023-09-01")
  }
];

// Sample losses
const mockLosses: Loss[] = [
  {
    id: "l1",
    date: new Date("2023-10-10"),
    productionBatchId: "pb1",
    batchNumber: "PROD-2023-001",
    machine: "Mexedor",
    quantity: 5,
    unitOfMeasure: "kg",
    productType: "Fécula",
    notes: "Perda durante processo de mistura",
    createdAt: new Date("2023-10-10"),
    updatedAt: new Date("2023-10-10")
  }
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, getUserDisplayName, checkJWTError } = useAuth();
  
  // State for all data collections
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [losses, setLosses] = useState<Loss[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materialBatches, setMaterialBatches] = useState<MaterialBatch[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState({
    products: true,
    materials: true,
    suppliers: true,
    materialBatches: true,
    productionBatches: true,
    sales: true,
    orders: true,
    losses: true,
    globalSettings: true,
  });

  const { toast } = useToast();

  // State for dashboard stats
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalProduction: 0,
    totalSales: 0,
    currentInventory: 0,
    averageProfitability: 0,
    totalFeculaInventoryKg: 0
  });

  // Fetch all data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(prev => ({ ...prev, products: true }));
        const productsData = await fetchProducts();
        setProducts(productsData);
      } catch (error) {
        console.error("Error loading products:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados dos produtos",
          variant: "destructive",
        });
      } finally {
        setIsLoading(prev => ({ ...prev, products: false }));
      }
      
      try {
        setIsLoading(prev => ({ ...prev, materials: true }));
        const materialsData = await fetchMaterials();
        setMaterials(materialsData);
      } catch (error) {
        console.error("Error loading materials:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados dos materiais",
          variant: "destructive",
        });
      } finally {
        setIsLoading(prev => ({ ...prev, materials: false }));
      }
      
      try {
        setIsLoading(prev => ({ ...prev, suppliers: true }));
        const suppliersData = await fetchSuppliers();
        setSuppliers(suppliersData);
      } catch (error) {
        console.error("Error loading suppliers:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados dos fornecedores",
          variant: "destructive",
        });
      } finally {
        setIsLoading(prev => ({ ...prev, suppliers: false }));
      }
      
      try {
        setIsLoading(prev => ({ ...prev, materialBatches: true }));
        const materialBatchesData = await fetchMaterialBatchesWithDetails();
        setMaterialBatches(materialBatchesData);
      } catch (error) {
        console.error("Error loading material batches:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados dos lotes de materiais",
          variant: "destructive",
        });
      } finally {
        setIsLoading(prev => ({ ...prev, materialBatches: false }));
      }
      
      try {
        setIsLoading(prev => ({ ...prev, productionBatches: true }));
        const productionBatchesData = await fetchProductionBatches();
        setProductionBatches(productionBatchesData);
      } catch (error) {
        console.error("Error loading production batches:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados dos lotes de produção",
          variant: "destructive",
        });
      } finally {
        setIsLoading(prev => ({ ...prev, productionBatches: false }));
      }

      try {
        setIsLoading(prev => ({ ...prev, sales: true }));
        const salesData = await fetchSales();
        setSales(salesData);
      } catch (error) {
        console.error("Error loading sales:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados das vendas",
          variant: "destructive",
        });
      } finally {
        setIsLoading(prev => ({ ...prev, sales: false }));
      }

      try {
        setIsLoading(prev => ({ ...prev, orders: true }));
        const ordersData = await fetchOrders();
        setOrders(ordersData);
      } catch (error) {
        console.error("Error loading orders:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados dos pedidos",
          variant: "destructive",
        });
      } finally {
        setIsLoading(prev => ({ ...prev, orders: false }));
      }

      try {
        setIsLoading(prev => ({ ...prev, losses: true }));
        const lossesData = await fetchLossesWithDetails(dateRange);
        setLosses(lossesData);
      } catch (error) {
        console.error("Error loading losses:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados das perdas",
          variant: "destructive",
        });
      } finally {
        setIsLoading(prev => ({ ...prev, losses: false }));
      }

      // Buscar configurações globais
      try {
        setIsLoading(prev => ({ ...prev, globalSettings: true }));
        const settings = await fetchGlobalSettings();
        setGlobalSettings(settings);
      } catch (error) {
        console.error("Error loading global settings:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar configurações globais",
          variant: "destructive",
        });
      } finally {
        setIsLoading(prev => ({ ...prev, globalSettings: false }));
      }
    };
    
    console.log('🔄 DataContext: Carregando dados...');
    loadData();
  }, []);

  // Separate useEffect for date range changes (only affects losses)
  useEffect(() => {
    const reloadLossesForDateRange = async () => {
      try {
        setIsLoading(prev => ({ ...prev, losses: true }));
        const lossesData = await fetchLossesWithDetails(dateRange);
        setLosses(lossesData);
      } catch (error) {
        console.error("Error reloading losses for date range:", error);
        toast({
          title: "Erro",
          description: "Falha ao carregar dados das perdas",
          variant: "destructive",
        });
      } finally {
        setIsLoading(prev => ({ ...prev, losses: false }));
      }
    };

    // Only reload losses if dateRange exists (avoid initial load duplication)
    if (dateRange) {
      console.log('📅 DataContext: Recarregando perdas para nova data range...');
      reloadLossesForDateRange();
    }
  }, [dateRange, toast]);

  // Refetch functions
  const refetchProducts = async () => {
    try {
      setIsLoading(prev => ({ ...prev, products: true }));
      const productsData = await fetchProducts();
      setProducts(productsData);
    } catch (error) {
      console.error("Error refetching products:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao atualizar dados dos produtos",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(prev => ({ ...prev, products: false }));
    }
  };

  const refetchMaterials = async () => {
    try {
      setIsLoading(prev => ({ ...prev, materials: true }));
      const materialsData = await fetchMaterials();
      setMaterials(materialsData);
    } catch (error) {
      console.error("Error refetching materials:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao atualizar dados dos materiais",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(prev => ({ ...prev, materials: false }));
    }
  };

  const refetchSuppliers = async () => {
    try {
      setIsLoading(prev => ({ ...prev, suppliers: true }));
      const suppliersData = await fetchSuppliers();
      setSuppliers(suppliersData);
    } catch (error) {
      console.error("Error refetching suppliers:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao atualizar dados dos fornecedores",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(prev => ({ ...prev, suppliers: false }));
    }
  };

  const refetchMaterialBatches = async () => {
    try {
      setIsLoading(prev => ({ ...prev, materialBatches: true }));
      const materialBatchesData = await fetchMaterialBatchesWithDetails();
      setMaterialBatches(materialBatchesData);
    } catch (error) {
      console.error("Error refetching material batches:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao atualizar dados dos lotes de materiais",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(prev => ({ ...prev, materialBatches: false }));
    }
  };

  const refetchProductionBatches = async () => {
    try {
      setIsLoading(prev => ({ ...prev, productionBatches: true }));
      const productionBatchesData = await fetchProductionBatches();
      setProductionBatches(productionBatchesData);
    } catch (error) {
      console.error("Error refetching production batches:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao atualizar dados dos lotes de produção",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(prev => ({ ...prev, productionBatches: false }));
    }
  };

  const refetchSales = async () => {
    try {
      setIsLoading(prev => ({ ...prev, sales: true }));
      const salesData = await fetchSales();
      setSales(salesData);
    } catch (error) {
      console.error("Error refetching sales:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao atualizar dados das vendas",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(prev => ({ ...prev, sales: false }));
    }
  };

  const refetchOrders = async () => {
    try {
      setIsLoading(prev => ({ ...prev, orders: true }));
      const ordersData = await fetchOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error("Error refetching orders:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao atualizar dados dos pedidos",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(prev => ({ ...prev, orders: false }));
    }
  };

  const refetchLosses = async () => {
    try {
      setIsLoading(prev => ({ ...prev, losses: true }));
      const data = await fetchLossesWithDetails(dateRange);
      setLosses(data);
    } catch (error) {
      console.error("Error refetching losses:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao recarregar dados das perdas",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(prev => ({ ...prev, losses: false }));
    }
  };

  const refetchGlobalSettings = async () => {
    try {
      setIsLoading(prev => ({ ...prev, globalSettings: true }));
      const data = await fetchGlobalSettings();
      setGlobalSettings(data);
    } catch (error) {
      console.error("Error refetching global settings:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao recarregar configurações globais",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(prev => ({ ...prev, globalSettings: false }));
    }
  };

  // Calculate dashboard stats based on date range
  useEffect(() => {
    // Filter data based on date range
    const filterByDateRange = <T extends { date?: Date; productionDate?: Date }>(
      items: T[],
      dateField: 'date' | 'productionDate'
    ): T[] => {
      if (!dateRange?.from) return items;
      
      return items.filter(item => {
        const itemDate = item[dateField];
        if (!itemDate) return true;
        
        const date = new Date(itemDate);
        
        if (dateRange.from && dateRange.to) {
          return date >= dateRange.from && date <= dateRange.to;
        }
        
        return date >= dateRange.from;
      });
    };
    
    // Filter production batches and sales
    const filteredProductionBatches = filterByDateRange(productionBatches, 'productionDate');
    const filteredSales = filterByDateRange(sales, 'date');
    
    // Calculate total production in KG using weight factors
    const totalProduction = filteredProductionBatches.reduce((acc, batch) => {
      return acc + batch.producedItems.reduce((itemAcc, item) => {
        const product = products.find(p => p.id === item.productId);
        const weightFactor = product?.weightFactor || 1;
        return itemAcc + (item.quantity * weightFactor);
      }, 0);
    }, 0);

    // Calculate total sales in KG using weight factors
    const totalSales = filteredSales.reduce((acc, sale) => {
      return acc + sale.items.reduce((itemAcc, item) => {
        const product = products.find(p => p.id === item.productId);
        const weightFactor = product?.weightFactor || 1;
        return itemAcc + (item.quantity * weightFactor);
      }, 0);
    }, 0);

    // Calculate current inventory in KG using weight factors (not filtered by date range)
    const currentInventory = productionBatches.reduce((acc, batch) => {
      return acc + batch.producedItems.reduce((itemAcc, item) => {
        const product = products.find(p => p.id === item.productId);
        const weightFactor = product?.weightFactor || 1;
        // Ensure we're using a valid number
        const remaining = typeof item.remainingQuantity === 'number' ? item.remainingQuantity : 0;
        return itemAcc + (remaining * weightFactor);
      }, 0);
    }, 0);

    // Calculate average profitability using production efficiency method
    const productionEfficiencies: number[] = [];
    
    filteredProductionBatches.forEach(batch => {
      // Calculate KG produced for this batch
      const kgProduced = batch.producedItems.reduce((acc, item) => {
        const product = products.find(p => p.id === item.productId);
        const weightFactor = product?.weightFactor || 1;
        return acc + (item.quantity * weightFactor);
      }, 0);
      
      // Calculate total starch used (fécula) for this batch
      const feculaUsed = batch.usedMaterials.reduce((acc, material) => {
        // Find the material to check if it's starch
        const materialData = materials.find(m => m.name === material.materialName);
        if (materialData && materialData.type.toLowerCase().includes('fécula')) {
          // Get the fecula conversion factor from products (using first product's factor as default)
          const product = products.find(p => p.id === batch.producedItems[0]?.productId);
          const feculaConversionFactor = product?.feculaConversionFactor || 25;
          
          // LÓGICA CORRIGIDA: mixCount × sacos por mexida × fator de conversão
          const totalSacosFeculas = material.quantity * batch.mixCount;
          return acc + (totalSacosFeculas * feculaConversionFactor);
        }
        return acc;
      }, 0);
      
      // Only calculate efficiency if we have both production and starch usage
      if (kgProduced > 0 && feculaUsed > 0) {
        const efficiency = kgProduced / feculaUsed;
        productionEfficiencies.push(efficiency);
      }
    });
    
    // Calculate average profitability as the mean of all production efficiencies
    const averageProfitability = productionEfficiencies.length > 0 
      ? productionEfficiencies.reduce((sum, eff) => sum + eff, 0) / productionEfficiencies.length 
      : 0;

    // Calcular o estoque total de Fécula em KG (a partir de materialBatches)
    const totalFeculaInventoryKg = materialBatches.reduce((acc, batch) => {
      // Certifique-se de que materialType existe e é uma string antes de chamar toLowerCase()
      if (batch.materialType && typeof batch.materialType === 'string' && batch.materialType.toLowerCase().includes('fécula')) {
        return acc + (batch.remainingQuantity || 0); // Adiciona remainingQuantity, tratando undefined como 0
      }
      return acc;
    }, 0);

    setDashboardStats({
      totalProduction,
      totalSales,
      currentInventory,
      averageProfitability: parseFloat(averageProfitability.toFixed(4)),
      totalFeculaInventoryKg,
    });

    // Log the calculated values for debugging
    console.log("Dashboard stats calculation with new profitability method:", {
      dateRange,
      totalProduction,
      totalSales,
      currentInventory,
      productionEfficiencies,
      averageProfitability: parseFloat(averageProfitability.toFixed(4))
    });

  }, [productionBatches, sales, dateRange, products, materials, materialBatches]);

  // Helper functions
  const generateId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  // CRUD operations for Production Batches
  const addProductionBatch = async (batch: Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newBatch = await createProductionBatchApi(batch, user?.id, getUserDisplayName());
      setProductionBatches([...productionBatches, newBatch]);
      // Refetch material batches to update stock levels
      await refetchMaterialBatches();
      toast({
        title: "Sucesso",
        description: "Lote de produção criado com sucesso",
      });
    } catch (error) {
      console.error("Error adding production batch:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao criar lote de produção",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const updateProductionBatch = async (id: string, batch: Partial<ProductionBatch>) => {
    try {
      await updateProductionBatchApi(id, batch, user?.id, getUserDisplayName());
      setProductionBatches(
        productionBatches.map(b => 
          b.id === id ? { ...b, ...batch, updatedAt: new Date() } : b
        )
      );
      // Refetch material batches to update stock levels
      await refetchMaterialBatches();
      toast({
        title: "Sucesso",
        description: "Lote de produção atualizado com sucesso",
      });
    } catch (error) {
      console.error("Error updating production batch:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao atualizar lote de produção",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const deleteProductionBatch = async (id: string) => {
    try {
      await deleteProductionBatchApi(id, user?.id, getUserDisplayName());
      setProductionBatches(productionBatches.filter(b => b.id !== id));
      // Refetch material batches to update stock levels
      await refetchMaterialBatches();
      toast({
        title: "Sucesso",
        description: "Lote de produção excluído com sucesso",
      });
    } catch (error) {
      console.error("Error deleting production batch:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao excluir lote de produção",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  // CRUD operations for Sales
  const addSale = async (sale: Omit<Sale, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newSale = await createSaleApi(sale, user?.id, getUserDisplayName());
      setSales([...sales, newSale]);
      toast({
        title: "Sucesso",
        description: "Venda criada com sucesso",
      });
    } catch (error) {
      console.error("Error adding sale:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao criar venda",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const updateSale = async (id: string, sale: Partial<Sale>) => {
    try {
      await updateSaleApi(id, sale, user?.id, getUserDisplayName());
      setSales(
        sales.map(s => 
          s.id === id ? { ...s, ...sale, updatedAt: new Date() } : s
        )
      );
      toast({
        title: "Sucesso",
        description: "Venda atualizada com sucesso",
      });
    } catch (error) {
      console.error("Error updating sale:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao atualizar venda",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const deleteSale = async (id: string) => {
    try {
      await deleteSaleApi(id, user?.id, getUserDisplayName());
      setSales(sales.filter(s => s.id !== id));
      toast({
        title: "Sucesso",
        description: "Venda excluída com sucesso",
      });
    } catch (error) {
      console.error("Error deleting sale:", error);
      
      // Verificar se é erro de JWT expirado antes de mostrar toast
      if (!checkJWTError(error)) {
        toast({
          title: "Erro",
          description: "Falha ao excluir venda",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  // CRUD operations for Orders
  const addOrder = async (order: Omit<Order, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newOrder = await createOrderApi(order, user?.id, getUserDisplayName());
      setOrders([...orders, newOrder]);
      toast({
        title: "Sucesso",
        description: "Pedido criado com sucesso",
      });
    } catch (error) {
      console.error("Error adding order:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar pedido",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateOrder = async (id: string, order: Partial<Order>) => {
    try {
      await updateOrderApi(id, order, user?.id, getUserDisplayName());
      setOrders(
        orders.map(o => 
          o.id === id ? { ...o, ...order, updatedAt: new Date() } : o
        )
      );
      toast({
        title: "Sucesso",
        description: "Pedido atualizado com sucesso",
      });
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar pedido",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteOrder = async (id: string) => {
    try {
      await deleteOrderApi(id, user?.id, getUserDisplayName());
      setOrders(orders.filter(o => o.id !== id));
      toast({
        title: "Sucesso",
        description: "Pedido excluído com sucesso",
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Erro",
        description: "Falha ao excluir pedido",
        variant: "destructive",
      });
      throw error;
    }
  };

  // CRUD operations for Losses
  const addLoss = async (loss: Omit<Loss, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newLoss = await createLossApi(loss, user?.id, getUserDisplayName());
      setLosses([...losses, newLoss]);
      toast({
        title: "Sucesso",
        description: "Perda registrada com sucesso",
      });
    } catch (error) {
      console.error("Error adding loss:", error);
      toast({
        title: "Erro",
        description: "Falha ao registrar perda",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateLoss = async (id: string, loss: Partial<Loss>) => {
    try {
      await updateLossApi(id, loss, user?.id, getUserDisplayName());
      setLosses(
        losses.map(l => 
          l.id === id ? { ...l, ...loss, updatedAt: new Date() } : l
        )
      );
      toast({
        title: "Sucesso",
        description: "Perda atualizada com sucesso",
      });
    } catch (error) {
      console.error("Error updating loss:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar perda",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteLoss = async (id: string) => {
    try {
      await deleteLossApi(id, user?.id, getUserDisplayName());
      setLosses(losses.filter(l => l.id !== id));
      toast({
        title: "Sucesso",
        description: "Perda excluída com sucesso",
      });
    } catch (error) {
      console.error("Error deleting loss:", error);
      toast({
        title: "Erro",
        description: "Falha ao excluir perda",
        variant: "destructive",
      });
      throw error;
    }
  };

  // CRUD operations for Products - Using Supabase
  const addProduct = async (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newProduct = await createProduct(product, user?.id, getUserDisplayName());
      setProducts([...products, newProduct]);
      toast({
        title: "Sucesso",
        description: "Produto criado com sucesso",
      });
    } catch (error) {
      console.error("Error adding product:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar produto",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProduct = async (id: string, product: Partial<Product>) => {
    try {
      await updateProductApi(id, product, user?.id, getUserDisplayName());
      setProducts(
        products.map(p => 
          p.id === id ? { ...p, ...product, updatedAt: new Date() } : p
        )
      );
      toast({
        title: "Sucesso",
        description: "Produto atualizado com sucesso",
      });
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar produto",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteProductApi(id, user?.id, getUserDisplayName());
      setProducts(products.filter(p => p.id !== id));
      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso",
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Erro",
        description: "Falha ao excluir produto",
        variant: "destructive",
      });
      throw error;
    }
  };

  // CRUD operations for Materials - Updated to use Supabase
  const addMaterial = async (material: Omit<Material, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newMaterial = await createMaterial(material, user?.id, getUserDisplayName());
      setMaterials([...materials, newMaterial]);
      toast({
        title: "Sucesso",
        description: "Material criado com sucesso",
      });
    } catch (error) {
      console.error("Error adding material:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar material",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateMaterial = async (id: string, material: Partial<Material>) => {
    try {
      await updateMaterialApi(id, material, user?.id, getUserDisplayName());
      setMaterials(
        materials.map(m => 
          m.id === id ? { ...m, ...material, updatedAt: new Date() } : m
        )
      );
      toast({
        title: "Sucesso",
        description: "Material atualizado com sucesso",
      });
    } catch (error) {
      console.error("Error updating material:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar material",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteMaterial = async (id: string) => {
    try {
      await deleteMaterialApi(id, user?.id, getUserDisplayName());
      setMaterials(materials.filter(m => m.id !== id));
      toast({
        title: "Sucesso",
        description: "Material excluído com sucesso",
      });
    } catch (error) {
      console.error("Error deleting material:", error);
      toast({
        title: "Erro",
        description: "Falha ao excluir material",
        variant: "destructive",
      });
      throw error;
    }
  };

  // CRUD operations for Suppliers - Updated to use Supabase
  const addSupplier = async (supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newSupplier = await createSupplier(supplier, user?.id, getUserDisplayName());
      setSuppliers([...suppliers, newSupplier]);
      toast({
        title: "Sucesso",
        description: "Fornecedor criado com sucesso",
      });
    } catch (error) {
      console.error("Error adding supplier:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar fornecedor",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateSupplier = async (id: string, supplier: Partial<Supplier>) => {
    try {
      await updateSupplierApi(id, supplier, user?.id, getUserDisplayName());
      setSuppliers(
        suppliers.map(s => 
          s.id === id ? { ...s, ...supplier, updatedAt: new Date() } : s
        )
      );
      toast({
        title: "Sucesso",
        description: "Fornecedor atualizado com sucesso",
      });
    } catch (error) {
      console.error("Error updating supplier:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar fornecedor",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      await deleteSupplierApi(id, user?.id, getUserDisplayName());
      setSuppliers(suppliers.filter(s => s.id !== id));
      toast({
        title: "Sucesso",
        description: "Fornecedor excluído com sucesso",
      });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast({
        title: "Erro",
        description: "Falha ao excluir fornecedor",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Helper method to get available materials
  const getAvailableMaterials = () => {
    return materialBatches.filter(batch => batch.remainingQuantity > 0);
  };

  // Helper method to get available products
  const getAvailableProducts = () => {
    const availableProducts: ProducedItem[] = [];
    
    productionBatches.forEach(batch => {
      batch.producedItems.forEach(item => {
        if (item.remainingQuantity > 0) {
          availableProducts.push(item);
        }
      });
    });
    
    return availableProducts;
  };

  const value = {
    productionBatches,
    sales,
    orders,
    losses,
    products,
    materials,
    suppliers,
    materialBatches,
    globalSettings,
    isLoading,
    dashboardStats,
    dateRange,
    setDateRange,
    refetchProducts,
    refetchMaterials,
    refetchSuppliers,
    refetchMaterialBatches,
    refetchProductionBatches,
    refetchSales,
    refetchOrders,
    refetchLosses,
    refetchGlobalSettings,
    addProductionBatch,
    updateProductionBatch,
    deleteProductionBatch,
    addSale,
    updateSale,
    deleteSale,
    addOrder,
    updateOrder,
    deleteOrder,
    addLoss,
    updateLoss,
    deleteLoss,
    addProduct,
    updateProduct,
    deleteProduct,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getAvailableMaterials,
    getAvailableProducts
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
