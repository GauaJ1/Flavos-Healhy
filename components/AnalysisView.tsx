import React, { useState, useEffect, useMemo } from 'react';
import type { AnalysisResult, FoodItem } from '../types';
import { FlameIcon, LightBulbIcon, ShareIcon, PlusCircleIcon, XMarkIcon } from './icons';
import { motion } from 'framer-motion';
import NutritionScoreBadge from './NutritionScoreBadge';
import DetailedNutritionPanel from './DetailedNutritionPanel';
import ProcessingBreakdownComp from './ProcessingBreakdown';
import MicronutrientPanel from './MicronutrientPanel';
import NutritionalAlerts from './NutritionalAlerts';
import PortionAdjuster from './PortionAdjuster';
import { calculateNutritionScore, calculateProcessingBreakdown, aggregateMicronutrients, generateAlerts } from '../utils/nutritionScore';
import { buildMealShareMessage } from '../utils/shareMessage';
import { loadGoals } from '../hooks/useDailyStats';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

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
  const [adjustedFoods, setAdjustedFoods] = useState<FoodItem[]>(result.foods || []);
  const [finalCalories, setFinalCalories] = useState<number>(result.nutritionalSummary?.baseCalories || 0);
  const [hasSaved, setHasSaved] = useState(false);

  // Estados para respostas personalizadas/customizadas
  const [customModes, setCustomModes] = useState<Record<string, boolean>>({});
  const [customTexts, setCustomTexts] = useState<Record<string, string>>({});
  const [customImpacts, setCustomImpacts] = useState<Record<string, number>>({});

  // Recalcular quando porções mudam
  const currentResult = useMemo(() => {
    const r = { ...result, foods: adjustedFoods };
    r.nutritionalSummary = { ...r.nutritionalSummary, baseCalories: adjustedFoods.reduce((s, f) => s + f.calories, 0) };
    return r;
  }, [result, adjustedFoods]);

  const nutritionScore = useMemo(() => calculateNutritionScore(currentResult), [currentResult]);
  const processingBreakdown = useMemo(() => calculateProcessingBreakdown(adjustedFoods), [adjustedFoods]);
  const micronutrients = useMemo(() => aggregateMicronutrients(adjustedFoods), [adjustedFoods]);
  const alerts = useMemo(() => generateAlerts(currentResult), [currentResult]);

  // Carregar metas diárias para comparação e insights
  const dailyGoals = useMemo(() => loadGoals(), []);
  const dailyBudget = dailyGoals.calories || 2000;
  const caloriePercentage = Math.round((finalCalories / dailyBudget) * 100);

  // Equivalentes de Atividade Física
  const walkTime = Math.round(finalCalories / 4); // ~4 kcal/min caminhando
  const cycleTime = Math.round(finalCalories / 7); // ~7 kcal/min pedalando
  const runTime = Math.round(finalCalories / 10); // ~10 kcal/min correndo

  // Densidade calórica e termômetro
  const densityValue = result.nutritionalSummary.calorieDensity || 'media';
  const densityPercent = 
    densityValue === 'baixa' ? '16.6%' : 
    densityValue === 'media' ? '50%' : '83.3%';

  // ATP e Performance
  const totalCarbs = useMemo(() => adjustedFoods.reduce((sum, food) => sum + food.carbohydrates, 0), [adjustedFoods]);
  const totalProtein = useMemo(() => adjustedFoods.reduce((sum, food) => sum + food.protein, 0), [adjustedFoods]);
  const totalFat = useMemo(() => adjustedFoods.reduce((sum, food) => sum + food.fat, 0), [adjustedFoods]);

  // Origem das calorias por macronutriente (Atwater)
  const { carbCal, protCal, fatCal, carbPct, protPct, fatPct } = useMemo(() => {
    const cCal = Math.round(totalCarbs * 4);
    const pCal = Math.round(totalProtein * 4);
    const fCal = Math.round(totalFat * 9);
    const totalCalc = cCal + pCal + fCal || 1;
    const cPct = Math.round((cCal / totalCalc) * 100);
    const pPct = Math.round((pCal / totalCalc) * 100);
    const fPct = Math.max(0, 100 - cPct - pPct); // garantir soma 100% e evitar valor negativo
    return { carbCal: cCal, protCal: pCal, fatCal: fCal, carbPct: cPct, protPct: pPct, fatPct: fPct };
  }, [totalCarbs, totalProtein, totalFat]);

  // Impacto Metabólico e Velocidade de Absorção
  const metabolicImpact = useMemo(() => {
    const fiber = adjustedFoods.reduce((sum, food) => sum + (food.fiber || 0), 0);
    
    if (totalCarbs <= 5) {
      return {
        label: 'Homeostase Lipídica / Cetogênica',
        desc: 'Energia proveniente quase exclusivamente de proteínas e gorduras. Mantém a glicose estável sem picos de insulina.',
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        emoji: '🔋'
      };
    }
    
    const fiberRatio = fiber / totalCarbs;
    const proteinRatio = totalProtein / totalCarbs;
    
    if (fiberRatio >= 0.15 || proteinRatio >= 0.5) {
      return {
        label: 'Energia Gradual / Sustentada',
        desc: 'Liberação lenta de glicose. Sem picos de insulina, excelente para saciedade e controle de peso.',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        emoji: '🌱'
      };
    } else if (fiberRatio < 0.08 && proteinRatio < 0.25) {
      return {
        label: 'Energia Rápida / Pico Glicêmico',
        desc: 'Absorção veloz. Ótimo para energia de explosão pré-treino, mas pode causar cansaço posterior.',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        emoji: '⚡'
      };
    } else {
      return {
        label: 'Energia Moderada / Estável',
        desc: 'Absorção equilibrada. Fornece energia estável ao longo de 2 a 3 horas.',
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        emoji: '⚖️'
      };
    }
  }, [totalCarbs, totalProtein, adjustedFoods]);

  const { atpTitle, atpDescription } = useMemo(() => {
    if (totalProtein >= 20 && totalCarbs >= 30) {
      return {
        atpTitle: 'Refeição Alta Performance (Anabólica & Energética)',
        atpDescription: 'Combinação ideal de carboidratos para reabastecer rapidamente o glicogênio (recuperando os estoques de ATP celular) e proteínas de alto valor biológico para otimizar a regeneração e anabolismo muscular pós-esforço.'
      };
    } else if (totalCarbs >= 40) {
      return {
        atpTitle: 'Super Recarga de ATP (Glicogênio Ativo)',
        atpDescription: 'Rica em carboidratos, ideal para fornecer glicose rápida para as mitocôndrias produzirem ATP. Excelente pré-treino para garantir explosão muscular e alta disposição física.'
      };
    } else if (totalProtein >= 20) {
      return {
        atpTitle: 'Recuperação Tecidual & Saciedade Prolongada',
        atpDescription: 'Foco em aminoácidos essenciais para a reparação de microlesões musculares. O alto teor proteico ativa vias de saciedade e ajuda a preservar a massa muscular ativa mesmo em repouso.'
      };
    } else if (totalCarbs <= 15 && totalFat >= 15) {
      return {
        atpTitle: 'Energia Sustentada via Lipídeos (Foco de Resistência)',
        atpDescription: 'Baixo carboidrato com gorduras saudáveis. Estimula a via de oxidação lipídica e produção de corpos cetônicos para energia mental constante, sem oscilações de insulina ou fadiga.'
      };
    } else {
      return {
        atpTitle: 'Aporte de Energia Diária Estabilizado',
        atpDescription: 'Combinação balanceada de nutrientes que fornece energia estável ao organismo. Apoia a homeostase metabólica e mantém os processos vitais ativos sem picos elevados de glicose sanguínea.'
      };
    }
  }, [totalCarbs, totalProtein, totalFat]);

  const handlePortionAdjust = (index: number, adjusted: FoodItem) => {
    const newFoods = [...adjustedFoods];
    newFoods[index] = adjusted;
    setAdjustedFoods(newFoods);
    setFinalCalories(newFoods.reduce((s, f) => s + f.calories, 0));
  };

  useEffect(() => {
    if (result.analysisMetadata && !result.analysisMetadata.requiresFollowUp && !hasSaved && result.analysisMetadata.isRealFood) {
      onSave(result, result.nutritionalSummary.baseCalories);
      setHasSaved(true);
    }
  }, [result, hasSaved, onSave]);

  const updateCustomAnswer = (qId: string, text: string, impact: number) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: {
        isCustom: true,
        text,
        calorieImpact: impact
      }
    }));
  };

  const handleCustomTextChange = (qId: string, text: string) => {
    setCustomTexts(prev => {
      const nextTexts = { ...prev, [qId]: text };
      updateCustomAnswer(qId, nextTexts[qId], customImpacts[qId] || 0);
      return nextTexts;
    });
  };

  const handleCustomImpactChange = (qId: string, impact: number) => {
    setCustomImpacts(prev => {
      const nextImpacts = { ...prev, [qId]: impact };
      updateCustomAnswer(qId, customTexts[qId] || '', nextImpacts[qId]);
      return nextImpacts;
    });
  };

  const toggleCustomMode = (qId: string) => {
    setCustomModes(prev => {
      const nextMode = !prev[qId];
      if (nextMode) {
        const initialText = '';
        const initialImpact = 0;
        setCustomTexts(t => ({ ...t, [qId]: initialText }));
        setCustomImpacts(i => ({ ...i, [qId]: initialImpact }));
        updateCustomAnswer(qId, initialText, initialImpact);
      } else {
        setAnswers(prevAnswers => {
          const nextAnswers = { ...prevAnswers };
          delete nextAnswers[qId];
          return nextAnswers;
        });
      }
      return { ...prev, [qId]: nextMode };
    });
  };

  const handleFinishRefinement = () => {
    let calc = result.nutritionalSummary.baseCalories;
    let fraction = 1;

    result.analysisMetadata.followUpQuestions.forEach(q => {
      const ans = answers[q.id];
      if (ans && typeof ans === 'object' && ans.isCustom) {
        calc += ans.calorieImpact;
      } else {
        if (q.type === 'boolean' && ans === true) {
          calc += q.calorieImpact;
        } else if (q.type === 'fraction' && ans !== undefined) {
          fraction = ans;
        } else if (q.type === 'choice' && ans !== undefined) {
          calc += ans;
        }
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
    const totalCarbs = adjustedFoods.reduce((sum, food) => sum + food.carbohydrates, 0);
    const totalProtein = adjustedFoods.reduce((sum, food) => sum + food.protein, 0);
    const totalFat = adjustedFoods.reduce((sum, food) => sum + food.fat, 0);
    const totalFiber = adjustedFoods.reduce((sum, food) => sum + (food.fiber || 0), 0);

    const shareText = buildMealShareMessage({
      nutritionScore,
      processingBreakdown,
      adjustedFoods,
      finalCalories,
      macros: {
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat,
        fiber: totalFiber,
      },
      variant: 'default',
    });

    const shareTitle = 'Análise Nutricional — Flavos Healthy';

    try {
      if (Capacitor.isNativePlatform()) {
        let fileUrls: string[] = [];
        
        if (imageFile) {
          try {
            const reader = new FileReader();
            reader.readAsDataURL(imageFile);
            await new Promise<void>((resolve, reject) => {
              reader.onload = async () => {
                try {
                  const base64Data = (reader.result as string).split(',')[1];
                  const fileName = `flavos-analise-${Date.now()}.jpg`;
                  const savedFile = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Cache,
                  });
                  fileUrls.push(savedFile.uri);
                  resolve();
                } catch (e) {
                  reject(e);
                }
              };
              reader.onerror = reject;
            });
          } catch (e) {
            console.error('Falha ao salvar imagem no cache do celular:', e);
          }
        }

        await Share.share({
          title: shareTitle,
          text: shareText,
          files: fileUrls.length > 0 ? fileUrls : undefined,
          dialogTitle: 'Compartilhe sua Análise'
        });
        return;
      }

      // Lógica para Web (Mobile Browsers como Safari iOS e Chrome Android)
      const isWebShareSupported = 'canShare' in navigator;
      
      if (imageFile && isWebShareSupported) {
        // Safari do iOS exige o tipo MIME explícito, senão ele bloqueia o envio da imagem
        const mimeType = imageFile.type || 'image/jpeg';
        const fileToShare = new File([imageFile], 'analise-flavos.jpg', { type: mimeType });

        if (navigator.canShare({ files: [fileToShare] })) {
          await navigator.share({ 
            title: shareTitle, 
            text: shareText, 
            files: [fileToShare] 
          });
          return;
        }
      }

      // Fallback 1: Compartilhar apenas texto (Navegadores mais antigos)
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText });
        return;
      }

      // Fallback 2: Copiar para área de transferência (PC)
      await navigator.clipboard.writeText(shareText);
      alert('Análise copiada para a área de transferência!');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareText);
          alert('Análise copiada para a área de transferência!');
        } catch {
          console.error('Erro ao compartilhar:', error);
        }
      }
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
          {result.analysisMetadata.followUpQuestions.map(q => {
            const isCustom = customModes[q.id];
            return (
              <div key={q.id} className="bg-gray-900/50 p-5 rounded-xl border border-gray-700 space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <p className="text-emerald-400 font-medium">{q.question}</p>
                  <button
                    onClick={() => toggleCustomMode(q.id)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                      isCustom 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'bg-gray-800 text-gray-400 border border-gray-750 hover:bg-gray-750 hover:text-white'
                    }`}
                  >
                    {isCustom ? '✨ Usar Prontos' : '✍️ Personalizar'}
                  </button>
                </div>

                {isCustom ? (
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-[11px] text-gray-400 font-medium mb-1 block">Sua resposta personalizada:</label>
                      <input
                        type="text"
                        placeholder="Ex: Grelhado com pouco azeite, cozido no vapor, frito na airfryer..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors text-sm"
                        value={customTexts[q.id] || ''}
                        onChange={(e) => handleCustomTextChange(q.id, e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2 bg-gray-800/40 p-3 rounded-xl border border-gray-755">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Ajuste de calorias adicionais:</span>
                        <span className="font-bold text-emerald-400">
                          {customImpacts[q.id] > 0 ? `+${customImpacts[q.id]}` : customImpacts[q.id]} kcal
                        </span>
                      </div>
                      <input
                        type="range"
                        min={-150}
                        max={350}
                        step={10}
                        value={customImpacts[q.id] !== undefined ? customImpacts[q.id] : 0}
                        onChange={(e) => handleCustomImpactChange(q.id, Number(e.target.value))}
                        className="w-full accent-emerald-500"
                      />
                      <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                        <span>Sem gordura (-150 kcal)</span>
                        <span>Normal (0 kcal)</span>
                        <span>Frito / Calórico (+350 kcal)</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {q.type === 'boolean' ? (
                      <div className="flex gap-3">
                        <button onClick={() => setAnswers({...answers, [q.id]: true})} className={`flex-1 py-3 rounded-xl font-medium transition-all ${answers[q.id] === true ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'}`}>Sim</button>
                        <button onClick={() => setAnswers({...answers, [q.id]: false})} className={`flex-1 py-3 rounded-xl font-medium transition-all ${answers[q.id] === false ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'}`}>Não</button>
                      </div>
                    ) : q.type === 'fraction' ? (
                      <div className="flex gap-2">
                        {[0.25, 0.5, 0.75, 1].map(frac => (
                          <button key={frac} onClick={() => setAnswers({...answers, [q.id]: frac})} className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${answers[q.id] === frac ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'}`}>
                            {frac === 1 ? 'Tudo' : frac === 0.5 ? 'Metade' : `${frac * 100}%`}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {q.choices?.map((choice, idx) => (
                          <button
                            key={idx}
                            onClick={() => setAnswers({...answers, [q.id]: choice.calorieImpact})}
                            className={`w-full py-3 px-4 rounded-xl font-medium text-left transition-all ${
                              answers[q.id] === choice.calorieImpact
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20 border-emerald-500'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700/80 hover:border-gray-600'
                            }`}
                          >
                            {choice.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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

            {/* Macro Energy Distribution Bar */}
            <div className="mb-4 bg-gray-900/35 rounded-2xl p-3 border border-gray-700/40 space-y-2 relative z-10">
              <div className="flex justify-between text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                <span>Origem das Calorias</span>
                <span className="font-mono text-emerald-400">Soma: {carbCal + protCal + fatCal} kcal</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden flex bg-gray-800 border border-gray-700/30">
                <div style={{ width: `${carbPct}%` }} className="bg-blue-400 h-full" />
                <div style={{ width: `${protPct}%` }} className="bg-emerald-400 h-full" />
                <div style={{ width: `${fatPct}%` }} className="bg-yellow-400 h-full" />
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-gray-300">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>{carbPct}% Carb ({carbCal} kcal)</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>{protPct}% Prot ({protCal} kcal)</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>{fatPct}% Gord ({fatCal} kcal)</span>
              </div>
            </div>

            {/* Metabolic Impact Badge */}
            <div className={`mb-5 p-3.5 rounded-2xl border ${metabolicImpact.color} flex gap-2.5 items-start relative z-10`}>
              <span className="text-xl leading-none pt-0.5">{metabolicImpact.emoji}</span>
              <div className="space-y-0.5">
                <p className="text-xs font-bold uppercase tracking-wider">{metabolicImpact.label}</p>
                <p className="text-[10px] text-gray-300 leading-normal font-medium">{metabolicImpact.desc}</p>
              </div>
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

        {/* ⚡ Insights de Energia & Performance (Calorie & ATP context) */}
        <motion.div variants={itemVariants} className="bg-gray-800/60 backdrop-blur-md rounded-3xl shadow-xl border border-gray-700/50 p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2 relative z-10">
            <span className="text-emerald-400">⚡</span> Insights de Energia & Performance
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
            
            {/* Daily Target Progress */}
            <div className="bg-gray-900/40 border border-gray-700/40 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Orçamento Diário</span>
                  <span className="text-xs text-emerald-400 font-bold font-mono">
                    {caloriePercentage}%
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">{finalCalories}</span>
                  <span className="text-xs text-gray-500">/ {dailyBudget} kcal</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden border border-gray-700/50">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, caloriePercentage)}%` }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-500 leading-normal pt-1">
                Esta refeição consome {caloriePercentage}% do seu orçamento calórico diário recomendado de {dailyBudget} kcal.
              </p>
            </div>
            
            {/* Calorie Density Thermometer */}
            <div className="bg-gray-900/40 border border-gray-700/40 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Densidade Calórica</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                    densityValue === 'baixa' ? 'bg-emerald-500/20 text-emerald-400' :
                    densityValue === 'media' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {densityValue === 'media' ? 'média' : densityValue}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white leading-none">
                    {densityValue === 'baixa' ? 'Alto Volume' : densityValue === 'media' ? 'Equilibrada' : 'Concentrada'}
                  </span>
                </div>
                <div className="relative pt-1">
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden flex border border-gray-700/50">
                    <div className="bg-emerald-500 h-full flex-1" title="Baixa" />
                    <div className="bg-yellow-500 h-full flex-1" title="Média" />
                    <div className="bg-red-500 h-full flex-1" title="Alta" />
                  </div>
                  {/* Indicator Pin */}
                  <div 
                    className="absolute top-0 -mt-1 w-2.5 h-4 bg-white border border-gray-900 rounded-full shadow-md transition-all duration-700" 
                    style={{ left: `calc(${densityPercent} - 5px)` }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-500 leading-normal pt-1">
                {densityValue === 'baixa' ? 'Excelente volume físico para poucas calorias. Altamente recomendável para saciedade!' :
                 densityValue === 'media' ? 'Equilíbrio ideal entre peso do alimento e calorias fornecidas.' :
                 'Alta concentração calórica por porção. Monitore o tamanho das porções se quer controlar peso.'}
              </p>
            </div>

            {/* ATP Recovery & Muscle Performance */}
            <div className="bg-gray-900/40 border border-gray-700/40 rounded-2xl p-5 space-y-2 col-span-1 md:col-span-2 lg:col-span-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Performance e Recuperação de Energia (ATP)</span>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl shrink-0">
                    ⚡
                  </div>
                  <div className="text-sm font-bold text-gray-200">
                    {atpTitle}
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed pt-1">
                {atpDescription}
              </p>
            </div>

          </div>

          {/* Physical Activity Equivalents */}
          <div className="mt-6 pt-6 border-t border-gray-700/40 space-y-4 relative z-10">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider block">Equivalentes Estimados de Gasto Físico</span>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Caminhada', emoji: '🚶', time: walkTime, speed: '4 km/h', bg: 'from-emerald-500/10 to-teal-500/5', border: 'border-emerald-500/10', text: 'text-emerald-400' },
                { name: 'Ciclismo', emoji: '🚴', time: cycleTime, speed: '16 km/h', bg: 'from-blue-500/10 to-indigo-500/5', border: 'border-blue-500/10', text: 'text-blue-400' },
                { name: 'Corrida', emoji: '🏃', time: runTime, speed: '8 km/h', bg: 'from-amber-500/10 to-orange-500/5', border: 'border-amber-500/10', text: 'text-amber-400' }
              ].map(act => (
                <div key={act.name} className={`bg-gradient-to-br ${act.bg} border ${act.border} rounded-2xl p-4 flex flex-col items-center justify-center text-center`}>
                  <span className="text-2xl mb-1">{act.emoji}</span>
                  <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">{act.name}</span>
                  <span className={`text-xl font-extrabold ${act.text} mt-1`}>{act.time} <span className="text-xs font-normal">min</span></span>
                  <span className="text-[9px] text-gray-600 mt-0.5">{act.speed}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Nutrition Score + Detailed Panel */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NutritionScoreBadge score={nutritionScore} />
          <div className="space-y-4">
            <DetailedNutritionPanel summary={currentResult.nutritionalSummary} />
            <ProcessingBreakdownComp breakdown={processingBreakdown} />
          </div>
        </motion.div>

        {/* Alerts + Micronutrients */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NutritionalAlerts alerts={alerts} />
          <MicronutrientPanel estimates={micronutrients} />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
              <h3 className="text-xl font-bold text-white px-2">Ingredientes Identificados</h3>
              <div className="space-y-3">
                {adjustedFoods.map((food, index) => {
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
                        <div className="bg-gray-900/50 px-3 py-1.5 rounded-lg border border-gray-700 text-right">
                          <p className="font-bold text-white">{food.calories} kcal</p>
                          {finalCalories > 0 && (
                            <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
                              {Math.round((food.calories / finalCalories) * 100)}% do prato
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-4">
                          <MacroBar label="Carb" value={food.carbohydrates} total={totalMacros} color="bg-blue-400" />
                          <MacroBar label="Prot" value={food.protein} total={totalMacros} color="bg-emerald-400" />
                          <MacroBar label="Gord" value={food.fat} total={totalMacros} color="bg-yellow-400" />
                      </div>

                      {/* Nutritional details row */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {food.fiber > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                            Fibra: {food.fiber}g
                          </span>
                        )}
                        {food.sodium > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            Sódio: {food.sodium}mg
                          </span>
                        )}
                        {food.saturatedFat > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-300 border border-pink-500/20">
                            G. Sat: {food.saturatedFat}g
                          </span>
                        )}
                        {food.addedSugar > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                            Açúcar add: {food.addedSugar}g
                          </span>
                        )}
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

                      {/* Portion Adjuster */}
                      <PortionAdjuster
                        food={food}
                        onAdjust={(adjusted) => handlePortionAdjust(index, adjusted)}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {result.suggestions && result.suggestions.length > 0 && (
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
            )}
        </div>
      </motion.div>
    </div>
  );
};

export default AnalysisView;
