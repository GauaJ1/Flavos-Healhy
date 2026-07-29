import { useState, useEffect, useCallback, useMemo } from 'react';
import type { HistoryEntry } from '../types';
import { generateCorrelationInsightText } from '../services/geminiService';

export interface WellbeingLog {
  id: string;
  meal_id?: string;
  logged_at: string;
  energy: number; // 1-5
  mood: number;   // 1-5
  sleep: number;  // 1-5 (sono da noite anterior)
  notes?: string;
}

const WELLBEING_KEY = 'flavos_wellbeing_logs';
const INSIGHT_KEY = 'flavos_wellbeing_insight';

export function useWellbeing(history: HistoryEntry[]) {
  const [logs, setLogs] = useState<WellbeingLog[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(() => {
    try {
      const raw = localStorage.getItem(WELLBEING_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const loadInsight = useCallback(() => {
    try {
      return localStorage.getItem(INSIGHT_KEY);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    setLogs(loadLogs());
    setInsight(loadInsight());
  }, [loadLogs, loadInsight]);

  const addLog = useCallback((logData: Omit<WellbeingLog, 'id' | 'logged_at'>) => {
    const newLog: WellbeingLog = {
      ...logData,
      id: `well_${Date.now()}`,
      logged_at: new Date().toISOString(),
    };
    setLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem(WELLBEING_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteLog = useCallback((id: string) => {
    setLogs(prev => {
      const updated = prev.filter(l => l.id !== id);
      localStorage.setItem(WELLBEING_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Agrupar estatísticas de correlação para os últimos 60 dias
  const correlationStats = useMemo(() => {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentLogs = logs.filter(l => new Date(l.logged_at) >= sixtyDaysAgo);
    const recentMeals = history.filter(m => new Date(m.date) >= sixtyDaysAgo);

    const stats = {
      protein_correlation: {
        baixa_proteina: { count: 0, sum_energy: 0, sum_mood: 0 },
        media_proteina: { count: 0, sum_energy: 0, sum_mood: 0 },
        alta_proteina: { count: 0, sum_energy: 0, sum_mood: 0 },
      },
      carb_correlation: {
        baixo_carb: { count: 0, sum_energy: 0, sum_mood: 0 },
        medio_carb: { count: 0, sum_energy: 0, sum_mood: 0 },
        alto_carb: { count: 0, sum_energy: 0, sum_mood: 0 },
      },
      sugar_correlation: {
        baixo_acucar: { count: 0, sum_energy: 0, sum_mood: 0 },
        alto_acucar: { count: 0, sum_energy: 0, sum_mood: 0 },
      },
      processing_correlation: {
        predominio_natural: { count: 0, sum_energy: 0, sum_mood: 0 },
        predominio_ultraprocessado: { count: 0, sum_energy: 0, sum_mood: 0 },
      },
      // PASSO 6 — correlação Jantar (≥19h) × Qualidade do Sono (score sleep do wellbeing)
      dinner_sleep_correlation: {
        // Jantar leve: calorias noturnas < 400 kcal
        jantar_leve: { count: 0, sum_sleep: 0 },
        // Jantar pesado: calorias noturnas ≥ 400 kcal
        jantar_pesado: { count: 0, sum_sleep: 0 },
      },
      total_samples: 0
    };

    recentLogs.forEach(log => {
      let meal: HistoryEntry | undefined;
      if (log.meal_id) {
        meal = recentMeals.find(m => String(m.id) === String(log.meal_id));
      } else {
        const logTime = new Date(log.logged_at).getTime();
        const eligible = recentMeals.filter(m => {
          const mealTime = new Date(m.date).getTime();
          const diffMin = (logTime - mealTime) / 60000;
          return diffMin >= 0 && diffMin <= 120; // associar nos 120 minutos pós-refeição
        });
        if (eligible.length > 0) {
          meal = eligible.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        }
      }

      if (meal) {
        stats.total_samples++;
        
        const protein = meal.foods.reduce((sum, f) => sum + (f.protein || 0), 0);
        const carbs = meal.foods.reduce((sum, f) => sum + (f.carbohydrates || 0), 0);
        const addedSugar = meal.foods.reduce((sum, f) => sum + (f.addedSugar || 0), 0);
        
        const totalWeight = meal.foods.reduce((sum, f) => sum + (f.estimatedWeightGrams || 1), 0);
        const ultraWeight = meal.foods.reduce((sum, f) => sum + (f.processingLevel === 'ultraprocessado' ? f.estimatedWeightGrams : 0), 0);
        const naturalWeight = meal.foods.reduce((sum, f) => sum + (f.processingLevel === 'in natura' || f.processingLevel === 'minimamente processado' ? f.estimatedWeightGrams : 0), 0);
        
        const pctUltra = (ultraWeight / totalWeight) * 100;
        const pctNatural = (naturalWeight / totalWeight) * 100;

        // 1. Proteína
        if (protein < 15) {
          stats.protein_correlation.baixa_proteina.count++;
          stats.protein_correlation.baixa_proteina.sum_energy += log.energy;
          stats.protein_correlation.baixa_proteina.sum_mood += log.mood;
        } else if (protein < 30) {
          stats.protein_correlation.media_proteina.count++;
          stats.protein_correlation.media_proteina.sum_energy += log.energy;
          stats.protein_correlation.media_proteina.sum_mood += log.mood;
        } else {
          stats.protein_correlation.alta_proteina.count++;
          stats.protein_correlation.alta_proteina.sum_energy += log.energy;
          stats.protein_correlation.alta_proteina.sum_mood += log.mood;
        }

        // 2. Carboidrato
        if (carbs < 25) {
          stats.carb_correlation.baixo_carb.count++;
          stats.carb_correlation.baixo_carb.sum_energy += log.energy;
          stats.carb_correlation.baixo_carb.sum_mood += log.mood;
        } else if (carbs < 75) {
          stats.carb_correlation.medio_carb.count++;
          stats.carb_correlation.medio_carb.sum_energy += log.energy;
          stats.carb_correlation.medio_carb.sum_mood += log.mood;
        } else {
          stats.carb_correlation.alto_carb.count++;
          stats.carb_correlation.alto_carb.sum_energy += log.energy;
          stats.carb_correlation.alto_carb.sum_mood += log.mood;
        }

        // 3. Açúcar adicionado
        if (addedSugar < 5) {
          stats.sugar_correlation.baixo_acucar.count++;
          stats.sugar_correlation.baixo_acucar.sum_energy += log.energy;
          stats.sugar_correlation.baixo_acucar.sum_mood += log.mood;
        } else if (addedSugar >= 15) {
          stats.sugar_correlation.alto_acucar.count++;
          stats.sugar_correlation.alto_acucar.sum_energy += log.energy;
          stats.sugar_correlation.alto_acucar.sum_mood += log.mood;
        }

        // 4. Nível de Processamento
        if (pctNatural >= 70) {
          stats.processing_correlation.predominio_natural.count++;
          stats.processing_correlation.predominio_natural.sum_energy += log.energy;
          stats.processing_correlation.predominio_natural.sum_mood += log.mood;
        } else if (pctUltra >= 40) {
          stats.processing_correlation.predominio_ultraprocessado.count++;
          stats.processing_correlation.predominio_ultraprocessado.sum_energy += log.energy;
          stats.processing_correlation.predominio_ultraprocessado.sum_mood += log.mood;
        }
      }
    });

    // PASSO 6 — Correlação Jantar × Sono
    // Para cada log de wellbeing com score de sono, busca o jantar da véspera (≥19h no dia anterior)
    recentLogs.forEach(log => {
      if (!log.sleep) return; // log sem score de sono, pular

      const logDate = new Date(log.logged_at);
      // Jantar = refeições do dia anterior entre 19h e 23h59
      const prevDayStart = new Date(logDate);
      prevDayStart.setDate(prevDayStart.getDate() - 1);
      prevDayStart.setHours(19, 0, 0, 0);
      const prevDayEnd = new Date(logDate);
      prevDayEnd.setDate(prevDayEnd.getDate() - 1);
      prevDayEnd.setHours(23, 59, 59, 999);

      const dinnerMeals = recentMeals.filter(m => {
        const t = new Date(m.date).getTime();
        return t >= prevDayStart.getTime() && t <= prevDayEnd.getTime();
      });

      if (dinnerMeals.length === 0) return;

      const dinnerKcal = dinnerMeals.reduce((sum, m) =>
        sum + m.foods.reduce((fs, f) => fs + (f.calories || 0), 0), 0);

      if (dinnerKcal < 400) {
        stats.dinner_sleep_correlation.jantar_leve.count++;
        stats.dinner_sleep_correlation.jantar_leve.sum_sleep += log.sleep;
      } else {
        stats.dinner_sleep_correlation.jantar_pesado.count++;
        stats.dinner_sleep_correlation.jantar_pesado.sum_sleep += log.sleep;
      }
    });

    return stats;
  }, [logs, history]);

  // Verificar se há ao menos uma categoria com >= 5 amostras
  const hasSufficientSamples = useMemo(() => {
    const s = correlationStats;
    return (
      s.protein_correlation.baixa_proteina.count >= 5 ||
      s.protein_correlation.media_proteina.count >= 5 ||
      s.protein_correlation.alta_proteina.count >= 5 ||
      s.carb_correlation.baixo_carb.count >= 5 ||
      s.carb_correlation.medio_carb.count >= 5 ||
      s.carb_correlation.alto_carb.count >= 5 ||
      s.sugar_correlation.baixo_acucar.count >= 5 ||
      s.sugar_correlation.alto_acucar.count >= 5 ||
      s.processing_correlation.predominio_natural.count >= 5 ||
      s.processing_correlation.predominio_ultraprocessado.count >= 5
    );
  }, [correlationStats]);

  // Verificar se a correlação Jantar×Sono tem amostras suficientes nos dois buckets
  const hasDinnerSleepData = useMemo(() => {
    const ds = correlationStats.dinner_sleep_correlation;
    return ds.jantar_leve.count >= 5 && ds.jantar_pesado.count >= 5;
  }, [correlationStats]);

  // Insight derivado da correlação Jantar × Sono (calculado localmente, sem IA)
  const dinnerSleepInsight = useMemo(() => {
    if (!hasDinnerSleepData) return null;
    const ds = correlationStats.dinner_sleep_correlation;
    const avgSleepLeve = ds.jantar_leve.sum_sleep / ds.jantar_leve.count;
    const avgSleepPesado = ds.jantar_pesado.sum_sleep / ds.jantar_pesado.count;
    const diff = avgSleepLeve - avgSleepPesado;
    if (Math.abs(diff) < 0.3) {
      return {
        text: 'Seus dados não mostram diferença clara entre jantar leve e sono. Continue registrando para uma análise mais precisa.',
        direction: 'neutral' as const,
      };
    }
    if (diff > 0) {
      return {
        text: `Nos dias em que o jantar foi mais leve (<400 kcal), seu sono foi ${diff.toFixed(1)} pontos melhor em média.`,
        direction: 'light' as const,
      };
    }
    return {
      text: `Seu sono não apresentou queda significativa com jantares mais densos. Seu padrão individual é diferente da média.`,
      direction: 'heavy' as const,
    };
  }, [hasDinnerSleepData, correlationStats]);

  const generateInsight = useCallback(async () => {
    if (!hasSufficientSamples) {
      setError('Amostras insuficientes para correlação (mínimo de 5 check-ins em um bucket).');
      setInsight(null);
      localStorage.removeItem(INSIGHT_KEY);
      return null;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const formattedStats = {
        total_samples: correlationStats.total_samples,
        protein: {
          baixo: { count: correlationStats.protein_correlation.baixa_proteina.count, avg_energy: correlationStats.protein_correlation.baixa_proteina.count > 0 ? +(correlationStats.protein_correlation.baixa_proteina.sum_energy / correlationStats.protein_correlation.baixa_proteina.count).toFixed(2) : 0, avg_mood: correlationStats.protein_correlation.baixa_proteina.count > 0 ? +(correlationStats.protein_correlation.baixa_proteina.sum_mood / correlationStats.protein_correlation.baixa_proteina.count).toFixed(2) : 0 },
          medio: { count: correlationStats.protein_correlation.media_proteina.count, avg_energy: correlationStats.protein_correlation.media_proteina.count > 0 ? +(correlationStats.protein_correlation.media_proteina.sum_energy / correlationStats.protein_correlation.media_proteina.count).toFixed(2) : 0, avg_mood: correlationStats.protein_correlation.media_proteina.count > 0 ? +(correlationStats.protein_correlation.media_proteina.sum_mood / correlationStats.protein_correlation.media_proteina.count).toFixed(2) : 0 },
          alto: { count: correlationStats.protein_correlation.alta_proteina.count, avg_energy: correlationStats.protein_correlation.alta_proteina.count > 0 ? +(correlationStats.protein_correlation.alta_proteina.sum_energy / correlationStats.protein_correlation.alta_proteina.count).toFixed(2) : 0, avg_mood: correlationStats.protein_correlation.alta_proteina.count > 0 ? +(correlationStats.protein_correlation.alta_proteina.sum_mood / correlationStats.protein_correlation.alta_proteina.count).toFixed(2) : 0 },
        },
        carbohydrate: {
          baixo: { count: correlationStats.carb_correlation.baixo_carb.count, avg_energy: correlationStats.carb_correlation.baixo_carb.count > 0 ? +(correlationStats.carb_correlation.baixo_carb.sum_energy / correlationStats.carb_correlation.baixo_carb.count).toFixed(2) : 0, avg_mood: correlationStats.carb_correlation.baixo_carb.count > 0 ? +(correlationStats.carb_correlation.baixo_carb.sum_mood / correlationStats.carb_correlation.baixo_carb.count).toFixed(2) : 0 },
          medio: { count: correlationStats.carb_correlation.medio_carb.count, avg_energy: correlationStats.carb_correlation.medio_carb.count > 0 ? +(correlationStats.carb_correlation.medio_carb.sum_energy / correlationStats.carb_correlation.medio_carb.count).toFixed(2) : 0, avg_mood: correlationStats.carb_correlation.medio_carb.count > 0 ? +(correlationStats.carb_correlation.medio_carb.sum_mood / correlationStats.carb_correlation.medio_carb.count).toFixed(2) : 0 },
          alto: { count: correlationStats.carb_correlation.alto_carb.count, avg_energy: correlationStats.carb_correlation.alto_carb.count > 0 ? +(correlationStats.carb_correlation.alto_carb.sum_energy / correlationStats.carb_correlation.alto_carb.count).toFixed(2) : 0, avg_mood: correlationStats.carb_correlation.alto_carb.count > 0 ? +(correlationStats.carb_correlation.alto_carb.sum_mood / correlationStats.carb_correlation.alto_carb.count).toFixed(2) : 0 },
        },
        added_sugar: {
          baixo: { count: correlationStats.sugar_correlation.baixo_acucar.count, avg_energy: correlationStats.sugar_correlation.baixo_acucar.count > 0 ? +(correlationStats.sugar_correlation.baixo_acucar.sum_energy / correlationStats.sugar_correlation.baixo_acucar.count).toFixed(2) : 0, avg_mood: correlationStats.sugar_correlation.baixo_acucar.count > 0 ? +(correlationStats.sugar_correlation.baixo_acucar.sum_mood / correlationStats.sugar_correlation.baixo_acucar.count).toFixed(2) : 0 },
          alto: { count: correlationStats.sugar_correlation.alto_acucar.count, avg_energy: correlationStats.sugar_correlation.alto_acucar.count > 0 ? +(correlationStats.sugar_correlation.alto_acucar.sum_energy / correlationStats.sugar_correlation.alto_acucar.count).toFixed(2) : 0, avg_mood: correlationStats.sugar_correlation.alto_acucar.count > 0 ? +(correlationStats.sugar_correlation.alto_acucar.sum_mood / correlationStats.sugar_correlation.alto_acucar.count).toFixed(2) : 0 },
        },
        processing: {
          predominio_natural: { count: correlationStats.processing_correlation.predominio_natural.count, avg_energy: correlationStats.processing_correlation.predominio_natural.count > 0 ? +(correlationStats.processing_correlation.predominio_natural.sum_energy / correlationStats.processing_correlation.predominio_natural.count).toFixed(2) : 0, avg_mood: correlationStats.processing_correlation.predominio_natural.count > 0 ? +(correlationStats.processing_correlation.predominio_natural.sum_mood / correlationStats.processing_correlation.predominio_natural.count).toFixed(2) : 0 },
          predominio_ultraprocessado: { count: correlationStats.processing_correlation.predominio_ultraprocessado.count, avg_energy: correlationStats.processing_correlation.predominio_ultraprocessado.count > 0 ? +(correlationStats.processing_correlation.predominio_ultraprocessado.sum_energy / correlationStats.processing_correlation.predominio_ultraprocessado.count).toFixed(2) : 0, avg_mood: correlationStats.processing_correlation.predominio_ultraprocessado.count > 0 ? +(correlationStats.processing_correlation.predominio_ultraprocessado.sum_mood / correlationStats.processing_correlation.predominio_ultraprocessado.count).toFixed(2) : 0 },
        }
      };

      const textResult = await generateCorrelationInsightText(formattedStats);
      setInsight(textResult);
      if (textResult) {
        localStorage.setItem(INSIGHT_KEY, textResult);
      } else {
        localStorage.removeItem(INSIGHT_KEY);
      }
      return textResult;
    } catch (e: any) {
      setError(e.message || 'Falha ao processar correlações com a IA.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [hasSufficientSamples, correlationStats]);

  return {
    logs,
    addLog,
    deleteLog,
    correlationStats,
    hasSufficientSamples,
    insight,
    generateInsight,
    isGenerating,
    error,
    // PASSO 6 — Correlação Jantar × Sono
    hasDinnerSleepData,
    dinnerSleepInsight,
  };
}
