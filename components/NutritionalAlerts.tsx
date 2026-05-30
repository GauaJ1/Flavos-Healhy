import React from 'react';
import type { NutritionalAlert } from '../utils/nutritionScore';

const NutritionalAlerts: React.FC<{ alerts: NutritionalAlert[] }> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div style={{ background: 'rgba(31,41,55,0.6)', backdropFilter: 'blur(12px)', borderRadius: '1.5rem', border: '1px solid rgba(75,85,99,0.5)', padding: '1.25rem' }}>
      <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '0.75rem' }}>
        📋 Alertas Nutricionais
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {alerts.map((alert, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 0.75rem', borderRadius: '0.75rem', fontSize: '0.75rem',
              background: alert.type === 'positive' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${alert.type === 'positive' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
              color: alert.type === 'positive' ? '#6ee7b7' : '#fcd34d',
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{alert.icon}</span>
            <span>{alert.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NutritionalAlerts;
