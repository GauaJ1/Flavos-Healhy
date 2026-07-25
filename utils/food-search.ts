import { TACO_DATABASE, findTACOMatch, type TacoNutrient } from './tacoDatabase';

export interface FoodMatch {
  match: TacoNutrient;
  similarity: number;
  source: 'TACO' | 'IBGE-POF';
}

let ibgeCache: {
  data: (TacoNutrient & { source: 'IBGE-POF' })[];
  wordIndex: Record<string, number[]>;
} | null = null;

async function loadIBGE() {
  if (ibgeCache) return ibgeCache;
  const mod = await import('./ibge-database');
  ibgeCache = { data: mod.IBGE_DATABASE, wordIndex: mod.IBGE_WORD_INDEX };
  return ibgeCache;
}

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Dice Similarity Coefficient: 2 * |intersection| / (|A| + |B|)
 */
export function calculateDiceSimilarity(query: string, target: string): number {
  const cleanQ = normalizeText(query);
  const cleanT = normalizeText(target);

  if (cleanQ === cleanT) return 1.0;

  const qWords = cleanQ.split(' ').filter(w => w.length > 2);
  const tWords = cleanT.split(' ').filter(w => w.length > 2);

  if (qWords.length === 0 || tWords.length === 0) return 0;

  const common = qWords.filter(w => tWords.some(tw => tw.includes(w) || w.includes(tw)));
  let diceScore = (2 * common.length) / (qWords.length + tWords.length);

  // If all query words are present in target, ensure high similarity score (0.80)
  if (common.length > 0 && common.length === qWords.length) {
    diceScore = Math.max(diceScore, 0.80);
  }

  return diceScore;
}

function findInIBGE(
  query: string,
  cache: NonNullable<typeof ibgeCache>,
  allowedFoodGroups?: string[],
  minSimilarity = 0.65
): { match: TacoNutrient & { source: 'IBGE-POF' }; similarity: number } | null {
  const qWords = normalizeText(query).split(' ').filter(w => w.length > 2);
  if (qWords.length === 0) return null;

  // Use inverted index to filter candidates
  const candidateIdx = new Set<number>();
  for (const w of qWords) {
    (cache.wordIndex[w] || []).forEach(i => candidateIdx.add(i));
  }

  let best: (TacoNutrient & { source: 'IBGE-POF' }) | null = null;
  let bestScore = 0;

  const isQueryCru = normalizeText(query).includes('cru');

  for (const idx of candidateIdx) {
    const food = cache.data[idx];
    if (allowedFoodGroups?.length) {
      const normalizedGroups = allowedFoodGroups.flatMap(g => g === 'proteinas' ? ['carnes', 'pescados', 'ovos', 'proteinas'] : [g]);
      if (!normalizedGroups.includes(food.foodGroup)) continue;
    }

    let score = calculateDiceSimilarity(query, food.name);

    if (score > 0) {
      const isFoodCru = normalizeText(food.name).includes('cru');
      if (!isQueryCru && !isFoodCru) {
        score += 0.05;
      } else if (!isQueryCru && isFoodCru) {
        score -= 0.1;
      }
    }

    if (score > bestScore && score >= minSimilarity) {
      bestScore = score;
      best = food;
    }
  }

  return best ? { match: best, similarity: bestScore } : null;
}

/**
 * Busca de enriquecimento combinada: busca primeiro na TACO (fonte primária).
 * Se não encontrar com similaridade >= minSimilarity, busca no IBGE (fallback).
 */
export async function findEnrichmentMatch(
  query: string,
  minSimilarity = 0.65,
  allowedFoodGroups?: string[]
): Promise<FoodMatch | null> {
  // 1. Busca na TACO
  const tacoResult = findTACOMatch(query, allowedFoodGroups, minSimilarity);
  if (tacoResult && tacoResult.similarity >= minSimilarity) {
    return {
      match: tacoResult.match,
      similarity: tacoResult.similarity,
      source: 'TACO'
    };
  }

  // 2. Fallback no IBGE-POF
  const cache = await loadIBGE();
  const ibgeResult = findInIBGE(query, cache, allowedFoodGroups, minSimilarity);

  if (ibgeResult && (!tacoResult || ibgeResult.similarity > tacoResult.similarity)) {
    return {
      match: ibgeResult.match,
      similarity: ibgeResult.similarity,
      source: 'IBGE-POF'
    };
  }

  return tacoResult ? { match: tacoResult.match, similarity: tacoResult.similarity, source: 'TACO' } : null;
}
