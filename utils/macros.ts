/**
 * macros.ts — Utilitários de macros (Fase 2)
 *
 * Extensões ao sistema de macros e plano de refeições:
 *   1. PROTEIN_GKG_GOAL_BONUS — bônus de proteína por objetivo
 *   2. volumeStrategy          — estratégia de volume para déficit calórico
 *   3. redistributeAroundFixedMeals — redistribuição com refeições travadas
 *
 * Fontes científicas:
 *   - ISSN Position Stand (Stokes et al., 2018): proteína em déficit 1.8–2.7 g/kg
 *   - Hall & Guo (2017): déficit > 15% do TDEE → estratégias de volume
 */

import type { AnalysisResult, FoodItem } from '../types';
import type {
  Goal,
  ActivityLevel,
  NutritionalTargets,
  MealConfig,
  MealMacroPlan,
  MealRole,
} from '../hooks/useUserProfile';
import { distributeMeals } from '../hooks/useUserProfile';

// ──────────────────────────────────────────────────────────────
// 1. Bônus de proteína por objetivo (g/kg)
// ──────────────────────────────────────────────────────────────

/**
 * Bônus de proteína (g/kg de peso corporal) aplicado por objetivo.
 *
 * Referência ISSN: em déficit calórico, aumentar proteína para ~2.0–2.7 g/kg
 * ajuda a preservar massa magra. O bônus de +0.2 g/kg é conservador e seguro
 * para a maioria dos perfis, sem ultrapassar o limite máximo da tabela PROTEIN_GKG.
 */
export const PROTEIN_GKG_GOAL_BONUS: Record<Goal, number> = {
  perder_peso:  0.2,   // Déficit → preservar massa magra (ISSN)
  manter:       0.0,
  ganhar_massa: 0.0,   // Já coberto pelo ideal do nível de atividade
};

// ──────────────────────────────────────────────────────────────
// 2. volumeStrategy — estratégia de saciedade para déficit
// ──────────────────────────────────────────────────────────────

export interface VolumeStrategyResult {
  /** Dica empática de volume. null quando não há necessidade de estratégia especial. */
  tip: string | null;
  /**
   * Número recomendado de refeições por dia.
   * - 4 para perder_peso / manter (mais volume por refeição = mais saciedade)
   * - 5+ para ganhar_massa (já coberto por carbLoadStrategy)
   */
  recommendedMealCount: number;
}

/**
 * Retorna estratégia de volume para déficits calóricos moderados/agressivos.
 *
 * @param targetKcal - Meta calórica diária do usuário
 * @param tdee       - TDEE calculado
 * @param goal       - Objetivo do usuário
 */
export function volumeStrategy(
  targetKcal: number,
  tdee: number,
  goal: Goal,
): VolumeStrategyResult {
  const ratio = tdee > 0 ? targetKcal / tdee : 1;

  // ganhar_massa: deixar carbLoadStrategy gerir contagem de refeições
  if (goal === 'ganhar_massa') {
    return { tip: null, recommendedMealCount: 5 };
  }

  const recommendedMealCount = 4; // perder_peso e manter: 4 refeições

  // Déficit moderado/agressivo (> 15% abaixo do TDEE)
  if (ratio <= 0.85) {
    return {
      recommendedMealCount,
      tip:
        'Com esse nível de déficit calórico, priorizar alimentos de baixa ' +
        'densidade calórica e alto volume — como saladas verdes, legumes ' +
        'no vapor, sopas e frutas ricas em água (melão, morango, pepino) — ' +
        'em pelo menos 2 refeições do dia pode aumentar bastante a saciedade ' +
        'sem elevar muito as calorias. Cada refeição fica mais completa visualmente ' +
        'e no paladar. 🥗',
    };
  }

  // Déficit leve ou manutenção: sem estratégia especial
  return { tip: null, recommendedMealCount };
}

// ──────────────────────────────────────────────────────────────
// 3. Tipos para refeições fixas
// ──────────────────────────────────────────────────────────────

/** Macros somados de uma refeição fixa (sempre calculado de foods[], nunca do resumo) */
export interface FixedMealMacros {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  kcal: number;
}

/** Refeição fixa (travada) — analysis vem do meal_template ou de uma análise nova */
export interface FixedMeal {
  role: MealRole;
  type: string;
  /** Análise validada pelo pipeline da Fase 0 */
  analysis: AnalysisResult;
}

/** Resultado de uma refeição no plano com metadados de redistribuição */
export interface MealPlanEntry extends MealMacroPlan {
  isFixed: boolean;
  /** Macros que mudaram em relação ao plano-base (usado para highlight na UI) */
  changedMacros?: {
    protein?: boolean;
    carbs?: boolean;
    fat?: boolean;
  };
  /** Aviso empático associado a esta refeição, se houver */
  warning?: string | null;
}

/** Resultado completo de redistributeAroundFixedMeals */
export interface RedistributionResult {
  meals: MealPlanEntry[];
  /** Quantas refeições foram recalculadas */
  recalculatedCount: number;
  /** Macros restantes após deduzir fixedMeals (pode ser zero por macro se fixedMeals consumirem tudo) */
  remainingTargets: NutritionalTargets;
  /** Aviso global, se houver */
  globalWarning?: string | null;
}

// ──────────────────────────────────────────────────────────────
// Helpers internos
// ──────────────────────────────────────────────────────────────

/**
 * Soma macros de um AnalysisResult somando foods[].
 * NUNCA usa o valor de nutritionalSummary.baseCalories diretamente
 * (pode estar desatualizado em snapshots antigos).
 */
export function sumFoodsMacros(analysis: AnalysisResult): FixedMealMacros {
  const foods: FoodItem[] = analysis.foods ?? [];
  const protein_g = round1(foods.reduce((s, f) => s + (f.protein || 0), 0));
  const carbs_g   = round1(foods.reduce((s, f) => s + (f.carbohydrates || 0), 0));
  const fat_g     = round1(foods.reduce((s, f) => s + (f.fat || 0), 0));
  const kcal      = Math.round(protein_g * 4 + carbs_g * 4 + fat_g * 9);
  return { protein_g, carbs_g, fat_g, kcal };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Gera aviso de alta concentração de macro em uma refeição fixa */
function checkMacroConcentration(
  macros: FixedMealMacros,
  targets: NutritionalTargets,
  mealType: string,
): string | null {
  const warnings: string[] = [];

  if (targets.targetProtein_g > 0 && macros.protein_g / targets.targetProtein_g > 0.6) {
    warnings.push(`proteína (${macros.protein_g}g = ${Math.round((macros.protein_g / targets.targetProtein_g) * 100)}% da meta)`);
  }
  if (targets.targetCarbs_g > 0 && macros.carbs_g / targets.targetCarbs_g > 0.6) {
    warnings.push(`carboidrato (${macros.carbs_g}g = ${Math.round((macros.carbs_g / targets.targetCarbs_g) * 100)}% da meta)`);
  }
  if (targets.targetFat_g > 0 && macros.fat_g / targets.targetFat_g > 0.6) {
    warnings.push(`gordura (${macros.fat_g}g = ${Math.round((macros.fat_g / targets.targetFat_g) * 100)}% da meta)`);
  }

  if (warnings.length === 0) return null;

  return (
    `"${mealType}" concentra mais de 60% da sua meta diária de ` +
    `${warnings.join(' e ')}. As outras refeições ficarão mais leves nesses macros — ` +
    `nada de errado com isso, só é bom estar ciente. 💡`
  );
}

/** Aviso empático para refeições pré/pós-treino com gordura ou sódio elevado */
function checkTrainingMealFlags(analysis: AnalysisResult, role: MealRole): string | null {
  if (role !== 'pre_treino' && role !== 'pos_treino') return null;

  const foods: FoodItem[] = analysis.foods ?? [];
  const hasFat  = foods.some(f => f.possibleAddedFats);
  const hasSodium = foods.some(f => f.possibleExcessSodium);

  if (!hasFat && !hasSodium) return null;

  const concerns: string[] = [];
  if (hasFat)    concerns.push('gordura adicionada');
  if (hasSodium) concerns.push('sódio elevado');

  const timing = role === 'pre_treino' ? 'antes do treino' : 'logo após o treino';

  return (
    `Esta refeição (${timing}) pode ter ${concerns.join(' e ')}, ` +
    `o que tende a deixar a digestão um pouco mais lenta. ` +
    `Caso sinta desconforto, vale explorar alternativas mais leves para esse momento. 🏃`
  );
}

// ──────────────────────────────────────────────────────────────
// 4. redistributeAroundFixedMeals — função principal
// ──────────────────────────────────────────────────────────────

/**
 * Redistribui os macros do dia respeitando as refeições travadas.
 *
 * @param dailyTargets   - Metas diárias totais (saída de calcTargets)
 * @param fixedMeals     - Refeições travadas pelo usuário
 * @param remainingMeals - Refeições NÃO travadas que receberão a redistribuição
 *
 * @throws Error se nenhuma refeição livre sobrar para redistribuir
 */
export function redistributeAroundFixedMeals(
  dailyTargets: NutritionalTargets,
  fixedMeals: FixedMeal[],
  remainingMeals: MealConfig[],
): RedistributionResult {
  // ── Validação: ao menos 1 refeição livre ──────────────────
  if (remainingMeals.length === 0) {
    throw new Error(
      'É necessário manter pelo menos uma refeição não travada para redistribuir ' +
      'os macros restantes do dia. Destrave ao menos uma refeição para continuar. 🔓',
    );
  }

  // ── 1. Somar macros das refeições travadas ────────────────
  const fixedSums = fixedMeals.map(fm => ({
    meal: fm,
    macros: sumFoodsMacros(fm.analysis),
  }));

  const totalFixed = fixedSums.reduce(
    (acc, { macros }) => ({
      protein_g: acc.protein_g + macros.protein_g,
      carbs_g:   acc.carbs_g   + macros.carbs_g,
      fat_g:     acc.fat_g     + macros.fat_g,
      kcal:      acc.kcal      + macros.kcal,
    }),
    { protein_g: 0, carbs_g: 0, fat_g: 0, kcal: 0 },
  );

  // ── 2. Calcular metas restantes (sem negativos) ───────────
  const remainingProtein = Math.max(0, dailyTargets.targetProtein_g - totalFixed.protein_g);
  const remainingCarbs   = Math.max(0, dailyTargets.targetCarbs_g   - totalFixed.carbs_g);
  const remainingFat     = Math.max(0, dailyTargets.targetFat_g     - totalFixed.fat_g);

  const remainingKcal = Math.round(
    remainingProtein * 4 + remainingCarbs * 4 + remainingFat * 9,
  );

  const remainingTargets: NutritionalTargets = {
    ...dailyTargets,
    targetKcal:     remainingKcal,
    targetProtein_g: remainingProtein,
    targetCarbs_g:   remainingCarbs,
    targetFat_g:     remainingFat,
  };

  // ── 3. Redistribuir nas refeições livres ──────────────────
  const redistributed = distributeMeals(remainingTargets, remainingMeals);

  // ── 4. Montar entradas das refeições travadas ─────────────
  const fixedEntries: MealPlanEntry[] = fixedSums.map(({ meal, macros }) => {
    const concentrationWarning = checkMacroConcentration(macros, dailyTargets, meal.type);
    const trainingWarning      = checkTrainingMealFlags(meal.analysis, meal.role);

    const warnings = [concentrationWarning, trainingWarning].filter(Boolean);

    return {
      type:      meal.type,
      role:      meal.role,
      protein_g: Math.round(macros.protein_g),
      carbs_g:   Math.round(macros.carbs_g),
      fat_g:     Math.round(macros.fat_g),
      isFixed:   true,
      warning:   warnings.length > 0 ? warnings.join(' ') : null,
    };
  });

  // ── 5. Montar entradas das refeições recalculadas ─────────
  const freeEntries: MealPlanEntry[] = redistributed.map(plan => ({
    ...plan,
    isFixed: false,
    // Identificar macros que mudaram em relação ao plano-base sem travamento
    // (simplificado: qualquer refeição recalculada tem changedMacros marcado)
    changedMacros: {
      protein: remainingProtein < dailyTargets.targetProtein_g,
      carbs:   remainingCarbs   < dailyTargets.targetCarbs_g,
      fat:     remainingFat     < dailyTargets.targetFat_g,
    },
  }));

  // ── 6. Retornar resultado ─────────────────────────────────
  return {
    meals: [...fixedEntries, ...freeEntries],
    recalculatedCount: freeEntries.length,
    remainingTargets,
    globalWarning: null,
  };
}
