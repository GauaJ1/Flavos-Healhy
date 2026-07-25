import { describe, it, expect } from 'vitest';
import { calculateHarmonyScore } from './nutritionScore';

describe('calculateHarmonyScore (Fase 1.3 - Saúde 360°)', () => {
  it('deve retornar score capado em 100 para valores excelentes', () => {
    const res = calculateHarmonyScore(95, 8, 12000);
    expect(res.score).toBeLessThanOrEqual(100);
    expect(res.score).toBeGreaterThanOrEqual(85);
    expect(res.label).toBe('Dia de Alta Performance');
    expect(res.color).toBe('text-emerald-400');
  });

  it('deve usar o fator multiplicador de sono correto sem penalidade severa', () => {
    // Sono < 6h reduz o multiplicador para 0.9 (suavizado)
    const normalSleep = calculateHarmonyScore(80, 8, 5000);
    const lowSleep = calculateHarmonyScore(80, 5, 5000);

    expect(lowSleep.score).toBeLessThan(normalSleep.score);
    // Não deve zerar nem usar rótulo punitivo
    expect(lowSleep.label).not.toContain('Atenção');
    expect(lowSleep.label).not.toContain('Ruim');
  });

  it('deve limitar o bônus de passos em no máximo 10 pontos', () => {
    const highSteps = calculateHarmonyScore(70, null, 30000);
    const maxStepsBonus = Math.floor(30000 / 1500); // 20, mas capado em 10
    expect(maxStepsBonus).toBe(20);

    const expectedScore = Math.round(70 * 0.8 * 1.0 + 10);
    expect(highSteps.score).toBe(expectedScore);
  });

  it('deve usar rótulo "Dia Mais Leve" e cor neutra "text-slate-400" para pontuação baixa', () => {
    const res = calculateHarmonyScore(30, 4, 1000);
    expect(res.label).toBe('Dia Mais Leve');
    expect(res.color).toBe('text-slate-400');
  });
});
