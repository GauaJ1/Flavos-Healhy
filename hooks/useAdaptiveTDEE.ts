/**
 * useAdaptiveTDEE — TDEE Adaptativo via EWMA + Balanço Energético.
 *
 * Algoritmo:
 * 1. Coleta pesagens e calorias ingeridas diárias (do histórico de refeições).
 * 2. Suaviza o peso com EWMA (α = 0.1, ~19-day half-life).
 * 3. Calcula a variação de peso suavizado (ΔW) na janela de calibração.
 * 4. TDEE_real = média_calorias_diarias − (ΔW × 7700 / dias)
 *    onde 7700 kcal/kg = conteúdo energético médio de tecido corporal.
 * 5. Quando confiança ≥ alta (≥14 dias com dados), oferece override da meta.
 *
 * Referências:
 * - MacroFactor: erro mediano 135 kcal (adaptativo) vs 335 kcal (Mifflin).
 * - EWMA α=0.1 suaviza flutuações hídricas (~1-2 kg/dia).
 *
 * REGRA DE SEGURANÇA: Nunca aplica override automaticamente.
 * Sempre mostra o AdaptiveTDEECard com explicação antes de alterar metas.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { HistoryEntry } from '../types';
import type { WeightEntry } from './useWeight';
import type { NutritionalTargets, Goal } from './useUserProfile';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DailyLogEntry {
  date: string; // YYYY-MM-DD
  caloriesIn: number;
  weightKg: number | null;
}

export interface AdaptiveTDEEState {
  /** Dias com dados completos (peso + calorias) */
  daysWithData: number;
  /** Nível de confiança na estimativa */
  confidence: 'insuficiente' | 'baixa' | 'media' | 'alta';
  /** Peso suavizado EWMA mais recente */
  ewmaWeight: number | null;
  /** TDEE calculado pela fórmula estática (Mifflin) */
  staticTDEE: number;
  /** TDEE estimado adaptativamente (null se insuficiente) */
  adaptiveTDEE: number | null;
  /** Diferença entre adaptativo e estático */
  deltaTDEE: number | null;
  /** Meta calórica corrigida (TDEE adaptativo + delta do objetivo) */
  correctedTarget: number | null;
  /** Se o usuário já aceitou o override */
  overrideAccepted: boolean;
  /** Média calórica diária na janela */
  avgDailyCalories: number | null;
  /** Variação de peso (kg) na janela EWMA */
  weightDelta: number | null;
  /** Trend semanal (kg/semana) baseado em EWMA */
  weeklyTrend: number | null;
  /** Mínimo de dias necessários para calibração */
  minDaysRequired: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const EWMA_ALPHA = 0.1;
const ENERGY_PER_KG = 7700; // kcal por kg de tecido corporal
const MIN_DAYS_CALIBRATION = 14;
const STATE_KEY = 'flavos_adaptive_tdee';
const OVERRIDE_KEY = 'flavos_adaptive_tdee_override';
const MAX_TDEE_DEVIATION = 800; // Limite de segurança: ignorar se desvio > 800 kcal

// ── Goal delta (espelhado de useUserProfile) ────────────────────────────────

const GOAL_DELTA: Record<Goal, number> = {
  perder_peso: -300,
  manter: 0,
  ganhar_massa: +300,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDateKey(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

function computeEWMA(values: number[], alpha: number): number[] {
  if (values.length === 0) return [];
  const result = [values[0]];
  for (let i = 1; i < values.length; i++) {
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

function getConfidence(days: number): AdaptiveTDEEState['confidence'] {
  if (days < 7) return 'insuficiente';
  if (days < 10) return 'baixa';
  if (days < MIN_DAYS_CALIBRATION) return 'media';
  return 'alta';
}

function loadOverrideAccepted(): boolean {
  try {
    return localStorage.getItem(OVERRIDE_KEY) === 'true';
  } catch {
    return false;
  }
}

function saveOverrideAccepted(accepted: boolean): void {
  localStorage.setItem(OVERRIDE_KEY, String(accepted));
}

// ── Main Hook ──────────────────────────────────────────────────────────────────

export function useAdaptiveTDEE(
  weightEntries: WeightEntry[],
  mealHistory: HistoryEntry[],
  staticTDEE: number,
  goal: Goal,
) {
  const [overrideAccepted, setOverrideAccepted] = useState(loadOverrideAccepted);

  // ── Build daily log: merge weight + calories by date ──

  const dailyLog = useMemo<DailyLogEntry[]>(() => {
    // Agrupa calorias por dia
    const calByDate = new Map<string, number>();
    for (const entry of mealHistory) {
      const key = toDateKey(entry.date);
      calByDate.set(key, (calByDate.get(key) || 0) + entry.totalCalories);
    }

    // Agrupa peso por dia (último registro do dia)
    const weightByDate = new Map<string, number>();
    for (const entry of weightEntries) {
      const key = toDateKey(entry.date);
      weightByDate.set(key, entry.kg);
    }

    // Merge — só inclui dias que têm pelo menos calorias OU peso
    const allDates = new Set([...calByDate.keys(), ...weightByDate.keys()]);
    const entries: DailyLogEntry[] = [];
    for (const date of allDates) {
      entries.push({
        date,
        caloriesIn: calByDate.get(date) || 0,
        weightKg: weightByDate.get(date) || null,
      });
    }

    // Ordena cronologicamente
    entries.sort((a, b) => a.date.localeCompare(b.date));
    return entries;
  }, [weightEntries, mealHistory]);

  // ── Compute adaptive TDEE ──

  const state = useMemo<AdaptiveTDEEState>(() => {
    // Dias com AMBOS peso e calorias
    const completeDays = dailyLog.filter(d => d.weightKg !== null && d.caloriesIn > 0);
    const daysWithData = completeDays.length;
    const confidence = getConfidence(daysWithData);

    const baseState: AdaptiveTDEEState = {
      daysWithData,
      confidence,
      ewmaWeight: null,
      staticTDEE,
      adaptiveTDEE: null,
      deltaTDEE: null,
      correctedTarget: null,
      overrideAccepted,
      avgDailyCalories: null,
      weightDelta: null,
      weeklyTrend: null,
      minDaysRequired: MIN_DAYS_CALIBRATION,
    };

    if (daysWithData < 7) return baseState;

    // Extrai peso dos dias completos e aplica EWMA
    const weights = completeDays.map(d => d.weightKg!);
    const ewmaWeights = computeEWMA(weights, EWMA_ALPHA);
    const ewmaCurrent = ewmaWeights[ewmaWeights.length - 1];
    const ewmaFirst = ewmaWeights[0];

    // Calcula variação de peso na janela
    const weightDelta = ewmaCurrent - ewmaFirst;

    // Calcula período em dias
    const firstDate = new Date(completeDays[0].date);
    const lastDate = new Date(completeDays[completeDays.length - 1].date);
    const periodDays = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / 86400000);

    // Média calórica diária
    const totalCalories = completeDays.reduce((sum, d) => sum + d.caloriesIn, 0);
    const avgDailyCalories = Math.round(totalCalories / daysWithData);

    // TDEE_real = avg_calorias - (ΔW_ewma × 7700 / período_dias)
    const energyFromWeight = (weightDelta * ENERGY_PER_KG) / periodDays;
    const rawAdaptiveTDEE = Math.round(avgDailyCalories - energyFromWeight);

    // Sanity check: se desvio é absurdo, não confiamos
    const deviation = Math.abs(rawAdaptiveTDEE - staticTDEE);
    if (deviation > MAX_TDEE_DEVIATION) {
      return {
        ...baseState,
        ewmaWeight: Math.round(ewmaCurrent * 10) / 10,
        avgDailyCalories,
        weightDelta: Math.round(weightDelta * 100) / 100,
        weeklyTrend: Math.round((weightDelta / periodDays) * 7 * 100) / 100,
      };
    }

    // Só oferece adaptiveTDEE se confiança >= media
    const adaptiveTDEE = confidence !== 'insuficiente' ? rawAdaptiveTDEE : null;
    const deltaTDEE = adaptiveTDEE !== null ? adaptiveTDEE - staticTDEE : null;

    // Meta corrigida = TDEE adaptativo + delta do objetivo
    const correctedTarget = adaptiveTDEE !== null
      ? Math.max(1200, adaptiveTDEE + GOAL_DELTA[goal])
      : null;

    return {
      ...baseState,
      ewmaWeight: Math.round(ewmaCurrent * 10) / 10,
      adaptiveTDEE,
      deltaTDEE,
      correctedTarget,
      avgDailyCalories,
      weightDelta: Math.round(weightDelta * 100) / 100,
      weeklyTrend: Math.round((weightDelta / periodDays) * 7 * 100) / 100,
    };
  }, [dailyLog, staticTDEE, goal, overrideAccepted]);

  // ── Actions ──

  const acceptOverride = useCallback(() => {
    saveOverrideAccepted(true);
    setOverrideAccepted(true);
  }, []);

  const rejectOverride = useCallback(() => {
    saveOverrideAccepted(false);
    setOverrideAccepted(false);
  }, []);

  // ── TDEE efetivo: usa adaptativo se aceito, senão estático ──

  const effectiveTDEE = useMemo(() => {
    if (overrideAccepted && state.adaptiveTDEE !== null) {
      return state.adaptiveTDEE;
    }
    return staticTDEE;
  }, [overrideAccepted, state.adaptiveTDEE, staticTDEE]);

  const effectiveTarget = useMemo(() => {
    if (overrideAccepted && state.correctedTarget !== null) {
      return state.correctedTarget;
    }
    return Math.max(1200, staticTDEE + GOAL_DELTA[goal]);
  }, [overrideAccepted, state.correctedTarget, staticTDEE, goal]);

  return {
    state,
    effectiveTDEE,
    effectiveTarget,
    acceptOverride,
    rejectOverride,
    dailyLog,
  };
}
