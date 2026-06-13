import { describe, it, expect } from 'vitest';
import { enforceConsistency } from './geminiService';
import type { AnalysisResult } from '../types';

function createMockAnalysis(foods: any[]): AnalysisResult {
  return {
    analysisMetadata: {
      isRealFood: true,
      confidence: 'alta',
      isMixedDish: false,
      isPackagedFood: false,
      uncertaintyReasons: [],
      requiresFollowUp: false,
      followUpQuestions: [],
    },
    nutritionalSummary: {
      baseCalories: 0,
      maxPossibleCalories: 0,
      calorieDensity: 'media',
      satietyEstimate: 'media',
      possiblePositiveComponents: [],
      possibleAttentionPoints: [],
      totalFiber: 0,
      totalSugar: 0,
      totalAddedSugar: 0,
      totalSodium: 0,
      totalSaturatedFat: 0,
    },
    foods,
    hiddenIngredientsPossible: [],
    feedback: '',
    suggestions: [],
  };
}

describe('enforceConsistency - TACO Enrichment Guard-rails', () => {
  it('should not override a composite/assembled dish (e.g. "Tapioca com frango, ovo e queijo")', () => {
    // 1. Simulating the bug case where a composite dish is sent with correct AI macros
    const rawAnalysis = createMockAnalysis([
      {
        id: 'food_1',
        name: 'Tapioca com frango, ovo e queijo',
        estimatedWeightGrams: 200,
        estimatedAmount: 1,
        unit: 'unidade',
        portionDescription: '1 unidade grande',
        protein: 28.5,       // Correct AI estimate for the whole loaded tapioca
        carbohydrates: 45.0,  // Correct AI estimate
        fat: 12.0,            // Correct AI estimate
        calories: 402,
        consumedFraction: 1.0,
        processingLevel: 'minimamente_processado',
        source: 'visible',
        confidence: 'alta',
        preparationMethod: 'grelhado',
        healthHighlights: [],
        attentionHighlights: [],
        possibleAddedSugars: false,
        possibleAddedFats: false,
        possibleExcessSodium: false,
        possibleIndustrializedSauces: false,
      }
    ]);

    const result = enforceConsistency(rawAnalysis);
    
    // The protein should NOT have dropped to ~0.4g (from "tapioca crua")
    // It must remain exactly what the AI estimated because it is a composite dish!
    expect(result.foods[0].protein).toBe(28.5);
    expect(result.foods[0].carbohydrates).toBe(45.0);
    expect(result.foods[0].fat).toBe(12.0);
    // Calories must be calculated as Math.round(protein * 4 + carbs * 4 + fat * 9)
    // 28.5 * 4 + 45 * 4 + 12 * 9 = 114 + 180 + 108 = 402
    expect(result.foods[0].calories).toBe(402);
  });

  it('should decompose composite dishes and enrich individual simple components with TACO', () => {
    // 2. Simulating the correct decomposed analysis of a composite dish (after REGRA DE DECOMPOSIÇÃO prompt fix)
    const rawAnalysis = createMockAnalysis([
      {
        id: 'food_1',
        name: 'goma de tapioca',
        estimatedWeightGrams: 50,
        estimatedAmount: 50,
        unit: 'gramas',
        portionDescription: '50g',
        protein: 0.1,
        carbohydrates: 30.0, // Match TACO tapioca (60g carbs per 100g -> 30g per 50g)
        fat: 0,
        calories: 120,
        consumedFraction: 1.0,
        processingLevel: 'processado',
        source: 'visible',
        confidence: 'alta',
        preparationMethod: 'cru',
        healthHighlights: [],
        attentionHighlights: [],
        possibleAddedSugars: false,
        possibleAddedFats: false,
        possibleExcessSodium: false,
        possibleIndustrializedSauces: false,
      },
      {
        id: 'food_2',
        name: 'peito de frango grelhado',
        estimatedWeightGrams: 100,
        estimatedAmount: 100,
        unit: 'gramas',
        portionDescription: '100g',
        protein: 32.0, // Match TACO peito de frango (32g prot per 100g)
        carbohydrates: 0,
        fat: 2.5,
        calories: 151,
        consumedFraction: 1.0,
        processingLevel: 'in_natura',
        source: 'visible',
        confidence: 'alta',
        preparationMethod: 'grelhado',
        healthHighlights: [],
        attentionHighlights: [],
        possibleAddedSugars: false,
        possibleAddedFats: false,
        possibleExcessSodium: false,
        possibleIndustrializedSauces: false,
      }
    ]);

    const result = enforceConsistency(rawAnalysis);

    // Both should match TACO successfully and enrich secondary details
    // "goma de tapioca" matches TACO "tapioca"
    expect(result.foods[0].protein).toBe(0.1); // enriched from TACO (0.2g * 0.5 = 0.1g)
    expect(result.foods[0].carbohydrates).toBe(30); // 60g * 0.5 = 30g
    // "peito de frango grelhado" matches TACO "peito de frango grelhado"
    expect(result.foods[1].protein).toBe(32);
    expect(result.foods[1].carbohydrates).toBe(0);

    // Verify recalculation of baseCalories:
    // food 1: 0.1 * 4 + 30 * 4 + 0 * 9 = 0.4 + 120 = 120 kcal
    // food 2: 32 * 4 + 0 * 4 + 2.5 * 9 = 128 + 22.5 = 151 kcal (rounded)
    // baseCalories = 120 + 151 = 271 kcal
    expect(result.nutritionalSummary.baseCalories).toBe(271);
  });

  it('should discard TACO enrichment and keep AI macros if divergence > 35%', () => {
    // 3. AI reports "ovo cozido" weighing 100g, but with 25g of protein (instead of TACO's 13g)
    // Deviation is |25 - 13| / 25 = 12 / 25 = 48%, which is > 35%.
    // Therefore, TACO enrichment must be skipped and AI values must be preserved.
    const rawAnalysis = createMockAnalysis([
      {
        id: 'food_1',
        name: 'ovo cozido',
        estimatedWeightGrams: 100,
        estimatedAmount: 2,
        unit: 'unidades',
        portionDescription: '2 ovos cozidos',
        protein: 25.0, // AI guess is way higher than TACO (13g per 100g)
        carbohydrates: 1.1,
        fat: 10.6,
        calories: 200,
        consumedFraction: 1.0,
        processingLevel: 'in_natura',
        source: 'visible',
        confidence: 'alta',
        preparationMethod: 'cozido',
        healthHighlights: [],
        attentionHighlights: [],
        possibleAddedSugars: false,
        possibleAddedFats: false,
        possibleExcessSodium: false,
        possibleIndustrializedSauces: false,
      }
    ]);

    const result = enforceConsistency(rawAnalysis);

    // The protein should NOT have dropped to TACO's 13g. The AI's 25g must be kept.
    expect(result.foods[0].protein).toBe(25.0);
  });

  it('should apply TACO enrichment if divergence <= 35% and similarity >= 0.82', () => {
    // 4. AI reports "ovo cozido" weighing 100g, with 12g of protein (TACO is 13g)
    // Deviation is |12 - 13| / 12 = 8.3%, which is <= 35%.
    // Similarity is 1.0 (exact match), which is >= 0.82.
    // It should apply TACO macros (13g protein).
    const rawAnalysis = createMockAnalysis([
      {
        id: 'food_1',
        name: 'ovo cozido',
        estimatedWeightGrams: 100,
        estimatedAmount: 2,
        unit: 'unidades',
        portionDescription: '2 ovos cozidos',
        protein: 12.0, // AI guess is close to TACO (13g)
        carbohydrates: 1.1,
        fat: 10.6,
        calories: 148,
        consumedFraction: 1.0,
        processingLevel: 'in_natura',
        source: 'visible',
        confidence: 'alta',
        preparationMethod: 'cozido',
        healthHighlights: [],
        attentionHighlights: [],
        possibleAddedSugars: false,
        possibleAddedFats: false,
        possibleExcessSodium: false,
        possibleIndustrializedSauces: false,
      }
    ]);

    const result = enforceConsistency(rawAnalysis);

    // The protein should be enriched to 13g (TACO value)
    expect(result.foods[0].protein).toBe(13.0);
    expect(result.foods[0].fat).toBe(10.6);
  });
});
