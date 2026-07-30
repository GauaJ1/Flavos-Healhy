import { describe, it, expect } from 'vitest';
import { calcFoodItemFromQuantity } from './QuantityInputModal';
import type { SavedProduct } from '../types';

describe('calcFoodItemFromQuantity', () => {
  const sampleProduct: SavedProduct = {
    id: 'prod_123',
    name: 'Barra de Cereal',
    brand: 'Nutry',
    nutritionPer100g: {
      calories: 400,
      carbohydrates: 60,
      protein: 10,
      fat: 12,
      fiber: 8,
      sugar: 20,
      addedSugar: 10,
      sodium: 100,
      saturatedFat: 4,
    },
    unitWeightGrams: 30,
    unitLabel: 'barra',
    packageNetWeightGrams: 90,
    processingLevel: 'processado',
    source: 'barcode',
    createdAt: new Date().toISOString(),
    useCount: 0,
  };

  it('calcula corretamente em modo units multiplicando por unitWeightGrams (2 barras de 30g = 60g)', () => {
    const result = calcFoodItemFromQuantity(sampleProduct, 2, 'units');

    expect(result.estimatedWeightGrams).toBe(60);
    expect(result.portionDescription).toBe('2 barra (60g)');
    // 60g / 100g = 0.6 factor
    expect(result.calories).toBe(240); // 400 * 0.6
    expect(result.carbohydrates).toBe(36); // 60 * 0.6
    expect(result.protein).toBe(6); // 10 * 0.6
    expect(result.fat).toBe(7.2); // 12 * 0.6
    expect(result.fiber).toBe(4.8); // 8 * 0.6
    expect(result.sodium).toBe(60); // 100 * 0.6
  });

  it('calcula corretamente em modo grams aplicando o fator direto (150g)', () => {
    const result = calcFoodItemFromQuantity(sampleProduct, 150, 'grams');

    expect(result.estimatedWeightGrams).toBe(150);
    expect(result.portionDescription).toBe('150g');
    // 150g / 100g = 1.5 factor
    expect(result.calories).toBe(600); // 400 * 1.5
    expect(result.carbohydrates).toBe(90); // 60 * 1.5
    expect(result.protein).toBe(15); // 10 * 1.5
  });

  it('produto sem unitWeightGrams não quebra ao chamar calcFoodItemFromQuantity', () => {
    const productWithoutUnit: SavedProduct = {
      ...sampleProduct,
      unitWeightGrams: undefined,
    };

    const result = calcFoodItemFromQuantity(productWithoutUnit, 2, 'units');
    expect(result).toBeDefined();
    expect(result.estimatedWeightGrams).toBe(200); // fallback 100g * 2
    expect(result.calories).toBe(800);
  });
});
