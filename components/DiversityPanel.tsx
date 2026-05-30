/**
 * DiversityPanel — Arco-íris alimentar e análise de janela de alimentação.
 * Exibe o score de diversidade semanal e grupos alimentares identificados.
 * Baseado na Fase 3 da Documentacao_Tecnica.md.
 */
import React from 'react';
import { motion } from 'framer-motion';
import type { WeeklyDiversityResult, EatingWindowResult } from '../hooks/useFoodDiversity';
import { FOOD_GROUP_META } from '../hooks/useFoodDiversity';

interface Props {
  diversity: WeeklyDiversityResult;
  eatingWindow: EatingWindowResult;
}

function formatTime(date: Date | null): string {
  if (!date) return '--:--';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const DiversityPanel: React.FC<Props> = ({ diversity, eatingWindow }) => {
  const scoreColor =
    diversity.score >= 75 ? 'text-emerald-400' :
    diversity.score >= 50 ? 'text-yellow-400' :
    'text-orange-400';

  const scoreBg =
    diversity.score >= 75 ? 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20' :
    diversity.score >= 50 ? 'from-yellow-500/10 to-orange-500/10 border-yellow-500/20' :
    'from-orange-500/10 to-red-500/10 border-orange-500/20';

  const allGroups = Object.keys(FOOD_GROUP_META) as (keyof typeof FOOD_GROUP_META)[];

  return (
    <div className="flex flex-col gap-3">
      {/* Score de Diversidade */}
      <div className={`bg-gradient-to-br ${scoreBg} border rounded-2xl p-4`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-gray-500">Diversidade alimentar</p>
            <p className="text-xs text-gray-600">Últimos 7 dias</p>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${scoreColor}`}>{diversity.score}</p>
            <p className="text-xs text-gray-600">/ 100</p>
          </div>
        </div>

        {/* Arco-íris de grupos */}
        <div className="grid grid-cols-4 gap-1.5">
          {allGroups.map(group => {
            const meta = FOOD_GROUP_META[group];
            const seen = diversity.groupsSeen.includes(group);
            const count = diversity.groupsCount[group] ?? 0;
            return (
              <motion.div
                key={group}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-all ${
                  seen
                    ? 'bg-gray-800/60 border-gray-600/50'
                    : 'bg-gray-900/30 border-gray-800/30 opacity-40'
                }`}
              >
                <span className="text-lg">{meta.emoji}</span>
                <p className="text-[10px] text-gray-400 text-center leading-tight">{meta.label}</p>
                {seen && (
                  <span className="text-[10px] font-bold" style={{ color: meta.color }}>×{count}</span>
                )}
              </motion.div>
            );
          })}
        </div>

        {diversity.groupsSeen.length === 0 && (
          <p className="text-xs text-gray-600 text-center mt-2">
            Registre refeições desta semana para ver seu arco-íris alimentar!
          </p>
        )}

        {diversity.ultraPercent > 30 && (
          <div className="mt-3 flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5">
            <span className="text-base">⚠️</span>
            <p className="text-xs text-orange-300">
              {diversity.ultraPercent}% dos alimentos da semana são ultraprocessados. Que tal trocar por opções in natura?
            </p>
          </div>
        )}
      </div>

      {/* Janela alimentar */}
      {eatingWindow.mealCount > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4">
          <p className="text-xs text-gray-500 font-medium mb-3">Janela alimentar de hoje</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-900/40 rounded-xl p-2.5 text-center">
              <p className="text-xs text-gray-500">1ª refeição</p>
              <p className="text-sm font-bold text-gray-200">{formatTime(eatingWindow.firstMealAt)}</p>
            </div>
            <div className="bg-gray-900/40 rounded-xl p-2.5 text-center">
              <p className="text-xs text-gray-500">Janela</p>
              <p className="text-sm font-bold text-blue-400">{eatingWindow.windowHours}h</p>
            </div>
            <div className="bg-gray-900/40 rounded-xl p-2.5 text-center">
              <p className="text-xs text-gray-500">Última refeição</p>
              <p className={`text-sm font-bold ${eatingWindow.lateNightEating ? 'text-orange-400' : 'text-gray-200'}`}>
                {formatTime(eatingWindow.lastMealAt)}
              </p>
            </div>
          </div>
          {eatingWindow.lateNightEating && (
            <div className="mt-2.5 flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5">
              <span className="text-base">🌙</span>
              <p className="text-xs text-orange-300">
                Comer após as 21h pode impactar o sono e a digestão. Que tal adiantar um pouco?
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiversityPanel;
