/**
 * useAchievements — Sistema de conquistas do Flavos Healthy.
 *
 * Conquistas disponíveis (baseadas na Documentacao_Tecnica.md):
 * - first_log: Primeira refeição registrada
 * - streak_3: 3 dias consecutivos
 * - streak_7: 7 dias consecutivos
 * - streak_30: 30 dias consecutivos
 * - goal_week: Meta calórica atingida por 7 dias
 * - diversity_80: Score de diversidade ≥ 80
 * - profile_complete: Perfil físico preenchido
 * - water_goal: Meta de água atingida
 * - meals_10: 10 refeições registradas no total
 * - meals_50: 50 refeições registradas no total
 */
import { useMemo, useEffect, useRef } from 'react';
import type { HistoryEntry } from '../types';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number; // 0-100 para achievements com progresso
  target?: number;
  current?: number;
}

const ACHIEVEMENTS_KEY = 'flavos_achievements';

interface StoredAchievements {
  [id: string]: { unlockedAt: string };
}

function loadStored(): StoredAchievements {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function unlock(id: string): StoredAchievements {
  const stored = loadStored();
  if (stored[id]) return stored; // já desbloqueada
  stored[id] = { unlockedAt: new Date().toISOString() };
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(stored));
  return stored;
}

function calcStreak(history: HistoryEntry[]): number {
  if (history.length === 0) return 0;
  const days = [
    ...new Set(
      history.map((e) => {
        const d = new Date(e.date);
        return `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      }),
    ),
  ].sort().reverse();

  const today = new Date();
  const firstDay = new Date(history.find((e) => {
    const d = new Date(e.date);
    return `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` === days[0];
  })!.date);

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const yesterdayStr = (() => { const y = new Date(today); y.setDate(y.getDate()-1); return `${y.getFullYear()}-${String(y.getMonth()).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`; })();

  if (days[0] !== todayStr && days[0] !== yesterdayStr) return 0;

  let count = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i-1]);
    const curr = new Date(days[i]);
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diff === 1) count++;
    else break;
  }
  return count;
}

export interface AchievementsContext {
  diversityScore?: number;
  hasProfile?: boolean;
  waterGoalMet?: boolean;
}

export function useAchievements(
  history: HistoryEntry[],
  ctx: AchievementsContext = {}
): Achievement[] {
  const stored = useRef<StoredAchievements>(loadStored());
  const streak = useMemo(() => calcStreak(history), [history]);
  const totalMeals = history.length;

  // Checar e desbloquear conquistas automaticamente
  useEffect(() => {
    let changed = false;
    const check = (id: string, condition: boolean) => {
      if (condition && !stored.current[id]) {
        stored.current = unlock(id);
        changed = true;
      }
    };

    check('first_log', totalMeals >= 1);
    check('meals_10', totalMeals >= 10);
    check('meals_50', totalMeals >= 50);
    check('streak_3', streak >= 3);
    check('streak_7', streak >= 7);
    check('streak_30', streak >= 30);
    check('diversity_80', (ctx.diversityScore ?? 0) >= 80);
    check('profile_complete', ctx.hasProfile === true);
    check('water_goal', ctx.waterGoalMet === true);
  }, [history, streak, totalMeals, ctx.diversityScore, ctx.hasProfile, ctx.waterGoalMet]);

  const DEFINITIONS = [
    {
      id: 'first_log',
      title: 'Primeira Refeição',
      description: 'Você registrou sua primeira refeição.',
      emoji: '📸',
      target: 1,
      getCurrent: () => Math.min(totalMeals, 1),
    },
    {
      id: 'profile_complete',
      title: 'Perfil Completo',
      description: 'Perfil físico preenchido para metas personalizadas.',
      emoji: '👤',
      target: 1,
      getCurrent: () => ctx.hasProfile ? 1 : 0,
    },
    {
      id: 'streak_3',
      title: '3 Dias Seguidos',
      description: '3 dias consecutivos com refeições registradas.',
      emoji: '🔥',
      target: 3,
      getCurrent: () => Math.min(streak, 3),
    },
    {
      id: 'streak_7',
      title: 'Semana Consistente',
      description: '7 dias consecutivos com refeições registradas.',
      emoji: '🏆',
      target: 7,
      getCurrent: () => Math.min(streak, 7),
    },
    {
      id: 'streak_30',
      title: 'Mês Consistente',
      description: '30 dias consecutivos com refeições registradas.',
      emoji: '💎',
      target: 30,
      getCurrent: () => Math.min(streak, 30),
    },
    {
      id: 'meals_10',
      title: '10 Refeições',
      description: '10 refeições analisadas com IA.',
      emoji: '📊',
      target: 10,
      getCurrent: () => Math.min(totalMeals, 10),
    },
    {
      id: 'meals_50',
      title: '50 Refeições',
      description: '50 refeições analisadas! Você é um exemplo de consistência.',
      emoji: '🌟',
      target: 50,
      getCurrent: () => Math.min(totalMeals, 50),
    },
    {
      id: 'diversity_80',
      title: 'Prato Colorido',
      description: 'Score de diversidade alimentar ≥ 80 em uma semana.',
      emoji: '🌈',
      target: 80,
      getCurrent: () => Math.min(ctx.diversityScore ?? 0, 80),
    },
    {
      id: 'water_goal',
      title: 'Hidratação Perfeita',
      description: 'Meta de hidratação diária atingida.',
      emoji: '💧',
      target: 1,
      getCurrent: () => ctx.waterGoalMet ? 1 : 0,
    },
  ];

  return DEFINITIONS.map((def) => {
    const s = stored.current[def.id];
    const current = def.getCurrent();
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      emoji: def.emoji,
      unlocked: !!s,
      unlockedAt: s?.unlockedAt,
      target: def.target,
      current,
      progress: Math.round((current / def.target) * 100),
    };
  });
}
