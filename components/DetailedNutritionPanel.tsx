import React from 'react';
import type { NutritionalSummary } from '../types';

const DetailedNutritionPanel: React.FC<{ summary: NutritionalSummary }> = ({ summary }) => {
  const items = [
    { label: 'Fibras', value: summary.totalFiber || 0, unit: 'g', color: '#10b981', ideal: '≥8g' },
    { label: 'Açúcar Total', value: summary.totalSugar || 0, unit: 'g', color: '#f59e0b', ideal: '<25g' },
    { label: 'Açúcar Adicionado', value: summary.totalAddedSugar || 0, unit: 'g', color: '#ef4444', ideal: '<10g' },
    { label: 'Sódio', value: summary.totalSodium || 0, unit: 'mg', color: '#8b5cf6', ideal: '<600mg' },
    { label: 'Gordura Saturada', value: summary.totalSaturatedFat || 0, unit: 'g', color: '#ec4899', ideal: '<7g' },
  ];

  return (
    <div style={{ background: 'rgba(31,41,55,0.6)', backdropFilter: 'blur(12px)', borderRadius: '1.5rem', border: '1px solid rgba(75,85,99,0.5)', padding: '1.25rem' }}>
      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📊 Painel Nutricional Detalhado
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
        {items.map(item => (
          <div key={item.label} style={{ background: `${item.color}10`, borderRadius: '0.75rem', padding: '0.6rem 0.75rem', border: `1px solid ${item.color}22` }}>
            <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginBottom: '0.2rem' }}>{item.label}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: item.color }}>
              {item.value}<span style={{ fontSize: '0.7rem', fontWeight: 400 }}>{item.unit}</span>
            </div>
            <div style={{ fontSize: '0.55rem', color: '#6b7280', marginTop: '0.15rem' }}>Ideal: {item.ideal}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DetailedNutritionPanel;
