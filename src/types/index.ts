
// Base types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Product types
export interface Product extends BaseEntity {
  name: string;
  code: string;
  description?: string;
  unitOfMeasure: string; // kg, L, etc.
}

// Supplier types
export interface Supplier extends BaseEntity {
  name: string;
  code: string;
  contacts?: string;
  notes?: string;
}

// Material types
export interface Material extends BaseEntity {
  name: string;
  code: string;
  type: "Fécula" | "Conservante" | "Embalagem" | "Saco" | "Caixa" | "Outro";
  unitOfMeasure: string;
  description?: string;
}

// Material Batch
export interface MaterialBatch extends BaseEntity {
  materialId: string;
  materialName: string;
  materialType: string;
  batchNumber: string;
  quantity: number;
  suppliedQuantity: number;
  remainingQuantity: number;
  unitOfMeasure: string;
  expiryDate?: Date;
  hasReport: boolean;
}

// Production Batch
export interface ProductionBatch extends BaseEntity {
  batchNumber: string;
  productionDate: Date;
  mixDay: string;
  mixCount: number;
  notes?: string;
  producedItems: ProducedItem[];
  usedMaterials: UsedMaterial[];
}

// Produced item in a production batch
export interface ProducedItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitOfMeasure: string;
  batchNumber: string;
  remainingQuantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Material used in production
export interface UsedMaterial {
  id: string;
  materialBatchId: string;
  materialName: string;
  materialType: string;
  batchNumber: string;
  quantity: number;
  unitOfMeasure: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Sale
export interface Sale extends BaseEntity {
  date: Date;
  invoiceNumber: string;
  customerName: string;
  type: "Venda" | "Doação" | "Descarte" | "Devolução" | "Outro";
  notes?: string;
  items: SaleItem[];
}

// Sale item
export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  producedItemId: string;
  batchNumber: string;
  quantity: number;
  unitOfMeasure: string;
}

// Order (Material Purchase)
export interface Order extends BaseEntity {
  date: Date;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  notes?: string;
  items: OrderItem[];
}

// Order item
export interface OrderItem {
  id: string;
  materialId: string;
  materialName: string;
  materialType: string;
  quantity: number;
  unitOfMeasure: string;
  batchNumber: string;
  expiryDate?: Date;
  hasReport: boolean;
}

// Loss
export interface Loss extends BaseEntity {
  date: Date;
  productionBatchId: string;
  batchNumber: string;
  machine: "Moinho" | "Mexedor" | "Tombador" | "Embaladora" | "Outro";
  quantity: number;
  unitOfMeasure: string;
  productType: "Goma" | "Fécula" | "Embalagem" | "Sorbato" | "Produto Acabado" | "Outro";
  notes?: string;
}

// Dashboard stats
export interface DashboardStats {
  totalProduction: number;
  totalSales: number;
  currentInventory: number;
  averageProfitability: number;
}
