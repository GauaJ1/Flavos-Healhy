/**
 * Cards de macronutrientes do dia com barra de progresso.
 */
import React from 'react';
import { motion } from 'framer-motion';
import type { DailyMacros, DailyGoals } from '../hooks/useDailyStats';

interface MacroCardsProps {
  macros: DailyMacros;
  goals: DailyGoals;
}

interface MacroDef {
  key: keyof Pick<DailyMacros, 'protein' | 'carbohydrates' | 'fat'>;
  label: string;
  unit: string;
  color: string;
  bg: string;
  icon: string;
}

const MACROS: MacroDef[] = [
  { key: 'protein',       label: 'Proteína',   unit: 'g', color: '#818cf8', bg: 'rgba(129,140,248,0.12)', icon: '🥩' },
  { key: 'carbohydrates', label: 'Carboidratos', unit: 'g', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  icon: '🌾' },
  { key: 'fat',           label: 'Gordura',    unit: 'g', color: '#f97316', bg: 'rgba(249,115,22,0.12)',  icon: '🧈' },
];

const MacroCards: React.FC<MacroCardsProps> = ({ macros, goals }) => (
  <div className="grid grid-cols-3 gap-2 w-full">
    {MACROS.map(({ key, label, unit, color, bg, icon }, i) => {
      const value = macros[key] as number;
      const goal = goals[key as keyof DailyGoals] as number;
      const pct = Math.min(100, Math.round((value / goal) * 100));

      return (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="rounded-2xl p-3 flex flex-col gap-2"
          style={{ background: bg, border: `1px solid ${color}22` }}
        >
          <span className="text-lg">{icon}</span>
          <div>
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-base font-bold text-white">
              {value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{unit}
            </p>
            <p className="text-xs text-gray-500">/ {goal}{unit}</p>
          </div>

          {/* Mini progress bar */}
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: color }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      );
    })}
  </div>
);

export default MacroCards;
