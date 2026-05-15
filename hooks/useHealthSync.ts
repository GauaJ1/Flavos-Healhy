/**
 * Hook React para gerenciar sincronização com Health Connect / Samsung Health.
 * 
 * Fornece estado reativo sobre:
 * - Disponibilidade do Health Connect
 * - Status das permissões
 * - Estado de sincronização (loading, sucesso, erro)
 * - Preferência do usuário (sync habilitado/desabilitado)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  isNativePlatform,
  isHealthConnectAvailable,
  hasHealthPermissions,
  requestHealthPermissions,
  syncMeal,
  syncHydration,
  syncWeight,
} from '../services/healthSyncService';
import type { HistoryEntry } from '../types';

const SYNC_PREF_KEY = 'flavos_health_sync_enabled';

interface HealthSyncState {
  /** Se estamos rodando em plataforma nativa (Android via Capacitor) */
  isNative: boolean;
  /** Se o Health Connect está disponível no dispositivo */
  isAvailable: boolean;
  /** Se todas as permissões necessárias foram concedidas */
  hasPermissions: boolean;
  /** Se o usuário habilitou a sincronização */
  isSyncEnabled: boolean;
  /** Se uma operação de sync está em andamento */
  isSyncing: boolean;
  /** Última mensagem de sucesso */
  lastSyncMessage: string | null;
  /** Última mensagem de erro */
  lastSyncError: string | null;
}

export function useHealthSync() {
  const [state, setState] = useState<HealthSyncState>({
    isNative: false,
    isAvailable: false,
    hasPermissions: false,
    isSyncEnabled: false,
    isSyncing: false,
    lastSyncMessage: null,
    lastSyncError: null,
  });

  // Inicializar estado
  useEffect(() => {
    const init = async () => {
      const native = isNativePlatform();
      if (!native) {
        setState(prev => ({ ...prev, isNative: false }));
        return;
      }

      const available = await isHealthConnectAvailable();
      const permissions = available ? await hasHealthPermissions() : false;
      const syncPref = localStorage.getItem(SYNC_PREF_KEY) === 'true';

      setState(prev => ({
        ...prev,
        isNative: true,
        isAvailable: available,
        hasPermissions: permissions,
        isSyncEnabled: syncPref && permissions,
      }));
    };

    init();
  }, []);

  /**
   * Solicita permissões e habilita a sincronização.
   */
  const enableSync = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await requestHealthPermissions();

      if (granted) {
        localStorage.setItem(SYNC_PREF_KEY, 'true');
        setState(prev => ({
          ...prev,
          hasPermissions: true,
          isSyncEnabled: true,
          lastSyncMessage: 'Sincronização com Samsung Health ativada!',
          lastSyncError: null,
        }));
        return true;
      } else {
        setState(prev => ({
          ...prev,
          lastSyncError: 'Permissões não concedidas. Abra as configurações do Health Connect.',
        }));
        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        lastSyncError: 'Erro ao solicitar permissões.',
      }));
      return false;
    }
  }, []);

  /**
   * Desabilita a sincronização (não revoga permissões).
   */
  const disableSync = useCallback(() => {
    localStorage.setItem(SYNC_PREF_KEY, 'false');
    setState(prev => ({
      ...prev,
      isSyncEnabled: false,
      lastSyncMessage: 'Sincronização desativada.',
      lastSyncError: null,
    }));
  }, []);

  /**
   * Sincroniza uma refeição com o Health Connect.
   * Só executa se o sync estiver habilitado.
   */
  const syncMealEntry = useCallback(async (entry: HistoryEntry): Promise<boolean> => {
    if (!state.isSyncEnabled) return false;

    setState(prev => ({ ...prev, isSyncing: true, lastSyncError: null }));

    try {
      const success = await syncMeal(entry);

      if (success) {
        setState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncMessage: `✅ ${entry.foods.length} alimento(s) sincronizado(s) com Samsung Health`,
          lastSyncError: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          isSyncing: false,
          lastSyncError: 'Falha ao sincronizar com Health Connect.',
        }));
      }

      return success;
    } catch {
      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncError: 'Erro ao sincronizar refeição.',
      }));
      return false;
    }
  }, [state.isSyncEnabled]);

  /**
   * Sincroniza hidratação com o Health Connect.
   */
  const syncWaterIntake = useCallback(async (volumeMl: number): Promise<boolean> => {
    if (!state.isSyncEnabled) return false;

    try {
      const success = await syncHydration(volumeMl);
      if (success) {
        setState(prev => ({
          ...prev,
          lastSyncMessage: `💧 ${volumeMl}ml sincronizado com Samsung Health`,
        }));
      }
      return success;
    } catch {
      return false;
    }
  }, [state.isSyncEnabled]);

  /**
   * Sincroniza peso com o Health Connect.
   */
  const syncWeightEntry = useCallback(async (weightKg: number): Promise<boolean> => {
    if (!state.isSyncEnabled) return false;

    try {
      const success = await syncWeight(weightKg);
      if (success) {
        setState(prev => ({
          ...prev,
          lastSyncMessage: `⚖️ ${weightKg}kg sincronizado com Samsung Health`,
        }));
      }
      return success;
    } catch {
      return false;
    }
  }, [state.isSyncEnabled]);

  /**
   * Limpa mensagens de feedback.
   */
  const clearMessages = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastSyncMessage: null,
      lastSyncError: null,
    }));
  }, []);

  return {
    ...state,
    enableSync,
    disableSync,
    syncMealEntry,
    syncWaterIntake,
    syncWeightEntry,
    clearMessages,
  };
}
