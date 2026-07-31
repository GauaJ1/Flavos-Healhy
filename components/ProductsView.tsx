import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { SavedProduct } from '../types';

interface ProductsViewProps {
  products: SavedProduct[];
  onSelectProduct: (product: SavedProduct) => void;
  onRemoveProduct: (id: string) => void;
  onOpenAddManual: () => void;
  onOpenBarcodeScanner: () => void;
}

type SortOption = 'recent' | 'usage' | 'alphabetical';

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  onSelectProduct,
  onRemoveProduct,
  onOpenAddManual,
  onOpenBarcodeScanner,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter((p) => {
      const term = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.includes(term))
      );
    });

    result.sort((a, b) => {
      if (sortBy === 'usage') {
        return (b.useCount || 0) - (a.useCount || 0);
      }
      if (sortBy === 'alphabetical') {
        return a.name.localeCompare(b.name);
      }
      // 'recent'
      const timeA = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return result;
  }, [products, searchTerm, sortBy]);

  const getProcessingBadge = (level: SavedProduct['processingLevel']) => {
    switch (level) {
      case 'in natura':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">In Natura</span>;
      case 'minimamente processado':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">Min. Processado</span>;
      case 'processado':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Processado</span>;
      case 'ultraprocessado':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">Ultraprocessado</span>;
      default:
        return null;
    }
  };

  const getNutriScoreColor = (grade?: string) => {
    if (!grade) return 'bg-gray-800 text-gray-400';
    const g = grade.toUpperCase();
    if (g === 'A') return 'bg-emerald-600 text-white';
    if (g === 'B') return 'bg-lime-600 text-white';
    if (g === 'C') return 'bg-amber-500 text-black font-bold';
    if (g === 'D') return 'bg-orange-600 text-white';
    if (g === 'E') return 'bg-rose-600 text-white';
    return 'bg-gray-800 text-gray-400';
  };

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-4 pb-20">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Produtos Salvos</h2>
          <p className="text-xs text-gray-400">Sua biblioteca de alimentos para adição rápida</p>
        </div>
        <button
          onClick={onOpenBarcodeScanner}
          className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Escanear
        </button>
      </div>

      {/* Search and Sort controls */}
      {products.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nome, marca ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800/80 border border-gray-700/60 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
            />
            <svg
              className="w-4 h-4 text-gray-500 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex gap-1.5 p-1 bg-gray-900/60 rounded-xl border border-gray-800">
            <button
              onClick={() => setSortBy('recent')}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                sortBy === 'recent' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Recentes
            </button>
            <button
              onClick={() => setSortBy('usage')}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                sortBy === 'usage' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Mais Usados
            </button>
            <button
              onClick={() => setSortBy('alphabetical')}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-all ${
                sortBy === 'alphabetical' ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              A-Z
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/40 border border-gray-700/50 rounded-3xl p-8 text-center flex flex-col items-center gap-4 my-4"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">
            📦
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Nenhum produto salvo ainda</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed max-w-xs">
              Escaneie um código de barras ou cadastre manualmente para criar sua biblioteca de alimentos favoritos.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={onOpenBarcodeScanner}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-1.5"
            >
              📷 Escanear Código
            </button>
            <button
              onClick={onOpenAddManual}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold py-2.5 px-4 rounded-xl border border-gray-700 transition-colors flex items-center justify-center gap-1.5"
            >
              ✍️ Add Manual
            </button>
          </div>
        </motion.div>
      )}

      {/* Products List */}
      {filteredAndSortedProducts.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredAndSortedProducts.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-gray-600 transition-all group"
            >
              <div
                onClick={() => onSelectProduct(p)}
                className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
              >
                {/* Image / Thumbnail */}
                <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">
                      {p.processingLevel === 'in natura' ? '🥗' : p.processingLevel === 'ultraprocessado' ? '🍪' : '🥫'}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{p.name}</h4>
                    {p.nutriScoreGrade && (
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${getNutriScoreColor(p.nutriScoreGrade)}`}>
                        {p.nutriScoreGrade}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">
                    {p.brand ? `${p.brand} • ` : ''}
                    {p.nutritionPer100g.calories} kcal/100g
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {getProcessingBadge(p.processingLevel)}
                    {p.manuallyCorrected && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-0.5">
                        ✅ Verificado por você
                      </span>
                    )}
                    {!p.manuallyCorrected && p.dataQualityWarning && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-0.5">
                        ⚠️ Dados externos
                      </span>
                    )}
                    {p.useCount > 0 && (
                      <span className="text-[10px] text-gray-500 font-medium">
                        usado {p.useCount}x
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectProduct(p)}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 p-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                  title="Usar produto"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingId(deletingId === p.id ? null : p.id)}
                  className="text-gray-500 hover:text-rose-400 p-2 rounded-xl hover:bg-gray-700/50 transition-colors"
                  title="Remover produto"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Delete confirmation dialog */}
              {deletingId === p.id && (
                <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-between border border-rose-500/40 z-10">
                  <span className="text-xs text-rose-300 font-medium truncate">Remover {p.name}?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-2.5 py-1 text-xs text-gray-400 hover:text-white rounded-lg bg-gray-800"
                    >
                      Não
                    </button>
                    <button
                      onClick={() => {
                        onRemoveProduct(p.id);
                        setDeletingId(null);
                      }}
                      className="px-2.5 py-1 text-xs text-white font-bold rounded-lg bg-rose-600 hover:bg-rose-700"
                    >
                      Sim, remover
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Floating Add Manual Button */}
      <button
        onClick={onOpenAddManual}
        className="fixed bottom-20 right-5 z-30 bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-3.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-emerald-400/30"
        aria-label="Adicionar produto manualmente"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-xs font-bold pr-1">Manual</span>
      </button>
    </div>
  );
};
