import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const loadingMessages = [
  "Observando os detalhes...",
  "Identificando os sabores...",
  "Calculando cada caloria...",
  "Consultando o chef digital...",
  "Preparando o resumo...",
];

const LoadingView: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 w-full max-w-md mx-auto">
      <div className="relative w-32 h-32 flex items-center justify-center mb-8">
        {/* Ripple Effect */}
        <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl"
        />
        
        {/* Rotating Ring */}
        <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
        <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-t-emerald-500 border-r-emerald-500 border-b-transparent border-l-transparent rounded-full"
        ></motion.div>

        {/* Center Logo */}
        <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative z-10 w-16 h-16 flex items-center justify-center bg-gray-900 rounded-full border border-gray-800"
        >
             <img src="./public/logo.png" alt="Loading" className="w-10 h-10 object-contain" />
        </motion.div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2">Analisando sua Foto</h2>
      
      <div className="h-8 relative w-full">
        <AnimatePresence mode="wait">
            <motion.p 
                key={messageIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-emerald-400/80 font-medium absolute inset-x-0"
            >
                {loadingMessages[messageIndex]}
            </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LoadingView;