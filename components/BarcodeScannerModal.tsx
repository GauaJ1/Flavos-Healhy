import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import { fetchProductByBarcode } from '../services/barcodeService';
import type { FoodItem } from '../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmFood: (food: FoodItem) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onConfirmFood,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannedProduct, setScannedProduct] = useState<FoodItem | null>(null);
  const [editedWeight, setEditedWeight] = useState<number>(100);

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
          setBarcodeInput(code);
          await handleSearchCode(code);
        }
      }
    } catch (err: any) {
      console.error('[BarcodeScanner] Erro na câmera:', err);
      setErrorMsg('Falha ao abrir o leitor de câmera. Tente digitar o código.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchCode = async (codeToSearch?: string) => {
    const code = codeToSearch || barcodeInput;
    if (!code) return;

    setLoading(true);
    setErrorMsg(null);
    setScannedProduct(null);

    const res = await fetchProductByBarcode(code);
    setLoading(false);

    if (res.found && res.product) {
      setScannedProduct(res.product);
      setEditedWeight(res.product.estimatedWeightGrams || 100);
    } else {
      setErrorMsg(res.errorMessage || 'Produto não encontrado na base Open Food Facts.');
    }
  };

  const handleConfirm = () => {
    if (!scannedProduct) return;
    const baseWeight = scannedProduct.estimatedWeightGrams || 100;
    const multiplier = editedWeight / baseWeight;

    const finalProduct: FoodItem = {
      ...scannedProduct,
      estimatedWeightGrams: editedWeight,
      calories: Math.round(scannedProduct.calories * multiplier),
      carbohydrates: Math.round(scannedProduct.carbohydrates * multiplier * 10) / 10,
      protein: Math.round(scannedProduct.protein * multiplier * 10) / 10,
      fat: Math.round(scannedProduct.fat * multiplier * 10) / 10,
      portionDescription: `${editedWeight}g`,
    };

    onConfirmFood(finalProduct);
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

          {!scannedProduct ? (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
                Aproxime o código EAN-13 da embalagem ou digite o número abaixo para buscar a tabela nutricional oficial.
              </p>

              <button
                onClick={startNativeScan}
                disabled={loading}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'linear-[#10b981,#059669]', backgroundColor: '#10b981', color: '#ffffff', fontWeight: 600, border: 'none', marginBottom: '1rem', cursor: 'pointer' }}
              >
                {loading ? 'Buscando...' : 'Abri Leitor de Câmera Nativa'}
              </button>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Ex: 7891000100103"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', background: '#1f2937', border: '1px solid #4b5563', color: '#fff', fontSize: '0.875rem' }}
                />
                <button
                  onClick={() => handleSearchCode()}
                  disabled={loading || !barcodeInput}
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
          ) : (
            <div>
              <div style={{ background: '#1f2937', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1rem', border: '1px solid #374151' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981', marginBottom: '0.5rem' }}>{scannedProduct.name}</h4>
                <div style={{ fontSize: '0.875rem', color: '#d1d5db', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>🔥 Calorias: <strong>{Math.round(scannedProduct.calories * (editedWeight / (scannedProduct.estimatedWeightGrams || 100)))} kcal</strong></div>
                  <div>🥩 Proteína: <strong>{Math.round(scannedProduct.protein * (editedWeight / (scannedProduct.estimatedWeightGrams || 100)))}g</strong></div>
                  <div>🍞 Carbos: <strong>{Math.round(scannedProduct.carbohydrates * (editedWeight / (scannedProduct.estimatedWeightGrams || 100)))}g</strong></div>
                  <div>🥑 Gorduras: <strong>{Math.round(scannedProduct.fat * (editedWeight / (scannedProduct.estimatedWeightGrams || 100)))}g</strong></div>
                </div>

                <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.25rem' }}>
                  Ajustar Porção Consumida (gramas):
                </label>
                <input
                  type="number"
                  value={editedWeight}
                  onChange={(e) => setEditedWeight(Number(e.target.value) || 0)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '0.375rem', background: '#111827', border: '1px solid #4b5563', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => setScannedProduct(null)}
                  style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', background: '#374151', color: '#fff', border: 'none', cursor: 'pointer' }}
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirm}
                  style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', background: '#10b981', color: '#fff', fontWeight: 600, border: 'none', cursor: 'pointer' }}
                >
                  Confirmar e Adicionar
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
