import React, { useState, useEffect, useCallback } from 'react';
import { analyzeImage } from './services/geminiService';
import type { AnalysisResult } from './types';
import { useMealHistory } from './hooks/useMealHistory';
import ImageUploader from './components/ImageUploader';
import AnalysisView from './components/AnalysisView';
import LoadingView from './components/LoadingView';
import TutorialModal from './components/TutorialModal';
import ImagePreview from './components/ImagePreview';
import { CameraIcon, ChartBarIcon } from './components/icons';
import HistoryView from './components/HistoryView';
import CameraView from './components/CameraView';
import { AnimatePresence, motion } from 'framer-motion';

type View = 'upload' | 'preview' | 'analysis' | 'history' | 'camera';

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [view, setView] = useState<View>('upload');

  const { history, addHistoryEntry, removeHistoryEntry } = useMealHistory();
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (!root.classList.contains('dark')) {
      root.classList.add('dark');
    }
    localStorage.setItem('theme', 'dark');
  }, []);
  
  useEffect(() => {
    // Register Service Worker for PWA functionality
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('Service Worker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }

    // Show tutorial on first visit
    const isFirstVisit = !localStorage.getItem('nutrisnap_visited');
    if (isFirstVisit) {
      setShowTutorial(true);
      localStorage.setItem('nutrisnap_visited', 'true');
    }
  }, []);

  const handleAnalysisStart = useCallback(async (imageFile: File, userDescription: string) => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    
    // Switch to loading view immediately
    // Note: We use 'upload' view combined with isLoading=true to show LoadingView
    // or we can handle it directly in renderContent
    setView('upload'); 

    try {
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      reader.onload = async () => {
        try {
          const base64Image = (reader.result as string).split(',')[1];
          // Pass the user description to the service
          const result = await analyzeImage(base64Image, userDescription);
          setAnalysisResult(result);
          setView('analysis');
        } catch (err) {
          setError('Falha ao analisar a imagem. Por favor, tente uma foto mais nítida ou diferente.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Falha ao ler o arquivo de imagem.');
        setIsLoading(false);
      };
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
      setIsLoading(false);
    }
  }, [addHistoryEntry]);

  const handleImageSelected = (file: File) => {
    setSelectedImage(file);
    // Instead of analyzing immediately, go to preview
    setView('preview');
  };
  
  const handleConfirmAnalysis = (description: string) => {
    if (selectedImage) {
      handleAnalysisStart(selectedImage, description);
    }
  };
  
  const resetApp = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
    setView('upload');
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <motion.div 
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="w-full flex-grow flex items-center justify-center"
        >
          <LoadingView />
        </motion.div>
      );
    }
    if (error) {
       return (
        <motion.div 
          key="error"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="text-center p-8 flex-grow flex flex-col items-center justify-center"
        >
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-8 max-w-md w-full backdrop-blur-sm">
            <p className="text-red-400 font-semibold mb-6 text-lg">{error}</p>
            <button
              onClick={resetApp}
              className="bg-red-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-red-600 transition-all shadow-lg hover:shadow-red-500/20"
            >
              Tentar Novamente
            </button>
          </div>
        </motion.div>
      );
    }
    
    switch (view) {
      case 'camera':
        return (
          <motion.div key="camera" className="w-full h-full fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <CameraView onCapture={handleImageSelected} onClose={() => setView('upload')} />
          </motion.div>
        );
      case 'preview':
        return (
            <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="w-full flex flex-col items-center justify-center flex-grow"
            >
                {selectedImage && (
                    <ImagePreview 
                        imageFile={selectedImage} 
                        onCancel={resetApp} 
                        onAnalyze={handleConfirmAnalysis} 
                    />
                )}
            </motion.div>
        );
      case 'analysis':
        return (
          <motion.div 
            key="analysis"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full flex justify-center"
          >
            {analysisResult && (
          <AnalysisView 
            result={analysisResult} 
            imageFile={selectedImage} 
            onAnalyzeAnother={resetApp} 
            onSave={(finalResult, finalCalories) => {
              addHistoryEntry({
                id: Date.now(),
                date: new Date().toISOString(),
                totalCalories: finalCalories,
                foods: finalResult.foods,
              });
            }}
          />
        )}
          </motion.div>
        );
      case 'history':
        return (
           <motion.div 
            key="history"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full flex justify-center"
          >
            <HistoryView history={history} onDeleteEntry={removeHistoryEntry} />
          </motion.div>
        );
      case 'upload':
      default:
        return (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full flex flex-col items-center justify-center flex-grow"
          >
            <ImageUploader onImageSelected={handleImageSelected} onTakePhoto={() => setView('camera')} />
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#111827] font-sans text-gray-200 flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black">
      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      
      {/* Hide Header in Camera Mode */}
      {view !== 'camera' && (
        <header className="bg-gray-900/60 backdrop-blur-md shadow-lg w-full sticky top-0 z-20 border-b border-gray-800/50">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-20 rounded-full"></div>
                  <img 
                    src="/logo.png" 
                    alt="Flavos" 
                    className="w-8 h-8 relative z-10 object-contain" 
                  />
              </div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Flavos Healthy</h1>
            </div>
          </div>
        </header>
      )}

      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center relative z-10">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>

      {/* Hide Footer in Camera Mode */}
      {view !== 'camera' && view !== 'preview' && !isLoading && (
        <footer className="bg-gray-900/80 backdrop-blur-lg shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] w-full sticky bottom-0 z-20 md:hidden border-t border-gray-800/50">
          <nav className="flex justify-around p-2">
            <button 
              onClick={() => setView('upload')} 
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${view === 'upload' ? 'text-emerald-400 bg-emerald-900/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <CameraIcon className="w-6 h-6" />
              <span className="text-xs font-medium">Analisar</span>
            </button>
             <button 
              onClick={() => setView('history')} 
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 ${view === 'history' ? 'text-emerald-400 bg-emerald-900/20' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <ChartBarIcon className="w-6 h-6" />
              <span className="text-xs font-medium">Histórico</span>
            </button>
          </nav>
        </footer>
      )}
    </div>
  );
};

export default App;