/**
 * useFoodDiversity — Score de diversidade alimentar semanal + análise de janela alimentar.
 *
 * Baseado na Documentacao_Tecnica.md (Fase 3):
 * - Classifica alimentos em 8 grupos
 * - Score = grupos únicos × qualidade dos alimentos (penaliza ultraprocessados)
 * - Analisa janela alimentar: primeira/última refeição, gap médio, comer tardio
 */
import { useMemo } from 'react';
import type { HistoryEntry, FoodItem } from '../types';

// ── Grupos alimentares ────────────────────────────────────────────────────────

export type FoodGroup =
  | 'cereais'
  | 'proteinas'
  | 'leguminosas'
  | 'vegetais'
  | 'frutas'
  | 'laticinios'
  | 'gorduras'
  | 'ultraprocessados';

export const FOOD_GROUP_META: Record<FoodGroup, { label: string; color: string; emoji: string }> = {
  cereais:           { label: 'Cereais',           color: '#f59e0b', emoji: '🌾' },
  proteinas:         { label: 'Proteínas',          color: '#ef4444', emoji: '🥩' },
  leguminosas:       { label: 'Leguminosas',         color: '#8b5cf6', emoji: '🫘' },
  vegetais:          { label: 'Vegetais',            color: '#22c55e', emoji: '🥦' },
  frutas:            { label: 'Frutas',              color: '#f97316', emoji: '🍎' },
  laticinios:        { label: 'Laticínios',          color: '#3b82f6', emoji: '🧀' },
  gorduras:          { label: 'Gorduras boas',       color: '#a3e635', emoji: '🥑' },
  ultraprocessados:  { label: 'Ultraprocessados',    color: '#6b7280', emoji: '🍟' },
};

const FOOD_GROUPS: Record<FoodGroup, string[]> = {
  cereais:          ['arroz','macarrão','massa','pão','aveia','tapioca','cuscuz','batata','mandioca','polenta','milho','trigo','farinha','canjica'],
  proteinas:        ['frango','carne','peixe','ovo','atum','salmão','sardinha','camarão','tilápia','cação','bife','alcatra','picanha','peito','coxa'],
  leguminosas:      ['feijão','lentilha','grão-de-bico','soja','ervilha','fradinho','carioca'],
  vegetais:         ['alface','tomate','brócolis','cenoura','couve','espinafre','chuchu','abobrinha','pepino','rúcula','beterraba','quiabo','jiló'],
  frutas:           ['banana','maçã','laranja','manga','morango','melancia','mamão','uva','limão','caju','goiaba','abacaxi','melão','kiwi'],
  laticinios:       ['queijo','iogurte','leite','requeijão','whey','creme de leite','manteiga','muçarela','parmesão'],
  gorduras:         ['azeite','abacate','castanha','amendoim','semente','nozes','chia','linhaça','gergelim','coco'],
  ultraprocessados: ['refrigerante','salgadinho','biscoito recheado','nugget','macarrão instantâneo','empanado','presunto','salsicha','mortadela','copa','bacon','hambúrguer'],
};

const QUALITY_WEIGHT: Record<string, number> = {
  'in natura':              1.0,
  'minimamente processado': 0.85,
  'processado':             0.5,
  'ultraprocessado':        0.15,
};

export function classifyFoodGroup(name: string): FoodGroup | null {
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [group, keywords] of Object.entries(FOOD_GROUPS) as [FoodGroup, string[]][]) {
    if (keywords.some(kw => n.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))) {
      return group;
    }
  }
  return null;
}

export interface WeeklyDiversityResult {
  score: number; // 0-100
  groupsSeen: FoodGroup[];
  groupsCount: Record<FoodGroup, number>;
  ultraPercent: number;
  qualityAvg: number;
}

function calcWeeklyDiversity(weekMeals: HistoryEntry[]): WeeklyDiversityResult {
  const allFoods = weekMeals.flatMap(m => m.foods);
  const groupsSeen = new Set<FoodGroup>();
  const groupsCount: Record<FoodGroup, number> = {
    cereais: 0, proteinas: 0, leguminosas: 0, vegetais: 0,
    frutas: 0, laticinios: 0, gorduras: 0, ultraprocessados: 0,
  };
  let totalQuality = 0;
  let count = 0;
  let ultraCount = 0;

  allFoods.forEach(food => {
    const group = classifyFoodGroup(food.name);
    if (group) {
      groupsSeen.add(group);
      groupsCount[group] = (groupsCount[group] || 0) + 1;
    }
    const raw = food.processingLevel as string;
    const level = (raw === 'in_natura') ? 'in natura' :
                  (raw === 'minimamente_processado') ? 'minimamente processado' :
                  (raw === 'indeterminado' || !raw) ? 'processado' : raw;

    const weight = QUALITY_WEIGHT[level] ?? 0.5;
    totalQuality += weight;
    count++;
    if (level === 'ultraprocessado') ultraCount++;
  });

  const groupScore = groupsSeen.size / Object.keys(FOOD_GROUPS).length;
  const qualityScore = count > 0 ? totalQuality / count : 0.5;
  const ultraPct = count > 0 ? ultraCount / count : 0;
  const ultraPenalty = Math.max(0, ultraPct - 0.3) * 0.5;

  const score = Math.round(Math.min(100, (groupScore * 0.6 + qualityScore * 0.4 - ultraPenalty) * 100));

  return {
    score,
    groupsSeen: [...groupsSeen],
    groupsCount,
    ultraPercent: Math.round(ultraPct * 100),
    qualityAvg: Math.round(qualityScore * 100),
  };
}

// ── Janela alimentar ──────────────────────────────────────────────────────────

export interface EatingWindowResult {
  firstMealAt: Date | null;
  lastMealAt: Date | null;
  windowHours: number;
  lateNightEating: boolean; // última refeição após 21h
  mealCount: number;
  avgGapHours: number;
}

function calcEatingWindow(todayMeals: HistoryEntry[]): EatingWindowResult {
  if (todayMeals.length === 0) {
    return { firstMealAt: null, lastMealAt: null, windowHours: 0, lateNightEating: false, mealCount: 0, avgGapHours: 0 };
  }
  const sorted = [...todayMeals].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const first = new Date(sorted[0].date);
  const last = new Date(sorted[sorted.length - 1].date);
  const windowHours = (last.getTime() - first.getTime()) / 3_600_000;

  return {
    firstMealAt: first,
    lastMealAt: last,
    windowHours: +windowHours.toFixed(1),
    lateNightEating: last.getHours() >= 21,
    mealCount: sorted.length,
    avgGapHours: +(windowHours / Math.max(sorted.length - 1, 1)).toFixed(1),
  };
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useFoodDiversity(history: HistoryEntry[]) {
  const weeklyDiversity = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekMeals = history.filter(e => new Date(e.date) >= oneWeekAgo);
    return calcWeeklyDiversity(weekMeals);
  }, [history]);

  const eatingWindow = useMemo(() => {
    const today = new Date();
    const todayMeals = history.filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === today.getFullYear() &&
             d.getMonth() === today.getMonth() &&
             d.getDate() === today.getDate();
    });
    return calcEatingWindow(todayMeals);
  }, [history]);

  return { weeklyDiversity, eatingWindow };
}
