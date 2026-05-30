/**
 * AchievementsPanel — Painel de conquistas do Flavos Healthy.
 * Exibe conquistas desbloqueadas e em progresso.
 */
import React from 'react';
import { motion } from 'framer-motion';
import type { Achievement } from '../hooks/useAchievements';

interface Props {
  achievements: Achievement[];
}

const AchievementsPanel: React.FC<Props> = ({ achievements }) => {
  const unlocked = achievements.filter(a => a.unlocked);
  const inProgress = achievements.filter(a => !a.unlocked);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🏅</span>
        <p className="text-sm font-semibold text-white">Conquistas</p>
        <span className="ml-auto text-xs text-gray-500">{unlocked.length}/{achievements.length}</span>
      </div>

      {unlocked.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Desbloqueadas</p>
          <div className="flex flex-wrap gap-2">
            {unlocked.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
                className="flex flex-col items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 min-w-[72px]"
                title={`${a.title}: ${a.description}`}
              >
                <span className="text-2xl">{a.emoji}</span>
                <span className="text-xs text-emerald-400 text-center leading-tight font-medium">{a.title}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-gray-500 mb-2">Em progresso</p>
        <div className="flex flex-col gap-2">
          {inProgress.slice(0, 4).map(a => (
            <div key={a.id} className="flex items-center gap-3 bg-gray-900/40 rounded-xl p-2.5">
              <span className="text-xl opacity-40">{a.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 font-medium truncate">{a.title}</p>
                <div className="w-full bg-gray-700/50 rounded-full h-1.5 mt-1">
                  <motion.div
                    className="h-full bg-emerald-500/60 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${a.progress ?? 0}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                  />
                </div>
              </div>
              <span className="text-xs text-gray-600 whitespace-nowrap">
                {a.current}/{a.target}
              </span>
            </div>
          ))}
        </div>
      </div>

      {unlocked.length === 0 && inProgress.length === 0 && (
        <p className="text-sm text-gray-600 text-center py-4">
          Registre sua primeira refeição para começar!
        </p>
      )}
    </div>
  );
};

export default AchievementsPanel;
