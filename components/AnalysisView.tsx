import React from 'react';
import type { AnalysisResult } from '../types';
import { FlameIcon, LightBulbIcon, ShareIcon, PlusCircleIcon, XMarkIcon } from './icons';
import { motion } from 'framer-motion';

interface AnalysisViewProps {
  result: AnalysisResult;
  imageFile: File | null;
  onAnalyzeAnother: () => void;
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

const AnalysisView: React.FC<AnalysisViewProps> = ({ result, imageFile, onAnalyzeAnother }) => {
  const imageUrl = imageFile ? URL.createObjectURL(imageFile) : '';

  const handleShare = async () => {
    const shareText = `Acabei de analisar minha refeição com o Flavos Healthy! Teve cerca de ${result.totalCalories} calorias. O app identificou: ${result.foods.map(f => f.name).join(', ')}.`;
    
    try {
      if (navigator.share) {
        const shareData: ShareData = {
          title: 'Minha Análise de Refeição',
          text: shareText,
        };

        if (imageFile && navigator.canShare) {
          // Create a new file with a safe name to ensure it can be shared
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  // Tratamento para imagem inválida (não é comida real)
  if (result.isRealFood === false) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto text-center p-6"
      >
        <div className="bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-red-500/30 p-8 flex flex-col items-center">
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-6 relative">
             <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping opacity-20"></div>
             <XMarkIcon className="w-12 h-12 text-red-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-3">Imagem não aceita</h2>
          
          <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 w-full mb-6">
             <p className="text-gray-300 text-sm leading-relaxed">
               "{result.feedback}"
             </p>
          </div>

          <div className="space-y-2 text-sm text-gray-400 mb-8 text-left w-full px-4">
             <p className="font-semibold text-gray-300 mb-2">Lembre-se:</p>
             <ul className="list-disc list-inside space-y-1">
                 <li>Use apenas <span className="text-emerald-400">fotos reais</span> de comida.</li>
                 <li>Evite desenhos, telas ou cartoons.</li>
                 <li>Tente uma iluminação melhor.</li>
             </ul>
          </div>

          <button 
            onClick={onAnalyzeAnother}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/20"
          >
            Tentar Novamente
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-5xl pb-20">
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Card */}
          <div className="bg-gray-800/60 backdrop-blur-md rounded-3xl shadow-xl border border-gray-700/50 overflow-hidden relative group">
             {imageUrl && (
                <img src={imageUrl} alt="Analyzed meal" className="w-full h-64 md:h-full object-cover transition-transform duration-700 group-hover:scale-105" />
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60 md:hidden"></div>
             <div className="absolute bottom-4 left-4 md:hidden">
                 <p className="text-white font-bold text-lg shadow-black drop-shadow-lg">Sua Refeição</p>
             </div>
          </div>

          {/* Summary Card */}
          <div className="bg-gray-800/60 backdrop-blur-md rounded-3xl shadow-xl border border-gray-700/50 p-6 md:p-8 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <p className="text-emerald-400 font-semibold mb-2 tracking-wide uppercase text-sm">Total Estimado</p>
            <div className="flex items-baseline gap-2 mb-4">
                 <span className="text-6xl md:text-7xl font-bold text-white tracking-tighter">{result.totalCalories}</span>
                 <span className="text-xl text-gray-400 font-medium">kcal</span>
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
        
        {/* Detail List & Suggestions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Food List */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
              <h3 className="text-xl font-bold text-white px-2">Ingredientes Identificados</h3>
              <div className="space-y-3">
                {result.foods.map((food, index) => {
                  const totalMacros = food.carbohydrates + food.protein + food.fat;
                  return (
                    <motion.div 
                      key={index}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                      className="bg-gray-800/40 backdrop-blur-sm p-5 rounded-2xl border border-gray-700/50 hover:bg-gray-800/60 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-lg font-bold text-gray-100">{food.name}</p>
                          <p className="text-sm text-emerald-400 font-medium">{food.quantity}</p>
                        </div>
                        <div className="bg-gray-900/50 px-3 py-1 rounded-lg border border-gray-700">
                          <p className="font-bold text-white">{food.calories} kcal</p>
                        </div>
                      </div>
                      
                      {/* Visual Macros */}
                      <div className="grid grid-cols-3 gap-4 mb-3">
                          <MacroBar label="Carb" value={food.carbohydrates} total={totalMacros} color="bg-blue-400" />
                          <MacroBar label="Prot" value={food.protein} total={totalMacros} color="bg-emerald-400" />
                          <MacroBar label="Gord" value={food.fat} total={totalMacros} color="bg-yellow-400" />
                      </div>
                      
                      {/* Micronutrients */}
                      {food.micronutrients && (
                        <div className="mt-3 pt-3 border-t border-gray-700/50">
                          <p className="text-xs text-gray-400 font-medium mb-1">Micronutrientes & Minerais:</p>
                          <p className="text-sm text-gray-300">{food.micronutrients}</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Suggestions */}
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