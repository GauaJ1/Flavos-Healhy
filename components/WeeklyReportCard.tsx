import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WeeklyReport } from '../hooks/useWeeklyReports';

interface WeeklyReportCardProps {
  report: WeeklyReport | null;
  isGenerating: boolean;
  onGenerate: () => void;
  error: string | null;
  hasMinimumHistory: boolean;
}

const WeeklyReportCard: React.FC<WeeklyReportCardProps> = ({
  report,
  isGenerating,
  onGenerate,
  error,
  hasMinimumHistory,
}) => {
  const [showStats, setShowStats] = useState(false);

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-5 relative overflow-hidden">
      {/* Top light glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wide">Relatório Semanal de IA</h3>
        </div>
        {report && (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 disabled:text-gray-500 transition-colors uppercase"
          >
            {isGenerating ? 'Gerando...' : '🔄 Atualizar'}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-6 flex flex-col items-center justify-center space-y-3"
          >
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-xs text-gray-400 font-medium">Analisando seus padrões da semana com IA...</p>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-4 text-center space-y-3"
          >
            <p className="text-xs text-red-400 font-medium">{error}</p>
            <button
              onClick={onGenerate}
              className="bg-red-500/10 text-red-300 border border-red-500/20 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-red-500/20 transition-all"
            >
              Tentar Novamente
            </button>
          </motion.div>
        ) : !report ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-4 text-center space-y-4"
          >
            <p className="text-xs text-gray-400 leading-relaxed">
              Descubra sua nota média da semana, consumo de ultraprocessados, comportamento da janela de alimentação e um feedback exclusivo gerado por inteligência artificial!
            </p>
            {hasMinimumHistory ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onGenerate}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-emerald-900/25 flex items-center justify-center gap-2"
              >
                📊 Gerar Meu Relatório Semanal
              </motion.button>
            ) : (
              <div className="bg-gray-900/40 border border-gray-700/40 rounded-xl p-3 text-center">
                <p className="text-[11px] text-gray-500 font-medium">
                  🔒 Registre pelo menos 3 refeições em seu histórico para desbloquear seu primeiro relatório semanal.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* 3 Pillars of Weekly Report */}
            <div className="space-y-3">
              {/* Highlight */}
              <div className="flex gap-2.5 items-start bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-3">
                <span className="text-lg leading-none pt-0.5" role="img" aria-label="leaf">🍃</span>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Ponto Forte</p>
                  <p className="text-xs text-gray-200 leading-relaxed font-medium">{report.highlight}</p>
                </div>
              </div>

              {/* Attention */}
              <div className="flex gap-2.5 items-start bg-amber-500/5 border border-amber-500/10 rounded-2xl p-3">
                <span className="text-lg leading-none pt-0.5" role="img" aria-label="warning">⚠️</span>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Foco de Atenção</p>
                  <p className="text-xs text-gray-200 leading-relaxed font-medium">{report.attention}</p>
                </div>
              </div>

              {/* Suggestion */}
              <div className="flex gap-2.5 items-start bg-blue-500/5 border border-blue-500/10 rounded-2xl p-3">
                <span className="text-lg leading-none pt-0.5" role="img" aria-label="lightbulb">💡</span>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">Dica de Evolução</p>
                  <p className="text-xs text-gray-200 leading-relaxed font-medium">{report.suggestion}</p>
                </div>
              </div>
            </div>

            {/* Expandable Stats Summary */}
            <div className="border-t border-gray-750 pt-3">
              <button
                onClick={() => setShowStats(!showStats)}
                className="w-full flex justify-between items-center text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors"
              >
                <span>📊 Estatísticas Agregadas da Semana</span>
                <span>{showStats ? '▲ Ocultar' : '▼ Mostrar'}</span>
              </button>

              <AnimatePresence>
                {showStats && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mt-3"
                  >
                    <div className="grid grid-cols-2 gap-2 pb-2">
                      <div className="bg-gray-900/30 border border-gray-750 rounded-xl p-2.5">
                        <span className="text-[9px] text-gray-500 font-bold uppercase block">Nota Média</span>
                        <span className="text-base font-extrabold text-emerald-400">{report.stats.averageDailyScore}<span className="text-[10px] font-normal text-gray-500">/100</span></span>
                      </div>
                      <div className="bg-gray-900/30 border border-gray-750 rounded-xl p-2.5">
                        <span className="text-[9px] text-gray-500 font-bold uppercase block">Média Calórica</span>
                        <span className="text-base font-extrabold text-white">{report.stats.averageDailyCalories} <span className="text-[10px] font-normal text-gray-400">kcal/dia</span></span>
                      </div>
                      <div className="bg-gray-900/30 border border-gray-750 rounded-xl p-2.5">
                        <span className="text-[9px] text-gray-500 font-bold uppercase block">Ultraprocessados</span>
                        <span className={`text-base font-extrabold ${report.stats.ultraProcessedPercent > 25 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {report.stats.ultraProcessedPercent}%
                        </span>
                      </div>
                      <div className="bg-gray-900/30 border border-gray-750 rounded-xl p-2.5">
                        <span className="text-[9px] text-gray-500 font-bold uppercase block">Janela de Alimentação</span>
                        <span className="text-base font-extrabold text-blue-400">{report.stats.averageEatingWindowHours} <span className="text-[10px] font-normal text-gray-400">horas</span></span>
                      </div>
                    </div>

                    {report.stats.missingFoodGroups.length > 0 && (
                      <div className="mt-2 bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-2.5">
                        <span className="text-[9px] text-yellow-500 font-bold uppercase block">Grupos Não Consumidos</span>
                        <span className="text-xs text-gray-300 capitalize">{report.stats.missingFoodGroups.join(', ')}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WeeklyReportCard;
