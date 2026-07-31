import { useState, useEffect, useCallback } from 'react';
import type { SavedProduct, FoodItem } from '../types';
import type { SavedProductSource } from '../services/barcodeService';

const STORAGE_KEY = 'flavos_saved_products';

export interface ManualProductInput {
  name: string;
  brand?: string;
  nutritionPer100g: SavedProduct['nutritionPer100g'];
  packageNetWeightGrams?: number;
  unitWeightGrams?: number;
  unitLabel?: string;
  processingLevel: FoodItem['processingLevel'];
  ingredientsText?: string;
  allergens?: string[];
  nutriScoreGrade?: string;
}

export function useSavedProducts() {
  const [products, setProducts] = useState<SavedProduct[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProducts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Falha ao carregar produtos salvos', error);
    }
  }, []);

  const saveToStorage = (newList: SavedProduct[]) => {
    setProducts(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch (error) {
      console.error('Falha ao salvar produtos no localStorage', error);
    }
  };

  const upsertFromBarcode = useCallback(
    (sourceData: SavedProductSource | undefined, foodItem: FoodItem): SavedProduct => {
      const barcode = sourceData?.barcode || foodItem.id.replace(/^ean_/, '').split('_')[0];
      const servingGrams = foodItem.estimatedWeightGrams || 100;
      const factor = servingGrams > 0 ? servingGrams / 100 : 1;

      const nutritionPer100g: SavedProduct['nutritionPer100g'] = {
        calories: Math.round(foodItem.calories / factor),
        carbohydrates: Math.round((foodItem.carbohydrates / factor) * 10) / 10,
        protein: Math.round((foodItem.protein / factor) * 10) / 10,
        fat: Math.round((foodItem.fat / factor) * 10) / 10,
        fiber: Math.round((foodItem.fiber / factor) * 10) / 10,
        sugar: Math.round((foodItem.sugar / factor) * 10) / 10,
        addedSugar: Math.round(((foodItem.addedSugar || 0) / factor) * 10) / 10,
        sodium: Math.round(foodItem.sodium / factor),
        saturatedFat: Math.round(((foodItem.saturatedFat || 0) / factor) * 10) / 10,
      };

      const now = new Date().toISOString();

      // ── Padrão correto: calcular o produto de forma síncrona ANTES de chamar
      // setProducts, eliminando a variável mutável em closure. Depois o setProducts
      // apenas aplica o resultado pré-calculado usando `prev` (estado mais recente).
      const existing = products.find((p) => p.barcode && p.barcode === barcode);

      let resultProduct: SavedProduct;

      if (existing) {
        const isCorrected = existing.manuallyCorrected === true;
        resultProduct = {
          ...existing,
          name: sourceData?.name || foodItem.name || existing.name,
          brand: sourceData?.brand || existing.brand,
          imageUrl: sourceData?.imageUrl || existing.imageUrl,
          nutritionPer100g: isCorrected ? existing.nutritionPer100g : nutritionPer100g,
          packageNetWeightGrams: sourceData?.packageNetWeightGrams ?? existing.packageNetWeightGrams,
          unitWeightGrams: sourceData?.unitWeightGrams ?? existing.unitWeightGrams,
          unitLabel: sourceData?.unitLabel || existing.unitLabel,
          processingLevel: foodItem.processingLevel || existing.processingLevel,
          ingredientsText: sourceData?.ingredientsText || existing.ingredientsText,
          allergens: sourceData?.allergens || existing.allergens,
          nutriScoreGrade: sourceData?.nutriScoreGrade || existing.nutriScoreGrade,
          dataQualityWarning: isCorrected ? undefined : (sourceData?.dataQualityWarning || existing.dataQualityWarning),
          manuallyCorrected: isCorrected,
        };
      } else {
        resultProduct = {
          id: `prod_ean_${barcode}_${Date.now()}`,
          barcode,
          name: sourceData?.name || foodItem.name,
          brand: sourceData?.brand,
          imageUrl: sourceData?.imageUrl,
          nutritionPer100g,
          packageNetWeightGrams: sourceData?.packageNetWeightGrams,
          unitWeightGrams: sourceData?.unitWeightGrams,
          unitLabel: sourceData?.unitLabel,
          processingLevel: foodItem.processingLevel,
          ingredientsText: sourceData?.ingredientsText,
          allergens: sourceData?.allergens,
          nutriScoreGrade: sourceData?.nutriScoreGrade,
          source: 'barcode',
          createdAt: now,
          useCount: 0,
          dataQualityWarning: sourceData?.dataQualityWarning,
          manuallyCorrected: false,
        };
      }

      // Aplicar o produto pré-calculado no estado (usando `prev` para garantir
      // que trabalhamos sempre com o estado mais recente, mesmo sob batching)
      setProducts((prev) => {
        const existingIndex = prev.findIndex((p) => p.barcode && p.barcode === barcode);
        let newList: SavedProduct[];
        if (existingIndex >= 0) {
          newList = [...prev];
          newList[existingIndex] = resultProduct;
        } else {
          newList = [resultProduct, ...prev];
        }
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
        } catch (e) {
          console.error(e);
        }
        return newList;
      });

      return resultProduct;
    },
    [products] // depende de `products` para ler o estado atual ao calcular o resultado
  );

  const addManual = useCallback((input: ManualProductInput): SavedProduct => {
    const now = new Date().toISOString();
    const newProd: SavedProduct = {
      id: `prod_manual_${Date.now()}`,
      name: input.name,
      brand: input.brand,
      nutritionPer100g: input.nutritionPer100g,
      packageNetWeightGrams: input.packageNetWeightGrams,
      unitWeightGrams: input.unitWeightGrams,
      unitLabel: input.unitLabel,
      processingLevel: input.processingLevel,
      ingredientsText: input.ingredientsText,
      allergens: input.allergens,
      nutriScoreGrade: input.nutriScoreGrade,
      source: 'manual',
      createdAt: now,
      useCount: 0,
    };

    setProducts((prev) => {
      const newList = [newProd, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
      } catch (e) {
        console.error(e);
      }
      return newList;
    });

    return newProd;
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => {
      const newList = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
      } catch (e) {
        console.error(e);
      }
      return newList;
    });
  }, []);

  const recordUsage = useCallback((id: string) => {
    setProducts((prev) => {
      const newList = prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            useCount: (p.useCount || 0) + 1,
            lastUsedAt: new Date().toISOString(),
          };
        }
        return p;
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
      } catch (e) {
        console.error(e);
      }
      return newList;
    });
  }, []);

  const updateProductNutrition = useCallback(
    (id: string, newNutritionPer100g: SavedProduct['nutritionPer100g']): SavedProduct | null => {
      let updatedProd: SavedProduct | null = null;
      setProducts((prev) => {
        const newList = prev.map((p) => {
          if (p.id === id) {
            const updated: SavedProduct = {
              ...p,
              nutritionPer100g: newNutritionPer100g,
              manuallyCorrected: true,
              dataQualityWarning: undefined,
            };
            updatedProd = updated;
            return updated;
          }
          return p;
        });
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
        } catch (e) {
          console.error(e);
        }
        return newList;
      });
      return updatedProd;
    },
    []
  );

  const list = useCallback(() => {
    return [...products].sort((a, b) => {
      const timeA = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  }, [products]);

  return {
    products,
    upsertFromBarcode,
    addManual,
    removeProduct,
    recordUsage,
    updateProductNutrition,
    list,
  };
}
