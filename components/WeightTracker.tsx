/**
 * Tracker de peso corporal.
 * Input de novo peso + tendência semanal + mini gráfico de pontos.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WeightEntry } from '../hooks/useWeight';

interface WeightTrackerProps {
  latestWeight: number | null;
  weekTrend: number | null;
  chartData: { date: string; kg: number }[];
  onAdd: (kg: number) => void;
}

const WeightTracker: React.FC<WeightTrackerProps> = ({
  latestWeight,
  weekTrend,
  chartData,
  onAdd,
}) => {
  const [input, setInput] = useState('');
  const [showLog, setShowLog] = useState(false);

  const handleAdd = () => {
    const kg = parseFloat(input.replace(',', '.'));
    if (!isNaN(kg) && kg > 0 && kg < 500) {
      onAdd(kg);
      setInput('');
    }
  };

  const trendIcon = weekTrend === null ? '—' : weekTrend > 0 ? '↑' : weekTrend < 0 ? '↓' : '→';
  const trendColor =
    weekTrend === null
      ? 'text-gray-400'
      : Math.abs(weekTrend) < 0.3
      ? 'text-gray-400'
      : weekTrend > 0
      ? 'text-red-400'
      : 'text-emerald-400';

  // Mini sparkline
  const mini = chartData.slice(-7);
  const minKg = mini.length ? Math.min(...mini.map((d) => d.kg)) - 0.5 : 60;
  const maxKg = mini.length ? Math.max(...mini.map((d) => d.kg)) + 0.5 : 100;
  const range = maxKg - minKg || 1;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-4 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚖️</span>
          <h3 className="text-sm font-semibold text-gray-200">Peso Corporal</h3>
        </div>
        {chartData.length > 0 && (
          <button
            onClick={() => setShowLog(!showLog)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {showLog ? 'Fechar' : 'Ver histórico'}
          </button>
        )}
      </div>

      {/* Current weight + trend */}
      <div className="flex items-end gap-4 mb-4">
        <div>
          <p className="text-3xl font-bold text-white">
            {latestWeight !== null ? `${latestWeight} kg` : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Último registro</p>
        </div>
        {weekTrend !== null && (
          <div className={`pb-1 ${trendColor}`}>
            <span className="text-lg font-bold">{trendIcon}</span>
            <span className="text-xs ml-1">
              {Math.abs(weekTrend)} kg esta semana
            </span>
          </div>
        )}
      </div>

      {/* Mini sparkline */}
      {mini.length >= 2 && (
        <div className="mb-4 h-10 relative">
          <svg className="w-full h-full" viewBox={`0 0 ${mini.length * 30} 40`} preserveAspectRatio="none">
            <polyline
              points={mini
                .map((d, i) => `${i * 30 + 15},${40 - ((d.kg - minKg) / range) * 36}`)
                .join(' ')}
              fill="none"
              stroke="#a78bfa"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {mini.map((d, i) => (
              <circle
                key={i}
                cx={i * 30 + 15}
                cy={40 - ((d.kg - minKg) / range) * 36}
                r="3"
                fill="#a78bfa"
              />
            ))}
          </svg>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Seu peso (kg)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          step="0.1"
          min="1"
          max="499"
          className="flex-1 bg-white/5 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
          id="weight-input"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={!input}
          className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-semibold hover:bg-purple-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
        >
          Registrar
        </button>
      </div>

      {/* Log */}
      <AnimatePresence>
        {showLog && chartData.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-gray-700/50 overflow-hidden"
          >
            <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
              {[...chartData].reverse().map((e, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-400">
                  <span>{e.date}</span>
                  <span className="text-purple-400">{e.kg} kg</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WeightTracker;
