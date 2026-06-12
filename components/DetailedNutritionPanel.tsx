import React from 'react';
import type { NutritionalSummary, FoodItem } from '../types';

const DetailedNutritionPanel: React.FC<{ summary: NutritionalSummary; foods?: FoodItem[] }> = ({ summary, foods }) => {
  const items = [
    { label: 'Fibras', value: summary.totalFiber || 0, unit: 'g', color: '#10b981', ideal: '≥8g' },
    { label: 'Açúcar Total', value: summary.totalSugar || 0, unit: 'g', color: '#f59e0b', ideal: '<25g' },
    { label: 'Açúcar Adicionado', value: summary.totalAddedSugar || 0, unit: 'g', color: '#ef4444', ideal: '<10g' },
    { label: 'Sódio', value: summary.totalSodium || 0, unit: 'mg', color: '#8b5cf6', ideal: '<600mg' },
    { label: 'Gordura Saturada', value: summary.totalSaturatedFat || 0, unit: 'g', color: '#ec4899', ideal: '<7g' },
  ];

  // Calcular detalhamento de fibras a partir dos alimentos, ou usar fallback proporcional (35% solúvel, 65% insolúvel)
  const totalFiber = summary.totalFiber || 0;
  const totalSoluble = foods 
    ? foods.reduce((sum, f) => sum + (f.fiberDetailed?.soluble_g || 0) * (f.consumedFraction ?? 1), 0)
    : totalFiber * 0.35;
  const totalInsoluble = foods 
    ? foods.reduce((sum, f) => sum + (f.fiberDetailed?.insoluble_g || 0) * (f.consumedFraction ?? 1), 0)
    : totalFiber * 0.65;

  const solubleRounded = Math.round(totalSoluble * 10) / 10;
  const insolubleRounded = Math.round(totalInsoluble * 10) / 10;

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

      {totalFiber > 0 && (
        <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.35rem' }}>
            <span>Solúvel: <strong style={{ color: '#10b981' }}>{solubleRounded}g</strong></span>
            <span>Insolúvel: <strong style={{ color: '#34d399' }}>{insolubleRounded}g</strong></span>
          </div>
          <div style={{ display: 'flex', height: '6px', background: 'rgba(75,85,99,0.3)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${(totalSoluble / (totalFiber || 1)) * 100}%`, background: '#10b981', height: '100%' }} title="Solúvel" />
            <div style={{ width: `${(totalInsoluble / (totalFiber || 1)) * 100}%`, background: '#34d399', height: '100%' }} title="Insolúvel" />
          </div>
          <p style={{ fontSize: '0.625rem', color: '#9ca3af', marginTop: '0.35rem', lineHeight: '1.3' }}>
            🌾 Fibras solúveis auxiliam no controle glicêmico e saciedade. Fibras insolúveis apoiam a digestão e o trânsito intestinal.
          </p>
        </div>
      )}
    </div>
  );
};

export default DetailedNutritionPanel;

