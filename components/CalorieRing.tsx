/**
 * Anel visual de progresso de calorias do dia.
 * SVG animado com percentual e valores.
 */
import React from 'react';
import { motion } from 'framer-motion';

interface CalorieRingProps {
  consumed: number;
  goal: number;
  meals: number;
}

const CalorieRing: React.FC<CalorieRingProps> = ({ consumed, goal, meals }) => {
  const pct = Math.min(1, consumed / goal);
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;
  const remaining = Math.max(0, goal - consumed);

  const color =
    pct < 0.5 ? '#34d399' : pct < 0.85 ? '#fbbf24' : pct < 1 ? '#f97316' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 176 176">
          {/* Track */}
          <circle
            cx="88"
            cy="88"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="14"
          />
          {/* Progress */}
          <motion.circle
            cx="88"
            cy="88"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - dash }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-bold text-white leading-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            {consumed.toLocaleString('pt-BR')}
          </motion.span>
          <span className="text-xs text-gray-400 mt-1">kcal</span>
          <span className="text-xs text-gray-500 mt-0.5">/ {goal.toLocaleString('pt-BR')}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm">
        <div className="text-center">
          <p className="text-gray-400 text-xs">Restam</p>
          <p className="font-semibold text-white">{remaining.toLocaleString('pt-BR')} kcal</p>
        </div>
        <div className="w-px h-8 bg-gray-700" />
        <div className="text-center">
          <p className="text-gray-400 text-xs">Refeições</p>
          <p className="font-semibold text-white">{meals}</p>
        </div>
      </div>
    </div>
  );
};

export default CalorieRing;
