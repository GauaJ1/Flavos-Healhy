/**
 * Hook para calcular as estatísticas nutricionais do dia atual.
 * Agrega os dados do histórico de refeições (localStorage).
 */
import { useMemo } from 'react';
import type { HistoryEntry } from '../types';

export interface DailyMacros {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  meals: number;
}

export interface DailyGoals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  water: number; // ml
}

const DEFAULT_GOALS: DailyGoals = {
  calories: 2000,
  protein: 150,
  carbohydrates: 250,
  fat: 65,
  water: 2000,
};

const GOALS_KEY = 'flavos_daily_goals';

export function loadGoals(): DailyGoals {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (raw) return { ...DEFAULT_GOALS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_GOALS;
}

export function saveGoals(goals: Partial<DailyGoals>): void {
  const current = loadGoals();
  localStorage.setItem(GOALS_KEY, JSON.stringify({ ...current, ...goals }));
}

function isSameDay(dateStr: string): boolean {
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export function useDailyStats(history: HistoryEntry[]) {
  const todayEntries = useMemo(
    () => history.filter((e) => isSameDay(e.date)),
    [history],
  );

  const macros = useMemo<DailyMacros>(() => {
    const base: DailyMacros = { calories: 0, protein: 0, carbohydrates: 0, fat: 0, meals: 0 };
    for (const entry of todayEntries) {
      base.meals += 1;
      // Usar totalCalories da entry (valor confirmado pelo usuário na análise)
      // em vez de recalcular somando alimentos individuais, que pode divergir
      base.calories += entry.totalCalories;
      for (const food of entry.foods) {
        const f = food.consumedFraction;
        base.protein += food.protein * f;
        base.carbohydrates += food.carbohydrates * f;
        base.fat += food.fat * f;
      }
    }
    return {
      calories: Math.round(base.calories),
      protein: Math.round(base.protein * 10) / 10,
      carbohydrates: Math.round(base.carbohydrates * 10) / 10,
      fat: Math.round(base.fat * 10) / 10,
      meals: base.meals,
    };
  }, [todayEntries]);

  return { macros, todayEntries };
}
