import { useState, useEffect, useCallback } from 'react';
import type { HistoryEntry } from '../types';
import { classifyFoodGroup } from './useFoodDiversity';
import { generateWeeklyReportText } from '../services/geminiService';

export interface WeeklyReport {
  weekId: string;
  generatedAt: string;
  highlight: string;
  attention: string;
  suggestion: string;
  stats: {
    averageDailyCalories: number;
    averageDailyScore: number;
    averageDailyCarbs: number;
    averageDailyProtein: number;
    averageDailyFat: number;
    ultraProcessedPercent: number;
    averageEatingWindowHours: number;
    missingFoodGroups: string[];
    uniqueGroupsCount: number;
    totalMealsLogged: number;
  };
}

const REPORTS_KEY = 'flavos_weekly_reports';

export function useWeeklyReports(history: HistoryEntry[]) {
  const [latestReport, setLatestReport] = useState<WeeklyReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWeekId = useCallback((date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    // Ajustar para segunda-feira
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return `${monday.getFullYear()}-${monday.getMonth() + 1}-${monday.getDate()}`;
  }, []);

  const getPastWeekStats = useCallback((history: HistoryEntry[]) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekEntries = history.filter(e => new Date(e.date) >= oneWeekAgo && new Date(e.date) < new Date(new Date().setHours(0,0,0,0)));

    if (weekEntries.length === 0) return null;

    // Agrupar por dia
    const daily: Record<string, { calories: number; score: number; carbs: number; prot: number; fat: number; times: number[] }> = {};
    let totalFoods = 0;
    let ultraCount = 0;
    const groupsSeen = new Set<string>();

    weekEntries.forEach(entry => {
      const d = new Date(entry.date);
      const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!daily[dateKey]) {
        daily[dateKey] = { calories: 0, score: 0, carbs: 0, prot: 0, fat: 0, times: [] };
      }
      daily[dateKey].calories += entry.totalCalories;
      if (entry.nutritionScore) {
        daily[dateKey].score += entry.nutritionScore.total;
      }
      daily[dateKey].times.push(d.getHours() + d.getMinutes() / 60);

      entry.foods.forEach(food => {
        totalFoods++;
        if (food.processingLevel === 'ultraprocessado') {
          ultraCount++;
        }
        const group = classifyFoodGroup(food.name);
        if (group && group !== 'ultraprocessados') {
          groupsSeen.add(group);
        }
        daily[dateKey].carbs += food.carbohydrates || 0;
        daily[dateKey].prot += food.protein || 0;
        daily[dateKey].fat += food.fat || 0;
      });
    });

    const days = Object.keys(daily);
    const dayCount = days.length || 1;

    const avgCal = Object.values(daily).reduce((sum, d) => sum + d.calories, 0) / dayCount;
    const avgScore = Object.values(daily).reduce((sum, d) => sum + (d.score || 70), 0) / dayCount;
    const avgCarbs = Object.values(daily).reduce((sum, d) => sum + d.carbs, 0) / dayCount;
    const avgProt = Object.values(daily).reduce((sum, d) => sum + d.prot, 0) / dayCount;
    const avgFat = Object.values(daily).reduce((sum, d) => sum + d.fat, 0) / dayCount;

    // Janela alimentar média
    let totalWindow = 0;
    let windowDays = 0;
    Object.values(daily).forEach(d => {
      if (d.times.length >= 2) {
        const sorted = [...d.times].sort((a, b) => a - b);
        const win = sorted[sorted.length - 1] - sorted[0];
        totalWindow += win;
        windowDays++;
      }
    });
    const avgEatingWindow = windowDays > 0 ? totalWindow / windowDays : 12; // default 12h

    const allGroups = ['cereais', 'proteinas', 'leguminosas', 'vegetais', 'frutas', 'laticinios', 'gorduras'];
    const missingGroups = allGroups.filter(g => !groupsSeen.has(g));

    return {
      averageDailyCalories: Math.round(avgCal),
      averageDailyScore: Math.round(avgScore),
      averageDailyCarbs: Math.round(avgCarbs),
      averageDailyProtein: Math.round(avgProt),
      averageDailyFat: Math.round(avgFat),
      ultraProcessedPercent: totalFoods > 0 ? Math.round((ultraCount / totalFoods) * 100) : 0,
      averageEatingWindowHours: Math.round(avgEatingWindow * 10) / 10,
      missingFoodGroups: missingGroups,
      uniqueGroupsCount: groupsSeen.size,
      totalMealsLogged: weekEntries.length,
    };
  }, []);

  const loadReports = useCallback((): WeeklyReport[] => {
    try {
      const raw = localStorage.getItem(REPORTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const saveReport = useCallback((report: WeeklyReport) => {
    try {
      const reports = loadReports();
      // Remover report anterior da mesma semana se houver para atualizar
      const filtered = reports.filter(r => r.weekId !== report.weekId);
      filtered.push(report);
      localStorage.setItem(REPORTS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error('Erro ao salvar relatório semanal:', e);
    }
  }, [loadReports]);

  // Função para forçar a geração de um relatório
  const generateReportManually = useCallback(async () => {
    if (history.length < 3) {
      setError('Histórico insuficiente para gerar o relatório semanal. Registre pelo menos 3 refeições.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const stats = getPastWeekStats(history);
      if (!stats) {
        throw new Error('Nenhum dado encontrado nos últimos 7 dias.');
      }

      const weekId = getWeekId(new Date());
      const response = await generateWeeklyReportText(stats);

      const newReport: WeeklyReport = {
        weekId,
        generatedAt: new Date().toISOString(),
        highlight: response.highlight,
        attention: response.attention,
        suggestion: response.suggestion,
        stats,
      };

      saveReport(newReport);
      setLatestReport(newReport);

      // Despachar notificação / toast customizado
      dispatchNotification();
    } catch (e: any) {
      console.error('Erro ao gerar relatório semanal:', e);
      setError(e.message || 'Falha ao processar relatório semanal com IA.');
    } finally {
      setIsGenerating(false);
    }
  }, [history, getPastWeekStats, getWeekId, saveReport]);

  const dispatchNotification = () => {
    const event = new CustomEvent('flavos-weekly-report-ready', {
      detail: { message: '✨ Seu relatório semanal de IA está pronto! Acesse o Dashboard para conferir.' }
    });
    window.dispatchEvent(event);
  };

  // Autogeração quando muda de semana
  useEffect(() => {
    const reports = loadReports();
    const currentWeekId = getWeekId(new Date());
    const existing = reports.find(r => r.weekId === currentWeekId);

    if (existing) {
      setLatestReport(existing);
    } else {
      // Se não existe relatório para esta semana, vamos tentar gerar se houver histórico mínimo
      const stats = getPastWeekStats(history);
      if (stats && stats.totalMealsLogged >= 3 && history.length >= 3 && !isGenerating) {
        setIsGenerating(true);
        generateWeeklyReportText(stats)
          .then(response => {
            const newReport: WeeklyReport = {
              weekId: currentWeekId,
              generatedAt: new Date().toISOString(),
              highlight: response.highlight,
              attention: response.attention,
              suggestion: response.suggestion,
              stats,
            };
            saveReport(newReport);
            setLatestReport(newReport);
            dispatchNotification();
          })
          .catch(err => {
            console.error('Erro ao autogerar relatório semanal:', err);
          })
          .finally(() => {
            setIsGenerating(false);
          });
      }
    }
  }, [history, getWeekId, loadReports, saveReport, getPastWeekStats, isGenerating]);

  return { latestReport, generateReportManually, isGenerating, error };
}
