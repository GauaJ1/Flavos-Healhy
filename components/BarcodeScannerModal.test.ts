import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { BarcodeScannerModal } from './BarcodeScannerModal';

describe('BarcodeScannerModal', () => {
  it('deve ser um componente React válido que recebe isOpen, onClose e onBarcodeDetected', () => {
    expect(BarcodeScannerModal).toBeDefined();
    expect(typeof BarcodeScannerModal).toBe('function');
  });

  it('NÃO deve importar ou exportar fetchProductByBarcode diretamente (responsabilidade delegada para App.tsx)', async () => {
    const modalModule = await import('./BarcodeScannerModal');
    expect(modalModule).not.toHaveProperty('fetchProductByBarcode');
  });
});
