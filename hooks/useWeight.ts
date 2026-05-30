/**
 * Hook para acompanhamento de peso corporal.
 * Persiste no localStorage e sincroniza com Health Connect (Android).
 */
import { useState, useCallback } from 'react';
import { isNativePlatform, syncWeight } from '../services/healthSyncService';

export interface WeightEntry {
  date: string; // ISO
  kg: number;
}

const WEIGHT_KEY = 'flavos_weight_history';

function loadEntries(): WeightEntry[] {
  try {
    const raw = localStorage.getItem(WEIGHT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: WeightEntry[]): void {
  localStorage.setItem(WEIGHT_KEY, JSON.stringify(entries));
}

export function useWeight(syncEnabled: boolean = false) {
  const [entries, setEntries] = useState<WeightEntry[]>(loadEntries);

  const latestWeight = entries.length > 0 ? entries[entries.length - 1].kg : null;

  const weekTrend = (() => {
    if (entries.length < 2) return null;
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const recent = entries.filter((e) => new Date(e.date).getTime() >= weekAgo);
    if (recent.length < 2) return null;
    const diff = recent[recent.length - 1].kg - recent[0].kg;
    return Math.round(diff * 10) / 10;
  })();

  const addWeight = useCallback(
    async (kg: number) => {
      const entry: WeightEntry = { date: new Date().toISOString(), kg };
      setEntries((prev) => {
        const updated = [...prev, entry];
        saveEntries(updated);
        return updated;
      });

      if (syncEnabled && isNativePlatform()) {
        try {
          await syncWeight(kg);
        } catch {
          // Silent fail
        }
      }
    },
    [syncEnabled],
  );

  // Last 30 entries for chart
  const chartData = entries.slice(-30).map((e) => ({
    date: new Date(e.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    kg: e.kg,
  }));

  return { entries, latestWeight, weekTrend, addWeight, chartData };
}
