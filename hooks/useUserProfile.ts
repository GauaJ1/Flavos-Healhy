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

const PROTEIN_GKG: Record<ActivityLevel, { min: number; ideal: number; max: number }> = {
  sedentario:    { min: 0.8, ideal: 1.0, max: 1.2 },
  leve:          { min: 1.0, ideal: 1.2, max: 1.4 },
  moderado:      { min: 1.2, ideal: 1.4, max: 1.6 },
  intenso:       { min: 1.4, ideal: 1.8, max: 2.0 },
  muito_intenso: { min: 1.6, ideal: 2.0, max: 2.2 },
};

const CARBS_GKG: Record<ActivityLevel, { min: number; ideal: number; max: number }> = {
  sedentario:    { min: 3, ideal: 3.5, max: 4 },
  leve:          { min: 4, ideal: 4.5, max: 5 },
  moderado:      { min: 5, ideal: 6,   max: 7 },
  intenso:       { min: 6, ideal: 8,   max: 10 },
  muito_intenso: { min: 8, ideal: 10,  max: 12 },
};

const FAT_FLOOR_GKG = 0.8;

export function calcTargets(profile: UserProfile): NutritionalTargets {
  const age = new Date().getFullYear() - profile.birthYear;
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age;
  const tmb = profile.sex === 'M' ? base + 5 : base - 161;
  const tdee = Math.round(tmb * ACTIVITY_FACTOR[profile.activityLevel]);
  const targetKcal = Math.max(1200, tdee + GOAL_DELTA[profile.goal]);

  // Bônus de proteína por objetivo (ISSN: preservar massa magra em déficit)
  // perder_peso: +0.2 g/kg | manter: 0 | ganhar_massa: 0
  const PROTEIN_GOAL_BONUS: Record<Goal, number> = {
    perder_peso:  0.2,
    manter:       0.0,
    ganhar_massa: 0.0,
  };
  const proteinBonus = PROTEIN_GOAL_BONUS[profile.goal] ?? 0;
  let proteinG = Math.round(
    profile.weightKg * (PROTEIN_GKG[profile.activityLevel].ideal + proteinBonus),
  );
  let carbsG   = Math.round(profile.weightKg * CARBS_GKG[profile.activityLevel].ideal);

  let fatKcal = targetKcal - (proteinG * 4) - (carbsG * 4);
  let fatG = Math.round(fatKcal / 9);

  const fatFloor = Math.round(profile.weightKg * FAT_FLOOR_GKG);
  if (fatG < fatFloor) {
    const deficitKcal = (fatFloor - fatG) * 9;
    carbsG = Math.round(carbsG - (deficitKcal / 4));
    fatG = fatFloor;
  }

  return {
    tmbKcal: Math.round(tmb),
    tdeeKcal: tdee,
    targetKcal,
    targetProtein_g: proteinG,
    targetCarbs_g: Math.max(carbsG, 0),
    targetFat_g: fatG,
  };
}

export type MealRole = 'pre_treino' | 'pos_treino' | 'normal';

export interface MealConfig {
  type: string;
  role: MealRole;
}

export interface MealMacroPlan {
  type: string;
  role: MealRole;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

const CARB_SHARE_PRE_TREINO = 0.20;
const CARB_SHARE_POS_TREINO = 0.25;
const FAT_SHARE_PER_TRAINING_MEAL = 0.075;

export function distributeMeals(targets: NutritionalTargets, meals: MealConfig[]): MealMacroPlan[] {
  const proteinPerMeal = targets.targetProtein_g / meals.length;

  const preTreino = meals.find(m => m.role === 'pre_treino');
  const posTreino = meals.find(m => m.role === 'pos_treino');
  const normalMeals = meals.filter(m => m.role === 'normal');

  const carbPre = preTreino ? targets.targetCarbs_g * CARB_SHARE_PRE_TREINO : 0;
  const carbPos = posTreino ? targets.targetCarbs_g * CARB_SHARE_POS_TREINO : 0;
  const carbNormalTotal = targets.targetCarbs_g - carbPre - carbPos;
  const carbPerNormal = normalMeals.length ? carbNormalTotal / normalMeals.length : 0;

  const trainingMealsCount = [preTreino, posTreino].filter(Boolean).length;
  const fatPerTrainingMeal = targets.targetFat_g * FAT_SHARE_PER_TRAINING_MEAL;
  const fatNormalTotal = targets.targetFat_g - fatPerTrainingMeal * trainingMealsCount;
  const fatPerNormal = normalMeals.length ? fatNormalTotal / normalMeals.length : 0;

  return meals.map(m => ({
    type: m.type,
    role: m.role,
    protein_g: Math.round(proteinPerMeal),
    carbs_g: Math.round(
      m.role === 'pre_treino' ? carbPre :
      m.role === 'pos_treino' ? carbPos : carbPerNormal
    ),
    fat_g: Math.round(m.role === 'normal' ? fatPerNormal : fatPerTrainingMeal),
  }));
}

export function carbLoadStrategy(targetCarbs_g: number, weightKg: number, currentMealCount: number) {
  const gPerKg = targetCarbs_g / weightKg;

  if (gPerKg <= 6) {
    return {
      recommendedMealCount: currentMealCount,
      tip: 'Distribuição padrão é suficiente — sem necessidade de ajustes.',
    };
  }

  if (gPerKg <= 9) {
    return {
      recommendedMealCount: Math.max(currentMealCount, 5),
      tip: 'Considere incluir uma vitamina/shake (aveia + banana + leite + pasta de amendoim + mel) como uma das refeições — concentra bastante carboidrato e caloria com baixo volume e digestão mais rápida.',
    };
  }

  return {
    recommendedMealCount: 6,
    tip: 'Volume diário alto. Priorize fontes calóricas densas (aveia, granola, tapioca, batata doce, pão, frutas secas, mel) em pelo menos 2 refeições, e reserve saladas/vegetais de alto volume para apenas 1-2 refeições no dia, para não antecipar a saciedade.',
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
