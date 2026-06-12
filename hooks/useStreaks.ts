/**
 * useStreaks — Cálculo das streaks de consistência e meta calórica.
 *
 * Baseado na Documentacao_Tecnica.md (Fase 2):
 * - Consistency streak: dias consecutivos com ≥2 refeições registradas.
 * - Calorie goal streak: dias consecutivos com consumo dentro de ±15% da meta.
 */
import { useMemo } from 'react';
import type { HistoryEntry } from '../types';
import { loadGoals } from './useDailyStats';

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

export interface StreakResult {
  consistencyStreak: number;
  calorieGoalStreak: number;
}

export function useStreaks(history: HistoryEntry[]): StreakResult {
  return useMemo(() => {
    if (history.length === 0) {
      return { consistencyStreak: 0, calorieGoalStreak: 0 };
    }

    // Agrupar refeições por dia local e somar calorias
    const dailyData: Record<string, { mealCount: number; totalCalories: number; date: Date }> = {};
    
    history.forEach(entry => {
      const d = new Date(entry.date);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { mealCount: 0, totalCalories: 0, date: d };
      }
      dailyData[dateKey].mealCount += 1;
      dailyData[dateKey].totalCalories += entry.totalCalories;
    });

    const sortedDates = Object.keys(dailyData).sort().reverse(); // do mais recente ao mais antigo
    if (sortedDates.length === 0) {
      return { consistencyStreak: 0, calorieGoalStreak: 0 };
    }

    const today = new Date();
    const targetKcal = loadGoals().calories || 2000;

    // --- 1. Streak de Consistência (consecutivos com >= 2 refeições) ---
    let consistencyStreak = 0;
    let expectedDiff = 0; // diferença esperada do dia em relação a "hoje"
    
    // Verifica se a última data com registro é hoje ou ontem
    const lastRegDate = dailyData[sortedDates[0]].date;
    const daysSinceLastReg = diffDays(today, lastRegDate);

    if (daysSinceLastReg <= 1) {
      // Se a última data com registro for hoje e tiver < 2 refeições, começamos a verificar a partir de ontem
      let startIndex = 0;
      if (daysSinceLastReg === 0 && dailyData[sortedDates[0]].mealCount < 2) {
        startIndex = 1;
        expectedDiff = 1;
      }
      
      let streakBroken = false;
      for (let i = startIndex; i < sortedDates.length; i++) {
        const entry = dailyData[sortedDates[i]];
        const actualDiff = diffDays(today, entry.date);
        
        if (actualDiff === expectedDiff && entry.mealCount >= 2) {
          consistencyStreak++;
          expectedDiff++;
        } else {
          // Se houver furo de dia consecutivo com >= 2 refeições, a streak quebra
          break;
        }
      }
    }

    // --- 2. Streak de Meta Calórica (consecutivos dentro de ±15%) ---
    let calorieGoalStreak = 0;
    expectedDiff = 0;

    if (daysSinceLastReg <= 1) {
      let startIndex = 0;
      const firstDayCal = dailyData[sortedDates[0]].totalCalories;
      const firstInRange = Math.abs(firstDayCal - targetKcal) / targetKcal <= 0.15;
      
      // Se hoje ainda não bateu a meta (e as calorias estão abaixo), não quebra a streak ainda (tolerância para o dia corrente)
      if (daysSinceLastReg === 0 && !firstInRange && firstDayCal < targetKcal) {
        startIndex = 1;
        expectedDiff = 1;
      }

      for (let i = startIndex; i < sortedDates.length; i++) {
        const entry = dailyData[sortedDates[i]];
        const actualDiff = diffDays(today, entry.date);
        const inRange = Math.abs(entry.totalCalories - targetKcal) / targetKcal <= 0.15;

        if (actualDiff === expectedDiff && inRange) {
          calorieGoalStreak++;
          expectedDiff++;
        } else {
          break;
        }
      }
    }

    return { consistencyStreak, calorieGoalStreak };
  }, [history]);
}
