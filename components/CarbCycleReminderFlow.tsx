/**
 * CarbCycleReminderFlow — Fluxo de atualização rápida da rotina semanal de treinos.
 *
 * Exibe um formulário simplificado para revisar os 7 dias da semana (Seg-Dom),
 * ajustar as descrições dos treinos e as intensidades calóricas do ciclo.
 *
 * v2: Integração com Gemini — botão "✨ Sugerir com IA" classifica automaticamente
 *     cada dia (Alto/Mod/Baixo) com base na descrição de atividade.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CycleDay, CycleDayConfig } from '../hooks/useCarbCycle';
import {
  suggestCarbCycleFromActivities,
  type CarbCycleSuggestion,
} from '../services/geminiService';

interface CarbCycleReminderFlowProps {
  currentConfig: CycleDayConfig[];
  onSave: (updated: { dayIndex: number; type: CycleDay; activity: string }[]) => void;
  onClose: () => void;
  confirmWeekUpdated: () => void;
  showToast: (msg: string) => void;
  /** Objetivo do usuário ('perder' | 'manter' | 'ganhar') */
  userGoal?: string;
  /** TDEE estimado em kcal para contextualizar a IA */
  tdeeKcal?: number;
}

const DAY_LONG_NAMES = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

export const CarbCycleReminderFlow: React.FC<CarbCycleReminderFlowProps> = ({
  currentConfig,
  onSave,
  onClose,
  confirmWeekUpdated,
  showToast,
  userGoal = 'manter',
  tdeeKcal = 2000,
}) => {
  // Estado local para edições
  const [formDays, setFormDays] = useState<{ dayIndex: number; type: CycleDay; activity: string }[]>(() =>
    currentConfig.map(cfg => ({
      dayIndex: cfg.dayIndex,
      type: cfg.type,
      activity: cfg.activity,
    }))
  );

  // Estado da sugestão da IA
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiReasonings, setAiReasonings] = useState<Record<number, string>>({});
  const [aiApplied, setAiApplied] = useState(false);

  const handleActivityChange = (index: number, val: string) => {
    setFormDays(prev =>
      prev.map((d, i) => (i === index ? { ...d, activity: val } : d))
    );
    // Limpa o reasoning da IA se o usuário editar manualmente
    if (aiReasonings[index] !== undefined) {
      setAiReasonings(prev => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const handleTypeChange = (index: number, type: CycleDay) => {
    setFormDays(prev =>
      prev.map((d, i) => (i === index ? { ...d, type } : d))
    );
  };

  const handleRepeatPrevious = () => {
    confirmWeekUpdated();
    onSave(formDays);
    showToast('Rotina semanal anterior repetida e confirmada! 🔄');
    onClose();
  };

  /** Chama o Gemini para sugerir tipos de dia com base nas atividades */
  const handleAISuggest = async () => {
    setIsLoadingAI(true);
    setAiApplied(false);
    try {
      const suggestions: CarbCycleSuggestion[] = await suggestCarbCycleFromActivities(
        formDays.map(d => ({ dayIndex: d.dayIndex, activity: d.activity })),
        userGoal,
        tdeeKcal
      );

      // Aplica os tipos sugeridos e guarda os reasonings
      const newReasonings: Record<number, string> = {};
      setFormDays(prev =>
        prev.map((day, i) => {
          const suggestion = suggestions.find(s => s.dayIndex === day.dayIndex);
          if (suggestion) {
            newReasonings[i] = suggestion.reasoning;
            return { ...day, type: suggestion.type };
          }
          return day;
        })
      );
      setAiReasonings(newReasonings);
      setAiApplied(true);
      showToast('✨ IA classificou sua semana! Revise e ajuste se necessário.');
    } catch (err) {
      showToast('Não foi possível gerar a sugestão. Tente novamente.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSave = () => {
    confirmWeekUpdated();
    onSave(formDays);
    showToast('Ciclo de carboidratos atualizado para esta semana! 🎉');
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full max-w-md mx-auto flex flex-col gap-4 pb-8"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Como vai ser sua semana?</h2>
          <p className="text-xs text-gray-400 mt-1">Descreva cada dia — a IA monta o ciclo ideal pra você</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Voltar"
        >
          ✕
        </button>
      </div>

      {/* Ações Rápidas */}
      <div className="flex gap-2">
        <button
          onClick={handleRepeatPrevious}
          className="flex-1 bg-gray-850 hover:bg-gray-800 text-gray-200 border border-gray-750 font-bold py-2.5 px-3 rounded-xl text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5"
        >
          🔄 Repetir anterior
        </button>

        {/* Botão de sugestão da IA */}
        <button
          onClick={handleAISuggest}
          disabled={isLoadingAI}
          className={`flex-1 font-extrabold py-2.5 px-3 rounded-xl text-xs transition-all active:scale-98 flex items-center justify-center gap-1.5 border
            ${isLoadingAI
              ? 'bg-violet-900/30 border-violet-700/30 text-violet-400 cursor-wait'
              : 'bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border-violet-500/30 text-violet-300 hover:from-violet-600/30 hover:to-fuchsia-600/30'
            }`}
        >
          {isLoadingAI ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5 text-violet-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analisando...
            </>
          ) : (
            <>✨ Sugerir com IA</>
          )}
        </button>
      </div>

      {/* Badge de confirmação da IA */}
      <AnimatePresence>
        {aiApplied && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-violet-900/20 border border-violet-500/20 rounded-xl px-3 py-2"
          >
            <span className="text-violet-400 text-lg">✨</span>
            <p className="text-xs text-violet-300">
              Ciclo sugerido com base nas suas atividades. Ajuste à vontade antes de salvar.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de dias da semana */}
      <div className="flex flex-col gap-3">
        {formDays.map((d, i) => {
          const labelColor =
            d.type === 'high'
              ? 'text-emerald-400'
              : d.type === 'mod'
              ? 'text-amber-400'
              : 'text-indigo-400';

          const hasReasoning = !!aiReasonings[i];

          return (
            <div
              key={d.dayIndex}
              className="bg-gray-800/40 border border-gray-750/50 rounded-2xl p-4 flex flex-col gap-3 transition-colors duration-200 hover:border-gray-700"
            >
              {/* Dia + Seletor de intensidade */}
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-300">{DAY_LONG_NAMES[i]}</span>

                {/* Pill selectors */}
                <div className="flex bg-gray-900/50 border border-gray-800 p-0.5 rounded-lg">
                  {(['high', 'mod', 'low'] as CycleDay[]).map(t => {
                    const active = d.type === t;
                    const activeStyle =
                      t === 'high'
                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/20'
                        : t === 'mod'
                        ? 'bg-amber-600/20 text-amber-400 border-amber-500/20'
                        : 'bg-indigo-600/20 text-indigo-400 border-indigo-500/20';

                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTypeChange(i, t)}
                        className={`text-[9px] font-extrabold px-2.5 py-1 rounded transition-all uppercase ${
                          active ? `${activeStyle} border font-black` : 'text-gray-500 hover:text-gray-400'
                        }`}
                      >
                        {t === 'high' ? 'alto' : t === 'mod' ? 'mod' : 'baixo'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input de descrição de treino */}
              <div>
                <input
                  type="text"
                  value={d.activity}
                  onChange={e => handleActivityChange(i, e.target.value)}
                  placeholder="Ex: Treino de pernas, corrida, descanso..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-650 focus:outline-none focus:border-emerald-500/40 transition-colors"
                />
              </div>

              {/* Reasoning da IA (aparece após sugestão) */}
              <AnimatePresence>
                {hasReasoning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`flex items-start gap-1.5 mt-0.5 px-2.5 py-1.5 rounded-lg bg-gray-900/60 border border-gray-800/60`}>
                      <span className="text-[10px] shrink-0 mt-0.5">✨</span>
                      <p className={`text-[10px] leading-tight ${labelColor} opacity-80`}>
                        {aiReasonings[i]}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Botões finais */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={onClose}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3.5 rounded-2xl text-xs transition-all active:scale-95"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:opacity-95 text-white font-extrabold py-3.5 rounded-2xl text-xs transition-all shadow-lg shadow-emerald-950/20 active:scale-95"
        >
          Atualizar Ciclo 🚀
        </button>
      </div>
    </motion.div>
  );
};
