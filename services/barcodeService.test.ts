import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchProductByBarcode,
  mapNovaGroupToProcessingLevel,
  parsePackageWeight,
  parseAllergens,
} from './barcodeService';

describe('barcodeService (Fase 1.1 - Scanner de Código de Barras)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve mapear o grupo NOVA para o enum canônico de processingLevel com espaço', () => {
    expect(mapNovaGroupToProcessingLevel(1)).toBe('in natura');
    expect(mapNovaGroupToProcessingLevel(2)).toBe('minimamente processado');
    expect(mapNovaGroupToProcessingLevel(3)).toBe('processado');
    expect(mapNovaGroupToProcessingLevel(4)).toBe('ultraprocessado');
    expect(mapNovaGroupToProcessingLevel(null)).toBe('processado');
    expect(mapNovaGroupToProcessingLevel(undefined)).toBe('processado');
  });

  it('parsePackageWeight extrai corretamente de "400 g" e de product_quantity numérico', () => {
    expect(parsePackageWeight('400 g', undefined)).toBe(400);
    expect(parsePackageWeight('200g', undefined)).toBe(200);
    expect(parsePackageWeight(undefined, 350)).toBe(350);
    expect(parsePackageWeight(undefined, '140')).toBe(140);
    expect(parsePackageWeight(undefined, undefined)).toBeUndefined();
  });

  it('parseAllergens remove o prefixo "en:" e substitui hifens por espaços', () => {
    const tags = ['en:gluten', 'en:milk-and-dairy', 'en:soybeans'];
    const parsed = parseAllergens(tags);
    expect(parsed).toEqual(['gluten', 'milk and dairy', 'soybeans']);
    expect(parseAllergens(undefined)).toEqual([]);
  });

  it('deve extrair e montar um FoodItem e sourceData válidos quando o produto for encontrado na Open Food Facts', async () => {
    const mockOFFResponse = {
      status: 1,
      product: {
        product_name_pt: 'Biscoito de Polvilho',
        brands: 'Yoki',
        quantity: '100 g',
        serving_quantity: 100,
        serving_size: 'unidade',
        nova_group: 4,
        nutriscore_grade: 'd',
        allergens_tags: ['en:gluten'],
        nutriments: {
          'energy-kcal_100g': 430,
          carbohydrates_100g: 80,
          proteins_100g: 1.5,
          fat_100g: 12,
          fiber_100g: 1,
          sugars_100g: 2,
          sodium_100g: 0.1, // 0.1g = 100mg
        },
      },
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockOFFResponse,
    } as Response);

    const res = await fetchProductByBarcode('7891000100103');

    expect(res.found).toBe(true);
    expect(res.product).toBeDefined();
    expect(res.product?.name).toBe('Biscoito de Polvilho');
    expect(res.product?.calories).toBe(430);
    expect(res.product?.processingLevel).toBe('ultraprocessado');

    expect(res.sourceData).toBeDefined();
    expect(res.sourceData?.brand).toBe('Yoki');
    expect(res.sourceData?.packageNetWeightGrams).toBe(100);
    expect(res.sourceData?.nutriScoreGrade).toBe('d');
    expect(res.sourceData?.allergens).toEqual(['gluten']);
  });

  it('deve retornar found: false quando o produto não existir na base', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 0 }),
    } as Response);

    const res = await fetchProductByBarcode('0000000000000');
    expect(res.found).toBe(false);
    expect(res.errorMessage).toContain('Produto não encontrado');
  });

  it('deve tratar erros de rede com fallback seguro', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Failed'));

    const res = await fetchProductByBarcode('7891000100103');
    expect(res.found).toBe(false);
    expect(res.errorMessage).toContain('Falha na conexão');
  });
});

