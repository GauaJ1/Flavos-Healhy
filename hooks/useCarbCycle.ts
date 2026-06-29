/**
 * useCarbCycle — Ciclo de carboidratos integrado ao TDEE adaptativo.
 *
 * Implementa 3 tipos de dia:
 * - Alto (high): treino pesado → targetKcal + 300 kcal, carbs = peso × 8 g/kg
 * - Moderado (mod): treino leve → targetKcal, carbs = peso × 6 g/kg
 * - Baixo (low): descanso → targetKcal - 600 kcal, carbs = peso × 2.5 g/kg
 *
 * A proteína é fixa (g/kg por nível de atividade, idêntico ao useUserProfile).
 * Gordura é calculada residualmente, com piso de 0.8 g/kg.
 *
 * O ciclo usa o TDEE efetivo (adaptativo se aceito, senão estático).
 */
import { useMemo, useState, useCallback } from 'react';
import type { UserProfile, NutritionalTargets, ActivityLevel } from './useUserProfile';

// ── Types ──────────────────────────────────────────────────────────────────────

export type CycleDay = 'high' | 'mod' | 'low';

export interface CycleDayConfig {
  dayIndex: number; // 0=Seg, 6=Dom
  dayLabel: string;
  type: CycleDay;
  activity: string; // descrição do treino
}

export interface CycleDayMacros {
  dayIndex: number;
  dayLabel: string;
  type: CycleDay;
  activity: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CycleWeekSummary {
  days: CycleDayMacros[];
  totalKcal: number;
  avgKcal: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const DEFAULT_WEEK: CycleDayConfig[] = [
  { dayIndex: 0, dayLabel: 'Seg', type: 'high', activity: 'Treino pesado' },
  { dayIndex: 1, dayLabel: 'Ter', type: 'mod',  activity: 'Treino leve' },
  { dayIndex: 2, dayLabel: 'Qua', type: 'high', activity: 'Treino pesado' },
  { dayIndex: 3, dayLabel: 'Qui', type: 'low',  activity: 'Descanso' },
  { dayIndex: 4, dayLabel: 'Sex', type: 'high', activity: 'Treino pesado' },
  { dayIndex: 5, dayLabel: 'Sáb', type: 'high', activity: 'Treino pesado' },
  { dayIndex: 6, dayLabel: 'Dom', type: 'low',  activity: 'Descanso' },
];

const CYCLE_CONFIG_KEY = 'flavos_carb_cycle_config';

const KCAL_OFFSET: Record<CycleDay, number> = {
  high: +300,
  mod: 0,
  low: -600,
};

const CARBS_GKG: Record<CycleDay, number> = {
  high: 8,
  mod: 6,
  low: 2.5,
};

const PROTEIN_GKG_BY_ACTIVITY: Record<ActivityLevel, number> = {
  sedentario: 1.0,
  leve: 1.2,
  moderado: 1.4,
  intenso: 1.8,
  muito_intenso: 2.0,
};

const FAT_FLOOR_GKG = 0.8;

// ── Persistence ────────────────────────────────────────────────────────────────

function loadWeekConfig(): CycleDayConfig[] {
  try {
    const raw = localStorage.getItem(CYCLE_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_WEEK;
}

function saveWeekConfig(config: CycleDayConfig[]): void {
  localStorage.setItem(CYCLE_CONFIG_KEY, JSON.stringify(config));
}

// ── Calc Helper ────────────────────────────────────────────────────────────────

function calcDayMacros(
  type: CycleDay,
  baseTargetKcal: number,
  weightKg: number,
  activityLevel: ActivityLevel,
): { kcal: number; protein: number; carbs: number; fat: number } {
  const kcal = Math.max(1200, baseTargetKcal + KCAL_OFFSET[type]);
  const protein = Math.round(weightKg * PROTEIN_GKG_BY_ACTIVITY[activityLevel]);
  const carbs = Math.round(weightKg * CARBS_GKG[type]);

  // Gordura residual
  const fatKcal = kcal - (protein * 4) - (carbs * 4);
  let fat = Math.round(fatKcal / 9);

  // Piso de gordura
  const fatFloor = Math.round(weightKg * FAT_FLOOR_GKG);
  if (fat < fatFloor) {
    fat = fatFloor;
  }

  return { kcal, protein, carbs, fat };
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useCarbCycle(
  effectiveTargetKcal: number,
  profile: UserProfile | null,
) {
  const [weekConfig, setWeekConfig] = useState<CycleDayConfig[]>(loadWeekConfig);
  const [selectedDay, setSelectedDay] = useState(0);

  const weekSummary = useMemo<CycleWeekSummary | null>(() => {
    if (!profile) return null;

    const days: CycleDayMacros[] = weekConfig.map(cfg => {
      const macros = calcDayMacros(
        cfg.type,
        effectiveTargetKcal,
        profile.weightKg,
        profile.activityLevel,
      );
      return {
        dayIndex: cfg.dayIndex,
        dayLabel: cfg.dayLabel,
        type: cfg.type,
        activity: cfg.activity,
        ...macros,
      };
    });

    const totalKcal = days.reduce((s, d) => s + d.kcal, 0);

    return {
      days,
      totalKcal,
      avgKcal: Math.round(totalKcal / 7),
      avgProtein: Math.round(days.reduce((s, d) => s + d.protein, 0) / 7),
      avgCarbs: Math.round(days.reduce((s, d) => s + d.carbs, 0) / 7),
      avgFat: Math.round(days.reduce((s, d) => s + d.fat, 0) / 7),
    };
  }, [effectiveTargetKcal, profile, weekConfig]);

  // Dia atual da semana (0=Seg para ficar alinhado com o ciclo)
  const todayIndex = useMemo(() => {
    const jsDay = new Date().getDay(); // 0=Dom
    return jsDay === 0 ? 6 : jsDay - 1; // Converte para 0=Seg
  }, []);

  const todayMacros = useMemo(() => {
    if (!weekSummary) return null;
    return weekSummary.days[todayIndex] || null;
  }, [weekSummary, todayIndex]);

  const updateDayType = useCallback((dayIndex: number, type: CycleDay, activity?: string) => {
    setWeekConfig(prev => {
      const updated = prev.map(cfg =>
        cfg.dayIndex === dayIndex
          ? { ...cfg, type, activity: activity || cfg.activity }
          : cfg
      );
      saveWeekConfig(updated);
      return updated;
    });
  }, []);

  return {
    weekConfig,
    weekSummary,
    selectedDay,
    setSelectedDay,
    todayIndex,
    todayMacros,
    updateDayType,
  };
}
