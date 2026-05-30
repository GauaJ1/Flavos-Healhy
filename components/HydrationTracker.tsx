/**
 * Tracker de hidratação diária.
 * Botões de adição rápida + barra de progresso + histórico do dia.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HydrationTrackerProps {
  totalMl: number;
  goalMl: number;
  percentage: number;
  entries: { time: string; ml: number }[];
  onAdd: (ml: number) => void;
  onUndo: () => void;
}

const QUICK_AMOUNTS = [150, 250, 350, 500];

const HydrationTracker: React.FC<HydrationTrackerProps> = ({
  totalMl,
  goalMl,
  percentage,
  entries,
  onAdd,
  onUndo,
}) => {
  const [custom, setCustom] = useState('');

  const handleCustomAdd = () => {
    const ml = parseInt(custom, 10);
    if (ml > 0 && ml <= 2000) {
      onAdd(ml);
      setCustom('');
    }
  };

  const cups = Math.floor(totalMl / 250);
  const totalCups = Math.ceil(goalMl / 250);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">💧</span>
          <h3 className="text-sm font-semibold text-gray-200">Hidratação</h3>
        </div>
        {entries.length > 0 && (
          <button
            onClick={onUndo}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Desfazer último registro de água"
          >
            Desfazer
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{totalMl} ml</span>
          <span>{percentage}% — meta {goalMl} ml</span>
        </div>
        <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Cup icons */}
      <div className="flex flex-wrap gap-1 mb-3">
        {Array.from({ length: totalCups }).map((_, i) => (
          <span key={i} className={`text-base ${i < cups ? 'opacity-100' : 'opacity-20'}`}>
            🥛
          </span>
        ))}
      </div>

      {/* Quick add buttons */}
      <div className="flex gap-2 flex-wrap">
        {QUICK_AMOUNTS.map((ml) => (
          <button
            key={ml}
            onClick={() => onAdd(ml)}
            className="flex-1 min-w-[60px] py-2 px-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold hover:bg-blue-500/30 active:scale-95 transition-all"
            aria-label={`Adicionar ${ml}ml de água`}
          >
            +{ml}ml
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex gap-2 mt-2">
        <input
          type="number"
          placeholder="ml customizado"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          className="flex-1 bg-white/5 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
          min={1}
          max={2000}
          id="hydration-custom-ml"
        />
        <button
          onClick={handleCustomAdd}
          disabled={!custom || parseInt(custom, 10) <= 0}
          className="px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold hover:bg-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Adicionar
        </button>
      </div>

      {/* Today's log */}
      <AnimatePresence>
        {entries.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-gray-700/50 overflow-hidden"
          >
            <p className="text-xs text-gray-500 mb-1">Registros de hoje</p>
            <div className="flex flex-col gap-1 max-h-24 overflow-y-auto">
              {[...entries].reverse().map((e, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-400">
                  <span>{new Date(e.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="text-blue-400">+{e.ml} ml</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HydrationTracker;
