/**
 * useWeeklyCycleReminder — Agenda lembrete de notificação semanal para atualizar a rotina
 * de treinos e re-calibrar o ciclo de carboidratos toda semana.
 */
import { useState, useCallback, useEffect } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WeeklyReminderState {
  enabled: boolean;
  permissionStatus: 'granted' | 'denied' | 'prompt' | 'unknown';
  nextScheduledAt: string | null;
  lastTriggeredAt: string | null;
  lastWeekConfirmedAt: string | null; // Última vez que o usuário atualizou e salvou a rotina
}

// ── Constants ──────────────────────────────────────────────────────────────────

export const NOTIFICATION_ID = 9001;
export const REMINDER_DAY = 0; // 0 = Domingo (getDay())
export const REMINDER_HOUR = 22;
export const REMINDER_MINUTE = 0;
const STORAGE_KEY = 'flavos_weekly_reminder';

const DEFAULT_STATE: WeeklyReminderState = {
  enabled: false,
  permissionStatus: 'unknown',
  nextScheduledAt: null,
  lastTriggeredAt: null,
  lastWeekConfirmedAt: null,
};

// ── Date Helper ────────────────────────────────────────────────────────────────

export function getNextOccurrence(targetDay: number, hour: number, minute: number, now = new Date()): Date {
  const resultDate = new Date(now);
  resultDate.setHours(hour, minute, 0, 0);

  const currentDay = now.getDay();
  let daysToAdd = targetDay - currentDay;

  // Se o dia alvo é hoje mas já passou, ou se é no passado desta semana, joga para a próxima semana (+7 dias)
  if (daysToAdd < 0 || (daysToAdd === 0 && now.getTime() >= resultDate.getTime())) {
    daysToAdd += 7;
  }

  resultDate.setDate(resultDate.getDate() + daysToAdd);
  return resultDate;
}

// ── Main Hook ──────────────────────────────────────────────────────────────────

export function useWeeklyCycleReminder() {
  const [state, setState] = useState<WeeklyReminderState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  });

  const persistState = useCallback((updates: Partial<WeeklyReminderState>) => {
    setState(prev => {
      const updated = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Cria canal para Android 8+
  const ensureChannel = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.createChannel({
        id: 'weekly_routine',
        name: 'Lembrete semanal de rotina',
        description: 'Lembrete para atualizar sua semana de treinos no ciclo de carboidratos',
        importance: 4, // alta (Heads-up)
        visibility: 1, // público
        sound: 'default',
      });
    } catch (err) {
      console.error('Falha ao criar canal de notificação:', err);
    }
  }, []);

  // Cancela a notificação pendente
  const disable = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
      } catch (err) {
        console.error('Falha ao cancelar notificação:', err);
      }
    }
    persistState({ enabled: false, nextScheduledAt: null });
  }, [persistState]);

  // Agenda/Habilita a notificação semanal
  const enable = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      // Degradação graciosa no PWA/Web: habilita estado local apenas
      persistState({
        enabled: true,
        permissionStatus: 'granted',
        nextScheduledAt: getNextOccurrence(REMINDER_DAY, REMINDER_HOUR, REMINDER_MINUTE).toISOString(),
      });
      return;
    }

    try {
      await ensureChannel();

      // Checa permissões atuais
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        perm = await LocalNotifications.requestPermissions();
        if (perm.display !== 'granted') {
          persistState({ permissionStatus: 'denied', enabled: false });
          return;
        }
      }

      // Calcula próximo agendamento
      const nextSunday = getNextOccurrence(REMINDER_DAY, REMINDER_HOUR, REMINDER_MINUTE);

      // Limpa agendamentos anteriores com mesmo ID para evitar duplicação
      await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });

      // Agendar
      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIFICATION_ID,
            title: 'Hora de planejar sua semana 🔄',
            body: 'Atualize sua rotina de treinos para o ciclo de carboidratos desta semana.',
            schedule: {
              on: { weekday: 1, hour: REMINDER_HOUR, minute: REMINDER_MINUTE }, // 1 = Domingo no LocalNotifications do Capacitor
              allowWhileIdle: true,
            },
            extra: { deepLink: 'carbCycle:update' },
            channelId: 'weekly_routine',
            smallIcon: 'ic_stat_flavos',
          },
        ],
      });

      persistState({
        enabled: true,
        permissionStatus: 'granted',
        nextScheduledAt: nextSunday.toISOString(),
      });
    } catch (err) {
      console.error('Erro ao agendar lembrete semanal:', err);
      persistState({ enabled: false });
    }
  }, [persistState, ensureChannel]);

  // Solicita permissão runtime explicitamente
  const requestPermission = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return 'granted';
    try {
      const req = await LocalNotifications.requestPermissions();
      persistState({ permissionStatus: req.display });
      return req.display;
    } catch {
      return 'denied';
    }
  }, [persistState]);

  // Função para marcar a semana como confirmada/atualizada hoje
  const confirmWeekUpdated = useCallback(() => {
    persistState({
      lastWeekConfirmedAt: new Date().toISOString(),
    });
  }, [persistState]);

  // Sincroniza permissões no mount
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.checkPermissions().then(perm => {
        persistState({ permissionStatus: perm.display });
      }).catch(() => {});
    }
  }, [persistState]);

  return {
    state,
    enable,
    disable,
    requestPermission,
    confirmWeekUpdated,
  };
}
