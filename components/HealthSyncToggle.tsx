/**
 * Componente de toggle para sincronização com Samsung Health / Health Connect.
 * 
 * Exibe:
 * - Toggle para habilitar/desabilitar sincronização
 * - Status atual (disponível, permissões, etc.)
 * - Feedback visual de sincronização
 * 
 * Só aparece quando o app está rodando no Android nativo (Capacitor).
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HealthSyncToggleProps {
  isNative: boolean;
  isAvailable: boolean;
  hasPermissions: boolean;
  isSyncEnabled: boolean;
  isSyncing: boolean;
  lastSyncMessage: string | null;
  lastSyncError: string | null;
  onEnable: () => Promise<boolean>;
  onDisable: () => void;
  onClearMessages: () => void;
}

const HealthSyncToggle: React.FC<HealthSyncToggleProps> = ({
  isNative,
  isAvailable,
  hasPermissions,
  isSyncEnabled,
  isSyncing,
  lastSyncMessage,
  lastSyncError,
  onEnable,
  onDisable,
  onClearMessages,
}) => {
  const [isToggling, setIsToggling] = useState(false);

  // Auto-clear messages after 4 seconds
  useEffect(() => {
    if (lastSyncMessage || lastSyncError) {
      const timer = setTimeout(onClearMessages, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastSyncMessage, lastSyncError, onClearMessages]);

  // Não renderizar nada no browser
  if (!isNative) return null;

  const handleToggle = async () => {
    if (isToggling) return;
    setIsToggling(true);

    try {
      if (isSyncEnabled) {
        onDisable();
      } else {
        await onEnable();
      }
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mb-4">
      {/* Card principal */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 overflow-hidden"
      >
        {/* Header com ícone Samsung Health */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Samsung Health Icon */}
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-xl ${isSyncEnabled ? 'bg-emerald-500/20' : 'bg-gray-600/20'} transition-colors duration-300`} />
              <svg
                className={`w-5 h-5 relative z-10 transition-colors duration-300 ${isSyncEnabled ? 'text-emerald-400' : 'text-gray-500'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-200">
                Samsung Health
              </h3>
              <p className="text-xs text-gray-400">
                {!isAvailable
                  ? 'Health Connect não disponível'
                  : isSyncEnabled
                    ? 'Sincronizando nutrição'
                    : 'Sincronizar dados nutricionais'
                }
              </p>
            </div>
          </div>

          {/* Toggle */}
          {isAvailable && (
            <button
              onClick={handleToggle}
              disabled={isToggling || isSyncing}
              className={`relative w-12 h-7 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
                isSyncEnabled
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20'
                  : 'bg-gray-600'
              } ${(isToggling || isSyncing) ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
              aria-label={isSyncEnabled ? 'Desativar sincronização com Samsung Health' : 'Ativar sincronização com Samsung Health'}
            >
              <motion.div
                className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                animate={{
                  left: isSyncEnabled ? '22px' : '2px',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          )}
        </div>

        {/* Sync indicator */}
        <AnimatePresence>
          {isSyncing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-gray-700/50"
            >
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-emerald-400">Sincronizando com Samsung Health...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feedback messages */}
        <AnimatePresence>
          {lastSyncMessage && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-gray-700/50"
            >
              <p className="text-xs text-emerald-400 font-medium">{lastSyncMessage}</p>
            </motion.div>
          )}

          {lastSyncError && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-gray-700/50"
            >
              <p className="text-xs text-red-400 font-medium">{lastSyncError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Health Connect not available warning */}
        {!isAvailable && isNative && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <p className="text-xs text-yellow-400/70">
              Instale o Health Connect pela Play Store para sincronizar dados de saúde.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default HealthSyncToggle;
