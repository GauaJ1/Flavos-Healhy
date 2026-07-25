import { describe, it, expect } from 'vitest';
import { calculateDiceSimilarity, normalizeText } from './food-search';
import { isCompositeDish } from './tacoDatabase';

// ─── Fix 2: Dice Coefficient ──────────────────────────────────────────────────
describe('Fix 2 — Dice Coefficient similarity', () => {
  it('should return 1.0 for identical strings', () => {
    expect(calculateDiceSimilarity('arroz branco cozido', 'arroz branco cozido')).toBe(1.0);
  });

  it('should return 0 for completely different strings', () => {
    const score = calculateDiceSimilarity('abacaxi', 'frango grelhado');
    expect(score).toBe(0);
  });

  it('should boost to >= 0.80 when all query words match target', () => {
    // query "arroz branco" -> words: ['arroz', 'branco']
    // target "arroz, tipo branco, cozido" -> words: ['arroz', 'tipo', 'branco', 'cozido']
    // common: ['arroz', 'branco'] -> dice = 2*2 / (2+4) = 0.67 -> boosted to 0.80
    const score = calculateDiceSimilarity('arroz branco', 'arroz tipo branco cozido');
    expect(score).toBeGreaterThanOrEqual(0.80);
  });

  it('should return score above 0.65 for similar items (above MIN_TACO_SIMILARITY)', () => {
    const score = calculateDiceSimilarity('feijao preto', 'feijao, preto, cozido');
    expect(score).toBeGreaterThanOrEqual(0.65);
  });

  it('should normalise accented characters before comparison', () => {
    const a = calculateDiceSimilarity('frango grelhado', 'frango grelhado');
    const b = calculateDiceSimilarity('frangô grélhado', 'frango grelhado');
    expect(a).toBe(1.0);
    expect(b).toBe(1.0);
  });
});

// ─── Fix 3: isCompositeDish word-boundary regex ───────────────────────────────
describe('Fix 3 — isCompositeDish word-boundary regex', () => {
  it('should NOT mark words containing composite keywords as substrings', () => {
    expect(isCompositeDish('Acompanhamento')).toBe(false);  // contains "com"
    expect(isCompositeDish('Recomendado')).toBe(false);     // contains "com"
    expect(isCompositeDish('Elefante')).toBe(false);        // contains "e"
    expect(isCompositeDish('Recheado')).toBe(false);        // contains "com" would be false
  });

  it('should correctly identify genuine composite dishes with isolated connector words', () => {
    expect(isCompositeDish('Tapioca com frango')).toBe(true);
    expect(isCompositeDish('Arroz e feijao')).toBe(true);
    expect(isCompositeDish('Strogonoff de frango')).toBe(true);
    expect(isCompositeDish('Omelete de queijo e presunto')).toBe(true);
    expect(isCompositeDish('Frango com batata e legumes')).toBe(true);
  });
});
