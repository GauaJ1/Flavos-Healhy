import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, SparklesIcon } from './icons';

interface ImagePreviewProps {
  imageFile: File;
  onCancel: () => void;
  onAnalyze: (description: string) => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ imageFile, onCancel, onAnalyze }) => {
  const [description, setDescription] = useState('');
  const imageUrl = URL.createObjectURL(imageFile);

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-gray-800/60 backdrop-blur-md rounded-3xl p-6 border border-gray-700/50 shadow-2xl relative"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-900/50 p-2 rounded-full transition-colors z-10"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Image Preview Container */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-6 bg-gray-900 shadow-inner">
          <img
            src={imageUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Essa é a sua foto?</h3>
          
          {/* Input with 1s Delay */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 1, duration: 0.5 }} // Delay de 1 segundo solicitado
            className="overflow-hidden"
          >
            <div className="relative">
                <label className="block text-sm text-emerald-400 mb-2 font-medium">
                    Adicionar detalhes (Opcional)
                </label>
                <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: 'É um bolo de cenoura sem açúcar' ou 'Suco de laranja natural'..."
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none text-sm"
                rows={3}
                />
            </div>
          </motion.div>

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAnalyze(description)}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <SparklesIcon className="w-5 h-5" />
            Analisar Calorias
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default ImagePreview;