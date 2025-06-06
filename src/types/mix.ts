
export interface MixBatch {
  id: string;
  batchNumber: string;
  mixDate: Date;
  mixDay: string;
  mixCount: number;
  notes?: string;
  status: 'available' | 'used' | 'expired';
  usedMaterials: UsedMaterialMix[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UsedMaterialMix {
  id?: string;
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
