/**
 * Hook para controle de hidratação diária.
 * Persiste no localStorage e sincroniza com Health Connect (Android).
 */
import { useState, useEffect, useCallback } from 'react';
import { isNativePlatform, syncHydration } from '../services/healthSyncService';

interface HydrationEntry {
  time: string; // ISO
  ml: number;
}

interface HydrationState {
  totalMl: number;
  entries: HydrationEntry[];
  goalMl: number;
}

function todayKey(): string {
  const d = new Date();
  return `flavos_hydration_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
}

const GOAL_KEY = 'flavos_water_goal_ml';

function loadState(): HydrationState {
  try {
    const raw = localStorage.getItem(todayKey());
    const entries: HydrationEntry[] = raw ? JSON.parse(raw) : [];
    const goalMl = parseInt(localStorage.getItem(GOAL_KEY) || '2000', 10);
    const totalMl = entries.reduce((s, e) => s + e.ml, 0);
    return { totalMl, entries, goalMl };
  } catch {
    return { totalMl: 0, entries: [], goalMl: 2000 };
  }
}

/**
 * Calcula bônus de hidratação com base em passos ou treino.
 */
export function calcDynamicWaterBonus(steps: number, hasWorkout: boolean): number {
  let bonus = 0;
  if (hasWorkout || steps > 8000) bonus += 500;
  if (steps > 12000) bonus += 300;
  return bonus;
}

export function useHydration(
  syncEnabled: boolean = false,
  activityData?: { steps: number; hasWorkout: boolean } | null
) {
  const [state, setState] = useState<HydrationState>(loadState);

  // Reload when day changes
  useEffect(() => {
    setState(loadState());
  }, []);

  const addWater = useCallback(
    async (ml: number) => {
      const entry: HydrationEntry = { time: new Date().toISOString(), ml };
      setState((prev) => {
        const entries = [...prev.entries, entry];
        const totalMl = prev.totalMl + ml;
        localStorage.setItem(todayKey(), JSON.stringify(entries));
        return { ...prev, entries, totalMl };
      });

      // Sync with Health Connect if on Android and sync enabled
      if (syncEnabled && isNativePlatform()) {
        try {
          await syncHydration(ml);
        } catch {
          // Silent fail — local data already saved
        }
      }
    },
    [syncEnabled],
  );

  const setGoal = useCallback((ml: number) => {
    localStorage.setItem(GOAL_KEY, String(ml));
    setState((prev) => ({ ...prev, goalMl: ml }));
  }, []);

  const removeLastEntry = useCallback(() => {
    setState((prev) => {
      if (prev.entries.length === 0) return prev;
      const entries = prev.entries.slice(0, -1);
      const totalMl = entries.reduce((s, e) => s + e.ml, 0);
      localStorage.setItem(todayKey(), JSON.stringify(entries));
      return { ...prev, entries, totalMl };
    });
  }, []);

  const bonusMl = (syncEnabled && activityData)
    ? calcDynamicWaterBonus(activityData.steps, activityData.hasWorkout)
    : 0;

  const effectiveGoalMl = state.goalMl + bonusMl;
  const percentage = Math.min(100, Math.round((state.totalMl / effectiveGoalMl) * 100));

  return {
    ...state,
    goalMl: effectiveGoalMl,
    baseGoalMl: state.goalMl,
    bonusMl,
    percentage,
    addWater,
    setGoal,
    removeLastEntry,
  };
}
