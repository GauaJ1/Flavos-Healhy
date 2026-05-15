/**
 * Badge de streak — dias consecutivos com refeições registradas.
 */
import React from 'react';
import { motion } from 'framer-motion';

interface StreakBadgeProps {
  streak: number;
}

const StreakBadge: React.FC<StreakBadgeProps> = ({ streak }) => {
  if (streak === 0) return null;

  const getMessage = () => {
    if (streak === 1) return 'Primeiro dia!';
    if (streak < 4) return 'Bom começo!';
    if (streak < 7) return 'Continue assim!';
    if (streak < 14) return 'Uma semana!';
    if (streak < 30) return 'Incrível! 🏅';
    return 'Lendário! 🏆';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 bg-gradient-to-r from-orange-500/15 to-amber-500/10 border border-orange-500/25 rounded-2xl px-4 py-3 w-full"
    >
      <motion.span
        className="text-2xl"
        animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        🔥
      </motion.span>
      <div className="flex-1">
        <p className="text-sm font-bold text-orange-300">
          {streak} {streak === 1 ? 'dia' : 'dias'} seguidos!
        </p>
        <p className="text-xs text-gray-400">{getMessage()}</p>
      </div>
      <div className="text-2xl font-black text-orange-400">{streak}</div>
    </motion.div>
  );
};

export default StreakBadge;
