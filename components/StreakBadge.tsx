/**
 * StreakBadge — Exibe streaks de consistência e meta calórica diária.
 */
import React from 'react';
import { motion } from 'framer-motion';

interface StreakBadgeProps {
  consistencyStreak: number;
  calorieGoalStreak: number;
}

const StreakBadge: React.FC<StreakBadgeProps> = ({ consistencyStreak, calorieGoalStreak }) => {
  if (consistencyStreak === 0 && calorieGoalStreak === 0) return null;

  const getConsistencyMessage = (s: number) => {
    if (s <= 1) return 'Que bom começar!';
    if (s < 7) return 'Consistência excelente!';
    return 'Hábito consolidado! 🏆';
  };

  const getCalorieMessage = (s: number) => {
    if (s <= 1) return 'Primeiro passo!';
    if (s < 7) return 'Meta no alvo!';
    return 'Foco absoluto! 🎯';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
      {/* Badge de Consistência */}
      {consistencyStreak > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-gradient-to-r from-orange-500/15 to-amber-500/10 border border-orange-500/25 rounded-2xl px-4 py-3"
        >
          <motion.span
            className="text-2xl"
            animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.6, delay: 0.5, repeat: Infinity, repeatDelay: 5 }}
          >
            🔥
          </motion.span>
          <div className="flex-1">
            <p className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider">Consistência</p>
            <p className="text-sm font-bold text-gray-100">
              {consistencyStreak} {consistencyStreak === 1 ? 'dia' : 'dias'} seguidos
            </p>
            <p className="text-xs text-gray-400">{getConsistencyMessage(consistencyStreak)}</p>
          </div>
          <div className="text-2xl font-black text-orange-400">{consistencyStreak}</div>
        </motion.div>
      )}

      {/* Badge de Meta Calórica */}
      {calorieGoalStreak > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/25 rounded-2xl px-4 py-3"
        >
          <motion.span
            className="text-2xl"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.6, delay: 0.8, repeat: Infinity, repeatDelay: 4 }}
          >
            🎯
          </motion.span>
          <div className="flex-1">
            <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Meta Diária</p>
            <p className="text-sm font-bold text-gray-100">
              {calorieGoalStreak} {calorieGoalStreak === 1 ? 'dia' : 'dias'} no alvo
            </p>
            <p className="text-xs text-gray-400">{getCalorieMessage(calorieGoalStreak)}</p>
          </div>
          <div className="text-2xl font-black text-emerald-400">{calorieGoalStreak}</div>
        </motion.div>
      )}
    </div>
  );
};

export default StreakBadge;
