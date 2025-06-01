import { useState, useEffect } from "react";
import { UsedMaterial } from "@/types";

interface ConservantUsage {
  materialBatchId: string;
  materialName: string;
  batchNumber: string;
  maxMixes: number;
  assignedMixes: number;
  quantity: number;
  unitOfMeasure: string;
}

export const useConservantLogic = (
  conservantMaterials: UsedMaterial[],
  totalMixes: number,
  conservantUsageFactor: number = 0.1
) => {
  const [conservantUsages, setConservantUsages] = useState<ConservantUsage[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [validationError, setValidationError] = useState<string>("");

  // Initialize conservant usages when materials change
  useEffect(() => {
    if (conservantMaterials.length === 0) {
      setConservantUsages([]);
      return;
    }

    const usages = conservantMaterials.map((material, index) => {
      // For the first (or only) conservant, assign all remaining mixes
      const assignedMixes = index === 0 ? totalMixes : 0;
      
      return {
        materialBatchId: material.materialBatchId,
        materialName: material.materialName,
        batchNumber: material.batchNumber,
        maxMixes: Math.floor((material.quantity || 0) / conservantUsageFactor),
        assignedMixes,
        quantity: assignedMixes * conservantUsageFactor,
        unitOfMeasure: "kg"
      };
    });

    setConservantUsages(usages);
  }, [conservantMaterials, totalMixes, conservantUsageFactor]);

  // Validate conservant distribution
  useEffect(() => {
    if (conservantUsages.length === 0) {
      setIsValid(true);
      setValidationError("");
      return;
    }

    const totalAssignedMixes = conservantUsages.reduce((sum, usage) => sum + usage.assignedMixes, 0);
    
    if (totalAssignedMixes !== totalMixes) {
      setIsValid(false);
      setValidationError(`Total de mexidas distribuídas (${totalAssignedMixes}) deve ser igual ao total de mexidas (${totalMixes})`);
      return;
    }

    // Check if any usage exceeds available stock
    const invalidUsage = conservantUsages.find(usage => usage.assignedMixes > usage.maxMixes);
    if (invalidUsage) {
      setIsValid(false);
      setValidationError(`Lote ${invalidUsage.batchNumber} não tem estoque suficiente. Máximo: ${invalidUsage.maxMixes} mexidas`);
      return;
    }

    setIsValid(true);
    setValidationError("");
  }, [conservantUsages, totalMixes]);

  const updateMixCount = (materialBatchId: string, mixCount: number) => {
    setConservantUsages(prev => {
      const updated = prev.map(usage => {
        if (usage.materialBatchId === materialBatchId) {
          return {
            ...usage,
            assignedMixes: Math.max(0, Math.min(mixCount, usage.maxMixes)),
            quantity: Math.max(0, Math.min(mixCount, usage.maxMixes)) * conservantUsageFactor
          };
        }
        return usage;
      });

      // Auto-adjust the first conservant to balance the total
      if (updated.length > 1) {
        const totalOthers = updated.slice(1).reduce((sum, usage) => sum + usage.assignedMixes, 0);
        const remainingForFirst = totalMixes - totalOthers;
        
        if (remainingForFirst >= 0 && remainingForFirst <= updated[0].maxMixes) {
          updated[0] = {
            ...updated[0],
            assignedMixes: remainingForFirst,
            quantity: remainingForFirst * conservantUsageFactor
          };
        }
      }

      return updated;
    });
  };

  const getConservantMaterials = (): UsedMaterial[] => {
    return conservantUsages.map(usage => ({
      id: "",
      materialBatchId: usage.materialBatchId,
      materialName: usage.materialName,
      materialType: "Conservante",
      batchNumber: usage.batchNumber,
      quantity: usage.quantity,
      unitOfMeasure: "kg",
      mixCountUsed: usage.assignedMixes
    }));
  };

  return {
    conservantUsages,
    isValid,
    validationError,
    updateMixCount,
    getConservantMaterials,
    showMixFields: conservantUsages.length > 1
  };
};
