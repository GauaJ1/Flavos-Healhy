import React, { useState, useEffect } from 'react';
import type { AnalysisResult } from '../types';
import { FlameIcon, LightBulbIcon, ShareIcon, PlusCircleIcon, XMarkIcon } from './icons';
import { motion } from 'framer-motion';

interface AnalysisViewProps {
  result: AnalysisResult;
  imageFile: File | null;
  onAnalyzeAnother: () => void;
  onSave: (result: AnalysisResult, finalCalories: number) => void;
}

const MacroBar: React.FC<{ label: string; value: number; total: number; color: string }> = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span className="font-bold text-gray-200">{value}g</span>
      </div>
      <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
        <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  );
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ result, imageFile, onAnalyzeAnother, onSave }) => {
  const imageUrl = imageFile ? URL.createObjectURL(imageFile) : '';
  
  const [isRefining, setIsRefining] = useState(result.analysisMetadata?.requiresFollowUp || false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [finalCalories, setFinalCalories] = useState<number>(result.nutritionalSummary?.baseCalories || 0);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    if (result.analysisMetadata && !result.analysisMetadata.requiresFollowUp && !hasSaved && result.analysisMetadata.isRealFood) {
      onSave(result, result.nutritionalSummary.baseCalories);
      setHasSaved(true);
    }
  }, [result, hasSaved, onSave]);

  const handleFinishRefinement = () => {
    let calc = result.nutritionalSummary.baseCalories;
    let fraction = 1;

    result.analysisMetadata.followUpQuestions.forEach(q => {
      if (q.type === 'boolean' && answers[q.id] === true) {
        calc += q.calorieImpact;
      } else if (q.type === 'fraction' && answers[q.id] !== undefined) {
        fraction = answers[q.id];
      }
    });

    const final = Math.round(calc * fraction);
    setFinalCalories(final);
    setIsRefining(false);
    onSave(result, final);
    setHasSaved(true);
  };

  const handleSkipRefinement = () => {
    const final = result.nutritionalSummary.maxPossibleCalories;
    setFinalCalories(final);
    setIsRefining(false);
    onSave(result, final);
    setHasSaved(true);
  };

  const handleShare = async () => {
    const shareText = `Acabei de analisar minha refeição com o Flavos Healthy! Teve cerca de ${finalCalories} calorias. O app identificou: ${result.foods.map(f => f.name).join(', ')}.`;
    try {
      if (navigator.share) {
        const shareData: ShareData = { title: 'Minha Análise de Refeição', text: shareText };
        if (imageFile && navigator.canShare) {
          const fileToShare = new File([imageFile], 'refeicao.jpg', { type: imageFile.type });
          if (navigator.canShare({ files: [fileToShare] })) {
            shareData.files = [fileToShare];
          }
        }
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Resumo da refeição copiado para a área de transferência!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  if (result.analysisMetadata?.isRealFood === false) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md mx-auto text-center p-6">
        <div className="bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-red-500/30 p-8 flex flex-col items-center">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 relative">
             <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping opacity-20"></div>
             <XMarkIcon className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Imagem não aceita</h2>
          <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 w-full mb-6">
             <p className="text-gray-300 text-sm leading-relaxed">"{result.feedback}"</p>
          </div>
          <button onClick={onAnalyzeAnother} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20">
            Tentar Novamente
          </button>
        </div>
      </motion.div>
    );
  }

  if (isRefining) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mx-auto p-6 bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-emerald-500/30">
        <h2 className="text-2xl font-bold text-white mb-2">Refinando a Análise</h2>
        <p className="text-gray-300 mb-6 text-sm">Encontramos seu prato, mas precisamos de alguns detalhes para sermos exatos.</p>

        <div className="space-y-6">
          {result.analysisMetadata.followUpQuestions.map(q => (
            <div key={q.id} className="bg-gray-900/50 p-5 rounded-xl border border-gray-700">
              <p className="text-emerald-400 font-medium mb-4">{q.question}</p>
              {q.type === 'boolean' ? (
                <div className="flex gap-3">
                  <button onClick={() => setAnswers({...answers, [q.id]: true})} className={`flex-1 py-3 rounded-xl font-medium transition-all ${answers[q.id] === true ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'}`}>Sim</button>
                  <button onClick={() => setAnswers({...answers, [q.id]: false})} className={`flex-1 py-3 rounded-xl font-medium transition-all ${answers[q.id] === false ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'}`}>Não</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {[0.25, 0.5, 0.75, 1].map(frac => (
                    <button key={frac} onClick={() => setAnswers({...answers, [q.id]: frac})} className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${answers[q.id] === frac ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'}`}>
                      {frac === 1 ? 'Tudo' : frac === 0.5 ? 'Metade' : `${frac * 100}%`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={handleSkipRefinement} className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors">Pular (Usar margem segura)</button>
          <button onClick={handleFinishRefinement} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20">Confirmar</button>
        </div>
      </motion.div>
    );
  }

  const displayCalories = result.analysisMetadata.requiresFollowUp && !hasSaved
    ? `${result.nutritionalSummary.baseCalories} - ${result.nutritionalSummary.maxPossibleCalories}`
    : finalCalories;

  return (
    <div className="w-full max-w-5xl pb-20">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/60 backdrop-blur-md rounded-3xl shadow-xl border border-gray-700/50 overflow-hidden relative group">
             {imageUrl && <img src={imageUrl} alt="Analyzed meal" className="w-full h-64 md:h-full object-cover transition-transform duration-700 group-hover:scale-105" />}
             <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60 md:hidden"></div>
             <div className="absolute bottom-4 left-4 md:hidden">
                 <p className="text-white font-bold text-lg shadow-black drop-shadow-lg">Sua Refeição</p>
             </div>
          </div>

          <div className="bg-gray-800/60 backdrop-blur-md rounded-3xl shadow-xl border border-gray-700/50 p-6 md:p-8 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="flex justify-between items-start mb-2">
              <p className="text-emerald-400 font-semibold tracking-wide uppercase text-sm">Total Estimado</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${
                result.analysisMetadata.confidence === 'alta' ? 'bg-emerald-500/20 text-emerald-400' :
                result.analysisMetadata.confidence === 'media' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-orange-500/20 text-orange-400'
              }`}>
                Confiança {result.analysisMetadata.confidence}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
                 <span className="text-6xl md:text-7xl font-bold text-white tracking-tighter">
                   {displayCalories}
                 </span>
                 <span className="text-xl text-gray-400 font-medium">kcal</span>
            </div>
            
            {(result.nutritionalSummary.possiblePositiveComponents?.length > 0 || result.nutritionalSummary.possibleAttentionPoints?.length > 0) && (
              <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                {result.nutritionalSummary.possiblePositiveComponents && result.nutritionalSummary.possiblePositiveComponents.length > 0 && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                    <p className="text-emerald-400 text-xs font-bold mb-1 flex items-center gap-1">✨ Positivos</p>
                    <p className="text-gray-300 text-xs">{result.nutritionalSummary.possiblePositiveComponents.join(', ')}</p>
                  </div>
                )}
                {result.nutritionalSummary.possibleAttentionPoints && result.nutritionalSummary.possibleAttentionPoints.length > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                    <p className="text-orange-400 text-xs font-bold mb-1 flex items-center gap-1">⚠️ Atenção</p>
                    <p className="text-gray-300 text-xs">{result.nutritionalSummary.possibleAttentionPoints.join(', ')}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-2 mb-6 relative z-10">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Saciedade Estimada:</span>
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                result.nutritionalSummary.satietyEstimate === 'alta' ? 'bg-emerald-500/20 text-emerald-400' :
                result.nutritionalSummary.satietyEstimate === 'media' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {result.nutritionalSummary.satietyEstimate?.toUpperCase() || 'MÉDIA'}
              </span>
            </div>

            <p className="text-gray-300 text-lg leading-relaxed mb-8 relative z-10">
              "{result.feedback}"
            </p>

            <div className="flex gap-3 mt-auto">
                 <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleShare} className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-all border border-gray-600 hover:border-gray-500 flex items-center justify-center gap-2">
                    <ShareIcon className="w-5 h-5" />
                    Compartilhar
                </motion.button>
                 <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onAnalyzeAnother} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2">
                    <PlusCircleIcon className="w-5 h-5" />
                    Nova Análise
                </motion.button>
            </div>
          </div>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
              <h3 className="text-xl font-bold text-white px-2">Ingredientes Identificados</h3>
              <div className="space-y-3">
                {result.foods.map((food, index) => {
                  const totalMacros = food.carbohydrates + food.protein + food.fat;
                  
                  const sourceLabels = {
                    'visible': '👁️ Visível',
                    'inferred_from_context': '🧠 Inferido',
                    'estimated_recipe_component': '🧠 Componente provável'
                  };

                  const processingLabels = {
                    'in_natura': 'In Natura',
                    'minimamente_processado': 'Minimamente Processado',
                    'processado': 'Processado',
                    'ultraprocessado': 'Ultraprocessado',
                    'indeterminado': 'Indeterminado'
                  };

                  return (
                    <motion.div 
                      key={food.id || index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                      className="bg-gray-800/40 backdrop-blur-sm p-5 rounded-2xl border border-gray-700/50 hover:bg-gray-800/60 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-lg font-bold text-gray-100">{food.name}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              food.confidence === 'alta' ? 'bg-emerald-500/20 text-emerald-400' :
                              food.confidence === 'media' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-orange-500/20 text-orange-400'
                            }`}>
                              {food.confidence}
                            </span>
                          </div>
                          <p className="text-sm text-emerald-400 font-medium">
                            {food.estimatedAmount} {food.unit} ({food.estimatedWeightGrams}g)
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">{food.portionDescription}</p>
                        </div>
                        <div className="bg-gray-900/50 px-3 py-1 rounded-lg border border-gray-700">
                          <p className="font-bold text-white">{food.calories} kcal</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-4">
                          <MacroBar label="Carb" value={food.carbohydrates} total={totalMacros} color="bg-blue-400" />
                          <MacroBar label="Prot" value={food.protein} total={totalMacros} color="bg-emerald-400" />
                          <MacroBar label="Gord" value={food.fat} total={totalMacros} color="bg-yellow-400" />
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-700/50 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">Origem:</span>
                            <span className="text-gray-300 font-medium">{sourceLabels[food.source as keyof typeof sourceLabels] || food.source}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">Preparo:</span>
                            <span className="text-gray-300 capitalize">{food.preparationMethod}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">Processamento:</span>
                            <span className="text-gray-300">{processingLabels[food.processingLevel as keyof typeof processingLabels] || food.processingLevel}</span>
                          </div>
                          {food.micronutrients && food.micronutrients !== 'Sem destaques' && food.micronutrients !== 'Nenhum destaque' && (
                            <div className="flex items-start gap-2 text-xs mt-2">
                              <span className="text-blue-400 shrink-0">💎</span>
                              <span className="text-blue-200/90"><span className="font-semibold text-blue-300">Micronutrientes:</span> {food.micronutrients}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          {food.healthHighlights && food.healthHighlights.length > 0 && (
                            <div className="flex items-start gap-2 text-xs">
                              <span className="text-emerald-500 shrink-0">✓</span>
                              <span className="text-emerald-200/80">{food.healthHighlights.join(', ')}</span>
                            </div>
                          )}
                          {food.attentionHighlights && food.attentionHighlights.length > 0 && (
                            <div className="flex items-start gap-2 text-xs">
                              <span className="text-orange-400 shrink-0">!</span>
                              <span className="text-orange-200/80">{food.attentionHighlights.join(', ')}</span>
                            </div>
                          )}
                          {food.possibleAddedSugars && (
                            <div className="flex items-start gap-2 text-xs">
                              <span className="text-red-400 shrink-0">⚠️</span>
                              <span className="text-red-200/80">Possível adição de açúcares industriais</span>
                            </div>
                          )}
                          {food.possibleAddedFats && (
                            <div className="flex items-start gap-2 text-xs">
                              <span className="text-red-400 shrink-0">⚠️</span>
                              <span className="text-red-200/80">Possível adição de gorduras (preparo/fritura)</span>
                            </div>
                          )}
                          {food.possibleExcessSodium && (
                            <div className="flex items-start gap-2 text-xs">
                              <span className="text-red-400 shrink-0">⚠️</span>
                              <span className="text-red-200/80">Possível excesso de sódio</span>
                            </div>
                          )}
                          {food.possibleIndustrializedSauces && (
                            <div className="flex items-start gap-2 text-xs">
                              <span className="text-red-400 shrink-0">⚠️</span>
                              <span className="text-red-200/80">Uso provável de molhos industrializados</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
                <h3 className="text-xl font-bold text-white px-2 flex items-center gap-2">
                    <LightBulbIcon className="w-5 h-5 text-yellow-400" />
                    Dicas do Chef
                </h3>
                <div className="space-y-4">
                    {result.suggestions.map((suggestion, index) => (
                        <motion.div 
                            key={index}
                            whileHover={{ y: -2 }}
                            className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-2xl border border-gray-700/50 shadow-lg relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full -mr-2 -mt-2"></div>
                            <h4 className="font-bold text-emerald-300 mb-2 text-lg">{suggestion.title}</h4>
                            <p className="text-sm text-gray-400 leading-relaxed">{suggestion.details}</p>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AnalysisView;
