
import { useData } from "@/context/DataContext";
import { useCallback, useMemo } from "react";

export function useMaterials() {
  const { materials, isLoading } = useData();
  
  return {
    data: materials,
    isLoading: isLoading.materials
  };
}

export function useProducts() {
  const { products, isLoading } = useData();
  
  return {
    data: products,
    isLoading: isLoading.products
  };
}

export function useCreateProductionBatch() {
  const { addProductionBatch } = useData();
  
  const mutate = useCallback((data: any, options?: any) => {
    return addProductionBatch(data)
      .then(() => {
        if (options?.onSuccess) {
          options.onSuccess();
        }
      })
      .catch((error) => {
        if (options?.onError) {
          options.onError(error);
        }
        throw error;
      });
  }, [addProductionBatch]);

  return {
    mutate,
    isLoading: false // We don't have loading state for mutation in DataContext
  };
}
