import { describe, it, expect, vi } from 'vitest';
import { getNextOccurrence, NOTIFICATION_ID } from './useWeeklyCycleReminder';

// Mock do local-notifications do Capacitor
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    schedule: vi.fn().mockResolvedValue(null),
    cancel: vi.fn().mockResolvedValue(null),
    createChannel: vi.fn().mockResolvedValue(null),
  },
}));

describe('useWeeklyCycleReminder - getNextOccurrence', () => {
  it('getNextOccurrence calcula corretamente a partir de quarta-feira', () => {
    // Quarta-feira, 25 de Junho de 2026, 12:00:00
    const now = new Date('2026-06-25T12:00:00Z');
    // Alvo: Domingo (0) às 22:00
    const nextSunday = getNextOccurrence(0, 22, 0, now);
    
    // Próximo domingo deve ser 29 de Junho de 2026 às 22:00
    expect(nextSunday.getUTCFullYear()).toBe(2026);
    expect(nextSunday.getUTCMonth()).toBe(5); // 0-indexed (Junho = 5)
    // O getNextOccurrence ajusta o fuso local, vamos checar o getDay e as horas locally
    expect(nextSunday.getDay()).toBe(0); // Domingo
    expect(nextSunday.getHours()).toBe(22);
    expect(nextSunday.getMinutes()).toBe(0);
  });

  it('getNextOccurrence calcula corretamente quando hoje é domingo 23h (já passou — pula pro próximo domingo)', () => {
    // Domingo, 28 de Junho de 2026, 23:00:00
    const now = new Date('2026-06-28T23:00:00');
    // Alvo: Domingo (0) às 22:00
    const nextSunday = getNextOccurrence(0, 22, 0, now);

    // Deve pular para o próximo domingo, 5 de Julho de 2026
    expect(nextSunday.getDate()).toBe(5);
    expect(nextSunday.getMonth()).toBe(6); // Julho = 6
    expect(nextSunday.getDay()).toBe(0); // Domingo
    expect(nextSunday.getHours()).toBe(22);
  });
});
