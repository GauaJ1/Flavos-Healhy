/**
 * macros.test.ts — Testes unitários para utils/macros.ts
 *
 * Execute com: npx vitest run utils/macros.test.ts
 * (ou jest se configurado no projeto)
 *
 * Cobertura:
 *   - PROTEIN_GKG_GOAL_BONUS
 *   - volumeStrategy
 *   - redistributeAroundFixedMeals (incluindo regras de negócio e avisos)
 *   - sumFoodsMacros (helper)
 */

import { describe, it, expect } from 'vitest';

import {
  PROTEIN_GKG_GOAL_BONUS,
  volumeStrategy,
  redistributeAroundFixedMeals,
  sumFoodsMacros,
} from './macros';

import type { NutritionalTargets } from '../hooks/useUserProfile';
import type { FixedMeal } from './macros';
import type { AnalysisResult } from '../types';

// ──────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────

const TARGETS: NutritionalTargets = {
  tmbKcal:        1800,
  tdeeKcal:       2800,
  targetKcal:     2500,
  targetProtein_g: 160,
  targetCarbs_g:   280,
  targetFat_g:      70,
};

function makeAnalysis(protein: number, carbs: number, fat: number): AnalysisResult {
  const kcal = Math.round(protein * 4 + carbs * 4 + fat * 9);
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
      // baseCalories NUNCA deve ser usado diretamente — deve ser recalculado de foods[]
      baseCalories: kcal + 999, // intencionalmente errado para validar que só foods[] é usado
      maxPossibleCalories: kcal + 1000,
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
    foods: [
      {
        id: 'f1',
        name: 'Alimento Teste',
        calories: kcal,
        estimatedAmount: 1,
        unit: 'g',
        estimatedWeightGrams: 200,
        portionDescription: '200g',
        carbohydrates: carbs,
        protein,
        fat,
        fiber: 2,
        sugar: 1,
        addedSugar: 0,
        sodium: 100,
        saturatedFat: 1,
        source: 'visible',
        confidence: 'alta',
        preparationMethod: 'cozido',
        consumedFraction: 1,
        healthHighlights: [],
        attentionHighlights: [],
        processingLevel: 'in_natura',
        possibleAddedSugars: false,
        possibleAddedFats: false,
        possibleExcessSodium: false,
        possibleIndustrializedSauces: false,
      },
    ],
    hiddenIngredientsPossible: [],
    feedback: '',
    suggestions: [],
  };
}

const REMAINING_MEALS = [
  { type: 'Café da manhã', role: 'normal' as const },
  { type: 'Jantar',        role: 'normal' as const },
];

// ──────────────────────────────────────────────────────────────
// 1. PROTEIN_GKG_GOAL_BONUS
// ──────────────────────────────────────────────────────────────

describe('PROTEIN_GKG_GOAL_BONUS', () => {
  it('deve ter bônus positivo apenas para perder_peso', () => {
    expect(PROTEIN_GKG_GOAL_BONUS.perder_peso).toBeGreaterThan(0);
  });

  it('deve ter bônus zero para manter', () => {
    expect(PROTEIN_GKG_GOAL_BONUS.manter).toBe(0);
  });

  it('deve ter bônus zero para ganhar_massa', () => {
    expect(PROTEIN_GKG_GOAL_BONUS.ganhar_massa).toBe(0);
  });

  it('bônus de perder_peso deve ser 0.2', () => {
    expect(PROTEIN_GKG_GOAL_BONUS.perder_peso).toBe(0.2);
  });
});

// ──────────────────────────────────────────────────────────────
// 2. volumeStrategy
// ──────────────────────────────────────────────────────────────

describe('volumeStrategy', () => {
  it('retorna tip quando déficit > 15% (ratio <= 0.85)', () => {
    // targetKcal = 2380, tdee = 2800 → ratio ≈ 0.85
    const result = volumeStrategy(2380, 2800, 'perder_peso');
    expect(result.tip).not.toBeNull();
    expect(result.recommendedMealCount).toBe(4);
  });

  it('retorna tip=null quando déficit leve (ratio > 0.85)', () => {
    // targetKcal = 2500, tdee = 2800 → ratio ≈ 0.893
    const result = volumeStrategy(2500, 2800, 'perder_peso');
    expect(result.tip).toBeNull();
    expect(result.recommendedMealCount).toBe(4);
  });

  it('retorna tip=null para manter mesmo com ratio exato em 0.85', () => {
    const result = volumeStrategy(2380, 2800, 'manter');
    // Manter com déficit alto → tip deve aparecer (ratio 0.85 <= 0.85)
    expect(result.tip).not.toBeNull();
    expect(result.recommendedMealCount).toBe(4);
  });

  it('sempre retorna recommendedMealCount=5 para ganhar_massa', () => {
    const result = volumeStrategy(3200, 2800, 'ganhar_massa');
    expect(result.recommendedMealCount).toBe(5);
    expect(result.tip).toBeNull();
  });

  it('tip de volume menciona alimentos de alta saciedade', () => {
    const result = volumeStrategy(2000, 2800, 'perder_peso');
    expect(result.tip).toContain('salada');
  });

  it('funciona com tdee=0 sem divisão por zero', () => {
    expect(() => volumeStrategy(0, 0, 'perder_peso')).not.toThrow();
  });
});

// ──────────────────────────────────────────────────────────────
// 3. sumFoodsMacros
// ──────────────────────────────────────────────────────────────

describe('sumFoodsMacros', () => {
  it('soma proteína, carbs e fat de foods[] ignorando nutritionalSummary', () => {
    const analysis = makeAnalysis(30, 50, 10);
    const result = sumFoodsMacros(analysis);

    expect(result.protein_g).toBeCloseTo(30, 0);
    expect(result.carbs_g).toBeCloseTo(50, 0);
    expect(result.fat_g).toBeCloseTo(10, 0);
  });

  it('calcula kcal como 4×prot + 4×carb + 9×fat', () => {
    const analysis = makeAnalysis(30, 50, 10);
    const result = sumFoodsMacros(analysis);
    const expectedKcal = Math.round(30 * 4 + 50 * 4 + 10 * 9);
    expect(result.kcal).toBe(expectedKcal);
  });

  it('retorna zeros quando não há foods', () => {
    const analysis = makeAnalysis(0, 0, 0);
    // Substituir foods por array vazio
    analysis.foods = [];
    const result = sumFoodsMacros(analysis);
    expect(result.protein_g).toBe(0);
    expect(result.carbs_g).toBe(0);
    expect(result.fat_g).toBe(0);
    expect(result.kcal).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────
// 4. redistributeAroundFixedMeals
// ──────────────────────────────────────────────────────────────

describe('redistributeAroundFixedMeals — baseline', () => {
  it('lança erro quando remainingMeals está vazio', () => {
    const fixedMeals: FixedMeal[] = [
      { type: 'Almoço', role: 'normal', analysis: makeAnalysis(30, 80, 15) },
    ];

    expect(() =>
      redistributeAroundFixedMeals(TARGETS, fixedMeals, []),
    ).toThrow(/pelo menos uma refeição/i);
  });

  it('retorna todas as refeições (fixas + livres)', () => {
    const fixedMeals: FixedMeal[] = [
      { type: 'Almoço', role: 'normal', analysis: makeAnalysis(40, 80, 15) },
    ];

    const result = redistributeAroundFixedMeals(TARGETS, fixedMeals, REMAINING_MEALS);
    // 1 fixed + 2 remaining = 3 refeições
    expect(result.meals.length).toBe(3);
  });

  it('marca refeições travadas com isFixed=true', () => {
    const fixedMeals: FixedMeal[] = [
      { type: 'Almoço', role: 'normal', analysis: makeAnalysis(40, 80, 15) },
    ];

    const result = redistributeAroundFixedMeals(TARGETS, fixedMeals, REMAINING_MEALS);
    const fixed = result.meals.filter(m => m.isFixed);
    expect(fixed.length).toBe(1);
    expect(fixed[0].type).toBe('Almoço');
  });

  it('marca refeições livres com isFixed=false', () => {
    const fixedMeals: FixedMeal[] = [
      { type: 'Almoço', role: 'normal', analysis: makeAnalysis(40, 80, 15) },
    ];

    const result = redistributeAroundFixedMeals(TARGETS, fixedMeals, REMAINING_MEALS);
    const free = result.meals.filter(m => !m.isFixed);
    expect(free.length).toBe(2);
  });

  it('recalculatedCount reflete número de refeições livres', () => {
    const fixedMeals: FixedMeal[] = [
      { type: 'Almoço', role: 'normal', analysis: makeAnalysis(40, 80, 15) },
    ];

    const result = redistributeAroundFixedMeals(TARGETS, fixedMeals, REMAINING_MEALS);
    expect(result.recalculatedCount).toBe(REMAINING_MEALS.length);
  });
});

describe('redistributeAroundFixedMeals — macros restantes', () => {
  it('desconta macros das fixedMeals dos targets antes de redistribuir', () => {
    const fixedMeals: FixedMeal[] = [
      { type: 'Almoço', role: 'normal', analysis: makeAnalysis(50, 100, 20) },
    ];

    const result = redistributeAroundFixedMeals(TARGETS, fixedMeals, REMAINING_MEALS);

    expect(result.remainingTargets.targetProtein_g).toBeCloseTo(
      TARGETS.targetProtein_g - 50, 0,
    );
    expect(result.remainingTargets.targetCarbs_g).toBeCloseTo(
      TARGETS.targetCarbs_g - 100, 0,
    );
    expect(result.remainingTargets.targetFat_g).toBeCloseTo(
      TARGETS.targetFat_g - 20, 0,
    );
  });

  it('nunca gera macros negativos mesmo quando fixedMeals excedem os targets', () => {
    // fixedMeal consome MAIS proteína do que o target total
    const fixedMeals: FixedMeal[] = [
      { type: 'Almoço', role: 'normal', analysis: makeAnalysis(200, 50, 10) },
    ];

    const result = redistributeAroundFixedMeals(TARGETS, fixedMeals, REMAINING_MEALS);

    expect(result.remainingTargets.targetProtein_g).toBeGreaterThanOrEqual(0);
    expect(result.remainingTargets.targetCarbs_g).toBeGreaterThanOrEqual(0);
    expect(result.remainingTargets.targetFat_g).toBeGreaterThanOrEqual(0);
  });
});

describe('redistributeAroundFixedMeals — avisos', () => {
  it('gera aviso quando fixedMeal consome > 60% de algum macro', () => {
    // 100g de proteína = 62.5% de 160g target
    const fixedMeals: FixedMeal[] = [
      { type: 'Almoço', role: 'normal', analysis: makeAnalysis(100, 50, 10) },
    ];

    const result = redistributeAroundFixedMeals(TARGETS, fixedMeals, REMAINING_MEALS);
    const fixedEntry = result.meals.find(m => m.isFixed);
    expect(fixedEntry?.warning).not.toBeNull();
    expect(fixedEntry?.warning).toMatch(/60%/);
  });

  it('não gera aviso de concentração quando macros estão abaixo de 60%', () => {
    const fixedMeals: FixedMeal[] = [
      { type: 'Almoço', role: 'normal', analysis: makeAnalysis(40, 80, 15) },
    ];

    const result = redistributeAroundFixedMeals(TARGETS, fixedMeals, REMAINING_MEALS);
    const fixedEntry = result.meals.find(m => m.isFixed);
    expect(fixedEntry?.warning).toBeNull();
  });

  it('gera aviso de digestão para pre_treino com gordura adicionada', () => {
    const analysis = makeAnalysis(30, 60, 10);
    analysis.foods[0].possibleAddedFats = true;

    const fixedMeals: FixedMeal[] = [
      { type: 'Lanche pré-treino', role: 'pre_treino', analysis },
    ];

    const result = redistributeAroundFixedMeals(TARGETS, fixedMeals, REMAINING_MEALS);
    const fixedEntry = result.meals.find(m => m.isFixed);
    expect(fixedEntry?.warning).toMatch(/antes do treino/i);
  });

  it('gera aviso de digestão para pos_treino com sódio elevado', () => {
    const analysis = makeAnalysis(30, 60, 5);
    analysis.foods[0].possibleExcessSodium = true;

    const fixedMeals: FixedMeal[] = [
      { type: 'Shake pós-treino', role: 'pos_treino', analysis },
    ];

    const result = redistributeAroundFixedMeals(TARGETS, fixedMeals, REMAINING_MEALS);
    const fixedEntry = result.meals.find(m => m.isFixed);
    expect(fixedEntry?.warning).toMatch(/ap.s o treino/i);
  });

  it('não gera aviso de treino para refeições normais com gordura', () => {
    const analysis = makeAnalysis(30, 60, 10);
    analysis.foods[0].possibleAddedFats = true;

    const fixedMeals: FixedMeal[] = [
      { type: 'Almoço', role: 'normal', analysis },
    ];

    const result = redistributeAroundFixedMeals(TARGETS, fixedMeals, REMAINING_MEALS);
    const fixedEntry = result.meals.find(m => m.isFixed);
    // Aviso de treino não deve aparecer para role=normal (warning deve ser null)
    expect(fixedEntry?.warning ?? null).toBeNull();
  });
});

describe('redistributeAroundFixedMeals — múltiplas fixedMeals', () => {
  it('aceita múltiplas refeições fixas e soma corretamente', () => {
    const fixedMeals: FixedMeal[] = [
      { type: 'Almoço', role: 'normal', analysis: makeAnalysis(40, 80, 15) },
      { type: 'Pré-treino', role: 'pre_treino', analysis: makeAnalysis(20, 40, 5) },
    ];

    const result = redistributeAroundFixedMeals(TARGETS, fixedMeals, REMAINING_MEALS);

    expect(result.meals.length).toBe(4); // 2 fixed + 2 free
    expect(result.remainingTargets.targetProtein_g).toBeCloseTo(
      TARGETS.targetProtein_g - 40 - 20, 0,
    );
    expect(result.remainingTargets.targetCarbs_g).toBeCloseTo(
      TARGETS.targetCarbs_g - 80 - 40, 0,
    );
  });
});
