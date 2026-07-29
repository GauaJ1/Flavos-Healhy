import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const startNativeScan = async () => {
    setErrorMsg(null);
    if (!Capacitor.isNativePlatform()) {
      setErrorMsg('O scanner de câmera nativo requer Android. Digite o código EAN-13 manualmente.');
      return;
    }

    try {
      const granted = await BarcodeScanner.requestPermissions();
      if (granted.camera !== 'granted') {
        setErrorMsg('Permissão de câmera não concedida.');
        return;
      }

      setLoading(true);
      const result = await BarcodeScanner.scan({
        formats: [BarcodeFormat.Ean13, BarcodeFormat.Ean8],
      });

      if (result.barcodes && result.barcodes.length > 0) {
        const code = result.barcodes[0].rawValue;
        if (code) {
          onBarcodeDetected(code);
          onClose();
        }
      }
    } catch (err: any) {
      console.error('[BarcodeScanner] Erro na câmera:', err);
      setErrorMsg('Falha ao abrir o leitor de câmera. Tente digitar o código.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = () => {
    const code = barcodeInput.trim();
    if (!code) return;
    onBarcodeDetected(code);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{ width: '100%', maxWidth: '28rem', background: '#111827', borderRadius: '1.5rem', border: '1px solid #374151', padding: '1.5rem', color: '#f9fafb' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📷 Escanear Código de Barras
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
          </div>

          <div>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
              Aproxime o código EAN-13 da embalagem ou digite o número abaixo para buscar a tabela nutricional oficial.
            </p>

            <button
              onClick={startNativeScan}
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: '#10b981', color: '#ffffff', fontWeight: 600, border: 'none', marginBottom: '1rem', cursor: 'pointer' }}
            >
              {loading ? 'Abrindo câmera...' : 'Abrir Leitor de Câmera Nativa'}
            </button>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Ex: 7891000100103"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleManualSearch(); }}
                style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', background: '#1f2937', border: '1px solid #4b5563', color: '#fff', fontSize: '0.875rem' }}
              />
              <button
                onClick={handleManualSearch}
                disabled={loading || !barcodeInput.trim()}
                style={{ padding: '0.625rem 1rem', borderRadius: '0.5rem', background: '#3b82f6', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                Buscar
              </button>
            </div>

            {errorMsg && (
              <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: '0.875rem' }}>
                {errorMsg}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
