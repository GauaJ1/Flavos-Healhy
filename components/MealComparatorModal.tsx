import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HistoryEntry } from '../types';
import { calculateNutritionScore } from '../utils/nutritionScore';

interface MealComparatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryEntry[];
}

export interface ComparisonMetric {
  label: string;
  unit: string;
  val1: number;
  val2: number;
  highlightIndex: 1 | 2 | 0; // 1 = primeira refeição tem mais, 2 = segunda, 0 = empate
  description: string;
}

/**
 * Função pura para comparar 2 refeições em calorias, proteína, fibra e Nutrition Score.
 * Linguagem neutra e empática — sem "melhor"/"pior", apenas "mais densa em X", "mais rica em Y".
 */
export function compareMealEntries(entry1: HistoryEntry, entry2: HistoryEntry): ComparisonMetric[] {
  const getMacros = (entry: HistoryEntry) => {
    const prot = entry.foods.reduce((s, f) => s + (f.protein || 0), 0);
    const carbs = entry.foods.reduce((s, f) => s + (f.carbohydrates || 0), 0);
    const fat = entry.foods.reduce((s, f) => s + (f.fat || 0), 0);
    const fiber = entry.foods.reduce((s, f) => s + (f.fiber || 0), 0);
    const score = calculateNutritionScore({
      foods: entry.foods,
      nutritionalSummary: { baseCalories: entry.totalCalories } as any,
    } as any).total;
    return { kcal: entry.totalCalories, prot, carbs, fat, fiber, score };
  };

  const m1 = getMacros(entry1);
  const m2 = getMacros(entry2);

  const getWinner = (v1: number, v2: number): 1 | 2 | 0 => (v1 > v2 ? 1 : v2 > v1 ? 2 : 0);

  return [
    {
      label: 'Pontuação de Qualidade (Score)',
      unit: 'pts',
      val1: m1.score,
      val2: m2.score,
      highlightIndex: getWinner(m1.score, m2.score),
      description: m1.score === m2.score ? 'Equilíbrio nutricional equivalente' : `Refeição ${getWinner(m1.score, m2.score)} tem maior densidade de micronutrientes`,
    },
    {
      label: 'Proteínas',
      unit: 'g',
      val1: Math.round(m1.prot * 10) / 10,
      val2: Math.round(m2.prot * 10) / 10,
      highlightIndex: getWinner(m1.prot, m2.prot),
      description: m1.prot === m2.prot ? 'Mesmo aporte proteico' : `Refeição ${getWinner(m1.prot, m2.prot)} é mais rica em proteína`,
    },
    {
      label: 'Fibras',
      unit: 'g',
      val1: Math.round(m1.fiber * 10) / 10,
      val2: Math.round(m2.fiber * 10) / 10,
      highlightIndex: getWinner(m1.fiber, m2.fiber),
      description: m1.fiber === m2.fiber ? 'Quantidade similar de fibras' : `Refeição ${getWinner(m1.fiber, m2.fiber)} fornece mais fibras`,
    },
    {
      label: 'Calorias Totais',
      unit: 'kcal',
      val1: Math.round(m1.kcal),
      val2: Math.round(m2.kcal),
      highlightIndex: getWinner(m1.kcal, m2.kcal),
      description: m1.kcal === m2.kcal ? 'Mesmo valor calórico' : `Refeição ${getWinner(m1.kcal, m2.kcal)} tem maior volume calórico`,
    },
  ];
}

export const MealComparatorModal: React.FC<MealComparatorModalProps> = ({
  isOpen,
  onClose,
  history,
}) => {
  const [selectedId1, setSelectedId1] = useState<string>(history[0]?.id || '');
  const [selectedId2, setSelectedId2] = useState<string>(history[1]?.id || history[0]?.id || '');

  const meal1 = useMemo(() => history.find((h) => h.id === selectedId1) || history[0], [history, selectedId1]);
  const meal2 = useMemo(() => history.find((h) => h.id === selectedId2) || history[1] || history[0], [history, selectedId2]);

  const metrics = useMemo(() => {
    if (!meal1 || !meal2) return [];
    return compareMealEntries(meal1, meal2);
  }, [meal1, meal2]);

  if (!isOpen) return null;

  if (history.length < 2) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
        <div style={{ width: '100%', maxWidth: '24rem', background: '#111827', borderRadius: '1.5rem', border: '1px solid #374151', padding: '1.5rem', color: '#fff', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>⚖️ Comparador de Refeições</h3>
          <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
            Você precisa ter pelo menos 2 refeições cadastradas no histórico para realizar a comparação lado a lado.
          </p>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#3b82f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{ width: '100%', maxWidth: '32rem', background: '#111827', borderRadius: '1.5rem', border: '1px solid #374151', padding: '1.5rem', color: '#f9fafb', maxHeight: '90vh', overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚖️ Comparador de Refeições Lado a Lado
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
          </div>

          {/* Seletores */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Refeição A:</label>
              <select
                value={selectedId1}
                onChange={(e) => setSelectedId1(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', background: '#1f2937', border: '1px solid #4b5563', color: '#fff', fontSize: '0.875rem' }}
              >
                {history.map((h) => (
                  <option key={h.id} value={h.id}>
                    {new Date(h.date).toLocaleDateString('pt-BR')} ({h.totalCalories} kcal)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>Refeição B:</label>
              <select
                value={selectedId2}
                onChange={(e) => setSelectedId2(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', background: '#1f2937', border: '1px solid #4b5563', color: '#fff', fontSize: '0.875rem' }}
              >
                {history.map((h) => (
                  <option key={h.id} value={h.id}>
                    {new Date(h.date).toLocaleDateString('pt-BR')} ({h.totalCalories} kcal)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparação */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {metrics.map((m, idx) => (
              <div key={idx} style={{ background: '#1f2937', padding: '0.875rem', borderRadius: '0.75rem', border: '1px solid #374151' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e5e7eb' }}>{m.label}</span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{m.description}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center', fontSize: '0.9375rem', fontWeight: 700 }}>
                  <div style={{ padding: '0.375rem', borderRadius: '0.375rem', background: m.highlightIndex === 1 ? 'rgba(16,185,129,0.2)' : 'transparent', color: m.highlightIndex === 1 ? '#10b981' : '#9ca3af' }}>
                    {m.val1} {m.unit} {m.highlightIndex === 1 && '⭐'}
                  </div>
                  <div style={{ padding: '0.375rem', borderRadius: '0.375rem', background: m.highlightIndex === 2 ? 'rgba(16,185,129,0.2)' : 'transparent', color: m.highlightIndex === 2 ? '#10b981' : '#9ca3af' }}>
                    {m.val2} {m.unit} {m.highlightIndex === 2 && '⭐'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
