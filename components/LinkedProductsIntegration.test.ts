import { describe, it, expect } from 'vitest';
import { calcFoodItemFromQuantity } from './QuantityInputModal';
import { checkAtwaterConsistency } from '../services/barcodeService';
import { enforceConsistency } from '../services/geminiService';
import type { SavedProduct, AnalysisResult, FoodItem } from '../types';

describe('Integração de Produtos Salvos & Análise de Imagem Vinculada', () => {
  const sampleSavedProduct: SavedProduct = {
    id: 'prod_whey_123',
    barcode: '7891234567890',
    name: 'Whey Protein Concentrado 80%',
    brand: 'Growth Supplements',
    nutritionPer100g: {
      calories: 400,
      carbohydrates: 5,
      protein: 80,
      fat: 6.6,
      fiber: 0,
      sugar: 2,
      addedSugar: 0,
      sodium: 150,
      saturatedFat: 3,
    },
    unitWeightGrams: 30,
    unitLabel: 'dosador (30g)',
    packageNetWeightGrams: 1000,
    processingLevel: 'processado',
    source: 'barcode',
    createdAt: new Date().toISOString(),
    useCount: 3,
  };

  it('deve calcular corretamente porção em gramas e unidades a partir do produto salvo', () => {
    // 1 dosador (30g)
    const foodItem1 = calcFoodItemFromQuantity(sampleSavedProduct, 1, 'units');
    expect(foodItem1.estimatedWeightGrams).toBe(30);
    expect(foodItem1.calories).toBe(120); // 400 * 0.3
    expect(foodItem1.protein).toBe(24);   // 80 * 0.3
    expect(foodItem1.carbohydrates).toBe(1.5);
    expect(foodItem1.fat).toBe(2);

    // 60 gramas
    const foodItem2 = calcFoodItemFromQuantity(sampleSavedProduct, 60, 'grams');
    expect(foodItem2.estimatedWeightGrams).toBe(60);
    expect(foodItem2.calories).toBe(240); // 400 * 0.6
    expect(foodItem2.protein).toBe(48);   // 80 * 0.6
  });

  it('deve passar na validação Atwater para tabela nutricional consistente', () => {
    // Whey: C=5, P=80, F=6.6 -> Expected = 5*4 + 80*4 + 6.6*9 = 20 + 320 + 59.4 = 399.4 kcal (reportado: 400 kcal)
    const check = checkAtwaterConsistency(400, 5, 80, 6.6);
    expect(check.consistent).toBe(true);
    expect(check.deviationPercent).toBeLessThanOrEqual(5);
  });

  it('deve detectar inconsistência Atwater se dados estiverem corrompidos', () => {
    // Exemplo: rótulo diz 500 kcal mas macros somam 100 kcal
    const check = checkAtwaterConsistency(500, 5, 10, 2);
    expect(check.consistent).toBe(false);
    expect(check.deviationPercent).toBeGreaterThan(15);
  });

  it('deve preservar os macros do produto vinculado em enforceConsistency', async () => {
    const rawResult: AnalysisResult = {
      analysisMetadata: {
        isRealFood: true,
        confidence: 'alta',
        isMixedDish: false,
        isPackagedFood: true,
        uncertaintyReasons: [],
        requiresFollowUp: false,
        followUpQuestions: [],
      },
      nutritionalSummary: {
        baseCalories: 120,
        maxPossibleCalories: 120,
        calorieDensity: 'alta',
        satietyEstimate: 'alta',
        possiblePositiveComponents: ['Rico em proteínas'],
        possibleAttentionPoints: [],
        totalFiber: 0,
        totalSugar: 2,
        totalAddedSugar: 0,
        totalSodium: 45,
        totalSaturatedFat: 1,
      },
      foods: [
        {
          id: 'food_1',
          name: 'Whey Protein Concentrado 80%',
          calories: 120,
          estimatedAmount: 30,
          unit: 'g',
          estimatedWeightGrams: 30,
          portionDescription: '1 dosador (30g)',
          carbohydrates: 1.5,
          protein: 24,
          fat: 2,
          fiber: 0,
          sugar: 0.6,
          addedSugar: 0,
          sodium: 45,
          saturatedFat: 0.9,
          source: 'visible',
          confidence: 'alta',
          preparationMethod: 'diluído em água',
          consumedFraction: 1,
          healthHighlights: ['Alta proteína'],
          attentionHighlights: [],
          processingLevel: 'processado',
          possibleAddedSugars: false,
          possibleAddedFats: false,
          possibleExcessSodium: false,
          possibleIndustrializedSauces: false,
        },
      ],
      hiddenIngredientsPossible: [],
      feedback: 'Ótima ingestão de proteínas pós-treino.',
      suggestions: [],
    };

    const finalResult = await enforceConsistency(rawResult);

    expect(finalResult.foods[0].protein).toBe(24);
    expect(finalResult.foods[0].carbohydrates).toBe(1.5);
    expect(finalResult.foods[0].fat).toBe(2);
    // Calorias recalculadas matematicamente via Atwater: 1.5*4 + 24*4 + 2*9 = 6 + 96 + 18 = 120 kcal
    expect(finalResult.foods[0].calories).toBe(120);
    expect(finalResult.nutritionalSummary.baseCalories).toBe(120);
  });
});
