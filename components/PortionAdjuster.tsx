import React, { useState } from 'react';
import type { FoodItem } from '../types';
import { PORTION_PRESETS, type PortionSize } from '../types';
import { adjustFoodPortion } from '../utils/nutritionScore';

interface PortionAdjusterProps {
  food: FoodItem;
  onAdjust: (adjustedFood: FoodItem) => void;
}

const PortionAdjuster: React.FC<PortionAdjusterProps> = ({ food, onAdjust }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<PortionSize | null>(null);

  const handleSelect = (size: PortionSize) => {
    const preset = PORTION_PRESETS[size];
    setSelected(size);
    onAdjust(adjustFoodPortion(food, preset.multiplier));
  };

  const handleCustom = (multiplier: number) => {
    setSelected(null);
    onAdjust(adjustFoodPortion(food, multiplier));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '0.5rem', padding: '0.3rem 0.6rem', fontSize: '0.65rem',
          color: '#a5b4fc', cursor: 'pointer', fontWeight: 600,
        }}
      >
        ✏️ Ajustar porção
      </button>
    );
  }

  return (
    <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.75rem', padding: '0.75rem', marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#c7d2fe' }}>Tamanho da porção</span>
        <button onClick={() => { setIsOpen(false); setSelected(null); }} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
      </div>

      {/* Quick sizes */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
        {(Object.keys(PORTION_PRESETS) as PortionSize[]).map(size => {
          const preset = PORTION_PRESETS[size];
          const isActive = selected === size;
          return (
            <button
              key={size}
              onClick={() => handleSelect(size)}
              style={{
                flex: 1, padding: '0.4rem', borderRadius: '0.5rem', fontSize: '0.65rem', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s',
                background: isActive ? 'rgba(99,102,241,0.3)' : 'rgba(55,65,81,0.5)',
                border: `1px solid ${isActive ? 'rgba(99,102,241,0.5)' : 'rgba(75,85,99,0.5)'}`,
                color: isActive ? '#e0e7ff' : '#9ca3af',
              }}
            >
              {preset.label}
              <br />
              <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>×{preset.multiplier}</span>
            </button>
          );
        })}
      </div>

      {/* Household measures */}
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
        {[0.5, 0.75, 1.25, 1.5, 2.0].map(mult => (
          <button
            key={mult}
            onClick={() => handleCustom(mult)}
            style={{
              padding: '0.25rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.6rem',
              background: 'rgba(55,65,81,0.5)', border: '1px solid rgba(75,85,99,0.5)',
              color: '#9ca3af', cursor: 'pointer',
            }}
          >
            ×{mult}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PortionAdjuster;
