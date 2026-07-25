/**
 * pdfExportService.ts — Exportação de dados 100% client-side.
 *
 * Nenhuma chamada de rede. Funciona offline. Atende LGPD Art. 18
 * (direito de acesso e portabilidade de dados pessoais).
 *
 * Funções disponíveis:
 * - exportHistoryToCSV(history): exporta histórico de refeições em CSV (RFC 4180)
 * - exportFullUserData(): exporta TODOS os dados locais em JSON (portabilidade LGPD)
 */

import type { HistoryEntry } from '../types';

// ────────────────────────────────────────────────────────
// Helpers internos
// ────────────────────────────────────────────────────────

/**
 * Escaping CSV real conforme RFC 4180.
 * Campos com vírgula, aspas ou quebra de linha são envolvidos em aspas duplas.
 * Aspas internas são duplicadas ("").
 */
function escapeCSVField(field: string | number | undefined | null): string {
  const str = String(field ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.setAttribute('href', dataUrl);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ────────────────────────────────────────────────────────
// Exportação de histórico de refeições (CSV)
// ────────────────────────────────────────────────────────

/**
 * Exporta o histórico de refeições para um arquivo CSV abrível no Excel/Sheets.
 * Usa `;` como separador interno de listas para não colidir com `,` do CSV.
 */
export function exportHistoryToCSV(history: HistoryEntry[]): void {
  const headers = ['ID', 'Data', 'Calorias (kcal)', 'Proteína (g)', 'Carboidratos (g)', 'Gordura (g)', 'Alimentos'];

  const rows = history.map(entry => {
    const totalProtein = entry.foods.reduce((s, f) => s + (f.protein || 0), 0);
    const totalCarbs = entry.foods.reduce((s, f) => s + (f.carbohydrates || 0), 0);
    const totalFat = entry.foods.reduce((s, f) => s + (f.fat || 0), 0);
    const foodList = entry.foods.map(f => `${f.name} (${f.calories}kcal)`).join('; ');

    return [
      entry.id,
      new Date(entry.date).toLocaleString('pt-BR'),
      Math.round(entry.totalCalories ?? 0),
      Math.round(totalProtein * 10) / 10,
      Math.round(totalCarbs * 10) / 10,
      Math.round(totalFat * 10) / 10,
      foodList,
    ].map(escapeCSVField);
  });

  // BOM UTF-8 (\uFEFF) para garantir que Excel abra corretamente em Windows
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCSVField).join(','), ...rows.map(r => r.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `flavos-healthy-historico-${Date.now()}.csv`);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ────────────────────────────────────────────────────────
// Exportação completa LGPD (JSON — portabilidade de dados)
// ────────────────────────────────────────────────────────

/**
 * Coleta e exporta TODOS os dados do usuário armazenados no localStorage.
 * Cobertura das 5 categorias exigidas pelo LGPD Art. 18:
 * perfil, refeições, peso, hidratação e bem-estar.
 */
export function exportFullUserData(): void {
  const safeGet = (key: string): unknown => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? 'null');
    } catch {
      return null;
    }
  };

  // Agrega todas as chaves de hidratação (flavos_hydration_YYYY-MM-DD)
  const hydrationKeys = Object.keys(localStorage).filter(k => k.startsWith('flavos_hydration_'));
  const hydrationLogs: Record<string, unknown> = {};
  for (const key of hydrationKeys) {
    hydrationLogs[key.replace('flavos_hydration_', '')] = safeGet(key);
  }

  const fullData = {
    exportedAt: new Date().toISOString(),
    exportVersion: '1.0',
    appVersion: '5.0',
    profile: safeGet('flavos_user_profile'),
    mealHistory: safeGet('flavos_meal_history'),
    weightLog: safeGet('flavos_weight_log'),
    hydrationLogs,
    wellbeingLogs: safeGet('flavos_wellbeing_log'),
  };

  downloadJSON(fullData, `flavos-healthy-dados-completos-${Date.now()}.json`);
}
