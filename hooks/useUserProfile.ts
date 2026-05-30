/**
 * useUserProfile — Perfil físico do usuário + cálculo de TMB/TDEE.
 *
 * Fórmula Mifflin-St Jeor (conforme Documentacao_Tecnica.md):
 * - TMB homem = 10×peso + 6,25×altura − 5×idade + 5
 * - TMB mulher = 10×peso + 6,25×altura − 5×idade − 161
 * - TDEE = TMB × fator de atividade
 * - Meta = TDEE + delta por objetivo
 */
import { useState, useEffect, useCallback, useMemo } from 'react';

export type Sex = 'M' | 'F' | 'O';
export type ActivityLevel = 'sedentario' | 'leve' | 'moderado' | 'intenso' | 'muito_intenso';
export type Goal = 'perder_peso' | 'manter' | 'ganhar_massa';

export interface UserProfile {
  name: string;
  birthYear: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}

export interface NutritionalTargets {
  tmbKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  targetProtein_g: number;
  targetCarbs_g: number;
  targetFat_g: number;
}

const PROFILE_KEY = 'flavos_user_profile';

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentario:    1.2,
  leve:          1.375,
  moderado:      1.55,
  intenso:       1.725,
  muito_intenso: 1.9,
};

const GOAL_DELTA: Record<Goal, number> = {
  perder_peso:  -300,
  manter:        0,
  ganhar_massa: +300,
};

export function calcTargets(profile: UserProfile): NutritionalTargets {
  const age = new Date().getFullYear() - profile.birthYear;
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age;
  const tmb = profile.sex === 'M' ? base + 5 : base - 161;
  const tdee = Math.round(tmb * ACTIVITY_FACTOR[profile.activityLevel]);
  const targetKcal = Math.max(1200, tdee + GOAL_DELTA[profile.goal]);

  return {
    tmbKcal: Math.round(tmb),
    tdeeKcal: tdee,
    targetKcal,
    targetProtein_g: Math.round((targetKcal * 0.30) / 4),
    targetCarbs_g:   Math.round((targetKcal * 0.45) / 4),
    targetFat_g:     Math.round((targetKcal * 0.25) / 9),
  };
}

export function loadUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(() => loadUserProfile());

  useEffect(() => {
    const stored = loadUserProfile();
    if (stored) setProfile(stored);
  }, []);

  const updateProfile = useCallback((p: UserProfile) => {
    saveUserProfile(p);
    setProfile(p);
  }, []);

  const targets = useMemo<NutritionalTargets | null>(() => {
    if (!profile) return null;
    return calcTargets(profile);
  }, [profile]);

  const hasProfile = profile !== null;

  return { profile, targets, hasProfile, updateProfile };
}
