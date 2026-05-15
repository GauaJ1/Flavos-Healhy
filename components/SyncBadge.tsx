/**
 * Badge visual de sincronização com Samsung Health.
 * Exibido nos cards de refeição após sincronização bem-sucedida.
 */

import React from 'react';
import { motion } from 'framer-motion';

interface SyncBadgeProps {
  synced: boolean;
  isSyncing?: boolean;
  compact?: boolean;
}

const SyncBadge: React.FC<SyncBadgeProps> = ({ synced, isSyncing = false, compact = false }) => {
  if (!synced && !isSyncing) return null;

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="inline-flex items-center gap-1"
        title="Sincronizado com Samsung Health"
      >
        {isSyncing ? (
          <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
    >
      {isSyncing ? (
        <div className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )}
      <span className="text-[10px] font-medium text-emerald-400">
        {isSyncing ? 'Sincronizando...' : 'Samsung Health'}
      </span>
    </motion.div>
  );
};

export default SyncBadge;
