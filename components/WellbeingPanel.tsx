import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWellbeing } from '../hooks/useWellbeing';
import type { HistoryEntry } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface WellbeingPanelProps {
  history: HistoryEntry[];
}

const WellbeingPanel: React.FC<WellbeingPanelProps> = ({ history }) => {
  const {
    logs,
    addLog,
    correlationStats,
    hasSufficientSamples,
    insight,
    generateInsight,
    isGenerating,
    error,
  } = useWellbeing(history);

  const [activeTab, setActiveTab] = useState<'checkin' | 'insights'>('checkin');
  
  // Form state
  const [energy, setEnergy] = useState<number>(3);
  const [mood, setMood] = useState<number>(3);
  const [sleep, setSleep] = useState<number>(3);
  const [notes, setNotes] = useState<string>('');
  const [selectedMealId, setSelectedMealId] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Emojis mapping
  const moodEmojis = ['😢', '😔', '😐', '🙂', '😊'];
  const energyEmojis = ['🥱', '🔋', '⚡', '🚀', '💥'];
  const sleepEmojis = ['❌', '🥱', '😴', '🔋', '🌟'];

  const recentMeals = history.slice(0, 5); // 5 refeições mais recentes para vincular

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLog({
      energy,
      mood,
      sleep,
      notes: notes.slice(0, 140),
      meal_id: selectedMealId ? selectedMealId : undefined,
    });

    setIsSuccess(true);
    setNotes('');
    setSelectedMealId('');
    setTimeout(() => {
      setIsSuccess(false);
    }, 3000);
  };

  // Preparar dados para o gráfico de comparação Protein e Carb
  const hasData = logs.length > 0;

  const chartData = [
    {
      name: 'Prot. Baixa (<15g)',
      energia: correlationStats.protein_correlation.baixa_proteina.count > 0 
        ? +(correlationStats.protein_correlation.baixa_proteina.sum_energy / correlationStats.protein_correlation.baixa_proteina.count).toFixed(1) 
        : 0,
      humor: correlationStats.protein_correlation.baixa_proteina.count > 0 
        ? +(correlationStats.protein_correlation.baixa_proteina.sum_mood / correlationStats.protein_correlation.baixa_proteina.count).toFixed(1) 
        : 0,
    },
    {
      name: 'Prot. Alta (≥30g)',
      energia: correlationStats.protein_correlation.alta_proteina.count > 0 
        ? +(correlationStats.protein_correlation.alta_proteina.sum_energy / correlationStats.protein_correlation.alta_proteina.count).toFixed(1) 
        : 0,
      humor: correlationStats.protein_correlation.alta_proteina.count > 0 
        ? +(correlationStats.protein_correlation.alta_proteina.sum_mood / correlationStats.protein_correlation.alta_proteina.count).toFixed(1) 
        : 0,
    },
    {
      name: 'Carb. Baixo (<25g)',
      energia: correlationStats.carb_correlation.baixo_carb.count > 0 
        ? +(correlationStats.carb_correlation.baixo_carb.sum_energy / correlationStats.carb_correlation.baixo_carb.count).toFixed(1) 
        : 0,
      humor: correlationStats.carb_correlation.baixo_carb.count > 0 
        ? +(correlationStats.carb_correlation.baixo_carb.sum_mood / correlationStats.carb_correlation.baixo_carb.count).toFixed(1) 
        : 0,
    },
    {
      name: 'Carb. Alto (≥75g)',
      energia: correlationStats.carb_correlation.alto_carb.count > 0 
        ? +(correlationStats.carb_correlation.alto_carb.sum_energy / correlationStats.carb_correlation.alto_carb.count).toFixed(1) 
        : 0,
      humor: correlationStats.carb_correlation.alto_carb.count > 0 
        ? +(correlationStats.carb_correlation.alto_carb.sum_mood / correlationStats.carb_correlation.alto_carb.count).toFixed(1) 
        : 0,
    },
  ];

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wide flex items-center gap-2">
          <span>🧠</span> Correlações & Bem-Estar
        </h3>

        {/* Tab switch */}
        <div className="flex bg-gray-900/40 p-0.5 rounded-lg border border-gray-700/60">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${
              activeTab === 'checkin' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Check-In
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all ${
              activeTab === 'insights' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Gráficos & Insights
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'checkin' ? (
          <motion.form
            key="checkin"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {isSuccess ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="py-8 text-center space-y-2"
              >
                <div className="text-4xl">✨</div>
                <p className="text-sm font-bold text-emerald-400">Check-in salvo com sucesso!</p>
                <p className="text-xs text-gray-400">Suas respostas alimentam seu painel de correlações.</p>
              </motion.div>
            ) : (
              <>
                {/* Energy Check-in */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Como está sua Energia agora?</label>
                  <div className="flex justify-between gap-1">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setEnergy(val)}
                        className={`flex-1 py-2 rounded-xl text-center border transition-all text-lg flex flex-col items-center ${
                          energy === val
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                            : 'bg-gray-950/20 border-gray-700/50 text-gray-500 hover:border-gray-600'
                        }`}
                      >
                        <span>{energyEmojis[val - 1]}</span>
                        <span className="text-[8px] mt-1 text-gray-400">{val}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood Check-in */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Como está seu Humor?</label>
                  <div className="flex justify-between gap-1">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setMood(val)}
                        className={`flex-1 py-2 rounded-xl text-center border transition-all text-lg flex flex-col items-center ${
                          mood === val
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm'
                            : 'bg-gray-950/20 border-gray-700/50 text-gray-500 hover:border-gray-600'
                        }`}
                      >
                        <span>{moodEmojis[val - 1]}</span>
                        <span className="text-[8px] mt-1 text-gray-400">{val}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sleep Check-in */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Qualidade do Sono da noite anterior?</label>
                  <div className="flex justify-between gap-1">
                    {[1, 2, 3, 4, 5].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setSleep(val)}
                        className={`flex-1 py-2 rounded-xl text-center border transition-all text-lg flex flex-col items-center ${
                          sleep === val
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                            : 'bg-gray-950/20 border-gray-700/50 text-gray-500 hover:border-gray-600'
                        }`}
                      >
                        <span>{sleepEmojis[val - 1]}</span>
                        <span className="text-[8px] mt-1 text-gray-400">{val}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional free-text notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Notas (Opcional, max 140 caracteres)</label>
                  <input
                    type="text"
                    maxLength={140}
                    placeholder="Sinto fadiga, treinei pesado, digestão leve..."
                    className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Bind to recent meal */}
                {recentMeals.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Vincular a uma Refeição Recente (Opcional)</label>
                    <select
                      className="w-full bg-gray-900 border border-gray-700/80 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
                      value={selectedMealId}
                      onChange={(e) => setSelectedMealId(e.target.value)}
                    >
                      <option value="">Nenhuma refeição (check-in geral)</option>
                      {recentMeals.map(m => {
                        const dateStr = new Date(m.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const firstFood = m.foods[0]?.name || 'Refeição';
                        return (
                          <option key={m.id} value={m.id}>
                            {dateStr} - {firstFood} ({m.totalCalories} kcal)
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-900/20"
                >
                  Confirmar Check-In
                </button>
              </>
            )}
          </motion.form>
        ) : (
          <motion.div
            key="insights"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-5"
          >
            {/* IA Wellbeing Insight Card */}
            <div className="bg-gray-900/30 border border-gray-750 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">💡 Insight de IA</span>
                {hasSufficientSamples && (
                  <button
                    onClick={generateInsight}
                    disabled={isGenerating}
                    className="text-[9px] font-bold text-emerald-400 uppercase hover:text-emerald-300 disabled:text-gray-500"
                  >
                    {isGenerating ? 'Analisando...' : '🔄 Atualizar'}
                  </button>
                )}
              </div>

              {isGenerating ? (
                <div className="py-2 flex items-center gap-2">
                  <div className="w-4.5 h-4.5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin shrink-0" />
                  <p className="text-[11px] text-gray-400">Analisando dados com IA...</p>
                </div>
              ) : error ? (
                <p className="text-[11px] text-red-400 leading-normal">{error}</p>
              ) : insight ? (
                <p className="text-xs text-gray-200 leading-relaxed font-medium">"{insight}"</p>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-gray-300">
                    Ainda sem insights disponíveis. O motor de correlação requer check-ins vinculados para extrair conclusões de bem-estar.
                  </p>
                  <p className="text-[10px] text-gray-500 leading-normal font-medium">
                    {hasSufficientSamples 
                      ? '🎯 Você possui dados suficientes! Clique em "Atualizar" acima para gerar o insight com IA.'
                      : `🔒 Falta pouco: registre pelo menos 5 check-ins associados a uma mesma categoria nutricional para desbloquear o insight (Amostras atuais: ${correlationStats.total_samples}).`}
                  </p>
                </div>
              )}
            </div>

            {/* Recharts Bar Chart */}
            {hasData ? (
              <div className="space-y-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">🔋 Impacto de Macros no Bem-Estar</span>
                <div className="h-44 w-full bg-gray-950/20 rounded-xl p-2 border border-gray-750">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={8} tickLine={false} />
                      <YAxis domain={[0, 5]} stroke="#6b7280" fontSize={8} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }} 
                        labelStyle={{ color: '#f3f4f6', fontSize: '10px', fontWeight: 600 }}
                        itemStyle={{ fontSize: '10px' }}
                      />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '9px', color: '#9ca3af', paddingTop: '5px' }} />
                      <Bar dataKey="energia" name="Energia Média" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="humor" name="Humor Médio" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[9px] text-gray-500 leading-normal italic text-center">
                  * Escala de 1 a 5. Averages são calculadas dos check-ins vinculados às refeições de cada tier nos últimos 60 dias.
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-500 text-center py-6">Fazer check-ins para visualizar gráficos de correlação.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WellbeingPanel;
