import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SavedProduct, FoodItem } from '../types';

export function calcFoodItemFromQuantity(
  product: SavedProduct,
  quantityValue: number,
  mode: 'grams' | 'units'
): FoodItem {
  const grams = mode === 'units'
    ? quantityValue * (product.unitWeightGrams ?? 100)
    : quantityValue;

  const factor = grams / 100;
  const n = product.nutritionPer100g;

  const round1 = (v: number) => Math.round(v * 10) / 10;

  return {
    id: `saved_${product.id}_${Date.now()}`,
    name: product.name,
    calories: Math.round(n.calories * factor),
    estimatedAmount: grams,
    unit: 'g',
    estimatedWeightGrams: grams,
    portionDescription: mode === 'units'
      ? `${quantityValue} ${product.unitLabel || 'unidade(s)'} (${grams}g)`
      : `${grams}g`,
    carbohydrates: round1(n.carbohydrates * factor),
    protein: round1(n.protein * factor),
    fat: round1(n.fat * factor),
    fiber: round1(n.fiber * factor),
    sugar: round1(n.sugar * factor),
    addedSugar: round1(n.addedSugar * factor),
    sodium: Math.round(n.sodium * factor),
    saturatedFat: round1(n.saturatedFat * factor),
    source: 'visible',
    confidence: 'alta',
    preparationMethod: 'industrializado',
    consumedFraction: 1,
    healthHighlights: product.processingLevel === 'in natura' ? ['Alimento in natura'] : [],
    attentionHighlights: product.processingLevel === 'ultraprocessado'
      ? ['Produto ultraprocessado'] : [],
    processingLevel: product.processingLevel,
    possibleAddedSugars: n.sugar * factor > 5,
    possibleAddedFats: n.fat * factor > 10,
    possibleExcessSodium: n.sodium * factor > 400,
    possibleIndustrializedSauces: false,
  };
}

interface QuantityInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: SavedProduct | null;
  onConfirm: (foodItem: FoodItem, product: SavedProduct) => void;
  onUpdateNutrition?: (productId: string, updatedNutrition: SavedProduct['nutritionPer100g']) => SavedProduct | null;
}

export const QuantityInputModal: React.FC<QuantityInputModalProps> = ({
  isOpen,
  onClose,
  product,
  onConfirm,
  onUpdateNutrition,
}) => {
  if (!isOpen || !product) return null;

  const hasUnit = Boolean(product.unitWeightGrams && product.unitWeightGrams > 0);
  const [mode, setMode] = useState<'grams' | 'units'>(hasUnit ? 'units' : 'grams');
  const [quantity, setQuantity] = useState<number>(hasUnit ? 1 : (product.packageNetWeightGrams || 100));

  // Estado para edição inline de macros por 100g (PASSO 2)
  const [isEditingMacros, setIsEditingMacros] = useState<boolean>(Boolean(product.dataQualityWarning && !product.manuallyCorrected));
  const [editCalories, setEditCalories] = useState<string>(String(product.nutritionPer100g.calories));
  const [editCarbs, setEditCarbs] = useState<string>(String(product.nutritionPer100g.carbohydrates));
  const [editProtein, setEditProtein] = useState<string>(String(product.nutritionPer100g.protein));
  const [editFat, setEditFat] = useState<string>(String(product.nutritionPer100g.fat));
  const [editFiber, setEditFiber] = useState<string>(String(product.nutritionPer100g.fiber));

  const [currentProduct, setCurrentProduct] = useState<SavedProduct>(product);

  const previewFood = calcFoodItemFromQuantity(currentProduct, quantity || 0, mode);

  const handleApplyMacroEdit = () => {
    const kcal = parseFloat(editCalories);
    if (isNaN(kcal) || kcal < 0) return;

    const newNutrition: SavedProduct['nutritionPer100g'] = {
      ...currentProduct.nutritionPer100g,
      calories: kcal,
      carbohydrates: Math.max(0, parseFloat(editCarbs) || 0),
      protein: Math.max(0, parseFloat(editProtein) || 0),
      fat: Math.max(0, parseFloat(editFat) || 0),
      fiber: Math.max(0, parseFloat(editFiber) || 0),
    };

    const updated: SavedProduct = {
      ...currentProduct,
      nutritionPer100g: newNutrition,
      manuallyCorrected: true,
      dataQualityWarning: undefined,
    };

    setCurrentProduct(updated);
    if (onUpdateNutrition) {
      onUpdateNutrition(product.id, newNutrition);
    }
    setIsEditingMacros(false);
  };

  const handleConfirm = () => {
    if (!quantity || quantity <= 0) return;

    let finalProduct = currentProduct;
    // Se estava editando no momento de confirmar, aplica as alterações primeiro
    if (isEditingMacros) {
      const kcal = parseFloat(editCalories);
      if (!isNaN(kcal) && kcal >= 0) {
        const newNutrition: SavedProduct['nutritionPer100g'] = {
          ...currentProduct.nutritionPer100g,
          calories: kcal,
          carbohydrates: Math.max(0, parseFloat(editCarbs) || 0),
          protein: Math.max(0, parseFloat(editProtein) || 0),
          fat: Math.max(0, parseFloat(editFat) || 0),
          fiber: Math.max(0, parseFloat(editFiber) || 0),
        };
        finalProduct = {
          ...currentProduct,
          nutritionPer100g: newNutrition,
          manuallyCorrected: true,
          dataQualityWarning: undefined,
        };
        if (onUpdateNutrition) {
          onUpdateNutrition(product.id, newNutrition);
        }
      }
    }

    const finalFoodItem = calcFoodItemFromQuantity(finalProduct, quantity, mode);
    onConfirm(finalFoodItem, finalProduct);
  };

  const handlePackageShortcut = () => {
    if (currentProduct.packageNetWeightGrams) {
      setMode('grams');
      setQuantity(currentProduct.packageNetWeightGrams);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-white flex flex-col gap-4 my-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Definir Quantidade
              </span>
              <h3 className="text-lg font-bold text-white mt-1 leading-tight">{currentProduct.name}</h3>
              {currentProduct.brand && <p className="text-xs text-gray-400">{currentProduct.brand}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Banner de Aviso de Qualidade (PASSO 2) */}
          {currentProduct.dataQualityWarning && !currentProduct.manuallyCorrected && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs p-3 rounded-2xl flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="text-base">⚠️</span>
                <p className="leading-relaxed">
                  Os dados deste produto podem estar incompletos ou desatualizados na base pública. Você pode ajustar os valores abaixo antes de salvar.
                </p>
              </div>
              {!isEditingMacros && (
                <button
                  type="button"
                  onClick={() => setIsEditingMacros(true)}
                  className="self-start text-[11px] font-bold text-amber-400 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1 rounded-lg transition-colors"
                >
                  ✍️ Corrigir Valores (100g)
                </button>
              )}
            </div>
          )}

          {/* Painel Inline de Edição de Macros por 100g */}
          {isEditingMacros ? (
            <div className="bg-gray-800/60 p-4 rounded-2xl border border-amber-500/30 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-amber-400">Ajustar Tabela Nutricional (POR 100g)</span>
                <button
                  type="button"
                  onClick={() => setIsEditingMacros(false)}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-gray-400 block">Calorias (kcal)</label>
                  <input
                    type="number"
                    step="any"
                    value={editCalories}
                    onChange={(e) => setEditCalories(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Carboidratos (g)</label>
                  <input
                    type="number"
                    step="any"
                    value={editCarbs}
                    onChange={(e) => setEditCarbs(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Proteínas (g)</label>
                  <input
                    type="number"
                    step="any"
                    value={editProtein}
                    onChange={(e) => setEditProtein(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Gorduras (g)</label>
                  <input
                    type="number"
                    step="any"
                    value={editFat}
                    onChange={(e) => setEditFat(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Fibras (g)</label>
                  <input
                    type="number"
                    step="any"
                    value={editFiber}
                    onChange={(e) => setEditFiber(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleApplyMacroEdit}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors mt-1"
              >
                Salvar Correção Permanente
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center text-xs text-gray-400 px-1">
              <span>Base: {currentProduct.nutritionPer100g.calories} kcal / 100g</span>
              <button
                type="button"
                onClick={() => setIsEditingMacros(true)}
                className="text-emerald-400 hover:underline text-[11px] font-medium"
              >
                ✏️ Editar valores (100g)
              </button>
            </div>
          )}

          {/* Mode Switcher */}
          {hasUnit && (
            <div className="flex gap-2 p-1 bg-gray-800/60 rounded-xl border border-gray-700/50">
              <button
                type="button"
                onClick={() => {
                  setMode('units');
                  setQuantity(1);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'units'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Unidades ({currentProduct.unitLabel || 'unid.'})
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('grams');
                  setQuantity(currentProduct.unitWeightGrams || 100);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === 'grams'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Gramas (g)
              </button>
            </div>
          )}

          {/* Quantity Controls */}
          <div className="flex flex-col items-center gap-3 bg-gray-800/40 p-4 rounded-2xl border border-gray-800">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, (q || 1) - (mode === 'units' ? 1 : 10)))}
                className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 text-lg font-bold text-emerald-400 hover:bg-gray-700 active:scale-95 transition-all flex items-center justify-center"
              >
                -
              </button>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  min="1"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-24 text-center text-3xl font-black bg-transparent text-white border-b-2 border-emerald-500 focus:outline-none"
                />
                <span className="text-sm font-semibold text-gray-400">
                  {mode === 'units' ? (currentProduct.unitLabel || 'unid.') : 'g'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuantity((q) => (q || 0) + (mode === 'units' ? 1 : 10))}
                className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 text-lg font-bold text-emerald-400 hover:bg-gray-700 active:scale-95 transition-all flex items-center justify-center"
              >
                +
              </button>
            </div>

            {/* Shortcut Package */}
            {currentProduct.packageNetWeightGrams && currentProduct.packageNetWeightGrams > 0 && (
              <button
                type="button"
                onClick={handlePackageShortcut}
                className="text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-full font-medium transition-colors"
              >
                Comi o pacote inteiro ({currentProduct.packageNetWeightGrams}g)
              </button>
            )}
          </div>

          {/* Realtime Nutritional Preview */}
          <div className="bg-gray-800/80 rounded-2xl p-4 border border-gray-700/50 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Total Calculado ({previewFood.estimatedWeightGrams}g)</span>
              <span className="text-lg font-bold text-emerald-400">{previewFood.calories} kcal</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center pt-2 border-t border-gray-700/50">
              <div className="bg-gray-900/60 p-2 rounded-xl">
                <span className="text-[10px] text-gray-400 block">Carbs</span>
                <span className="text-xs font-bold text-amber-400">{previewFood.carbohydrates}g</span>
              </div>
              <div className="bg-gray-900/60 p-2 rounded-xl">
                <span className="text-[10px] text-gray-400 block">Prot</span>
                <span className="text-xs font-bold text-emerald-400">{previewFood.protein}g</span>
              </div>
              <div className="bg-gray-900/60 p-2 rounded-xl">
                <span className="text-[10px] text-gray-400 block">Gord</span>
                <span className="text-xs font-bold text-rose-400">{previewFood.fat}g</span>
              </div>
              <div className="bg-gray-900/60 p-2 rounded-xl">
                <span className="text-[10px] text-gray-400 block">Fibra</span>
                <span className="text-xs font-bold text-cyan-400">{previewFood.fiber}g</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-500/20 transition-all"
            >
              Confirmar e Analisar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
