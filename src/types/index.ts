
import { DateRange } from "react-day-picker";

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  productionDate: Date;
  productId?: string;
  productName?: string;
  items?: string;
  producedItems: ProducedItem[];
  usedMaterials: UsedMaterial[];
  mixDay: string;
  mixCount: number;
  notes?: string;
  feculaBags?: number; // Adding field for the number of fécula bags
  createdAt: Date;
  updatedAt: Date;
}

export interface ProducedItem {
  id: string;
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  unitOfMeasure: string;
  remainingQuantity: number;
}

export interface UsedMaterial {
  id: string;
  materialBatchId: string;
  materialName: string;
  materialType: string;
  batchNumber: string;
  quantity: number;
  unitOfMeasure: string;
  createdAt?: Date;  // Made optional with ?
  updatedAt?: Date;  // Made optional with ?
}

export interface Sale {
  id: string;
  date: Date;
  invoiceNumber: string;
  customerName: string;
  type: string;
  notes?: string;
  items: SaleItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  producedItemId: string;
  batchNumber: string;
  quantity: number;
  unitOfMeasure: string;
}

export interface Order {
  id: string;
  date: Date;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  notes?: string;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  materialId: string;
  materialName: string;
  materialType: string;
  quantity: number;
  unitOfMeasure: string;
  batchNumber: string;
  expiryDate: Date;
  hasReport: boolean;
}

export interface Loss {
  id: string;
  date: Date;
  productionBatchId: string;
  batchNumber: string;
  machine: string;
  quantity: number;
  unitOfMeasure: string;
  productType: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  description?: string;
  unitOfMeasure: string;
  weightFactor?: number;
  feculaConversionFactor?: number;  // For fécula conversion (usually 25)
  productionPredictionFactor?: number;  // For production prediction
  type?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Material {
  id: string;
  name: string;
  code: string;
  description?: string;
  unitOfMeasure: string;
  type: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  contacts?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialBatch {
  id: string;
  materialId: string;
  materialName: string;
  materialType: string;
  supplierId?: string;
  supplierName?: string;
  batchNumber: string;
  quantity: number;
  suppliedQuantity: number;
  unitOfMeasure: string;
  expiryDate?: Date;
  reportUrl?: string;
  hasReport?: boolean;
  remainingQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardStats {
  totalProduction: number;
  totalSales: number;
  currentInventory: number;
  averageProfitability: number;
}
