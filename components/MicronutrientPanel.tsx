import React from 'react';
import { motion } from 'framer-motion';
import type { MicronutrientEstimate } from '../types';

const levelColors = {
  baixo: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  moderado: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  bom: { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  alto: { color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
};

const MicronutrientPanel: React.FC<{ estimates: MicronutrientEstimate[] }> = ({ estimates }) => {
  if (!estimates || estimates.length === 0) return null;

  return (
    <div style={{ background: 'rgba(31,41,55,0.6)', backdropFilter: 'blur(12px)', borderRadius: '1.5rem', border: '1px solid rgba(75,85,99,0.5)', padding: '1.25rem' }}>
      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        💎 Micronutrientes Estimados
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
        {estimates.slice(0, 8).map((m, i) => {
          const cfg = levelColors[m.level] || levelColors.moderado;
          return (
            <motion.div
              key={m.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ background: cfg.bg, borderRadius: '0.75rem', padding: '0.6rem 0.75rem', border: `1px solid ${cfg.color}22` }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#e5e7eb' }}>{m.name}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: cfg.color }}>{m.percentage}%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(75,85,99,0.4)', borderRadius: 2, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(m.percentage, 100)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.05 }}
                  style={{ height: '100%', borderRadius: 2, background: cfg.color }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      <p style={{ fontSize: '0.6rem', color: '#6b7280', marginTop: '0.75rem', fontStyle: 'italic' }}>
        * Estimativas baseadas em tabela TACO/IBGE. Não substitui orientação médica ou nutricional.
      </p>
    </div>
  );
};

export default MicronutrientPanel;
