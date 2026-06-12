import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { MicronutrientEstimate } from '../types';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

const levelColors = {
  baixo: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  moderado: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  bom: { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  alto: { color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
};

interface MicronutrientPanelProps {
  estimates: MicronutrientEstimate[];
  dailyCoveragePercent?: Record<string, number>;
}

const MicronutrientPanel: React.FC<MicronutrientPanelProps> = ({ estimates, dailyCoveragePercent }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'radar'>('radar');

  if (!estimates || estimates.length === 0) return null;

  const hasCoverageData = dailyCoveragePercent && Object.keys(dailyCoveragePercent).length > 0;

  // Preparar dados para o gráfico Radar
  const nameMap: Record<string, string> = {
    iron_mg: 'Ferro',
    calcium_mg: 'Cálcio',
    vitaminC_mg: 'Vit. C',
    vitaminD_mcg: 'Vit. D',
    magnesium_mg: 'Magnesio',
    potassium_mg: 'Potássio',
    zinc_mg: 'Zinco',
    vitaminB12_mcg: 'Vit. B12',
    fiber_g: 'Fibras',
  };

  const chartData = hasCoverageData
    ? Object.entries(dailyCoveragePercent || {}).map(([key, val]) => ({
        subject: nameMap[key] || key,
        coverage: val,
        idr: 100,
      }))
    : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: '#1f2937', border: '1px solid #374151', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f3f4f6', margin: 0 }}>{payload[0].payload.subject}</p>
          <p style={{ fontSize: '0.75rem', color: '#10b981', margin: '0.15rem 0 0' }}>
            Cobertura: <strong style={{ fontFamily: 'monospace' }}>{payload[0].value}%</strong> da IDR
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ background: 'rgba(31,41,55,0.6)', backdropFilter: 'blur(12px)', borderRadius: '1.5rem', border: '1px solid rgba(75,85,99,0.5)', padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', minHeight: '360px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          💎 Micronutrientes & IDR ANVISA
        </h4>
        
        {hasCoverageData && (
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button
              onClick={() => setViewMode('radar')}
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color: viewMode === 'radar' ? '#10b981' : '#9ca3af',
                background: viewMode === 'radar' ? 'rgba(16,185,129,0.15)' : 'transparent',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              🕸️ Radar
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color: viewMode === 'grid' ? '#10b981' : '#9ca3af',
                background: viewMode === 'grid' ? 'rgba(16,185,129,0.15)' : 'transparent',
                border: 'none',
                borderRadius: '0.375rem',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              📊 Lista
            </button>
          </div>
        )}
      </div>

      {hasCoverageData && viewMode === 'radar' ? (
        <div style={{ flex: 1, width: '100%', height: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" radius="70%" data={chartData}>
              <PolarGrid stroke="rgba(75,85,99,0.4)" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#d1d5db', fontSize: 10, fontWeight: 500 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 'auto']} 
                tick={{ fill: '#6b7280', fontSize: 8 }}
                stroke="rgba(75,85,99,0.3)"
              />
              <Radar
                name="Cobertura"
                dataKey="coverage"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.25}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem', flex: 1 }}>
          {estimates.slice(0, 8).map((m, i) => {
            const cfg = levelColors[m.level] || levelColors.moderado;
            return (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ background: cfg.bg, borderRadius: '0.75rem', padding: '0.6rem 0.75rem', border: `1px solid ${cfg.color}22`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#e5e7eb' }}>{m.name}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: cfg.color }}>{m.percentage}%</span>
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
      )}

      <p style={{ fontSize: '0.6rem', color: '#6b7280', marginTop: 'auto', paddingTop: '0.75rem', fontStyle: 'italic', margin: 0 }}>
        * Percentuais em relação à Ingestão Diária Recomendada (IDR) estabelecida pela ANVISA.
      </p>
    </div>
  );
};

export default MicronutrientPanel;
