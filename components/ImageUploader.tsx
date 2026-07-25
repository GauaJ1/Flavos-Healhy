import React, { useRef, useState } from 'react';
import { CameraIcon, UploadIcon, PhotoIcon } from './icons';
import { motion } from 'framer-motion';

interface ImageUploaderProps {
  onImageSelected: (file: File) => void;
  onTakePhoto: () => void;
  onOpenBarcodeScanner?: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, onTakePhoto, onOpenBarcodeScanner }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageSelected(event.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageSelected(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl flex flex-col items-center">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
            O que vamos comer hoje?
        </h2>
        <p className="text-gray-400 text-lg">
            Envie uma <span className="text-emerald-400 font-medium">foto real</span> ou escaneie um <span className="text-purple-400 font-medium">código de barras</span>.
        </p>
      </motion.div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      
      <motion.div 
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`w-full relative cursor-pointer group overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 p-10 md:p-16 flex flex-col items-center justify-center
          ${isDragging 
            ? 'border-emerald-500 bg-emerald-900/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]' 
            : 'border-gray-700 bg-gray-800/40 hover:bg-gray-800/60 hover:border-emerald-500/50 hover:shadow-2xl'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <motion.div 
            animate={isDragging ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
            className="mb-6 relative z-10"
        >
             <div className="p-5 rounded-full bg-gray-800 border border-gray-700 shadow-xl group-hover:border-emerald-500/30 group-hover:shadow-emerald-500/20 transition-all duration-300">
                <UploadIcon className={`w-12 h-12 ${isDragging ? 'text-emerald-400' : 'text-gray-400 group-hover:text-emerald-400'} transition-colors`} />
             </div>
        </motion.div>

        <h3 className="text-xl font-semibold text-gray-200 mb-2 relative z-10">
          Toque para enviar ou arraste
        </h3>
        <p className="text-gray-500 text-sm relative z-10 font-medium text-center px-4">
           Aceitamos refeições, ingredientes ou embalagens
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-8">
            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleClick}
                className="w-full bg-gray-800 border border-gray-700 hover:border-emerald-500 text-gray-200 font-semibold py-4 px-4 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/10 inline-flex items-center justify-center gap-2"
            >
                <PhotoIcon className="w-5 h-5 text-emerald-400" />
                Galeria
            </motion.button>

            <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onTakePhoto}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-4 px-4 rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all inline-flex items-center justify-center gap-2"
            >
                <CameraIcon className="w-5 h-5" />
                Tirar Foto
            </motion.button>

            {onOpenBarcodeScanner && (
              <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onOpenBarcodeScanner}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 px-4 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all inline-flex items-center justify-center gap-2"
              >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m-8-16v16m4-16v16m8-16v16m4-16v16" />
                  </svg>
                  Barcode
              </motion.button>
            )}
      </div>
    </div>
  );
};

export default ImageUploader;