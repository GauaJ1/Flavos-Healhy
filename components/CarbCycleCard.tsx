/**
 * CarbCycleCard — Componente premium para visualização e edição do Ciclo de Carboidratos.
 *
 * Exibe a barra de dias com cores correspondentes a cada nível de carboidratos (Alto, Médio, Baixo),
 * exibe detalhes dos macros do dia selecionado e permite trocar dinamicamente a classificação
 * de cada dia.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CycleWeekSummary, CycleDay } from '../hooks/useCarbCycle';

interface CarbCycleCardProps {
  summary: CycleWeekSummary;
  selectedDay: number;
  onSelectDay: (idx: number) => void;
  onUpdateDayType: (dayIndex: number, type: CycleDay, activity?: string) => void;
  baseCalories: number;
}

const TYPE_LABELS: Record<CycleDay, string> = {
  high: 'Dia Alto — treino pesado',
  mod: 'Dia Moderado — treino leve',
  low: 'Dia Baixo — descanso',
};

const DAY_LONG_NAMES = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

export const CarbCycleCard: React.FC<CarbCycleCardProps> = ({
  summary,
  selectedDay,
  onSelectDay,
  onUpdateDayType,
  baseCalories,
}) => {
  const day = summary.days[selectedDay];
  if (!day) return null;

  // Percentuais de energia de cada macronutriente
  const totalMacrosKcal = day.protein * 4 + day.carbs * 4 + day.fat * 9;
  const pPct = Math.round((day.protein * 4 / totalMacrosKcal) * 100);
  const cPct = Math.round((day.carbs * 4 / totalMacrosKcal) * 100);
  const fPct = Math.round((day.fat * 9 / totalMacrosKcal) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Bloco 1: Visualização da Semana */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base font-bold text-white">Ciclo com TDEE Real</h3>
            <p className="text-xs text-gray-400 mt-0.5">Distribuição baseada no seu gasto real estimado</p>
          </div>
          <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {baseCalories} kcal base
          </span>
        </div>

        {/* Barra semanal com cores por intensidade */}
        <div className="flex gap-2 mt-1">
          {summary.days.map((d, i) => {
            const isSelected = i === selectedDay;
            // Definir cores das barras (High, Mod, Low)
            const styles =
              d.type === 'high'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : d.type === 'mod'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400';

            return (
              <button
                key={d.dayLabel}
                onClick={() => onSelectDay(i)}
                className={`flex-1 flex flex-col items-center justify-between rounded-xl py-2.5 border transition-all duration-200 active:scale-95 ${styles} ${
                  isSelected ? 'ring-2 ring-emerald-400 scale-[1.03] shadow-lg shadow-black/20' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">{d.dayLabel}</span>
                <span className="text-[11px] font-bold mt-1.5">{d.kcal}</span>
                <span className="text-[8px] mt-0.5 opacity-60">kcal</span>
              </button>
            );
          })}
        </div>

        {/* Média Semanal */}
        <p className="text-[10px] text-gray-500 text-center font-medium">
          Total semanal: {summary.totalKcal.toLocaleString('pt-BR')} kcal · Média: {summary.avgKcal} kcal/dia
        </p>
      </div>

      {/* Bloco 2: Detalhes do Dia Selecionado */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5 flex flex-col gap-4"
        >
          {/* Header do Dia */}
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-bold text-white">
                {DAY_LONG_NAMES[selectedDay]} · <span className="text-gray-400 text-xs font-normal">{day.activity}</span>
              </h4>
              <p className="text-xs text-emerald-400 font-semibold mt-0.5">{TYPE_LABELS[day.type]}</p>
            </div>
            {/* Seletor Rápido de Tipo de Dia */}
            <div className="flex gap-1 bg-gray-900/50 border border-gray-800 p-0.5 rounded-lg">
              {(['high', 'mod', 'low'] as CycleDay[]).map(t => (
                <button
                  key={t}
                  onClick={() => onUpdateDayType(selectedDay, t)}
                  className={`text-[9px] font-bold px-2 py-1 rounded transition-all capitalize ${
                    day.type === t
                      ? t === 'high'
                        ? 'bg-emerald-600 text-white'
                        : t === 'mod'
                        ? 'bg-amber-600 text-white'
                        : 'bg-indigo-600 text-white'
                      : 'text-gray-500 hover:text-gray-400'
                  }`}
                >
                  {t === 'high' ? 'alto' : t === 'mod' ? 'mod' : 'baixo'}
                </button>
              ))}
            </div>
          </div>

          {/* Calorias do Dia */}
          <div className="flex justify-between items-baseline border-b border-gray-800 pb-3">
            <span className="text-xs text-gray-500">Meta calórica diária:</span>
            <span className="text-2xl font-black text-white">
              {day.kcal} <span className="text-xs text-gray-400 font-normal">kcal</span>
            </span>
          </div>

          {/* Barras de Macronutrientes */}
          <div className="flex flex-col gap-3">
            {/* Carboidrato */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-400">Carboidrato ({cPct}%)</span>
                <span className="text-emerald-400">{day.carbs}g</span>
              </div>
              <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${cPct}%` }} />
              </div>
            </div>

            {/* Proteína */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-400">Proteína ({pPct}%)</span>
                <span className="text-blue-400">{day.protein}g</span>
              </div>
              <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full transition-all duration-500" style={{ width: `${pPct}%` }} />
              </div>
            </div>

            {/* Gordura */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-gray-400">Gordura ({fPct}%)</span>
                <span className="text-amber-500">{day.fat}g</span>
              </div>
              <div className="w-full h-2.5 bg-gray-900 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${fPct}%` }} />
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Bloco 3: Benefício Científico */}
      <div className="bg-emerald-950/20 border border-emerald-900/30 rounded-2xl p-4 flex gap-3 items-start">
        <span className="text-base">📈</span>
        <p className="text-xs text-emerald-300/80 leading-relaxed">
          <strong>Por que usar o TDEE Real no Ciclo?</strong> Com o gasto real calibrado, o dia alto gera um superávit calórico
          efetivo, garantindo sinalização anabólica. O dia baixo gera um leve déficit intencional (estimulando sensibilidade insulínica),
          em vez de manter um falso superávit gerado pela subestimativa da fórmula Mifflin.
        </p>
      </div>
    </div>
  );
};
