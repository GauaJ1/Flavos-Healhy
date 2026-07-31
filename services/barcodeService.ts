/**
 * barcodeService.ts — Leitura e enriquecimento de produtos via Open Food Facts API (Fase 1.1)
 *
 * Busca um produto pelo código de barras EAN-13, extrai a tabela nutricional
 * e converte o grupo NOVA oficial para o enum de processingLevel canônico:
 * - NOVA 1 -> 'in natura'
 * - NOVA 2 -> 'minimamente processado'
 * - NOVA 3 -> 'processado'
 * - NOVA 4 -> 'ultraprocessado'
 * - Fallback -> 'processado' (nunca assume 'in natura' sem confirmação)
 */

import type { FoodItem } from '../types';

/** Metadados completos do produto para armazenar na biblioteca de produtos salvos. */
export interface SavedProductSource {
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  packageNetWeightGrams?: number;  // peso líquido da embalagem (ex: 400g)
  unitWeightGrams?: number;        // peso de 1 porção/unidade padrão
  unitLabel?: string;              // ex: "barra", "unidade", "fatia"
  ingredientsText?: string;
  allergens?: string[];
  nutriScoreGrade?: string;
  novaGroup?: number;
  dataQualityWarning?: string;     // NOVO — aviso de inconsistência nos dados
}

export interface BarcodeProductResult {
  found: boolean;
  product?: FoodItem;
  barcode?: string;
  errorMessage?: string;
  sourceData?: SavedProductSource;  // NOVO — dados expandidos para a biblioteca
  dataQualityWarning?: string;     // NOVO — aviso de inconsistência nutricional
}

/**
 * Checa a consistência interna da tabela nutricional usando os fatores Atwater (4-4-9).
 * Tolerância de 15% para variação aceitável de arredondamentos de rótulo.
 */
export function checkAtwaterConsistency(
  calories: number,
  carbs: number,
  protein: number,
  fat: number
): { consistent: boolean; expectedCalories: number; deviationPercent: number } {
  const expected = carbs * 4 + protein * 4 + fat * 9;
  const deviation = expected > 0 ? Math.abs(calories - expected) / expected : 0;
  return {
    consistent: deviation <= 0.15, // 15% de tolerância
    expectedCalories: Math.round(expected),
    deviationPercent: Math.round(deviation * 100),
  };
}

/**
 * Mapeia o grupo NOVA oficial da Open Food Facts para o enum canônico com espaço.
 */
export function mapNovaGroupToProcessingLevel(novaGroup?: number | string | null): FoodItem['processingLevel'] {
  const g = Number(novaGroup);
  switch (g) {
    case 1: return 'in natura';
    case 2: return 'minimamente processado';
    case 3: return 'processado';
    case 4: return 'ultraprocessado';
    default: return 'processado'; // Fallback conservador
  }
}

/**
 * Extrai o peso líquido da embalagem do campo quantity (texto) ou product_quantity (número).
 * Exemplos: "400 g", "200g", product_quantity=400
 */
export function parsePackageWeight(
  quantity?: string,
  productQuantity?: string | number
): number | undefined {
  if (productQuantity) {
    const n = Number(productQuantity);
    if (!isNaN(n) && n > 0) return n;
  }
  if (quantity) {
    const match = quantity.match(/(\d+[.,]?\d*)\s*g/i);
    if (match) return parseFloat(match[1].replace(',', '.'));
  }
  return undefined;
}

/**
 * Normaliza os allergens_tags do Open Food Facts removendo o prefixo "en:" e hifens.
 * Exemplo: ["en:gluten", "en:dairy"] -> ["gluten", "dairy"]
 */
export function parseAllergens(tags?: string[]): string[] {
  if (!tags) return [];
  return tags.map(t => t.replace(/^en:/, '').replace(/-/g, ' '));
}

/**
 * Consulta a API pública da Open Food Facts para recuperar informações nutricionais do EAN-13.
 */
export async function fetchProductByBarcode(barcode: string): Promise<BarcodeProductResult> {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode || !/^\d{8,14}$/.test(cleanBarcode)) {
    return {
      found: false,
      barcode: cleanBarcode,
      errorMessage: 'Código de barras inválido. Insira um número EAN válido.',
    };
  }

  const apiUrl = `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'FlavosHealthyApp/5.0 (contact@flavoscompany.xyz)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        found: false,
        barcode: cleanBarcode,
        errorMessage: `Erro HTTP ${response.status} ao consultar Open Food Facts.`,
      };
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return {
        found: false,
        barcode: cleanBarcode,
        errorMessage: 'Produto não encontrado na base Open Food Facts.',
      };
    }

    const p = data.product;
    const nutriments = p.nutriments || {};

    const name = p.product_name_pt || p.product_name || `Produto ${cleanBarcode}`;
    const servingGrams = Number(p.serving_quantity) || 100;
    const factor = servingGrams / 100;

    // Valores por porção (ou por 100g se a porção não for definida)
    const kcal100 = Number(nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? 0);
    const carbs100 = Number(nutriments.carbohydrates_100g ?? nutriments.carbohydrates ?? 0);
    const prot100 = Number(nutriments.proteins_100g ?? nutriments.proteins ?? 0);
    const fat100 = Number(nutriments.fat_100g ?? nutriments.fat ?? 0);
    const fiber100 = Number(nutriments.fiber_100g ?? nutriments.fiber ?? 0);
    const sugar100 = Number(nutriments.sugars_100g ?? nutriments.sugars ?? 0);
    const sodium100 = Number(nutriments.sodium_100g ?? (nutriments.salt_100g ? nutriments.salt_100g / 2.5 : 0)) * 1000; // mg

    const calories = Math.round(kcal100 * factor);
    const carbohydrates = Math.round(carbs100 * factor * 10) / 10;
    const protein = Math.round(prot100 * factor * 10) / 10;
    const fat = Math.round(fat100 * factor * 10) / 10;
    const fiber = Math.round(fiber100 * factor * 10) / 10;
    const sugar = Math.round(sugar100 * factor * 10) / 10;
    const sodium = Math.round(sodium100 * factor);

    const processingLevel = mapNovaGroupToProcessingLevel(p.nova_group ?? p.nova_groups);

    const foodItem: FoodItem = {
      id: `ean_${cleanBarcode}_${Date.now()}`,
      name,
      calories,
      estimatedAmount: servingGrams,
      unit: 'g',
      estimatedWeightGrams: servingGrams,
      portionDescription: `1 porção (${servingGrams}g)`,
      carbohydrates,
      protein,
      fat,
      fiber,
      sugar,
      addedSugar: 0,
      sodium,
      saturatedFat: Math.round((Number(nutriments['saturated-fat_100g'] ?? 0) * factor) * 10) / 10,
      source: 'visible',
      confidence: 'alta',
      preparationMethod: 'industrializado',
      consumedFraction: 1,
      healthHighlights: processingLevel === 'in natura' ? ['Alimento in natura'] : [],
      attentionHighlights: processingLevel === 'ultraprocessado' ? ['Produto ultraprocessado'] : [],
      processingLevel,
      possibleAddedSugars: sugar > 5,
      possibleAddedFats: fat > 10,
      possibleExcessSodium: sodium > 400,
      possibleIndustrializedSauces: false,
    };

    // Sanity check Atwater (Fase 1.1)
    const atwater = checkAtwaterConsistency(kcal100, carbs100, prot100, fat100);
    const dataQualityWarning = !atwater.consistent && (kcal100 > 0 || atwater.expectedCalories > 0)
      ? 'Os valores deste produto podem estar desatualizados na base Open Food Facts — confira o rótulo da embalagem antes de confirmar.'
      : undefined;

    // Dados expandidos para a biblioteca de produtos salvos
    const sourceData: SavedProductSource = {
      barcode: cleanBarcode,
      name,
      brand: p.brands || undefined,
      imageUrl: p.image_front_small_url || p.image_url || undefined,
      packageNetWeightGrams: parsePackageWeight(p.quantity, p.product_quantity),
      unitWeightGrams: Number(p.serving_quantity) || undefined,
      unitLabel: p.serving_size || undefined,
      ingredientsText: p.ingredients_text_pt || p.ingredients_text || undefined,
      allergens: parseAllergens(p.allergens_tags),
      nutriScoreGrade: p.nutriscore_grade || undefined,
      novaGroup: Number(p.nova_group ?? p.nova_groups) || undefined,
      dataQualityWarning,
    };

    return {
      found: true,
      product: foodItem,
      barcode: cleanBarcode,
      sourceData,
      dataQualityWarning,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro de rede';
    return {
      found: false,
      barcode: cleanBarcode,
      errorMessage: `Falha na conexão: ${msg}`,
    };
  }
}
