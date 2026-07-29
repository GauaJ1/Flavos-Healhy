import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { calculateHarmonyScore } from '../utils/nutritionScore';
import { readSleepData, readActivityData } from '../services/healthSyncService';

interface Health360CardProps {
  isSyncEnabled: boolean;
  nutritionScore: number;
  effectiveTargetKcal?: number;
  dailyCaloriesConsumed?: number;
  todayProteinConsumed?: number;
  targetProtein?: number;
}

interface ActivityState {
  steps: number;
  hasWorkout: boolean;
  workoutTitle?: string;
  workoutType?: string;
  activeCaloriesBurned: number;
}

interface SleepState {
  hasData: boolean;
  durationMinutes?: number;
  hasStageData: boolean;
  deepSleepPercent?: number | null;
}

export const Health360Card: React.FC<Health360CardProps> = ({
  isSyncEnabled,
  nutritionScore,
  effectiveTargetKcal = 2000,
  dailyCaloriesConsumed = 0,
  todayProteinConsumed = 0,
  targetProtein = 120,
}) => {
  const [sleepState, setSleepState] = useState<SleepState | null>(null);
  const [activityState, setActivityState] = useState<ActivityState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isSyncEnabled) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function load360Data() {
      try {
        const [sleep, activity] = await Promise.all([
          readSleepData(),
          readActivityData(),
        ]);

        if (isMounted) {
          setSleepState(sleep);
          setActivityState(activity);
        }
      } catch (err) {
        console.warn('[Health360Card] Erro ao carregar dados do Health Connect:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load360Data();
    return () => {
      isMounted = false;
    };
  }, [isSyncEnabled]);

  if (!isSyncEnabled || loading) return null;

  const hasSleep = Boolean(sleepState?.hasData && sleepState?.durationMinutes);
  const hasActivity = Boolean(activityState && (activityState.steps > 0 || activityState.hasWorkout));

  // SÓ renderiza se houver pelo menos dados válidos de sono ou atividade
  if (!hasSleep && !hasActivity) return null;

  const sleepHours = hasSleep ? (sleepState!.durationMinutes! / 60) : null;
  const stepCount = activityState?.steps || 0;
  const activeKcal = activityState?.activeCaloriesBurned || 0;

  const harmony = calculateHarmonyScore(nutritionScore, sleepHours, stepCount);

  // Balanço Energético (Passo 7)
  const totalSpent = Math.round(effectiveTargetKcal + activeKcal);
  const balance = totalSpent - dailyCaloriesConsumed;

  // Nutrição x Recuperação (Passo 5)
  const hasWorkoutOrActive = Boolean(activityState?.hasWorkout || activeKcal >= 150);
  const proteinPct = targetProtein > 0 ? (todayProteinConsumed / targetProtein) * 100 : 100;
  const showRecoveryInsight = hasWorkoutOrActive && proteinPct < 70;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-slate-900/90 border border-emerald-500/20 rounded-2xl p-4 shadow-xl"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌐</span>
          <div>
            <h3 className="text-sm font-bold text-gray-100">Saúde 360°</h3>
            <p className="text-[10px] text-gray-400">Nutrição + Sono + Atividade integrados</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-black ${harmony.color}`}>{harmony.score}</span>
          <span className="text-[10px] text-gray-500 font-bold block">/100</span>
        </div>
      </div>

      {/* Harmony Label */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-300">Índice de Harmonia</span>
        <span className={`text-xs font-bold ${harmony.color}`}>{harmony.label}</span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-2 text-center">
          <span className="text-[10px] text-gray-500 block">Sono</span>
          <span className="text-xs font-bold text-indigo-300">
            {hasSleep ? `${sleepHours?.toFixed(1)}h` : '--'}
          </span>
          {sleepState?.hasStageData && sleepState.deepSleepPercent !== null && (
            <span className="text-[9px] text-indigo-400 block">{sleepState.deepSleepPercent}% profundo</span>
          )}
        </div>
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-2 text-center">
          <span className="text-[10px] text-gray-500 block">Passos</span>
          <span className="text-xs font-bold text-emerald-300">
            {stepCount > 0 ? stepCount.toLocaleString('pt-BR') : '--'}
          </span>
        </div>
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-2 text-center">
          <span className="text-[10px] text-gray-500 block">Ativas</span>
          <span className="text-xs font-bold text-amber-300">
            {activeKcal > 0 ? `${activeKcal} kcal` : '--'}
          </span>
        </div>
      </div>

      {/* Balanço Energético (Passo 7) */}
      <div className="bg-gray-950/40 border border-gray-800 rounded-xl p-2.5 text-xs text-gray-300 mb-2">
        <p className="leading-relaxed">
          ⚡ Hoje seu gasto total foi de <strong>~{totalSpent} kcal</strong> ({effectiveTargetKcal} kcal base + {activeKcal} kcal ativas) e você consumiu <strong>{dailyCaloriesConsumed} kcal</strong> — saldo de <strong>{balance > 0 ? 'déficit' : 'superávit'}</strong> de <strong>{Math.abs(balance)} kcal</strong>.
        </p>
      </div>

      {/* Insight de Recuperação (Passo 5) */}
      {showRecoveryInsight && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-xs text-amber-200">
          💪 Você teve um treino hoje ({activeKcal} kcal ativas) e está em {Math.round(proteinPct)}% da sua meta de proteína ({todayProteinConsumed}g / {targetProtein}g). Uma fonte extra de proteína ajuda a otimizar a recuperação pós-treino.
        </div>
      )}
    </motion.div>
  );
};
