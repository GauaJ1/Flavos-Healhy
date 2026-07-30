import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FoodItem } from '../types';
import type { ManualProductInput } from '../hooks/useSavedProducts';

interface AddManualProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: ManualProductInput) => void;
}

export const AddManualProductModal: React.FC<AddManualProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [calories, setCalories] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [fat, setFat] = useState<string>('');
  const [fiber, setFiber] = useState<string>('');
  const [sugar, setSugar] = useState<string>('');
  const [sodium, setSodium] = useState<string>('');
  const [saturatedFat, setSaturatedFat] = useState<string>('');

  const [packageNetWeight, setPackageNetWeight] = useState<string>('');
  const [unitWeight, setUnitWeight] = useState<string>('');
  const [unitLabel, setUnitLabel] = useState<string>('');
  const [processingLevel, setProcessingLevel] = useState<FoodItem['processingLevel']>('processado');

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Informe o nome do produto.');
      return;
    }

    const kcal = parseFloat(calories);
    if (isNaN(kcal) || kcal < 0) {
      setError('Informe as calorias (por 100g) válidas.');
      return;
    }

    const c = parseFloat(carbs) || 0;
    const p = parseFloat(protein) || 0;
    const f = parseFloat(fat) || 0;
    const fib = parseFloat(fiber) || 0;
    const sug = parseFloat(sugar) || 0;
    const sod = parseFloat(sodium) || 0;
    const satFat = parseFloat(saturatedFat) || 0;

    if (c < 0 || p < 0 || f < 0 || fib < 0 || sug < 0 || sod < 0 || satFat < 0) {
      setError('Os valores nutricionais não podem ser negativos.');
      return;
    }

    const pkgGrams = parseFloat(packageNetWeight);
    const uGrams = parseFloat(unitWeight);

    const input: ManualProductInput = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      nutritionPer100g: {
        calories: kcal,
        carbohydrates: c,
        protein: p,
        fat: f,
        fiber: fib,
        sugar: sug,
        addedSugar: 0,
        sodium: sod,
        saturatedFat: satFat,
      },
      packageNetWeightGrams: !isNaN(pkgGrams) && pkgGrams > 0 ? pkgGrams : undefined,
      unitWeightGrams: !isNaN(uGrams) && uGrams > 0 ? uGrams : undefined,
      unitLabel: unitLabel.trim() || undefined,
      processingLevel,
    };

    onSave(input);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl text-white flex flex-col gap-4 my-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Cadastro Manual
              </span>
              <h3 className="text-lg font-bold text-white mt-1">Novo Produto Salvo</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-3 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Informações básicas */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-400 font-semibold mb-1 block">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Iogurte Grego Tradicional"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 font-semibold mb-1 block">Marca (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Danone"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Informação Nutricional por 100g */}
            <div className="bg-gray-800/40 p-3 rounded-2xl border border-gray-800 flex flex-col gap-2">
              <span className="text-xs font-bold text-emerald-400">Tabela Nutricional (POR 100g)</span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 block">Calorias (kcal) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Carboidratos (g)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Proteínas (g)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Gorduras Totais (g)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Fibras (g)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={fiber}
                    onChange={(e) => setFiber(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Açúcares (g)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={sugar}
                    onChange={(e) => setSugar(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Sódio (mg)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={sodium}
                    onChange={(e) => setSodium(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block">Gordura Saturada (g)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={saturatedFat}
                    onChange={(e) => setSaturatedFat(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Medidas Opcionais */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 block">Peso Embalagem (g)</label>
                <input
                  type="number"
                  placeholder="Ex: 400"
                  value={packageNetWeight}
                  onChange={(e) => setPackageNetWeight(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block">Peso por Unidade (g)</label>
                <input
                  type="number"
                  placeholder="Ex: 30"
                  value={unitWeight}
                  onChange={(e) => setUnitWeight(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {unitWeight && (
              <div>
                <label className="text-[10px] text-gray-400 block">Rótulo da Unidade</label>
                <input
                  type="text"
                  placeholder="Ex: barra, fatia, copo"
                  value={unitLabel}
                  onChange={(e) => setUnitLabel(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {/* Nível de Processamento */}
            <div>
              <label className="text-xs text-gray-400 font-semibold mb-1 block">Nível de Processamento</label>
              <select
                value={processingLevel}
                onChange={(e) => setProcessingLevel(e.target.value as FoodItem['processingLevel'])}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="in natura">In Natura</option>
                <option value="minimamente processado">Minimamente Processado</option>
                <option value="processado">Processado</option>
                <option value="ultraprocessado">Ultraprocessado</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all"
              >
                Salvar Produto
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
