/**
 * Dashboard do Dia — Tab 2 do Flavos Healthy.
 *
 * Mostra:
 * - Streak de dias
 * - Anel de calorias do dia
 * - Cards de macros
 * - Hidratação
 * - Peso corporal
 * - Balanço calórico (steps — Fase 3, quando disponível)
 * - Deep Link Samsung Health (Android)
 */
import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import type { HistoryEntry } from '../types';
import { useDailyStats, loadGoals } from '../hooks/useDailyStats';
import { useHydration } from '../hooks/useHydration';
import { useWeight } from '../hooks/useWeight';
import { useStreaks } from '../hooks/useStreaks';
import CalorieRing from './CalorieRing';
import MacroCards from './MacroCards';
import HydrationTracker from './HydrationTracker';
import WeightTracker from './WeightTracker';
import StreakBadge from './StreakBadge';
import { isNativePlatform } from '../services/healthSyncService';

interface DashboardViewProps {
  history: HistoryEntry[];
  isSyncEnabled: boolean;
  isNative: boolean;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  history,
  isSyncEnabled,
  isNative,
}) => {
  const goals = loadGoals();
  const { macros } = useDailyStats(history);
  const hydration = useHydration(isSyncEnabled);
  const weight = useWeight(isSyncEnabled);
  const streak = useStreaks(history);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  const openSamsungHealth = useCallback(() => {
    // Deep Link para Samsung Health — Nutrição
    window.location.href = 'samsunghealth://Nutrition';
    // Fallback para Play Store se app não instalado
    setTimeout(() => {
      window.location.href =
        'https://play.google.com/store/apps/details?id=com.sec.android.app.shealth';
    }, 1500);
  }, []);

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="w-full max-w-md mx-auto flex flex-col gap-4 pb-6"
    >
      {/* Date header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 capitalize">{today}</p>
          <h2 className="text-lg font-bold text-white">Dashboard de Saúde</h2>
        </div>
        {isNative && isSyncEnabled && (
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400">Sync ativo</span>
          </div>
        )}
      </div>

      {/* Streak */}
      <StreakBadge streak={streak} />

      {/* Calorie ring */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5 flex flex-col items-center gap-2">
        <p className="text-xs text-gray-500 self-start">Calorias do dia</p>
        <CalorieRing
          consumed={macros.calories}
          goal={goals.calories}
          meals={macros.meals}
        />
      </div>

      {/* Macros */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4">
        <p className="text-xs text-gray-500 mb-3">Macronutrientes</p>
        <MacroCards macros={macros} goals={goals} />
      </div>

      {/* Hydration */}
      <HydrationTracker
        totalMl={hydration.totalMl}
        goalMl={hydration.goalMl}
        percentage={hydration.percentage}
        entries={hydration.entries}
        onAdd={hydration.addWater}
        onUndo={hydration.removeLastEntry}
      />

      {/* Weight */}
      <WeightTracker
        latestWeight={weight.latestWeight}
        weekTrend={weight.weekTrend}
        chartData={weight.chartData}
        onAdd={weight.addWeight}
      />

      {/* Samsung Health Deep Link — Phase 3 */}
      {isNative && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          onClick={openSamsungHealth}
          className="w-full flex items-center justify-between bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border border-blue-500/20 rounded-2xl p-4 hover:border-blue-500/40 transition-all active:scale-[0.99]"
          aria-label="Abrir Samsung Health"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-200">Ver no Samsung Health</p>
              <p className="text-xs text-gray-500">Abrir Food Tracker</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>
      )}

      {/* No data hint */}
      {macros.meals === 0 && (
        <p className="text-center text-sm text-gray-600 py-2">
          📸 Registre sua primeira refeição de hoje na aba <strong className="text-gray-500">Analisar</strong>!
        </p>
      )}
    </motion.div>
  );
};

export default DashboardView;
