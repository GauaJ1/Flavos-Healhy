import { describe, it, expect } from 'vitest';
import { calcTargets } from './useUserProfile';
import type { UserProfile } from './useUserProfile';

describe('Cálculos metabólicos - useUserProfile', () => {
  const profileMifflin: UserProfile = {
    name: 'Kaua',
    birthYear: 2000,
    sex: 'M',
    heightCm: 175,
    weightKg: 62,
    activityLevel: 'intenso',
    goal: 'ganhar_massa',
  };

  it('deve calcular a TMB usando Mifflin-St Jeor por padrão', () => {
    const targets = calcTargets(profileMifflin);
    // TMB Mifflin Homem = 10*62 + 6.25*175 - 5*26 + 5 = 620 + 1093.75 - 130 + 5 = 1588.75 (~1589)
    expect(targets.tmbKcal).toBe(1589);
    expect(targets.isCunningham).toBe(false);
  });

  it('deve calcular a TMB usando Cunningham se bodyFatPct for fornecido', () => {
    const profileCunningham: UserProfile = {
      ...profileMifflin,
      bodyFatPct: 10, // 10% de gordura corporal
    };
    const targets = calcTargets(profileCunningham);
    // LBM = 62 * (1 - 0.1) = 55.8 kg
    // TMB Cunningham = 370 + 21.6 * 55.8 = 370 + 1205.28 = 1575.28 (~1575)
    expect(targets.tmbKcal).toBe(1575);
    expect(targets.isCunningham).toBe(true);
  });

  it('deve aplicar override calórico se overrideTargetKcal for fornecido', () => {
    const targets = calcTargets(profileMifflin, 3435);
    expect(targets.targetKcal).toBe(3435);
    // O excedente calórico deve aumentar proporcionalmente carboidratos e gorduras mantendo proteína
    expect(targets.targetProtein_g).toBe(112); // 62 kg * 1.8 g/kg
  });
});
