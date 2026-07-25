import { describe, it, expect } from 'vitest';
import { calculateProcessingBreakdown } from './nutritionScore';
import type { FoodItem } from '../types';

describe('processingLevel Canonical Enum Validation (PASSO 1 - Fase 4.2)', () => {
  const CANONICAL_LEVELS = [
    'in natura',
    'minimamente processado',
    'processado',
    'ultraprocessado',
  ] as const;

  it('deve conter apenas valores do enum canônico sem underscores e sem indeterminado', () => {
    // Valida que a lista de níveis canônicos contém exatamente os 4 níveis oficiais
    expect(CANONICAL_LEVELS).toHaveLength(4);
    expect(CANONICAL_LEVELS).not.toContain('in_natura');
    expect(CANONICAL_LEVELS).not.toContain('minimamente_processado');
    expect(CANONICAL_LEVELS).not.toContain('indeterminado');
  });

  it('deve mapear valores legados e indefinidos defensivamente para o enum canônico', () => {
    const mockFoods = [
      { calories: 100, processingLevel: 'in_natura' as any },
      { calories: 100, processingLevel: 'minimamente_processado' as any },
      { calories: 100, processingLevel: 'indeterminado' as any },
      { calories: 100, processingLevel: 'ultraprocessado' as any },
    ] as FoodItem[];

    const breakdown = calculateProcessingBreakdown(mockFoods);

    // in_natura -> inNatura (25%)
    expect(breakdown.inNatura).toBe(25);
    // minimamente_processado -> minimamenteProcessado (25%)
    expect(breakdown.minimamenteProcessado).toBe(25);
    // indeterminado -> processado (25% fallback conservador)
    expect(breakdown.processado).toBe(25);
    // ultraprocessado -> ultraprocessado (25%)
    expect(breakdown.ultraprocessado).toBe(25);
    // 'indeterminado' não deve existir como chave no breakdown
    expect((breakdown as any).indeterminado).toBeUndefined();
  });
});
