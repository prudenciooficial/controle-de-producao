
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
  createdAt: Date;
  updatedAt: Date;
  isMixOnly: boolean; // Deprecated but kept for backward compatibility
  mixProductionBatchId?: string; // Now references mix_batches table
  status: 'complete' | 'rework';
}

export interface ProducedItem {
  id?: string;
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
  mixCountUsed?: number;
  createdAt?: Date;
  updatedAt?: Date;
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
  description?: string;
  unitOfMeasure: string;
  weightFactor?: number;
  feculaConversionFactor?: number;
  productionPredictionFactor?: number;
  conservantConversionFactor?: number;
  conservantUsageFactor?: number;
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
  capacidadeProdutiva?: number;
  totalFeculaInventoryKg?: number;
}

export interface GlobalSettings {
  id: string;
  fecula_conversion_factor: number;
  production_prediction_factor: number;
  conservant_conversion_factor: number;
  conservant_usage_factor: number;
  created_at?: string;
  updated_at?: string;
}

export interface LogEntry {
  id: string;
  created_at: string;
  user_id?: string;
  user_description?: string;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'OTHER';
  entity_type?: string;
  entity_id?: string;
  details: string | Record<string, any>;
}
