import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, SparklesIcon } from './icons';
import type { SavedProduct } from '../types';

interface SelectedProductEntry {
  product: SavedProduct;
  grams: number;
}

interface ImagePreviewProps {
  imageFile: File;
  onBack?: () => void;
  onCancel?: () => void;
  onAnalyze: (description: string) => void;
  savedProducts?: SavedProduct[];
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  imageFile,
  onBack,
  onCancel,
  onAnalyze,
  savedProducts = [],
}) => {
  const [description, setDescription] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProductEntry[]>([]);
  const [editingGrams, setEditingGrams] = useState<{ [id: string]: string }>({});

  // Memoizar imageUrl para evitar recriar o blob a cada re-render
  // e revogar quando o componente desmontar (evita memory leak)
  const imageUrl = useMemo(() => URL.createObjectURL(imageFile), [imageFile]);
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const handleClose = () => {
    if (onBack) onBack();
    else if (onCancel) onCancel();
  };

  // Filtra produtos salvos pela busca
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return savedProducts.slice(0, 8);
    const term = productSearch.toLowerCase();
    return savedProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.brand && p.brand.toLowerCase().includes(term))
      )
      .slice(0, 8);
  }, [savedProducts, productSearch]);

  const addProduct = (product: SavedProduct) => {
    if (selectedProducts.some((e) => e.product.id === product.id)) return;
    const defaultGrams = product.unitWeightGrams ?? product.packageNetWeightGrams ?? 100;
    setSelectedProducts((prev) => [...prev, { product, grams: defaultGrams }]);
    setProductSearch('');
    setShowProductPicker(false);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((e) => e.product.id !== productId));
  };

  const updateGrams = (productId: string, grams: number) => {
    setSelectedProducts((prev) =>
      prev.map((e) => (e.product.id === productId ? { ...e, grams } : e))
    );
  };

  // Monta a descrição final concatenando seleções de produtos
  const buildFinalDescription = (): string => {
    let parts: string[] = [];
    if (description.trim()) parts.push(description.trim());
    if (selectedProducts.length > 0) {
      const productLines = selectedProducts
        .map((e) => {
          const n = e.product.nutritionPer100g;
          const factor = e.grams / 100;
          const kcal = Math.round(n.calories * factor);
          const carbs = Math.round(n.carbohydrates * factor);
          const prot = Math.round(n.protein * factor);
          const fat = Math.round(n.fat * factor);
          return `- ${e.product.name}${e.product.brand ? ` (${e.product.brand})` : ''}: ${e.grams}g → ${kcal} kcal, ${carbs}g carb, ${prot}g prot, ${fat}g gordura`;
        })
        .join('\n');
      parts.push(
        `Produtos conhecidos incluídos nessa refeição (use esses valores EXATOS para esses itens):\n${productLines}`
      );
    }
    return parts.join('\n\n');
  };

  const handleAnalyze = () => {
    onAnalyze(buildFinalDescription());
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-gray-800/60 backdrop-blur-md rounded-3xl p-6 border border-gray-700/50 shadow-2xl relative"
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-900/50 p-2 rounded-full transition-colors z-10"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Image Preview */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-6 bg-gray-900 shadow-inner">
          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white">Essa é a sua foto?</h3>

          {/* Description textarea */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="relative">
              <label className="block text-sm text-emerald-400 mb-2 font-medium">
                Adicionar detalhes (Opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: 'É um bolo de cenoura sem açúcar' ou 'Suco de laranja natural'..."
                className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-4 text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none text-sm"
                rows={2}
              />
            </div>
          </motion.div>

          {/* ── Incluir Produtos da Biblioteca ── */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.9, duration: 0.4 }}
            className="overflow-hidden"
          >
            <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-200">📦 Incluir produto da biblioteca</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Já sei o que comi — adicionar itens com macros exatos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductPicker((v) => !v)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all border ${
                    showProductPicker
                      ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-400'
                      : savedProducts.length === 0
                      ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-emerald-500/40 hover:text-emerald-400'
                  }`}
                  disabled={savedProducts.length === 0}
                  title={savedProducts.length === 0 ? 'Nenhum produto salvo ainda. Vá até a aba Produtos para cadastrar.' : ''}
                >
                  {savedProducts.length === 0 ? 'Nenhum produto' : showProductPicker ? '− Fechar' : '+ Adicionar'}
                </button>
              </div>

              {/* Chips de produtos selecionados */}
              {selectedProducts.length > 0 && (
                <div className="flex flex-col gap-2">
                  {selectedProducts.map((entry) => (
                    <div
                      key={entry.product.id}
                      className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2"
                    >
                      <div className="w-6 h-6 rounded-md bg-gray-800 border border-gray-700 flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                        {entry.product.imageUrl ? (
                          <img
                            src={entry.product.imageUrl}
                            alt=""
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <span>
                            {entry.product.processingLevel === 'in natura'
                              ? '🥗'
                              : entry.product.processingLevel === 'ultraprocessado'
                              ? '🍪'
                              : '🥫'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-xs font-semibold text-white truncate">
                          {entry.product.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {Math.round(entry.product.nutritionPer100g.calories * (entry.grams / 100))} kcal
                        </span>
                      </div>
                      {/* Grams inline editor */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <input
                          type="number"
                          min="1"
                          value={editingGrams[entry.product.id] ?? String(entry.grams)}
                          onChange={(e) => {
                            setEditingGrams((prev) => ({
                              ...prev,
                              [entry.product.id]: e.target.value,
                            }));
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val > 0) updateGrams(entry.product.id, val);
                            setEditingGrams((prev) => {
                              const { [entry.product.id]: _, ...rest } = prev;
                              return rest;
                            });
                          }}
                          className="w-14 text-center text-xs font-bold bg-gray-900 border border-gray-700 rounded-lg px-1 py-1 text-white focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-[10px] text-gray-400">g</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProduct(entry.product.id)}
                        className="text-gray-500 hover:text-rose-400 p-1 transition-colors flex-shrink-0"
                        aria-label="Remover"
                      >
                        <XMarkIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Product picker dropdown */}
              <AnimatePresence>
                {showProductPicker && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden flex flex-col gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Buscar produto salvo..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      autoFocus
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                    <div className="flex flex-col gap-1 max-h-44 overflow-y-auto pr-1">
                      {filteredProducts.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-3">
                          Nenhum produto encontrado
                        </p>
                      )}
                      {filteredProducts.map((p) => {
                        const alreadyAdded = selectedProducts.some(
                          (e) => e.product.id === p.id
                        );
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => !alreadyAdded && addProduct(p)}
                            disabled={alreadyAdded}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all w-full ${
                              alreadyAdded
                                ? 'opacity-40 cursor-not-allowed bg-gray-800/30'
                                : 'hover:bg-emerald-500/10 hover:border-emerald-500/30 border border-transparent'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0 text-sm">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span>
                                  {p.processingLevel === 'in natura'
                                    ? '🥗'
                                    : p.processingLevel === 'ultraprocessado'
                                    ? '🍪'
                                    : '🥫'}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-semibold text-white truncate">{p.name}</span>
                              <span className="text-[10px] text-gray-400">
                                {p.brand ? `${p.brand} · ` : ''}{p.nutritionPer100g.calories} kcal/100g
                              </span>
                            </div>
                            {alreadyAdded && (
                              <span className="text-[10px] text-emerald-500 font-bold flex-shrink-0">✓</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Action Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAnalyze}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
          >
            <SparklesIcon className="w-5 h-5" />
            Analisar Calorias
            {selectedProducts.length > 0 && (
              <span className="bg-white/20 text-xs font-bold px-2 py-0.5 rounded-full ml-1">
                +{selectedProducts.length} produto{selectedProducts.length > 1 ? 's' : ''}
              </span>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default ImagePreview;