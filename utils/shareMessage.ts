import type { NutritionScore, ProcessingBreakdown, FoodItem } from '../types';

export type ShareMessageVariant = 'default' | 'compact' | 'social' | 'professional';

export interface BuildMealShareMessageParams {
  nutritionScore: NutritionScore;
  processingBreakdown: ProcessingBreakdown;
  adjustedFoods: FoodItem[];
  finalCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  variant?: ShareMessageVariant;
}

export function getProcessingLabel(ultraProcessedPct: number): string {
  if (ultraProcessedPct <= 10) return 'Baixo ultraprocessamento';
  if (ultraProcessedPct <= 30) return 'Ultraprocessamento moderado';
  return 'Alto nível de ultraprocessamento — ponto de atenção';
}

export function buildMealShareMessage(params: BuildMealShareMessageParams): string {
  const {
    nutritionScore,
    processingBreakdown,
    adjustedFoods,
    finalCalories,
    macros,
    variant = 'default',
  } = params;

  const { total: score, grade: label } = nutritionScore;
  const realFoodPercentage = processingBreakdown.inNatura + processingBreakdown.minimamenteProcessado;
  const ultraProcessedPercentage = processingBreakdown.ultraprocessado;
  const { protein, carbs, fat, fiber } = macros;

  const foodsList = adjustedFoods
    .map((f) => f.name)
    .filter(Boolean)
    .join(', ');

  const insights: string[] = [];
  if (protein >= 30) insights.push('Boa presença de proteína nessa refeição.');
  if (fiber >= 7) insights.push('Bom aporte de fibras.');
  else if (fiber < 3) insights.push('Ponto de atenção: fibras abaixo do ideal. Vegetais ou leguminosas fariam bem.');
  if (realFoodPercentage >= 75) insights.push('Predominância de comida de verdade — boa escolha.');
  if (ultraProcessedPercentage >= 40) insights.push('Atenção ao nível de ultraprocessamento.');
  if (score >= 80 && insights.length === 0) insights.push('Refeição com boa qualidade nutricional geral.');
  if (score < 50 && insights.length === 0) insights.push('Há espaço para melhorar o equilíbrio nutricional.');

  const insightText = insights.slice(0, 2).join(' ');
  const processingLabel = getProcessingLabel(ultraProcessedPercentage);

  const gradeText = 
    label === 'excelente' ? 'Excelente' :
    label === 'boa' ? 'Boa' :
    label === 'moderada' ? 'Moderada' : 'Em Evolução';

  switch (variant) {
    case 'compact':
      return [
        `Flavos Nutrition Score: ${score}/100 — ${gradeText}`,
        `${Math.round(finalCalories)} kcal · ${Math.round(protein)}g prot · ${Math.round(carbs)}g carb · ${Math.round(fat)}g gord · ${Math.round(fiber)}g fibras`,
        `${Math.round(realFoodPercentage)}% comida de verdade`,
        insightText,
        '— Flavos Healthy',
      ].filter(Boolean).join('\n');

    case 'social':
      return [
        'Minha refeição analisada pelo Flavos Healthy ✨',
        `Score: ${score}/100 — ${gradeText}`,
        `${Math.round(finalCalories)} kcal | ${Math.round(protein)}g proteína | ${Math.round(carbs)}g carbs`,
        insightText,
        '#FlavosHealthy #NutriçãoInteligente',
      ].filter(Boolean).join('\n');

    case 'professional':
      return [
        'Análise nutricional — Flavos Healthy',
        `Score: ${score}/100 (${gradeText})`,
        `${Math.round(finalCalories)} kcal | ${Math.round(protein)}g proteína | ${Math.round(carbs)}g carboidratos | ${Math.round(fat)}g gorduras | ${Math.round(fiber)}g fibras`,
        `${Math.round(realFoodPercentage)}% comida de verdade`,
        insightText,
        'Estimativa gerada por IA. Flavos Healthy.',
      ].filter(Boolean).join('\n');

    default:
      const gradeEmoji = 
        label === 'excelente' ? '🏆' :
        label === 'boa' ? '🌟' :
        label === 'moderada' ? '⚖️' : '🌱';

      return [
        'Análise nutricional feita no Flavos Healthy 🥗',
        '',
        `${gradeEmoji} Flavos Nutrition Score: ${score}/100 — ${gradeText}`,
        '',
        '📊 Estimativa da refeição:',
        `🔥 ${Math.round(finalCalories)} kcal`,
        `💪 ${Math.round(protein)}g proteína`,
        `🍞 ${Math.round(carbs)}g carboidratos`,
        `🥑 ${Math.round(fat)}g gorduras`,
        `🥬 ${Math.round(fiber)}g fibras`,
        '',
        '🧬 Qualidade alimentar:',
        `🌿 ${Math.round(realFoodPercentage)}% comida de verdade`,
        `🏷️ ${processingLabel}`,
        '',
        '🔍 Alimentos identificados:',
        foodsList,
        '',
        '💡 Insight:',
        insightText,
        '',
        '✨ Analisado com IA pelo Flavos Healthy.',
      ].join('\n');
  }
}
