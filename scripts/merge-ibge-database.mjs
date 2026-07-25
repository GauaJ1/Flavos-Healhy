import fs from 'fs';
import path from 'path';

// Carregar TACO atual (597 alimentos)
const tacoData = JSON.parse(fs.readFileSync('packages/alimentos-seo/src/data/taco-reference.json', 'utf8'));
// Carregar IBGE POF
const ibgeData = JSON.parse(fs.readFileSync('claude/ibge-database.json', 'utf8'));

console.log(`TACO atual: ${tacoData.length} itens`);
console.log(`IBGE POF: ${ibgeData.length} itens`);

// Mapeamento de slugs existentes na TACO para evitar duplicatas exatas
const existingSlugs = new Set(tacoData.map(item => item.slug));

let addedCount = 0;
const combinedData = [...tacoData];

ibgeData.forEach(item => {
  let slug = item.slug;
  if (!existingSlugs.has(slug)) {
    existingSlugs.add(slug);
    combinedData.push({
      ...item,
      source: 'IBGE-POF'
    });
    addedCount++;
  }
});

console.log(`✅ Adicionados ${addedCount} novos alimentos únicos da base IBGE-POF!`);
console.log(`🚀 Total da Base Unificada: ${combinedData.length} alimentos!`);

// 1. Salvar no subprojeto SEO em packages/alimentos-seo/src/data/taco-reference.json
const tacoSeoPath = 'packages/alimentos-seo/src/data/taco-reference.json';
fs.writeFileSync(tacoSeoPath, JSON.stringify(combinedData, null, 2), 'utf8');
console.log(`💾 Salvo em ${tacoSeoPath}`);

// 2. Atualizar utils/tacoDatabase.ts do App Principal
const tacoDatabaseTsPath = 'utils/tacoDatabase.ts';
const tsContent = `/**
 * Combined Food Database (TACO 4th Edition + IBGE-POF).
 * Integrated database with ${combinedData.length} total foods for high-precision nutrition matching.
 *
 * Nutritional values are per 100g of edible portion.
 */

export interface TacoNutrient {
  name: string;
  calories: number;
  carbohydrates: number;
  protein: number;
  fat: number;
  fiber: number;
  sugar: number;
  addedSugar: number;
  sodium: number; // mg
  saturatedFat: number;
  glycemicIndex: number; // 0-100
  antiInflammatoryScore: number; // 0-10
  iron_mg: number;
  calcium_mg: number;
  vitaminC_mg: number;
  vitaminD_mcg: number;
  magnesium_mg: number;
  potassium_mg: number;
  zinc_mg: number;
  vitaminB12_mcg: number;
  foodGroup: string;
  slug?: string;
  source?: 'TACO' | 'IBGE-POF';
}

export const TACO_DATABASE: TacoNutrient[] = ${JSON.stringify(combinedData, null, 2)};

export function isCompositeDish(name: string): boolean {
  const lower = name.toLowerCase();
  const keywords = ['com', ' e ', 'estrogonofe', 'strogonoff', 'feijoada', 'salpicão', 'salpicao', 'moqueca', 'lasanha', 'pizza', 'sanduíche', 'sanduiche', 'hambúrguer', 'hamburguer', 'yakisoba', 'acarajé', 'acaraje', 'baião', 'baiao', 'virado', 'vaca atolada', 'dobradinha', 'maniçoba', 'manicoba', 'sarapatel', 'vatapá', 'vatapa', 'barreado', 'risoto', 'paella', 'wrap', 'panqueca', 'marmita', 'vitamina'];
  return keywords.some(kw => lower.includes(kw));
}

export function findTACOMatch(query: string, allowedFoodGroups?: string[], minSimilarity = 0.4): { match: TacoNutrient; similarity: number } | null {
  if (!query) return null;
  const cleanQuery = query.toLowerCase().trim();
  let bestMatch: TacoNutrient | null = null;
  let bestScore = 0;

  const qWords = cleanQuery.split(/[\\s,/-]+/).filter(w => w.length > 2);

  for (const food of TACO_DATABASE) {
    if (allowedFoodGroups && allowedFoodGroups.length > 0) {
      const normalizedGroups = allowedFoodGroups.flatMap(g => g === 'proteinas' ? ['carnes', 'pescados', 'ovos', 'proteinas'] : [g]);
      if (!normalizedGroups.includes(food.foodGroup)) {
        continue;
      }
    }
    const cleanName = food.name.toLowerCase();
    const nWords = cleanName.split(/[\\s,/-]+/).filter(w => w.length > 2);

    let score = 0;
    if (cleanName === cleanQuery) {
      score = 1.0;
    } else {
      const common = qWords.filter(w => nWords.some(nw => nw.includes(w) || w.includes(nw)));
      score = common.length / Math.max(qWords.length, 1);
      if (cleanName.includes(cleanQuery)) {
        score = Math.max(score, 0.85);
      }
    }

    if (score > 0) {
      const isQueryCru = cleanQuery.includes('cru');
      const isFoodCru = cleanName.includes('cru');
      if (!isQueryCru && !isFoodCru) {
        score += 0.05;
      } else if (!isQueryCru && isFoodCru) {
        score -= 0.1;
      }
    }

    if (score > bestScore && score >= minSimilarity) {
      bestScore = score;
      bestMatch = {
        ...food,
        foodGroup: (allowedFoodGroups && allowedFoodGroups.includes('proteinas')) ? 'proteinas' : food.foodGroup
      };
    }
  }

  return bestMatch ? { match: bestMatch, similarity: bestScore } : null;
}
`;

fs.writeFileSync(tacoDatabaseTsPath, tsContent, 'utf8');
console.log(`💾 Salvo em ${tacoDatabaseTsPath}`);
