import React from 'react';
import { motion } from 'framer-motion';
import type { ProcessingBreakdown as PBType } from '../types';

const levelConfig = {
  inNatura: { label: 'In Natura', color: '#10b981', icon: '🌱' },
  minimamenteProcessado: { label: 'Min. Processado', color: '#3b82f6', icon: '🍳' },
  processado: { label: 'Processado', color: '#f59e0b', icon: '🏭' },
  ultraprocessado: { label: 'Ultraprocessado', color: '#ef4444', icon: '⚠️' },
};

const ProcessingBreakdown: React.FC<{ breakdown: PBType }> = ({ breakdown }) => {
  const items = [
    { key: 'inNatura', pct: breakdown.inNatura },
    { key: 'minimamenteProcessado', pct: breakdown.minimamenteProcessado },
    { key: 'processado', pct: breakdown.processado },
    { key: 'ultraprocessado', pct: breakdown.ultraprocessado },
  ].filter(i => i.pct > 0);

  const hasUltraWarning = breakdown.ultraprocessado > 50;

  return (
    <div style={{ background: 'rgba(31,41,55,0.6)', backdropFilter: 'blur(12px)', borderRadius: '1.5rem', border: `1px solid ${hasUltraWarning ? 'rgba(239,68,68,0.3)' : 'rgba(75,85,99,0.5)'}`, padding: '1.25rem' }}>
      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        🧪 Qualidade Alimentar
      </h4>

      {/* Stacked bar */}
      <div style={{ height: 12, borderRadius: 6, overflow: 'hidden', display: 'flex', marginBottom: '0.75rem' }}>
        {items.map(item => {
          const cfg = levelConfig[item.key as keyof typeof levelConfig];
          return (
            <motion.div
              key={item.key}
              initial={{ width: 0 }}
              animate={{ width: `${item.pct}%` }}
              transition={{ duration: 1, delay: 0.2 }}
              style={{ height: '100%', background: cfg.color }}
              title={`${cfg.label}: ${item.pct}%`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {items.map(item => {
          const cfg = levelConfig[item.key as keyof typeof levelConfig];
          return (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem' }}>
              <span>{cfg.icon}</span>
              <span style={{ color: cfg.color, fontWeight: 600 }}>{item.pct}%</span>
              <span style={{ color: '#9ca3af' }}>{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {hasUltraWarning && (
        <div style={{ marginTop: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.75rem', padding: '0.75rem', fontSize: '0.75rem', color: '#fca5a5' }}>
          ⚠️ Mais de 50% da refeição é ultraprocessada. Considere substituir por alimentos mais naturais.
        </div>
      )}
    </div>
  );
};

export default ProcessingBreakdown;
