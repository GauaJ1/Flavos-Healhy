/**
 * AdaptiveTDEECard — Exibe o status da calibração metabólica adaptativa.
 *
 * Permite ao usuário ver se o gasto metabólico calculado adaptativamente
 * diverge do estático e oferece a opção de aplicar a meta corrigida.
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AdaptiveTDEEState } from '../hooks/useAdaptiveTDEE';

interface AdaptiveTDEECardProps {
  state: AdaptiveTDEEState;
  onAccept: () => void;
  onReject: () => void;
}

export const AdaptiveTDEECard: React.FC<AdaptiveTDEECardProps> = ({
  state,
  onAccept,
  onReject,
}) => {
  const {
    daysWithData,
    confidence,
    ewmaWeight,
    staticTDEE,
    adaptiveTDEE,
    deltaTDEE,
    correctedTarget,
    overrideAccepted,
    avgDailyCalories,
    weightDelta,
    weeklyTrend,
    minDaysRequired,
  } = state;

  // Determinar cores baseadas no nível de confiança
  const confidenceLabels = {
    insuficiente: { text: 'Insuficiente · continue registrando peso e refeições', color: 'text-gray-500', dots: 1 },
    baixa: { text: 'Confiança baixa · estimativa preliminar', color: 'text-yellow-500', dots: 2 },
    media: { text: 'Confiança média · bom direcionamento', color: 'text-blue-400', dots: 3 },
    alta: { text: `Confiança alta · ${daysWithData} de ${minDaysRequired} dias mínimos`, color: 'text-emerald-400', dots: 5 },
  };

  const currentConf = confidenceLabels[confidence];

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-5 flex flex-col gap-4">
      {/* Header com badge de calibração */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-base font-bold text-white">TDEE Adaptativo</h3>
          <p className="text-xs text-gray-400 mt-0.5">Estimativa do gasto metabólico real baseado na sua rotina</p>
        </div>
        <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
          ✨ {daysWithData} {daysWithData === 1 ? 'dia' : 'dias'}
        </span>
      </div>

      {/* Indicador de confiança */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((d) => (
            <div
              key={d}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                d <= currentConf.dots
                  ? confidence === 'alta'
                    ? 'bg-emerald-500 animate-pulse'
                    : confidence === 'media'
                    ? 'bg-blue-400'
                    : 'bg-yellow-500'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-semibold ${currentConf.color}`}>{currentConf.text}</span>
      </div>

      {/* Informações de peso suavizado EWMA */}
      {ewmaWeight !== null && (
        <div className="flex items-start gap-2 bg-gray-900/30 border border-gray-800 rounded-xl p-3">
          <div className="text-lg">⚖️</div>
          <div>
            <p className="text-xs text-gray-300 font-semibold">Peso Suavizado (EWMA): {ewmaWeight} kg</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
              Filtra flutuações hídricas diárias. Variação na janela:{' '}
              <span className={weightDelta && weightDelta > 0 ? 'text-red-400' : 'text-emerald-400'}>
                {weightDelta && weightDelta > 0 ? '+' : ''}
                {weightDelta} kg
              </span>{' '}
              ({weeklyTrend && weeklyTrend > 0 ? '+' : ''}
              {weeklyTrend} kg/semana)
            </p>
          </div>
        </div>
      )}

      {/* Caixa comparativa entre Mifflin e Real */}
      <div className="bg-gray-900/40 rounded-xl p-3 border border-gray-700/30 flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Gasto estimado pela fórmula:</span>
          <span className="text-gray-200 font-medium">{staticTDEE} kcal</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-400">Gasto real adaptativo:</span>
          {adaptiveTDEE !== null ? (
            <span className="text-emerald-400 font-bold">{adaptiveTDEE} kcal</span>
          ) : (
            <span className="text-gray-500 italic">Calculando...</span>
          )}
        </div>
        {deltaTDEE !== null && (
          <div className="flex justify-between items-center text-xs pt-1.5 border-t border-gray-800">
            <span className="text-gray-400">Diferença detectada:</span>
            <span className={`font-bold ${deltaTDEE >= 0 ? 'text-emerald-400' : 'text-yellow-500'}`}>
              {deltaTDEE >= 0 ? '+' : ''}
              {deltaTDEE} kcal
            </span>
          </div>
        )}
      </div>

      {/* Se houver TDEE adaptativo e a confiança for razoável, propor a meta atualizada */}
      <AnimatePresence mode="wait">
        {adaptiveTDEE !== null && correctedTarget !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col gap-3 mt-1"
          >
            {/* Warning de consistência ou desvio */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2 items-start text-xs text-amber-300 leading-normal">
              <span>⚠️</span>
              <div>
                <p className="font-semibold mb-0.5">Metabolismo em adaptação</p>
                <p className="text-amber-400/80">
                  {deltaTDEE && deltaTDEE > 50
                    ? `Seu gasto real é superior ao cálculo estático. Recomendamos aplicar a correção para gerar superávit/déficit real.`
                    : `Ajuste fino calibrando o gasto de acordo com peso real e calorias consumidas registradas.`}
                </p>
              </div>
            </div>

            {/* Nova meta proposta */}
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex justify-between items-center">
              <div>
                <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Nova meta diária proposta</p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {correctedTarget} <span className="text-xs text-gray-400 font-normal">kcal/dia</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {overrideAccepted ? 'Ativo' : 'Pendente'}
                </span>
              </div>
            </div>

            {/* Ações de override */}
            <div className="flex gap-2">
              {!overrideAccepted ? (
                <button
                  onClick={onAccept}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all shadow-md active:scale-95"
                >
                  Aplicar Meta Adaptativa
                </button>
              ) : (
                <button
                  onClick={onReject}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-2 px-4 rounded-xl text-xs transition-all active:scale-95"
                >
                  Voltar para Fórmula Padrão
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rodapé explicativo */}
      <div className="text-[10px] text-gray-500 leading-relaxed text-center flex items-center justify-center gap-1">
        💡 <span>Atualização de calibração automática semanal à medida que você registra mais dados.</span>
      </div>
    </div>
  );
};
