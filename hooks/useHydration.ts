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

export function useHydration(syncEnabled: boolean = false) {
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

  const percentage = Math.min(100, Math.round((state.totalMl / state.goalMl) * 100));

  return {
    ...state,
    percentage,
    addWater,
    setGoal,
    removeLastEntry,
  };
}
