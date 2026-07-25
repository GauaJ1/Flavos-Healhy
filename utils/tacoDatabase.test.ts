import { describe, it, expect } from 'vitest';
import { isCompositeDish, findTACOMatch } from './tacoDatabase';
// We need to import enforceConsistency from the service to test it as well
// However, since geminiService.ts imports classifyFoodGroup which is a react hook
// (from '../hooks/useFoodDiversity'), we might get react errors if we run it in a pure node environment.
// Let's check if we can import it. If useFoodDiversity or other React parts are imported,
// it might need a react/jsdom env, or we can mock/wrap it. Let's see if we can import it directly first.

describe('isCompositeDish', () => {
  it('should identify composite dishes with filled/mixed keywords', () => {
    expect(isCompositeDish('Tapioca com frango, ovo e queijo')).toBe(true);
    expect(isCompositeDish('Sanduíche natural de frango')).toBe(true);
    expect(isCompositeDish('Omelete de queijo e presunto')).toBe(true);
    expect(isCompositeDish('Wrap funcional')).toBe(true);
    expect(isCompositeDish('Panqueca de carne')).toBe(true);
    expect(isCompositeDish('Marmita de frango e legumes')).toBe(true);
    expect(isCompositeDish('Yakisoba de carne')).toBe(true);
    expect(isCompositeDish('Vitamina de morango com aveia')).toBe(true);
  });

  it('should not mark simple ingredients as composite dishes', () => {
    expect(isCompositeDish('Frango grelhado')).toBe(false);
    expect(isCompositeDish('Banana')).toBe(false);
    expect(isCompositeDish('Ovo cozido')).toBe(false);
    expect(isCompositeDish('Arroz branco cozido')).toBe(false);
    expect(isCompositeDish('Queijo mucarela')).toBe(false);
    expect(isCompositeDish('Tapioca')).toBe(false); // simple tapioca without recheio keyword "com"
  });

  it('should not trigger isCompositeDish for substrings inside longer words (Fix 3)', () => {
    expect(isCompositeDish('Acompanhamento')).toBe(false); // "com" is substring
    expect(isCompositeDish('Recomendado')).toBe(false);     // "com" is substring
    expect(isCompositeDish('Elefante')).toBe(false);        // "e" is substring
  });
});

describe('findTACOMatch with allowedFoodGroups filter', () => {
  it('should allow filtering matches by foodGroup to avoid false positives', () => {
    // Standard match without filter
    const matchNoFilter = findTACOMatch('frango');
    expect(matchNoFilter).not.toBeNull();
    expect(['carnes', 'proteinas']).toContain(matchNoFilter?.match.foodGroup);

    // Match with proteinas or carnes whitelisted
    const matchProtein = findTACOMatch('frango', ['proteinas', 'carnes']);
    expect(matchProtein).not.toBeNull();
    expect(['carnes', 'proteinas']).toContain(matchProtein?.match.foodGroup);

    // Match with an unrelated category filter should yield null or different match
    // since the database doesn't have an item named 'frango' in 'laticinios'
    const matchDairy = findTACOMatch('frango', ['laticinios']);
    expect(matchDairy).toBeNull();
  });


  it('should raise the minimum similarity threshold correctly', () => {
    // "tapioca com frango" similarity to "tapioca" is low (around 0.5 - 0.6)
    // By setting minSimilarity to 0.82, this match should be rejected.
    const matchStrict = findTACOMatch('tapioca com frango', undefined, 0.82);
    expect(matchStrict).toBeNull();
  });
});
