/**
 * Flavos Nutrition Score — Algoritmo de pontuação de qualidade da refeição.
 *
 * Avalia cada refeição de 0 a 100, com base em:
 * - Proteína (0–20 pts)
 * - Fibra (0–20 pts)
 * - Penalidade de açúcar adicionado (0–20 pts)
 * - Penalidade de sódio (0–15 pts)
 * - Equilíbrio dos macros (0–15 pts)
 * - Nível de processamento (0–15 pts)
 * - Bônus de variedade (0–15 pts) — se >1 grupo alimentar presente
 *
 * Total máximo possível: 100 (capped)
 */

import type {
  FoodItem,
  AnalysisResult,
  NutritionScore,
  NutritionGrade,
  NutritionScoreBreakdown,
  ProcessingBreakdown,
  MicronutrientEstimate,
} from '../types';

// ────────────────────────────────────────────────────────
// Nutrition Score Calculator
// ────────────────────────────────────────────────────────

export function calculateNutritionScore(result: AnalysisResult): NutritionScore {
  const foods = result.foods || [];
  if (foods.length === 0) {
    return {
      total: 0,
      grade: 'precisa_melhorar',
      breakdown: {
        proteinScore: 0,
        fiberScore: 0,
        sugarPenalty: 0,
        sodiumPenalty: 0,
        macroBalance: 0,
        processingScore: 0,
        varietyBonus: 0,
      },
      explanation: 'Nenhum alimento identificado na refeição.',
    };
  }

  const totalCalories = result.nutritionalSummary.baseCalories || 0;
  const totalProtein = foods.reduce((s, f) => s + (f.protein || 0), 0);
  const totalCarbs = foods.reduce((s, f) => s + (f.carbohydrates || 0), 0);
  const totalFat = foods.reduce((s, f) => s + (f.fat || 0), 0);
  const totalFiber = foods.reduce((s, f) => s + (f.fiber || 0), 0);
  const totalAddedSugar = foods.reduce((s, f) => s + (f.addedSugar || 0), 0);
  const totalSodium = foods.reduce((s, f) => s + (f.sodium || 0), 0);

  // 1. Proteína (0-20): >=25g = 20pts, >=15g = 14pts, >=8g = 8pts
  const proteinScore = totalProtein >= 25 ? 20 : totalProtein >= 15 ? 14 : totalProtein >= 8 ? 8 : Math.round((totalProtein / 8) * 8);

  // 2. Fibra (0-20): >=8g = 20pts, >=5g = 14pts, >=2g = 8pts
  const fiberScore = totalFiber >= 8 ? 20 : totalFiber >= 5 ? 14 : totalFiber >= 2 ? 8 : Math.round((totalFiber / 2) * 8);

  // 3. Açúcar adicionado (0-20 penalty): >25g = -20, >15g = -14, >8g = -8
  const sugarPenalty = totalAddedSugar > 25 ? 20 : totalAddedSugar > 15 ? 14 : totalAddedSugar > 8 ? 8 : totalAddedSugar > 3 ? 4 : 0;

  // 4. Sódio (0-15 penalty): >1000mg = -15, >600mg = -10, >400mg = -5
  const sodiumPenalty = totalSodium > 1000 ? 15 : totalSodium > 600 ? 10 : totalSodium > 400 ? 5 : 0;

  // 5. Equilíbrio dos macros (0-15): ideal 40-55% carb, 20-35% prot, 20-35% fat
  const totalMacroGrams = totalProtein + totalCarbs + totalFat;
  let macroBalance = 0;
  if (totalMacroGrams > 0) {
    const carbPct = (totalCarbs / totalMacroGrams) * 100;
    const protPct = (totalProtein / totalMacroGrams) * 100;
    const fatPct = (totalFat / totalMacroGrams) * 100;

    // Quanto mais próximo do ideal, mais pontos
    const carbDev = Math.abs(carbPct - 47.5);  // ideal center: 47.5%
    const protDev = Math.abs(protPct - 27.5);  // ideal center: 27.5%
    const fatDev = Math.abs(fatPct - 27.5);    // ideal center: 27.5%
    const avgDev = (carbDev + protDev + fatDev) / 3;

    // avgDev = 0 → 15pts, avgDev >= 25 → 0pts
    macroBalance = Math.max(0, Math.round(15 - (avgDev / 25) * 15));
  }

  // 6. Processamento (0-15): baseado na proporção calórica de in_natura/minimamente processado
  const processingMap: Record<string, number> = {
    in_natura: 15,
    minimamente_processado: 12,
    processado: 5,
    ultraprocessado: 0,
    indeterminado: 7,
  };
  const weightedProcessing = foods.reduce((sum, f) => {
    const weight = (f.calories || 0) / Math.max(totalCalories, 1);
    return sum + (processingMap[f.processingLevel] || 7) * weight;
  }, 0);
  const processingScore = Math.round(Math.min(15, weightedProcessing));

  // 7. Variedade (0-15): bônus por diversidade de processamento e tipos
  const uniqueProcessingLevels = new Set(foods.map(f => f.processingLevel)).size;
  const varietyBonus = Math.min(15, foods.length >= 4 ? 15 : foods.length >= 3 ? 12 : foods.length >= 2 ? 8 : 3)
    + (uniqueProcessingLevels >= 2 ? 0 : -3);
  const clampedVariety = Math.max(0, Math.min(15, varietyBonus));

  const breakdown: NutritionScoreBreakdown = {
    proteinScore,
    fiberScore,
    sugarPenalty,
    sodiumPenalty,
    macroBalance,
    processingScore,
    varietyBonus: clampedVariety,
  };

  const rawTotal = proteinScore + fiberScore - sugarPenalty - sodiumPenalty + macroBalance + processingScore + clampedVariety;
  const total = Math.max(0, Math.min(100, rawTotal));

  const grade: NutritionGrade =
    total >= 80 ? 'excelente' :
    total >= 60 ? 'boa' :
    total >= 40 ? 'moderada' : 'precisa_melhorar';

  const explanation = buildExplanation(breakdown, total, grade, totalProtein, totalFiber, totalAddedSugar, totalSodium);

  return { total, grade, breakdown, explanation };
}

function buildExplanation(
  b: NutritionScoreBreakdown,
  total: number,
  grade: NutritionGrade,
  protein: number,
  fiber: number,
  addedSugar: number,
  sodium: number,
): string {
  const parts: string[] = [];

  // Positivos primeiro
  if (b.proteinScore >= 14) parts.push(`Boa quantidade de proteína (${Math.round(protein)}g)`);
  if (b.fiberScore >= 14) parts.push(`Rico em fibras (${Math.round(fiber)}g)`);
  if (b.processingScore >= 12) parts.push('Predomínio de alimentos naturais ou minimamente processados');
  if (b.macroBalance >= 12) parts.push('Bom equilíbrio entre os macronutrientes');
  if (b.varietyBonus >= 12) parts.push('Boa variedade de alimentos');

  // Atenção
  if (b.sugarPenalty >= 8) parts.push(`Açúcar adicionado elevado (${Math.round(addedSugar)}g)`);
  if (b.sodiumPenalty >= 5) parts.push(`Sódio acima do ideal (${Math.round(sodium)}mg)`);
  if (b.proteinScore < 8) parts.push(`Proteína baixa (${Math.round(protein)}g) — considere adicionar ovo, frango ou leguminosa`);
  if (b.fiberScore < 8) parts.push(`Poucas fibras (${Math.round(fiber)}g) — adicione vegetais, folhas ou grãos integrais`);
  if (b.processingScore < 5) parts.push('Predominância de ultraprocessados — prefira alimentos mais naturais');

  return parts.join('. ') + '.';
}

// ────────────────────────────────────────────────────────
// Processing Breakdown Calculator
// ────────────────────────────────────────────────────────

export function calculateProcessingBreakdown(foods: FoodItem[]): ProcessingBreakdown {
  const totalCal = foods.reduce((s, f) => s + (f.calories || 0), 0) || 1;

  const levels = {
    inNatura: 0,
    minimamenteProcessado: 0,
    processado: 0,
    ultraprocessado: 0,
    indeterminado: 0,
  };

  for (const food of foods) {
    const pct = ((food.calories || 0) / totalCal) * 100;
    switch (food.processingLevel) {
      case 'in_natura': levels.inNatura += pct; break;
      case 'minimamente_processado': levels.minimamenteProcessado += pct; break;
      case 'processado': levels.processado += pct; break;
      case 'ultraprocessado': levels.ultraprocessado += pct; break;
      default: levels.indeterminado += pct;
    }
  }

  return {
    inNatura: Math.round(levels.inNatura),
    minimamenteProcessado: Math.round(levels.minimamenteProcessado),
    processado: Math.round(levels.processado),
    ultraprocessado: Math.round(levels.ultraprocessado),
    indeterminado: Math.round(levels.indeterminado),
  };
}

// ────────────────────────────────────────────────────────
// Micronutrient Aggregator
// ────────────────────────────────────────────────────────

export function aggregateMicronutrients(foods: FoodItem[]): MicronutrientEstimate[] {
  // Coleta todos os micronutrientEstimates dos foods e combina
  const microMap = new Map<string, { totalPct: number; count: number }>();

  for (const food of foods) {
    if (food.micronutrientEstimates) {
      for (const m of food.micronutrientEstimates) {
        const existing = microMap.get(m.name) || { totalPct: 0, count: 0 };
        existing.totalPct += m.percentage;
        existing.count += 1;
        microMap.set(m.name, existing);
      }
    }
  }

  const result: MicronutrientEstimate[] = [];
  for (const [name, data] of microMap) {
    const pct = Math.min(150, Math.round(data.totalPct)); // Cap em 150%
    const level: MicronutrientEstimate['level'] =
      pct >= 50 ? 'alto' :
      pct >= 30 ? 'bom' :
      pct >= 15 ? 'moderado' : 'baixo';
    result.push({ name, level, percentage: pct });
  }

  return result.sort((a, b) => b.percentage - a.percentage);
}

// ────────────────────────────────────────────────────────
// Nutritional Alerts Generator
// ────────────────────────────────────────────────────────

export interface NutritionalAlert {
  type: 'positive' | 'warning';
  icon: string;
  message: string;
}

export function generateAlerts(result: AnalysisResult): NutritionalAlert[] {
  const alerts: NutritionalAlert[] = [];
  const foods = result.foods || [];
  const totalProtein = foods.reduce((s, f) => s + (f.protein || 0), 0);
  const totalFiber = foods.reduce((s, f) => s + (f.fiber || 0), 0);
  const totalAddedSugar = foods.reduce((s, f) => s + (f.addedSugar || 0), 0);
  const totalSodium = foods.reduce((s, f) => s + (f.sodium || 0), 0);
  const totalCal = result.nutritionalSummary.baseCalories || 0;
  const ultraCount = foods.filter(f => f.processingLevel === 'ultraprocessado').length;

  // Positivos
  if (totalProtein >= 20) alerts.push({ type: 'positive', icon: '💪', message: `Boa proteína: ${Math.round(totalProtein)}g` });
  if (totalFiber >= 5) alerts.push({ type: 'positive', icon: '🥬', message: `Boa quantidade de fibras: ${Math.round(totalFiber)}g` });
  if (ultraCount === 0 && foods.length > 0) alerts.push({ type: 'positive', icon: '🌿', message: 'Nenhum ultraprocessado detectado' });

  // Warnings
  if (totalSodium > 600) alerts.push({ type: 'warning', icon: '🧂', message: `Sódio elevado: ${Math.round(totalSodium)}mg (>600mg)` });
  if (totalFiber < 2 && foods.length > 0) alerts.push({ type: 'warning', icon: '🥗', message: `Fibras muito baixas: ${Math.round(totalFiber)}g — adicione vegetais ou grãos` });
  if (totalProtein < 8 && foods.length > 0) alerts.push({ type: 'warning', icon: '🍗', message: `Proteína insuficiente: ${Math.round(totalProtein)}g — considere ovo, frango ou leguminosa` });
  if (totalAddedSugar > 10) alerts.push({ type: 'warning', icon: '🍬', message: `Açúcar adicionado elevado: ${Math.round(totalAddedSugar)}g` });
  if (totalCal > 900) alerts.push({ type: 'warning', icon: '🔥', message: `Refeição muito calórica: ${totalCal} kcal` });
  if (ultraCount >= 2) alerts.push({ type: 'warning', icon: '🏭', message: `${ultraCount} ultraprocessados detectados — prefira opções mais naturais` });

  // Equilibrada
  if (alerts.filter(a => a.type === 'warning').length === 0 && alerts.filter(a => a.type === 'positive').length >= 2) {
    alerts.unshift({ type: 'positive', icon: '⭐', message: 'Refeição equilibrada! Parabéns!' });
  }

  return alerts;
}

// ────────────────────────────────────────────────────────
// Portion Adjustment Helper
// ────────────────────────────────────────────────────────

export function adjustFoodPortion(food: FoodItem, multiplier: number): FoodItem {
  // Limitação: o valor não pode exceder o limite razoável do que um ser humano consumiria em um dia (~20.000 kcal)
  const MAX_KCAL_PER_DAY = 20000;
  
  let finalMultiplier = multiplier;
  if (food.calories > 0 && food.calories * multiplier > MAX_KCAL_PER_DAY) {
    finalMultiplier = MAX_KCAL_PER_DAY / food.calories;
  }

  return {
    ...food,
    calories: Math.round(food.calories * finalMultiplier),
    estimatedWeightGrams: Math.round(food.estimatedWeightGrams * finalMultiplier),
    carbohydrates: Math.round(food.carbohydrates * finalMultiplier * 10) / 10,
    protein: Math.round(food.protein * finalMultiplier * 10) / 10,
    fat: Math.round(food.fat * finalMultiplier * 10) / 10,
    fiber: Math.round((food.fiber || 0) * finalMultiplier * 10) / 10,
    sugar: Math.round((food.sugar || 0) * finalMultiplier * 10) / 10,
    addedSugar: Math.round((food.addedSugar || 0) * finalMultiplier * 10) / 10,
    sodium: Math.round((food.sodium || 0) * finalMultiplier),
    saturatedFat: Math.round((food.saturatedFat || 0) * finalMultiplier * 10) / 10,
    consumedFraction: (food.consumedFraction || 1) * finalMultiplier,
  };
}
