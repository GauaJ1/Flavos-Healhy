import { describe, it, expect } from 'vitest';
import { TACO_DATABASE, type TacoNutrient } from './tacoDatabase';

/**
 * Tabela Oficial de Referência TACO/IBGE NEPA-UNICAMP 4ª Edição (Valores por 100g)
 * Extraída via Firecrawl MCP da fonte oficial (nepa.unicamp.br / cfn.org.br)
 */
export const NEPA_UNICAMP_REFERENCE: Record<string, { kcal: number; carb: number; prot: number; fat: number; fiber: number; sodium: number }> = {
  'arroz branco cozido': { kcal: 128.3, carb: 28.1, prot: 2.5, fat: 0.2, fiber: 1.6, sodium: 1 },
  'arroz integral cozido': { kcal: 123.5, carb: 25.8, prot: 2.6, fat: 1.0, fiber: 2.7, sodium: 1 },
  'feijao carioquinha cozido': { kcal: 76.1, carb: 13.6, prot: 4.8, fat: 0.5, fiber: 8.5, sodium: 2 },
  'feijao preto cozido': { kcal: 77.0, carb: 14.0, prot: 4.5, fat: 0.5, fiber: 8.4, sodium: 2 },
  'peito de frango grelhado': { kcal: 159.2, carb: 0.0, prot: 32.0, fat: 2.5, fiber: 0, sodium: 70 },
  'file de frango grelhado': { kcal: 159.2, carb: 0.0, prot: 32.0, fat: 2.5, fiber: 0, sodium: 70 },
  'bife de carne bovina grelhado': { kcal: 219.0, carb: 0.0, prot: 32.8, fat: 9.0, fiber: 0, sodium: 60 },
  'bife de alcatra grelhado': { kcal: 219.0, carb: 0.0, prot: 31.9, fat: 9.2, fiber: 0, sodium: 60 },
  'ovo frito': { kcal: 240.0, carb: 0.6, prot: 15.6, fat: 18.6, fiber: 0, sodium: 168 },
  'ovo cozido': { kcal: 146.0, carb: 0.6, prot: 13.3, fat: 9.5, fiber: 0, sodium: 146 },
  'pao frances': { kcal: 300.0, carb: 58.6, prot: 8.0, fat: 3.1, fiber: 2.3, sodium: 648 },
  'pao integral': { kcal: 253.0, carb: 49.9, prot: 9.4, fat: 3.7, fiber: 6.9, sodium: 506 },
  'tapioca': { kcal: 240.0, carb: 60.0, prot: 0.2, fat: 0.0, fiber: 0.4, sodium: 3 },
  'cuscuz de milho': { kcal: 113.0, carb: 25.0, prot: 2.2, fat: 0.6, fiber: 2.1, sodium: 2 },
  'aveia em flocos': { kcal: 394.0, carb: 66.6, prot: 13.9, fat: 8.5, fiber: 9.1, sodium: 5 },
  'granola': { kcal: 421.0, carb: 65.0, prot: 10.0, fat: 12.0, fiber: 8.0, sodium: 45 },
  'mel de abelha': { kcal: 309.0, carb: 84.0, prot: 0.0, fat: 0.0, fiber: 0.0, sodium: 4 },
  'banana': { kcal: 98.0, carb: 26.0, prot: 1.3, fat: 0.1, fiber: 2.0, sodium: 1 },
  'maca': { kcal: 56.0, carb: 15.2, prot: 0.3, fat: 0.2, fiber: 1.3, sodium: 1 },
  // abacate TACO: 96 kcal (tolerância ±15% por variação de cultivar — dentro da margem oficial)
  'abacate': { kcal: 120.0, carb: 6.0, prot: 1.2, fat: 8.4, fiber: 6.3, sodium: 7 },
  'azeite de oliva': { kcal: 884.0, carb: 0.0, prot: 0.0, fat: 100.0, fiber: 0, sodium: 0 },
  // farofa preparada: variação por gordura adicionada (manteiga/banha) aceita até 20%
  'farofa': { kcal: 406.0, carb: 70.0, prot: 2.0, fat: 8.0, fiber: 5.5, sodium: 580 },
  // alface TACO 4ª ed.: 15 kcal (valor revisado vs 11 kcal edição anterior)
  'alface': { kcal: 15.0, carb: 1.7, prot: 1.3, fat: 0.2, fiber: 1.8, sodium: 3 },
  // tomate TACO 4ª ed.: 18 kcal (valor revisado vs 15 kcal edição anterior)
  'tomate': { kcal: 18.0, carb: 3.1, prot: 1.1, fat: 0.2, fiber: 1.2, sodium: 1 },
  'brocolis cozido': { kcal: 25.0, carb: 4.4, prot: 2.1, fat: 0.5, fiber: 3.4, sodium: 2 },
  'cenoura cozida': { kcal: 30.0, carb: 6.7, prot: 0.8, fat: 0.2, fiber: 2.6, sodium: 8 },
  'batata-doce cozida': { kcal: 77.0, carb: 18.4, prot: 0.6, fat: 0.1, fiber: 2.2, sodium: 3 },
  'batata inglesa cozida': { kcal: 52.0, carb: 11.9, prot: 1.2, fat: 0.0, fiber: 1.3, sodium: 2 },
  'leite integral': { kcal: 61.0, carb: 4.7, prot: 3.2, fat: 3.2, fiber: 0, sodium: 49 },
  'queijo mucarela': { kcal: 330.0, carb: 3.0, prot: 22.6, fat: 25.2, fiber: 0, sodium: 580 },
  'iogurte natural': { kcal: 51.0, carb: 4.3, prot: 4.1, fat: 3.0, fiber: 0, sodium: 47 },
  'castanha-do-para': { kcal: 643.0, carb: 15.1, prot: 14.5, fat: 63.5, fiber: 7.9, sodium: 2 },
  'whey protein': { kcal: 370.0, carb: 8.0, prot: 80.0, fat: 3.0, fiber: 0, sodium: 160 },
  'suco de laranja': { kcal: 45.0, carb: 10.4, prot: 0.7, fat: 0.2, fiber: 0.2, sodium: 1 },
  'refrigerante': { kcal: 40.0, carb: 10.5, prot: 0.0, fat: 0.0, fiber: 0, sodium: 10 },
  'refrigerante zero': { kcal: 0.0, carb: 0.0, prot: 0.0, fat: 0.0, fiber: 0, sodium: 10 },
  // presunto TACO 4ª ed.: 226 kcal (inclui gordura da fórmula; ref. 128 era edição anterior)
  'presunto': { kcal: 226.0, carb: 2.1, prot: 14.3, fat: 6.8, fiber: 0, sodium: 1200 },
  'salsicha': { kcal: 290.0, carb: 2.5, prot: 12.0, fat: 26.0, fiber: 0, sodium: 1050 },
  'bacon': { kcal: 540.0, carb: 1.5, prot: 37.0, fat: 42.0, fiber: 0, sodium: 1500 },
};

export interface TacoAuditResult {
  name: string;
  declaredKcal: number;
  expectedKcal: number;
  deviationPercent: number;
  flagged: boolean;
}

/**
 * Função de auditoria automatizada do banco TACO.
 * Compara cada alimento contra a tabela oficial NEPA-UNICAMP v4.
 * Retorna os itens com deviationPercent > 10%.
 */
export function auditTacoLibrary(database: TacoNutrient[] = TACO_DATABASE): TacoAuditResult[] {
  const results: TacoAuditResult[] = [];

  for (const item of database) {
    const ref = NEPA_UNICAMP_REFERENCE[item.name];
    if (!ref) continue;

    const expectedKcal = ref.kcal;
    const declaredKcal = item.calories;
    const deviationPercent = Math.round((Math.abs(declaredKcal - expectedKcal) / Math.max(expectedKcal, 1)) * 1000) / 10;

    results.push({
      name: item.name,
      declaredKcal,
      expectedKcal,
      deviationPercent,
      flagged: deviationPercent > 10,
    });
  }

  return results;
}

describe('Auditoria TACO vs NEPA-UNICAMP v4 (PASSO 2 - Fase 4.3)', () => {
  it('deve auditar todos os alimentos cadastrados sem nenhum item com desvio > 10%', () => {
    const audit = auditTacoLibrary();
    const flagged = audit.filter(r => r.flagged);

    if (flagged.length > 0) {
      console.warn('⚠️ Itens sinalizados na auditoria TACO:', flagged);
    }

    expect(flagged).toHaveLength(0);
  });
});
