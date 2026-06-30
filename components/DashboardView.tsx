/**
 * Dashboard do Dia — Tab 2 do Flavos Healthy.
 *
 * Mostra:
 * - Streak de dias
 * - Anel de calorias (agora com meta personalizada via TMB/TDEE)
 * - Cards de macros (metas personalizadas)
 * - Hidratação
 * - Peso corporal
 * - Conquistas
 * - Arco-íris de diversidade alimentar + janela alimentar (Fase 3)
 * - Deep Link Samsung Health (Android)
 */
import React, { useCallback, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { HistoryEntry } from '../types';
import { useDailyStats, loadGoals } from '../hooks/useDailyStats';
import { useHydration } from '../hooks/useHydration';
import { useWeight } from '../hooks/useWeight';
import { useStreaks } from '../hooks/useStreaks';
import { useAchievements } from '../hooks/useAchievements';
import { useFoodDiversity } from '../hooks/useFoodDiversity';
import { useUserProfile, calcTargets } from '../hooks/useUserProfile';
import { useWeeklyReports } from '../hooks/useWeeklyReports';
import { useAdaptiveTDEE } from '../hooks/useAdaptiveTDEE';
import { useCarbCycle } from '../hooks/useCarbCycle';
import CalorieRing from './CalorieRing';
import MacroCards from './MacroCards';
import HydrationTracker from './HydrationTracker';
import WeightTracker from './WeightTracker';
import StreakBadge from './StreakBadge';
import AchievementsPanel from './AchievementsPanel';
import DiversityPanel from './DiversityPanel';
import { MealPlanPanel } from './MealPlanPanel';
import WeeklyReportCard from './WeeklyReportCard';
import WellbeingPanel from './WellbeingPanel';
import { AdaptiveTDEECard } from './AdaptiveTDEECard';
import { CarbCycleCard } from './CarbCycleCard';
import type { DailyGoals } from '../hooks/useDailyStats';
import type { NutritionalTargets } from '../hooks/useUserProfile';

interface DashboardViewProps {
  history: HistoryEntry[];
  isSyncEnabled: boolean;
  isNative: boolean;
  hasProfile: boolean;
  onOpenProfile: () => void;
  weeklyReminder?: any;
  onNavigateToReminderFlow?: () => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  history,
  isSyncEnabled,
  isNative,
  hasProfile,
  onOpenProfile,
  weeklyReminder,
  onNavigateToReminderFlow,
}) => {
  const goals = loadGoals();
  const { macros } = useDailyStats(history);
  const hydration = useHydration(isSyncEnabled);
  const weight = useWeight(isSyncEnabled);
  const { consistencyStreak, calorieGoalStreak } = useStreaks(history);
  const { weeklyDiversity, eatingWindow } = useFoodDiversity(history);
  const { profile, targets } = useUserProfile();
  const { latestReport, generateReportManually, isGenerating, error } = useWeeklyReports(history);

  // Sub-abas de configuração
  const [activeSubTab, setActiveSubTab] = useState<'tdee' | 'cycle'>('tdee');

  // Hook do TDEE adaptativo
  const {
    state: tdeeState,
    effectiveTDEE,
    effectiveTarget,
    acceptOverride,
    rejectOverride,
  } = useAdaptiveTDEE(
    weight.entries,
    history,
    targets?.tdeeKcal ?? goals.calories,
    profile?.goal ?? 'manter'
  );

  // Hook do Ciclo de carboidratos
  const {
    weekSummary,
    selectedDay,
    setSelectedDay,
    todayMacros,
    updateDayType,
  } = useCarbCycle(effectiveTarget, profile);

  // Targets com TDEE adaptativo aplicado
  const currentTargets = useMemo<NutritionalTargets | null>(() => {
    if (!profile) return null;
    return calcTargets(profile, effectiveTarget);
  }, [profile, effectiveTarget]);

  // Metas de calorias e macros para HOJE (para alimentar os anéis e cards no topo)
  const todayGoals = useMemo<DailyGoals>(() => {
    if (profile) {
      if (activeSubTab === 'cycle' && todayMacros) {
        return {
          calories: todayMacros.kcal,
          protein: todayMacros.protein,
          carbohydrates: todayMacros.carbs,
          fat: todayMacros.fat,
          water: goals.water,
        };
      }
      if (currentTargets) {
        return {
          calories: currentTargets.targetKcal,
          protein: currentTargets.targetProtein_g,
          carbohydrates: currentTargets.targetCarbs_g,
          fat: currentTargets.targetFat_g,
          water: goals.water,
        };
      }
    }
    return goals;
  }, [profile, activeSubTab, todayMacros, currentTargets, goals]);

  // Nutritional targets a serem repassadas para o MealPlanPanel (Plano de Refeições)
  const activeTargets = useMemo<NutritionalTargets | null>(() => {
    if (!profile) return null;

    if (activeSubTab === 'cycle' && todayMacros) {
      return {
        tmbKcal: targets?.tmbKcal ?? 0,
        tdeeKcal: effectiveTDEE,
        targetKcal: todayMacros.kcal,
        targetProtein_g: todayMacros.protein,
        targetCarbs_g: todayMacros.carbs,
        targetFat_g: todayMacros.fat,
        isCunningham: targets?.isCunningham,
      };
    }

    return currentTargets;
  }, [profile, activeSubTab, todayMacros, currentTargets, targets, effectiveTDEE]);

  const isRoutineOutdated = useMemo(() => {
    if (!weeklyReminder?.state?.lastWeekConfirmedAt) return true;
    const lastDate = new Date(weeklyReminder.state.lastWeekConfirmedAt);
    const diffTime = Math.abs(Date.now() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 10;
  }, [weeklyReminder?.state?.lastWeekConfirmedAt]);

  const waterGoalMet = hydration.percentage >= 100;
  const achievements = useAchievements(history, {
    diversityScore: weeklyDiversity.score,
    hasProfile,
    waterGoalMet,
  });

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  const openSamsungHealth = useCallback(() => {
    window.location.href = 'samsunghealth://Nutrition';
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
      {/* Date header + profile button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 capitalize">{today}</p>
          <h2 className="text-lg font-bold text-white">Dashboard de Saúde</h2>
        </div>
        <div className="flex items-center gap-2">
          {isNative && isSyncEnabled && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400">Sync ativo</span>
            </div>
          )}
          <button
            onClick={onOpenProfile}
            className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center hover:border-emerald-500/50 transition-colors"
            aria-label="Editar perfil"
            title={hasProfile ? 'Editar perfil e metas' : 'Configurar perfil para metas personalizadas'}
          >
            <svg className={`w-4 h-4 ${hasProfile ? 'text-emerald-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Profile CTA — se não tiver perfil */}
      {!hasProfile && (
        <motion.button
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={onOpenProfile}
          className="w-full flex items-center gap-3 bg-gradient-to-r from-emerald-900/40 to-teal-900/30 border border-emerald-500/20 rounded-2xl p-3.5 text-left hover:border-emerald-500/40 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-lg flex-shrink-0">🎯</div>
          <div>
            <p className="text-sm font-semibold text-emerald-300">Personalize suas metas</p>
            <p className="text-xs text-gray-500">Configure seu perfil para metas calóricas baseadas no seu corpo.</p>
          </div>
          <svg className="w-4 h-4 text-gray-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>
      )}

      {/* Streak */}
      <StreakBadge consistencyStreak={consistencyStreak} calorieGoalStreak={calorieGoalStreak} />

      {/* Switcher de Sub-abas */}
      {hasProfile && (
        <div className="flex gap-2 p-1 bg-gray-900/50 border border-gray-800 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('tdee')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeSubTab === 'tdee'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 font-bold'
                : 'text-gray-400 hover:text-gray-300 font-medium'
            }`}
          >
            TDEE Adaptativo
          </button>
          <button
            onClick={() => setActiveSubTab('cycle')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeSubTab === 'cycle'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 font-bold'
                : 'text-gray-400 hover:text-gray-300 font-medium'
            }`}
          >
            Ciclo de Carboidratos
          </button>
        </div>
      )}

      {/* Exibição condicional da aba de TDEE Adaptativo ou Ciclo de Carboidratos */}
      {activeSubTab === 'tdee' ? (
        <>
          {/* Calorie ring */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5 flex flex-col items-center gap-2">
            <div className="flex justify-between items-center w-full mb-1">
              <p className="text-xs text-gray-500">Calorias do dia</p>
              {hasProfile && (
                <p className="text-xs text-emerald-400/70">
                  {tdeeState.overrideAccepted ? 'meta adaptativa real' : 'meta personalizada'}
                </p>
              )}
            </div>
            <CalorieRing
              consumed={macros.calories}
              goal={todayGoals.calories}
              meals={macros.meals}
            />
          </div>

          {/* Macros */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4">
            <p className="text-xs text-gray-500 mb-3">Macronutrientes</p>
            <MacroCards macros={macros} goals={todayGoals} />
          </div>

          {/* Card do TDEE Adaptativo */}
          {hasProfile && (
            <AdaptiveTDEECard
              state={tdeeState}
              onAccept={acceptOverride}
              onReject={rejectOverride}
            />
          )}
        </>
      ) : (
        <>
          {/* Alerta de rotina desatualizada */}
          {isRoutineOutdated && onNavigateToReminderFlow && (
            <motion.button
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onNavigateToReminderFlow}
              className="w-full flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-left hover:border-amber-500/30 transition-all active:scale-[0.99] gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🔄</span>
                <div>
                  <p className="text-xs font-semibold text-amber-300">Sua rotina pode estar desatualizada</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-normal">
                    Revisar e confirmar o ciclo de carboidratos desta semana.
                  </p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </motion.button>
          )}

          {/* Card do Ciclo de Carboidratos */}
          {profile && weekSummary && (
            <CarbCycleCard
              summary={weekSummary}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onUpdateDayType={updateDayType}
              baseCalories={effectiveTarget}
            />
          )}
        </>
      )}

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

      {/* Plano de Refeições (Fase 2) */}
      {profile && activeTargets && (
        <MealPlanPanel profile={profile} targets={activeTargets} />
      )}

      {/* Diversidade alimentar + janela (Fase 3) */}
      <div className="space-y-3">
        <p className="text-xs text-gray-500 font-medium pl-1 mb-0">Qualidade Alimentar</p>
        <DiversityPanel diversity={weeklyDiversity} eatingWindow={eatingWindow} />
        <WeeklyReportCard
          report={latestReport}
          isGenerating={isGenerating}
          onGenerate={generateReportManually}
          error={error}
          hasMinimumHistory={history.length >= 3}
        />
      </div>

      {/* Correlações e Bem-Estar (Fase 4) */}
      <WellbeingPanel history={history} />

      {/* Conquistas */}
      <AchievementsPanel achievements={achievements} />

      {/* Samsung Health Deep Link */}
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
