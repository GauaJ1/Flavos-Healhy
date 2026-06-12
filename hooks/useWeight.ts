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
    
    // Filtra entradas dos últimos 30 dias para ter dados suficientes para regressão
    const now = Date.now();
    const limitTime = now - 30 * 86400000;
    const recent = entries.filter((e) => new Date(e.date).getTime() >= limitTime);
    if (recent.length < 2) return null;

    // X: tempo em dias relativo à primeira entrada do período
    const t0 = new Date(recent[0].date).getTime();
    const data = recent.map(e => ({
      x: (new Date(e.date).getTime() - t0) / 86400000, // em dias
      y: e.kg
    }));

    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (const pt of data) {
      sumX += pt.x;
      sumY += pt.y;
      sumXY += pt.x * pt.y;
      sumXX += pt.x * pt.x;
    }

    const denominator = n * sumXX - sumX * sumX;
    if (denominator === 0) return 0;

    const slope = (n * sumXY - sumX * sumY) / denominator; // kg por dia
    const weeklyChange = slope * 7; // kg por semana

    return Math.round(weeklyChange * 10) / 10;
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
