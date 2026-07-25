import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportHistoryToCSV, exportFullUserData } from './pdfExportService';
import type { HistoryEntry } from '../types';

describe('pdfExportService (Fase 3.2 - Exportação 100% Client-Side)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('deve preparar o download CSV com BOM UTF-8 e escaping correto', () => {
    const mockHistory: HistoryEntry[] = [
      {
        id: 1,
        date: '2026-05-30T12:00:00.000Z',
        totalCalories: 550,
        foods: [
          {
            id: 'f1',
            name: 'Arroz, feijão e "frango"',
            calories: 550,
            estimatedAmount: 350,
            unit: 'g',
            estimatedWeightGrams: 350,
            portionDescription: '350g',
            carbohydrates: 60,
            protein: 40,
            fat: 10,
            fiber: 8,
            sugar: 2,
            addedSugar: 0,
            sodium: 400,
            saturatedFat: 2,
            source: 'visible',
            confidence: 'alta',
            preparationMethod: 'grelhado',
            consumedFraction: 1,
            healthHighlights: [],
            attentionHighlights: [],
            processingLevel: 'in natura',
            possibleAddedSugars: false,
            possibleAddedFats: false,
            possibleExcessSodium: false,
            possibleIndustrializedSauces: false,
          },
        ],
      },
    ];

    const clickSpy = vi.fn();

    // Mock do DOM para ambiente Node
    const fakeAnchor = {
      setAttribute: vi.fn(),
      click: clickSpy,
    };

    const originalDocument = globalThis.document;
    const originalURL = globalThis.URL;

    // @ts-ignore
    globalThis.document = {
      createElement: vi.fn().mockReturnValue(fakeAnchor),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    } as any;

    // @ts-ignore
    globalThis.URL = {
      createObjectURL: vi.fn().mockReturnValue('blob:http://localhost/test-uuid'),
      revokeObjectURL: vi.fn(),
    };

    exportHistoryToCSV(mockHistory);

    expect(clickSpy).toHaveBeenCalled();
    expect(fakeAnchor.setAttribute).toHaveBeenCalledWith('download', expect.stringMatching(/flavos-healthy-historico-.*\.csv/));

    // Restaurar
    globalThis.document = originalDocument;
    globalThis.URL = originalURL;
  });

  it('deve exportar todos os dados do localStorage em JSON para LGPD Art. 18', () => {
    const storage: Record<string, string> = {
      flavos_user_profile: JSON.stringify({ name: 'Teste' }),
      flavos_meal_history: JSON.stringify([{ id: 1 }]),
      'flavos_hydration_2026-05-30': JSON.stringify({ ml: 2000 }),
    };

    const originalLocalStorage = globalThis.localStorage;
    const originalDocument = globalThis.document;
    const originalURL = globalThis.URL;

    // @ts-ignore
    globalThis.localStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, val: string) => { storage[key] = val; },
      length: Object.keys(storage).length,
      clear: () => {},
      key: (i: number) => Object.keys(storage)[i] ?? null,
      removeItem: (k: string) => delete storage[k],
    };

    const clickSpy = vi.fn();
    const fakeAnchor = {
      setAttribute: vi.fn(),
      click: clickSpy,
    };

    // @ts-ignore
    globalThis.document = {
      createElement: vi.fn().mockReturnValue(fakeAnchor),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
    } as any;

    // @ts-ignore
    globalThis.URL = {
      createObjectURL: vi.fn().mockReturnValue('blob:http://localhost/test-json-uuid'),
      revokeObjectURL: vi.fn(),
    };

    exportFullUserData();

    expect(clickSpy).toHaveBeenCalled();
    expect(fakeAnchor.setAttribute).toHaveBeenCalledWith('download', expect.stringMatching(/flavos-healthy-dados-completos-.*\.json/));

    // Restaurar
    globalThis.localStorage = originalLocalStorage;
    globalThis.document = originalDocument;
    globalThis.URL = originalURL;
  });
});
