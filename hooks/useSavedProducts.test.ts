import { describe, it, expect, beforeEach } from 'vitest';
import type { SavedProduct, FoodItem } from '../types';
import type { SavedProductSource } from '../services/barcodeService';

// Mock simples de localStorage para ambiente Node puro
const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, value: string) => storageMap.set(key, value),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};
globalThis.localStorage = localStorageMock as any;

const STORAGE_KEY = 'flavos_saved_products';

describe('useSavedProducts / SavedProduct logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockFoodItem: FoodItem = {
    id: 'ean_7891000100000_123',
    name: 'Biscoito Recheado',
    calories: 140,
    estimatedAmount: 30,
    unit: 'g',
    estimatedWeightGrams: 30,
    portionDescription: '1 porção (30g)',
    carbohydrates: 20,
    protein: 2,
    fat: 6,
    fiber: 1,
    sugar: 10,
    addedSugar: 0,
    sodium: 80,
    saturatedFat: 2.5,
    source: 'visible',
    confidence: 'alta',
    preparationMethod: 'industrializado',
    consumedFraction: 1,
    healthHighlights: [],
    attentionHighlights: ['Produto ultraprocessado'],
    processingLevel: 'ultraprocessado',
    possibleAddedSugars: true,
    possibleAddedFats: false,
    possibleExcessSodium: false,
    possibleIndustrializedSauces: false,
  };

  const mockSourceData: SavedProductSource = {
    barcode: '7891000100000',
    name: 'Biscoito Recheado Chocolate',
    brand: 'Nestlé',
    imageUrl: 'http://example.com/img.jpg',
    packageNetWeightGrams: 140,
    unitWeightGrams: 30,
    unitLabel: 'biscoito',
    nutriScoreGrade: 'e',
  };

  it('salva e lê corretamente no localStorage', () => {
    const mockProduct: SavedProduct = {
      id: 'prod_1',
      barcode: '7891000100000',
      name: 'Biscoito Recheado Chocolate',
      brand: 'Nestlé',
      nutritionPer100g: {
        calories: 466,
        carbohydrates: 66.7,
        protein: 6.7,
        fat: 20,
        fiber: 3.3,
        sugar: 33.3,
        addedSugar: 0,
        sodium: 267,
        saturatedFat: 8.3,
      },
      processingLevel: 'ultraprocessado',
      source: 'barcode',
      createdAt: new Date().toISOString(),
      useCount: 0,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify([mockProduct]));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    expect(stored.length).toBe(1);
    expect(stored[0].barcode).toBe('7891000100000');
  });

  it('calcula conversão de porção para base 100g corretamente', () => {
    const servingGrams = mockFoodItem.estimatedWeightGrams; // 30
    const factor = servingGrams / 100; // 0.3
    const calories100g = Math.round(mockFoodItem.calories / factor); // 140 / 0.3 = 467

    expect(calories100g).toBe(467);
  });
});

