import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { calculateHarmonyScore } from '../utils/nutritionScore';
import { readSleepData, readActivityData } from '../services/healthSyncService';

interface Health360CardProps {
  isSyncEnabled: boolean;
  nutritionScore: number;
  effectiveTDEE?: number;           // TDEE puro (sem ajuste de objetivo)
  effectiveTargetKcal?: number;     // Meta de ingestão (TDEE + delta objetivo)
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
  effectiveTDEE = 2000,
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
  const activeKcalMeasured = activityState?.activeCaloriesBurned || 0;

  // Estimativa biomecânica de calorias ativas dos passos (média científica: ~0.045 kcal por passo)
  const activeKcalEstimated = stepCount > 0 ? Math.round(stepCount * 0.045) : 0;

  // Usa calorias ativas medidas pelo Health Connect; se zeradas, usa estimativa dos passos
  const activeKcal = activeKcalMeasured > 0 ? activeKcalMeasured : activeKcalEstimated;
  const isEstimated = activeKcalMeasured === 0 && activeKcalEstimated > 0;

  const harmony = calculateHarmonyScore(nutritionScore, sleepHours, stepCount);

  // Balanço Energético
  // TDEE já inclui o fator de atividade do perfil — NÃO somar activeKcal (seria dupla contagem).
  // activeKcal do Health Connect é exibido como métrica informativa (coluna "Ativas"),
  // não como componente adicional do gasto.
  const totalSpent = effectiveTDEE;  // gasto = TDEE do perfil
  const balance = totalSpent - dailyCaloriesConsumed;

  // Nutrição x Recuperação
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
        <div className="bg-gray-800/60 border border-gray-700/40 rounded-xl p-2 text-center" title="Calorias queimadas em treinos e caminhadas">
          <span className="text-[10px] text-gray-500 block">Ativas</span>
          <span className="text-xs font-bold text-amber-300">
            {activeKcal > 0 ? `${activeKcal} kcal` : '--'}
          </span>
          {isEstimated && (
            <span className="text-[8px] text-amber-400/70 block">estimado</span>
          )}
        </div>
      </div>

      {/* Balanço Energético */}
      <div className="bg-gray-950/40 border border-gray-800 rounded-xl p-2.5 text-xs text-gray-300 mb-2">
        {dailyCaloriesConsumed === 0 ? (
          <p className="leading-relaxed">
            ⚡ Seu TDEE estimado é de <strong>~{totalSpent} kcal</strong> (meta de ingestão: {effectiveTargetKcal} kcal). Registre suas refeições para calcular o balanço calórico.
          </p>
        ) : (
          <p className="leading-relaxed">
            ⚡ Seu TDEE é <strong>~{totalSpent} kcal</strong> e você consumiu <strong>{dailyCaloriesConsumed} kcal</strong> — saldo de <strong>{balance > 0 ? 'déficit' : 'superávit'}</strong> de <strong>{Math.abs(balance)} kcal</strong> em relação ao gasto.
          </p>
        )}
      </div>

      {/* Insight de Recuperação */}
      {showRecoveryInsight && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-xs text-amber-200">
          💪 Você teve atividade física hoje ({activeKcal} kcal ativas) e atingiu {Math.round(proteinPct)}% da sua meta de proteína ({todayProteinConsumed}g / {targetProtein}g). Uma fonte extra de proteína otimiza sua recuperação muscular.
        </div>
      )}
    </motion.div>
  );
};

