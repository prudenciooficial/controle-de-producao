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
  DashboardStats
} from "../types";
import { 
  fetchProducts, 
  fetchMaterials, 
  fetchSuppliers,
  fetchMaterialBatches,
  createProduct,
  updateProduct,
  deleteProduct
} from "../services/supabaseService";
import { useToast } from "@/hooks/use-toast";

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
  };
  
  // Stats
  dashboardStats: DashboardStats;
  
  // Refetch functions
  refetchProducts: () => Promise<void>;
  refetchMaterials: () => Promise<void>;
  refetchSuppliers: () => Promise<void>;
  refetchMaterialBatches: () => Promise<void>;
  
  // CRUD operations
  addProductionBatch: (batch: Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">) => void;
  updateProductionBatch: (id: string, batch: Partial<ProductionBatch>) => void;
  deleteProductionBatch: (id: string) => void;
  
  addSale: (sale: Omit<Sale, "id" | "createdAt" | "updatedAt">) => void;
  updateSale: (id: string, sale: Partial<Sale>) => void;
  deleteSale: (id: string) => void;
  
  addOrder: (order: Omit<Order, "id" | "createdAt" | "updatedAt">) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  
  addLoss: (loss: Omit<Loss, "id" | "createdAt" | "updatedAt">) => void;
  updateLoss: (id: string, loss: Partial<Loss>) => void;
  deleteLoss: (id: string) => void;
  
  addProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  addMaterial: (material: Omit<Material, "id" | "createdAt" | "updatedAt">) => void;
  updateMaterial: (id: string, material: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;
  
  addSupplier: (supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  
  // Helper methods
  getAvailableMaterials: () => MaterialBatch[];
  getAvailableProducts: () => ProducedItem[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Mock data for initial state
const mockProducts: Product[] = [
  { 
    id: "p1", 
    name: "Polvilho Doce", 
    code: "PD001", 
    unitOfMeasure: "kg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  { 
    id: "p2", 
    name: "Polvilho Azedo", 
    code: "PA001", 
    unitOfMeasure: "kg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
];

const mockMaterials: Material[] = [
  {
    id: "m1",
    name: "Fécula de Mandioca",
    code: "FM001",
    type: "Fécula",
    unitOfMeasure: "kg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "m2",
    name: "Conservante Sorbato",
    code: "CS001",
    type: "Conservante",
    unitOfMeasure: "kg",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "m3",
    name: "Embalagem 1kg",
    code: "EM001",
    type: "Embalagem",
    unitOfMeasure: "unidade",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "m4",
    name: "Saco Sanfonado Grande",
    code: "SS001",
    type: "Saco",
    unitOfMeasure: "unidade",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "m5",
    name: "Caixa 20kg",
    code: "CX001",
    type: "Caixa",
    unitOfMeasure: "unidade",
    createdAt: new Date(),
    updatedAt: new Date()
  },
];

const mockSuppliers: Supplier[] = [
  {
    id: "s1",
    name: "Fornecedor de Fécula LTDA",
    code: "F001",
    contacts: "11 9999-8888",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: "s2",
    name: "Embalagens Rápidas S.A.",
    code: "F002",
    contacts: "11 7777-6666",
    createdAt: new Date(),
    updatedAt: new Date()
  },
];

const mockMaterialBatches: MaterialBatch[] = [
  {
    id: "mb1",
    materialId: "m1",
    materialName: "Fécula de Mandioca",
    materialType: "Fécula",
    batchNumber: "FEC-2023-001",
    quantity: 1000,
    suppliedQuantity: 1000,
    remainingQuantity: 850,
    unitOfMeasure: "kg",
    expiryDate: new Date("2025-12-31"),
    hasReport: true,
    createdAt: new Date("2023-10-01"),
    updatedAt: new Date("2023-10-01")
  },
  {
    id: "mb2",
    materialId: "m2",
    materialName: "Conservante Sorbato",
    materialType: "Conservante",
    batchNumber: "CSB-2023-001",
    quantity: 50,
    suppliedQuantity: 50,
    remainingQuantity: 40,
    unitOfMeasure: "kg",
    expiryDate: new Date("2025-06-30"),
    hasReport: true,
    createdAt: new Date("2023-09-15"),
    updatedAt: new Date("2023-09-15")
  },
  {
    id: "mb3",
    materialId: "m3",
    materialName: "Embalagem 1kg",
    materialType: "Embalagem",
    batchNumber: "EMB-2023-001",
    quantity: 10000,
    suppliedQuantity: 10000,
    remainingQuantity: 8500,
    unitOfMeasure: "unidade",
    hasReport: true,
    createdAt: new Date("2023-10-05"),
    updatedAt: new Date("2023-10-05")
  },
];

// Sample production batch
const mockProductionBatches: ProductionBatch[] = [
  {
    id: "pb1",
    batchNumber: "PROD-2023-001",
    productionDate: new Date("2023-10-10"),
    mixDay: "Segunda",
    mixCount: 3,
    notes: "Produção normal sem ocorrências",
    producedItems: [
      {
        id: "pi1",
        productId: "p1",
        productName: "Polvilho Doce",
        quantity: 500,
        unitOfMeasure: "kg",
        batchNumber: "PROD-2023-001-P1",
        remainingQuantity: 350
      }
    ],
    usedMaterials: [
      {
        id: "um1",
        materialBatchId: "mb1",
        materialName: "Fécula de Mandioca",
        materialType: "Fécula",
        batchNumber: "FEC-2023-001",
        quantity: 450,
        unitOfMeasure: "kg"
      },
      {
        id: "um2",
        materialBatchId: "mb2",
        materialName: "Conservante Sorbato",
        materialType: "Conservante",
        batchNumber: "CSB-2023-001",
        quantity: 2.5,
        unitOfMeasure: "kg"
      },
      {
        id: "um3",
        materialBatchId: "mb3",
        materialName: "Embalagem 1kg",
        materialType: "Embalagem",
        batchNumber: "EMB-2023-001",
        quantity: 500,
        unitOfMeasure: "unidade"
      }
    ],
    createdAt: new Date("2023-10-10"),
    updatedAt: new Date("2023-10-10")
  }
];

// Sample sales
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
  // State for all data collections
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>(mockProductionBatches);
  const [sales, setSales] = useState<Sale[]>(mockSales);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [losses, setLosses] = useState<Loss[]>(mockLosses);
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materialBatches, setMaterialBatches] = useState<MaterialBatch[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState({
    products: true,
    materials: true,
    suppliers: true,
    materialBatches: true,
    productionBatches: false,
    sales: false,
    orders: false,
    losses: false,
  });

  const { toast } = useToast();

  // State for dashboard stats
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalProduction: 0,
    totalSales: 0,
    currentInventory: 0,
    averageProfitability: 0
  });

  // Fetch data from Supabase
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(prev => ({ ...prev, products: true }));
        const productsData = await fetchProducts();
        setProducts(productsData);
      } catch (error) {
        console.error("Error loading products:", error);
        toast({
          title: "Error",
          description: "Failed to load products data",
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
          title: "Error",
          description: "Failed to load materials data",
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
          title: "Error",
          description: "Failed to load suppliers data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(prev => ({ ...prev, suppliers: false }));
      }
      
      try {
        setIsLoading(prev => ({ ...prev, materialBatches: true }));
        const materialBatchesData = await fetchMaterialBatches();
        setMaterialBatches(materialBatchesData);
      } catch (error) {
        console.error("Error loading material batches:", error);
        toast({
          title: "Error",
          description: "Failed to load material batches data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(prev => ({ ...prev, materialBatches: false }));
      }
    };
    
    loadData();
  }, [toast]);

  // Refetch functions
  const refetchProducts = async () => {
    try {
      setIsLoading(prev => ({ ...prev, products: true }));
      const productsData = await fetchProducts();
      setProducts(productsData);
    } catch (error) {
      console.error("Error refetching products:", error);
      toast({
        title: "Error",
        description: "Failed to refresh products data",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to refresh materials data",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to refresh suppliers data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, suppliers: false }));
    }
  };

  const refetchMaterialBatches = async () => {
    try {
      setIsLoading(prev => ({ ...prev, materialBatches: true }));
      const materialBatchesData = await fetchMaterialBatches();
      setMaterialBatches(materialBatchesData);
    } catch (error) {
      console.error("Error refetching material batches:", error);
      toast({
        title: "Error",
        description: "Failed to refresh material batches data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(prev => ({ ...prev, materialBatches: false }));
    }
  };

  // Calculate dashboard stats
  useEffect(() => {
    // Calculate total production
    const totalProduction = productionBatches.reduce((acc, batch) => {
      return acc + batch.producedItems.reduce((itemAcc, item) => itemAcc + item.quantity, 0);
    }, 0);

    // Calculate total sales
    const totalSales = sales.reduce((acc, sale) => {
      return acc + sale.items.reduce((itemAcc, item) => itemAcc + item.quantity, 0);
    }, 0);

    // Calculate current inventory
    const currentInventory = productionBatches.reduce((acc, batch) => {
      return acc + batch.producedItems.reduce((itemAcc, item) => itemAcc + item.remainingQuantity, 0);
    }, 0);

    // Calculate average profitability (simplified)
    const averageProfitability = totalSales > 0 ? (totalSales / totalProduction) * 100 : 0;

    setDashboardStats({
      totalProduction,
      totalSales,
      currentInventory,
      averageProfitability: parseFloat(averageProfitability.toFixed(2))
    });
  }, [productionBatches, sales]);

  // Helper functions
  const generateId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  // CRUD operations for Production Batches
  const addProductionBatch = (batch: Omit<ProductionBatch, "id" | "createdAt" | "updatedAt">) => {
    const newBatch: ProductionBatch = {
      ...batch,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Update material batches
    const updatedMaterialBatches = [...materialBatches];
    batch.usedMaterials.forEach(material => {
      const materialBatchIndex = updatedMaterialBatches.findIndex(
        mb => mb.id === material.materialBatchId
      );
      
      if (materialBatchIndex >= 0) {
        updatedMaterialBatches[materialBatchIndex] = {
          ...updatedMaterialBatches[materialBatchIndex],
          remainingQuantity: updatedMaterialBatches[materialBatchIndex].remainingQuantity - material.quantity
        };
      }
    });
    
    setMaterialBatches(updatedMaterialBatches);
    setProductionBatches([...productionBatches, newBatch]);
  };

  const updateProductionBatch = (id: string, batch: Partial<ProductionBatch>) => {
    setProductionBatches(
      productionBatches.map(pb => 
        pb.id === id ? { ...pb, ...batch, updatedAt: new Date() } : pb
      )
    );
  };

  const deleteProductionBatch = (id: string) => {
    setProductionBatches(productionBatches.filter(pb => pb.id !== id));
  };

  // CRUD operations for Sales
  const addSale = (sale: Omit<Sale, "id" | "createdAt" | "updatedAt">) => {
    const newSale: Sale = {
      ...sale,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Update produced items quantities
    const updatedProductionBatches = [...productionBatches];
    sale.items.forEach(item => {
      productionBatches.forEach((batch, batchIndex) => {
        const producedItemIndex = batch.producedItems.findIndex(
          pi => pi.id === item.producedItemId
        );
        
        if (producedItemIndex >= 0) {
          updatedProductionBatches[batchIndex].producedItems[producedItemIndex] = {
            ...updatedProductionBatches[batchIndex].producedItems[producedItemIndex],
            remainingQuantity: updatedProductionBatches[batchIndex].producedItems[producedItemIndex].remainingQuantity - item.quantity
          };
        }
      });
    });
    
    setProductionBatches(updatedProductionBatches);
    setSales([...sales, newSale]);
  };

  const updateSale = (id: string, sale: Partial<Sale>) => {
    setSales(
      sales.map(s => 
        s.id === id ? { ...s, ...sale, updatedAt: new Date() } : s
      )
    );
  };

  const deleteSale = (id: string) => {
    setSales(sales.filter(s => s.id !== id));
  };

  // CRUD operations for Orders
  const addOrder = (order: Omit<Order, "id" | "createdAt" | "updatedAt">) => {
    const newOrder: Order = {
      ...order,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Create material batches from order items
    const newMaterialBatches = order.items.map(item => {
      const materialBatch: MaterialBatch = {
        id: generateId(),
        materialId: item.materialId,
        materialName: item.materialName,
        materialType: item.materialType,
        batchNumber: item.batchNumber,
        quantity: item.quantity,
        suppliedQuantity: item.quantity,
        remainingQuantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure,
        expiryDate: item.expiryDate,
        hasReport: item.hasReport,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      return materialBatch;
    });
    
    setMaterialBatches([...materialBatches, ...newMaterialBatches]);
    setOrders([...orders, newOrder]);
  };

  const updateOrder = (id: string, order: Partial<Order>) => {
    setOrders(
      orders.map(o => 
        o.id === id ? { ...o, ...order, updatedAt: new Date() } : o
      )
    );
  };

  const deleteOrder = (id: string) => {
    setOrders(orders.filter(o => o.id !== id));
  };

  // CRUD operations for Losses
  const addLoss = (loss: Omit<Loss, "id" | "createdAt" | "updatedAt">) => {
    const newLoss: Loss = {
      ...loss,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setLosses([...losses, newLoss]);
  };

  const updateLoss = (id: string, loss: Partial<Loss>) => {
    setLosses(
      losses.map(l => 
        l.id === id ? { ...l, ...loss, updatedAt: new Date() } : l
      )
    );
  };

  const deleteLoss = (id: string) => {
    setLosses(losses.filter(l => l.id !== id));
  };

  // CRUD operations for Products - Updated to use Supabase
  const addProduct = async (product: Omit<Product, "id" | "createdAt" | "updatedAt">) => {
    try {
      const newProduct = await createProduct(product);
      setProducts([...products, newProduct]);
      toast({
        title: "Success",
        description: "Product created successfully",
      });
    } catch (error) {
      console.error("Error adding product:", error);
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProductLocal = async (id: string, product: Partial<Product>) => {
    try {
      await updateProduct(id, product);
      setProducts(
        products.map(p => 
          p.id === id ? { ...p, ...product, updatedAt: new Date() } : p
        )
      );
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteProductLocal = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
      throw error;
    }
  };

  // CRUD operations for Materials
  const addMaterial = (material: Omit<Material, "id" | "createdAt" | "updatedAt">) => {
    const newMaterial: Material = {
      ...material,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setMaterials([...materials, newMaterial]);
  };

  const updateMaterial = (id: string, material: Partial<Material>) => {
    setMaterials(
      materials.map(m => 
        m.id === id ? { ...m, ...material, updatedAt: new Date() } : m
      )
    );
  };

  const deleteMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  // CRUD operations for Suppliers
  const addSupplier = (supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">) => {
    const newSupplier: Supplier = {
      ...supplier,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setSuppliers([...suppliers, newSupplier]);
  };

  const updateSupplier = (id: string, supplier: Partial<Supplier>) => {
    setSuppliers(
      suppliers.map(s => 
        s.id === id ? { ...s, ...supplier, updatedAt: new Date() } : s
      )
    );
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(suppliers.filter(s => s.id !== id));
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
    isLoading,
    dashboardStats,
    refetchProducts,
    refetchMaterials,
    refetchSuppliers,
    refetchMaterialBatches,
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
    updateProduct: updateProductLocal,
    deleteProduct: deleteProductLocal,
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
