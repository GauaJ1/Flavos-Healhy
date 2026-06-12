import React, { useState, useEffect, useCallback } from 'react';
import { analyzeImage } from './services/geminiService';
import type { AnalysisResult } from './types';
import { useMealHistory } from './hooks/useMealHistory';
import { useHealthSync } from './hooks/useHealthSync';
import { useUserProfile } from './hooks/useUserProfile';
import ImageUploader from './components/ImageUploader';
import AnalysisView from './components/AnalysisView';
import LoadingView from './components/LoadingView';
import TutorialModal from './components/TutorialModal';
import OnboardingModal from './components/OnboardingModal';
import ImagePreview from './components/ImagePreview';
import HealthSyncToggle from './components/HealthSyncToggle';
import DashboardView from './components/DashboardView';
import HistoryView from './components/HistoryView';
import CameraView from './components/CameraView';
import { AnimatePresence, motion } from 'framer-motion';
import { compressImage } from './utils/imageCompression';

type View = 'upload' | 'preview' | 'analysis' | 'history' | 'camera' | 'dashboard';
type Tab = 'upload' | 'dashboard' | 'history';

const MAINTENANCE_DOMAINS: string[] = [];

// ── Icons ──────────────────────────────────────────────────────────────────────

const CameraTabIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const DashboardTabIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const HistoryTabIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ── App ────────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [view, setView] = useState<View>('upload');
  const [activeTab, setActiveTab] = useState<Tab>('upload');

  const { history, addHistoryEntry, removeHistoryEntry } = useMealHistory();
  const healthSync = useHealthSync();
  const { profile, targets, hasProfile, updateProfile } = useUserProfile();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Escutar evento de relatório semanal
  useEffect(() => {
    const handleWeeklyReport = (e: Event) => {
      const customEvent = e as CustomEvent;
      setToastMessage(customEvent.detail.message);
      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    };
    window.addEventListener('flavos-weekly-report-ready', handleWeeklyReport);
    return () => {
      window.removeEventListener('flavos-weekly-report-ready', handleWeeklyReport);
    };
  }, []);

  // Dark mode
  useEffect(() => {
    const root = window.document.documentElement;
    if (!root.classList.contains('dark')) root.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  }, []);

  // PWA service worker e check de onboarding
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('SW registered:', reg.scope))
          .catch((err) => console.error('SW failed:', err));
      });
    }
    const isFirstVisit = !localStorage.getItem('nutrisnap_visited');
    if (isFirstVisit) {
      setShowTutorial(true);
      localStorage.setItem('nutrisnap_visited', 'true');
    }

    // Abre onboarding automaticamente se não houver perfil salvo
    const hasStoredProfile = !!localStorage.getItem('flavos_user_profile');
    if (!hasStoredProfile) {
      setShowOnboarding(true);
    }
  }, []);

  // ── Tab navigation sync ──────────────────────────────────────────────────────
  const goToTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'upload') setView('upload');
    else if (tab === 'dashboard') setView('dashboard');
    else if (tab === 'history') setView('history');
    setError(null);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleAnalysisStart = useCallback(async (imageFile: File, userDescription: string) => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);
    setView('upload');
    try {
      const compressedFile = await compressImage(imageFile);
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onload = async () => {
        try {
          const base64Image = (reader.result as string).split(',')[1];
          const result = await analyzeImage(base64Image, userDescription);
          setAnalysisResult(result);
          setView('analysis');
        } catch (err) {
          setError('Falha ao analisar a imagem. Tente uma foto mais nítida.');
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
  }, []);

  const handleImageSelected = (file: File) => {
    setSelectedImage(file);
    setView('preview');
  };

  const handleConfirmAnalysis = (description: string) => {
    if (selectedImage) handleAnalysisStart(selectedImage, description);
  };

  const resetApp = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
    setView('upload');
    setActiveTab('upload');
  };

  // ── Content renderer ──────────────────────────────────────────────────────────
  const renderContent = () => {
    if (isLoading) {
      return (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="w-full flex-grow flex items-center justify-center">
          <LoadingView />
        </motion.div>
      );
    }

    if (error) {
      return (
        <motion.div key="error" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          className="text-center p-8 flex-grow flex flex-col items-center justify-center">
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-8 max-w-md w-full backdrop-blur-sm">
            <p className="text-red-400 font-semibold mb-6 text-lg">{error}</p>
            <button onClick={resetApp}
              className="bg-red-500 text-white font-bold py-3 px-8 rounded-xl hover:bg-red-600 transition-all shadow-lg hover:shadow-red-500/20">
              Tentar Novamente
            </button>
          </div>
        </motion.div>
      );
    }

    switch (view) {
      // ── Camera (fullscreen) ────────────────────────────────────────────────
      case 'camera':
        return (
          <motion.div key="camera" className="w-full h-full fixed inset-0 z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CameraView onCapture={handleImageSelected} onClose={() => setView('upload')} />
          </motion.div>
        );

      // ── Preview ────────────────────────────────────────────────────────────
      case 'preview':
        return (
          <motion.div key="preview" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }} className="w-full flex flex-col items-center justify-center flex-grow">
            {selectedImage && (
              <ImagePreview imageFile={selectedImage} onBack={() => setView('upload')} onAnalyze={handleConfirmAnalysis} />
            )}
          </motion.div>
        );

      // ── Analysis result ────────────────────────────────────────────────────
      case 'analysis':
        return (
          <motion.div key="analysis" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} className="w-full flex justify-center">
            {analysisResult && (
              <AnalysisView
                result={analysisResult}
                imageFile={selectedImage}
                onAnalyzeAnother={resetApp}
                onSave={(finalResult, finalCalories, entryId) => {
                  const id = entryId || Date.now();
                  const entry = {
                    id,
                    date: new Date().toISOString(),
                    totalCalories: finalCalories,
                    foods: finalResult.foods,
                  };
                  if (entryId && history.some(e => e.id === entryId)) {
                    updateHistoryEntry(entry);
                  } else {
                    addHistoryEntry(entry);
                  }
                  healthSync.syncMealEntry(entry);
                  // Stay on analysis view so user can review the meal stats
                  // Dashboard is available via the "Hoje" tab
                }}
              />
            )}
          </motion.div>
        );

      // ── Dashboard (new) ────────────────────────────────────────────────────
      case 'dashboard':
        return (
          <motion.div key="dashboard" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }} className="w-full flex justify-center">
            <DashboardView
              history={history}
              isSyncEnabled={healthSync.isSyncEnabled}
              isNative={healthSync.isNative}
              hasProfile={hasProfile}
              onOpenProfile={() => setShowOnboarding(true)}
            />
          </motion.div>
        );

      // ── History ────────────────────────────────────────────────────────────
      case 'history':
        return (
          <motion.div key="history" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }} className="w-full flex justify-center">
            <HistoryView history={history} onDeleteEntry={removeHistoryEntry} />
          </motion.div>
        );

      // ── Upload (default / home) ────────────────────────────────────────────
      case 'upload':
      default:
        return (
          <motion.div key="upload" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }} className="w-full flex flex-col items-center justify-center flex-grow">
            {/* Samsung Health Sync Toggle — only on native Android */}
            <HealthSyncToggle
              isNative={healthSync.isNative}
              isAvailable={healthSync.isAvailable}
              hasPermissions={healthSync.hasPermissions}
              isSyncEnabled={healthSync.isSyncEnabled}
              isSyncing={healthSync.isSyncing}
              lastSyncMessage={healthSync.lastSyncMessage}
              lastSyncError={healthSync.lastSyncError}
              onEnable={healthSync.enableSync}
              onDisable={healthSync.disableSync}
              onClearMessages={healthSync.clearMessages}
            />
            <ImageUploader onImageSelected={handleImageSelected} onTakePhoto={() => setView('camera')} />
          </motion.div>
        );
    }
  };

  // ── Maintenance mode ──────────────────────────────────────────────────────────
  const isMaintenanceMode = MAINTENANCE_DOMAINS.includes(window.location.hostname);

  if (isMaintenanceMode) {
    return (
      <div className="min-h-screen bg-[#111827] font-sans text-gray-200 flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black">
        <header className="bg-gray-900/60 backdrop-blur-md shadow-lg w-full sticky top-0 z-20 border-b border-gray-800/50">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-20 rounded-full" />
              <img src="/logo.png" alt="Flavos" className="w-8 h-8 relative z-10 object-contain" />
            </div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              Flavos Healthy
            </h1>
          </div>
        </header>
        <main className="flex-grow container mx-auto p-4 flex flex-col items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center p-8 md:p-12 bg-gray-800/50 backdrop-blur-md rounded-3xl shadow-xl w-full max-w-lg border border-gray-700/50 flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
              <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Em Manutenção</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              O Flavos Healthy está passando por atualizações para trazer uma experiência ainda melhor. Voltaremos em breve!
            </p>
          </motion.div>
        </main>
      </div>
    );
  }

  // ── Show header? ──────────────────────────────────────────────────────────────
  const hideChrome = view === 'camera' || view === 'preview';

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#111827] font-sans text-gray-200 flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-4 right-4 z-50 max-w-sm mx-auto bg-gray-900/90 border border-emerald-500/30 text-white px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 border-l-4 border-l-emerald-500"
          >
            <span className="text-emerald-400 text-lg">🔔</span>
            <p className="text-xs font-semibold leading-normal">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {showTutorial && <TutorialModal onClose={() => setShowTutorial(false)} />}
      {showOnboarding && (
        <OnboardingModal
          onComplete={(profile) => {
            updateProfile(profile);
            setShowOnboarding(false);
          }}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      {/* ── Header ── */}
      {!hideChrome && (
        <header className="bg-gray-900/60 backdrop-blur-md shadow-lg w-full sticky top-0 z-20 border-b border-gray-800/50">
          <div className="container mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-20 rounded-full" />
                <img src="/logo.png" alt="Flavos" className="w-8 h-8 relative z-10 object-contain" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                Flavos Healthy
              </h1>
            </div>
            {/* Today's quick stat in header */}
            {activeTab !== 'upload' && (
              <button
                onClick={() => goToTab('upload')}
                className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                aria-label="Analisar nova refeição"
              >
                <CameraTabIcon className="w-3.5 h-3.5" />
                Nova análise
              </button>
            )}
          </div>
        </header>
      )}

      {/* ── Main content ── */}
      <main className="flex-grow container mx-auto px-4 py-4 md:px-6 md:py-6 flex flex-col items-center relative z-10 pb-24">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>

      {/* ── Bottom navigation (3 tabs) ── */}
      {!hideChrome && !isLoading && (
        <footer className="bg-gray-900/80 backdrop-blur-lg shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] w-full fixed bottom-0 z-20 border-t border-gray-800/50">
          <nav className="flex justify-around p-2 max-w-md mx-auto" aria-label="Navegação principal">

            {/* Tab: Analisar */}
            <button
              id="tab-upload"
              onClick={() => goToTab('upload')}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all duration-300 ${
                activeTab === 'upload'
                  ? 'text-emerald-400 bg-emerald-900/20'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              aria-label="Analisar refeição"
              aria-selected={activeTab === 'upload'}
            >
              <CameraTabIcon className="w-6 h-6" />
              <span className="text-xs font-medium">Analisar</span>
            </button>

            {/* Tab: Hoje / Dashboard */}
            <button
              id="tab-dashboard"
              onClick={() => goToTab('dashboard')}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all duration-300 relative ${
                activeTab === 'dashboard'
                  ? 'text-emerald-400 bg-emerald-900/20'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              aria-label="Dashboard do dia"
              aria-selected={activeTab === 'dashboard'}
            >
              <DashboardTabIcon className="w-6 h-6" />
              <span className="text-xs font-medium">Hoje</span>
            </button>

            {/* Tab: Histórico */}
            <button
              id="tab-history"
              onClick={() => goToTab('history')}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-xl transition-all duration-300 ${
                activeTab === 'history'
                  ? 'text-emerald-400 bg-emerald-900/20'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              aria-label="Histórico de refeições"
              aria-selected={activeTab === 'history'}
            >
              <HistoryTabIcon className="w-6 h-6" />
              <span className="text-xs font-medium">Histórico</span>
            </button>

          </nav>
        </footer>
      )}
    </div>
  );
};

export default App;