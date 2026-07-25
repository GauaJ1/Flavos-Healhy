import { describe, it, expect } from 'vitest';
import { compareMealEntries } from './MealComparatorModal';
import type { HistoryEntry } from '../types';

describe('MealComparatorModal (Fase 3.1 - Comparador de Refeições)', () => {
  const makeEntry = (id: number, kcal: number, prot: number, carbs: number, fat: number, fiber: number): HistoryEntry => ({
    id,
    date: '2026-05-30T12:00:00.000Z',
    totalCalories: kcal,
    foods: [
      {
        id: `f_${id}`,
        name: `Refeição ${id}`,
        calories: kcal,
        estimatedAmount: 200,
        unit: 'g',
        estimatedWeightGrams: 200,
        portionDescription: '200g',
        carbohydrates: carbs,
        protein: prot,
        fat: fat,
        fiber: fiber,
        sugar: 0,
        addedSugar: 0,
        sodium: 200,
        saturatedFat: 1,
        source: 'visible',
        confidence: 'alta',
        preparationMethod: 'grelhado',
        consumedFraction: 1,
        healthHighlights: [],
        attentionHighlights: [],
        processingLevel: 'in natura',
        possibleAddedSugars: false,
        possibleAddedFats: false,
        possibleExcessSodium: false,
        possibleIndustrializedSauces: false,
      },
    ],
  });

  it('deve comparar duas refeições e destacar a refeição mais rica em cada nutriente', () => {
    const meal1 = makeEntry(1, 500, 40, 50, 10, 8); // 40g prot, 8g fibra
    const meal2 = makeEntry(2, 600, 20, 80, 15, 2); // 20g prot, 2g fibra

    const metrics = compareMealEntries(meal1, meal2);

    const protMetric = metrics.find((m) => m.label === 'Proteínas');
    expect(protMetric).toBeDefined();
    expect(protMetric?.highlightIndex).toBe(1); // Refeição 1 tem mais proteína
    expect(protMetric?.description).toContain('mais rica em proteína');
    expect(protMetric?.description).not.toContain('melhor');
    expect(protMetric?.description).not.toContain('pior');

    const kcalMetric = metrics.find((m) => m.label === 'Calorias Totais');
    expect(kcalMetric?.highlightIndex).toBe(2); // Refeição 2 é mais calórica
  });

  it('deve tratar empates com highlightIndex: 0 e descrição neutra de equilíbrio', () => {
    const meal1 = makeEntry(1, 400, 30, 40, 10, 5);
    const meal2 = makeEntry(2, 400, 30, 40, 10, 5);

    const metrics = compareMealEntries(meal1, meal2);

    const protMetric = metrics.find((m) => m.label === 'Proteínas');
    expect(protMetric?.highlightIndex).toBe(0);
    expect(protMetric?.description).toBe('Mesmo aporte proteico');
  });
});
