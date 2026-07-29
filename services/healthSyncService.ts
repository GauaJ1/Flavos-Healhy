/**
 * Flavos Healthy — Health Connect Sync Service
 * 
 * Bridge TypeScript entre o React app e o plugin nativo HealthSyncPlugin (Kotlin).
 * Gerencia sincronização de nutrição, hidratação e peso com o Samsung Health
 * via Google Health Connect.
 * 
 * Funciona apenas no Android nativo (Capacitor).
 * No browser (web/PWA), os métodos são no-op e retornam gracefully.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { FoodItem, HistoryEntry } from '../types';

// ──────────────────────────────────────────────────────────────
// Tipos do plugin nativo
// ──────────────────────────────────────────────────────────────

interface HealthSyncPlugin {
  checkAvailability(): Promise<{
    available: boolean;
    status: 'available' | 'unavailable' | 'update_required' | 'unknown';
  }>;

  requestHealthPermissions(): Promise<{
    allGranted: boolean;
    needsPrompt?: boolean;
    grantedCount: number;
    requiredCount: number;
  }>;

  checkHealthPermissions(): Promise<{
    nutritionWrite: boolean;
    hydrationWrite: boolean;
    weightWrite: boolean;
    nutritionRead: boolean;
    allGranted: boolean;
  }>;

  insertNutrition(options: {
    calories: number;
    protein?: number;
    carbohydrates?: number;
    fat?: number;
    sugar?: number;
    fiber?: number;
    sodium?: number;
    mealName?: string;
    mealType?: number;
    clientRecordId?: string;
  }): Promise<{
    success: boolean;
    recordIds: string;
    clientRecordId: string;
  }>;

  insertMeal(options: {
    foods: Array<{
      name: string;
      calories: number;
      protein?: number;
      carbohydrates?: number;
      fat?: number;
    }>;
    mealType?: number;
    entryId?: string;
  }): Promise<{
    success: boolean;
    recordCount: number;
    recordIds: string;
  }>;

  insertHydration(options: {
    volumeMl: number;
  }): Promise<{
    success: boolean;
    volumeMl: number;
  }>;

  insertWeight(options: {
    weightKg: number;
  }): Promise<{
    success: boolean;
    weightKg: number;
  }>;

  readSleepData(): Promise<{
    hasData: boolean;
    durationMinutes?: number;
    startTime?: string;
    endTime?: string;
    hasStageData: boolean;
    deepSleepPercent?: number | null;
    reason?: string;
  }>;

  readActivityData(): Promise<{
    steps: number;
    hasWorkout: boolean;
    workoutTitle?: string;
    workoutType?: string;
    activeCaloriesBurned: number;
  }>;
}

// Registrar plugin nativo — só funciona no Capacitor (Android)
const HealthSync = registerPlugin<HealthSyncPlugin>('HealthSync');

// ──────────────────────────────────────────────────────────────
// Meal Type Constants
// ──────────────────────────────────────────────────────────────

export const MealType = {
  UNKNOWN: 0,
  BREAKFAST: 1,
  LUNCH: 2,
  DINNER: 3,
  SNACK: 4,
} as const;

// ──────────────────────────────────────────────────────────────
// Detecção de plataforma
// ──────────────────────────────────────────────────────────────

/**
 * Verifica se estamos rodando em um contexto nativo (Capacitor Android).
 * No browser (web/PWA), retorna false.
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

// ──────────────────────────────────────────────────────────────
// API pública
// ──────────────────────────────────────────────────────────────

/**
 * Verifica se o Health Connect está disponível no dispositivo.
 * Retorna false silenciosamente no browser.
 */
export async function isHealthConnectAvailable(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const result = await HealthSync.checkAvailability();
    return result.available;
  } catch (error) {
    console.warn('[HealthSync] Erro ao verificar disponibilidade:', error);
    return false;
  }
}

/**
 * Verifica se todas as permissões de Health Connect estão concedidas.
 */
export async function hasHealthPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const result = await HealthSync.checkHealthPermissions();
    return result.allGranted;
  } catch {
    return false;
  }
}

/**
 * Solicita permissões de Health Connect ao usuário.
 * Retorna true se todas as permissões foram concedidas.
 */
export async function requestHealthPermissions(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const result = await HealthSync.requestHealthPermissions();
    return result.allGranted;
  } catch (error) {
    console.warn('[HealthSync] Erro ao solicitar permissões:', error);
    return false;
  }
}

/**
 * Sincroniza um único alimento com o Health Connect.
 */
export async function syncFoodItem(food: FoodItem): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const result = await HealthSync.insertNutrition({
      calories: food.calories,
      protein: food.protein,
      carbohydrates: food.carbohydrates,
      fat: food.fat,
      mealName: food.name,
      clientRecordId: `flavos_food_${food.id}`,
    });

    return result.success;
  } catch (error) {
    console.error('[HealthSync] Erro ao sincronizar alimento:', error);
    return false;
  }
}

/**
 * Sincroniza uma refeição completa (múltiplos alimentos) com o Health Connect.
 * Cada alimento vira um NutritionRecord separado para detalhamento.
 */
export async function syncMeal(entry: HistoryEntry): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const foods = entry.foods.map(food => ({
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbohydrates: food.carbohydrates,
      fat: food.fat,
    }));

    const result = await HealthSync.insertMeal({
      foods,
      entryId: String(entry.id),
    });

    return result.success;
  } catch (error) {
    console.error('[HealthSync] Erro ao sincronizar refeição:', error);
    return false;
  }
}

/**
 * Sincroniza ingestão de água com o Health Connect.
 * @param volumeMl Volume em mililitros
 */
export async function syncHydration(volumeMl: number): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const result = await HealthSync.insertHydration({ volumeMl });
    return result.success;
  } catch (error) {
    console.error('[HealthSync] Erro ao sincronizar hidratação:', error);
    return false;
  }
}

/**
 * Sincroniza peso corporal com o Health Connect.
 * @param weightKg Peso em quilogramas
 */
export async function syncWeight(weightKg: number): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
    const result = await HealthSync.insertWeight({ weightKg });
    return result.success;
  } catch (error) {
    console.error('[HealthSync] Erro ao sincronizar peso:', error);
    return false;
  }
}

/**
 * Lê a sessão de sono principal das últimas 24h via Health Connect.
 * Retorna durationMinutes (apenas se >= 180 min). No browser, retorna hasData: false.
 */
export async function readSleepData(): Promise<{
  hasData: boolean;
  durationMinutes?: number;
  startTime?: string;
  endTime?: string;
  hasStageData: boolean;
  deepSleepPercent?: number | null;
  reason?: string;
}> {
  if (!isNativePlatform()) {
    return { hasData: false, hasStageData: false, reason: 'Health Connect disponível apenas no Android nativo' };
  }
  try {
    return await HealthSync.readSleepData();
  } catch (error) {
    console.error('[HealthSync] Erro ao ler sono:', error);
    return { hasData: false, hasStageData: false, reason: 'Falha ao ler dados de sono' };
  }
}

/**
 * Lê a contagem de passos agregada, exercício e calorias ativas do dia via Health Connect.
 * No browser, retorna steps: 0, activeCaloriesBurned: 0.
 */
export async function readActivityData(): Promise<{
  steps: number;
  hasWorkout: boolean;
  workoutTitle?: string;
  workoutType?: string;
  activeCaloriesBurned: number;
}> {
  if (!isNativePlatform()) {
    return { steps: 0, hasWorkout: false, activeCaloriesBurned: 0 };
  }
  try {
    return await HealthSync.readActivityData();
  } catch (error) {
    console.error('[HealthSync] Erro ao ler atividade:', error);
    return { steps: 0, hasWorkout: false, activeCaloriesBurned: 0 };
  }
}
