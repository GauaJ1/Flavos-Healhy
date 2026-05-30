import React from 'react';
import { motion } from 'framer-motion';
import type { NutritionScore } from '../types';

const gradeConfig = {
  excelente: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Excelente', emoji: '🌟' },
  boa: { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Boa', emoji: '👍' },
  moderada: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Moderada', emoji: '⚡' },
  precisa_melhorar: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Precisa Melhorar', emoji: '💡' },
};

const NutritionScoreBadge: React.FC<{ score: NutritionScore }> = ({ score }) => {
  const cfg = gradeConfig[score.grade];
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score.total / 100) * circumference;

  return (
    <div style={{ background: 'rgba(31,41,55,0.6)', backdropFilter: 'blur(12px)', borderRadius: '1.5rem', border: '1px solid rgba(75,85,99,0.5)', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: `linear-gradient(90deg, ${cfg.color}, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(75,85,99,0.3)" strokeWidth="8" />
            <motion.circle
              cx="60" cy="60" r="54" fill="none" stroke={cfg.color} strokeWidth="8"
              strokeLinecap="round" strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              style={{ fontSize: '2rem', fontWeight: 800, color: cfg.color }}
            >{score.total}</motion.span>
            <span style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 600 }}>de 100</span>
          </div>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{cfg.emoji}</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#d1d5db', lineHeight: 1.5 }}>{score.explanation}</p>
        </div>
      </div>

      {/* Breakdown bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        {[
          { label: 'Proteína', val: score.breakdown.proteinScore, max: 20, color: '#10b981' },
          { label: 'Fibras', val: score.breakdown.fiberScore, max: 20, color: '#3b82f6' },
          { label: 'Equilíbrio', val: score.breakdown.macroBalance, max: 15, color: '#8b5cf6' },
          { label: 'Processamento', val: score.breakdown.processingScore, max: 15, color: '#06b6d4' },
          { label: 'Variedade', val: score.breakdown.varietyBonus, max: 15, color: '#f59e0b' },
          { label: 'Açúcar (-)', val: score.breakdown.sugarPenalty, max: 20, color: '#ef4444', penalty: true },
        ].map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.65rem', color: '#9ca3af', width: 80, flexShrink: 0 }}>{item.label}</span>
            <div style={{ flex: 1, height: 6, background: 'rgba(75,85,99,0.4)', borderRadius: 3, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(item.val / item.max) * 100}%` }}
                transition={{ duration: 1, delay: 0.3 }}
                style={{ height: '100%', borderRadius: 3, background: item.color }}
              />
            </div>
            <span style={{ fontSize: '0.65rem', color: item.color, fontWeight: 700, width: 28, textAlign: 'right' }}>
              {(item as any).penalty ? `-${item.val}` : `+${item.val}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NutritionScoreBadge;
