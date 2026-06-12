/**
 * MealPlanPanel — Fase 2
 *
 * Plano de refeições com:
 *   - Refeições travadas ("Minhas refeições")
 *   - Redistribuição automática dos macros restantes
 *   - Estratégia de volume (déficit) + carbLoadStrategy (surplus)
 *   - Avisos empáticos de concentração de macro e timing de treino
 *   - Banner de redistribuição
 *   - Highlight visual nos macros alterados
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserProfile, NutritionalTargets, MealConfig } from '../hooks/useUserProfile';
import { distributeMeals, carbLoadStrategy } from '../hooks/useUserProfile';
import {
  volumeStrategy,
  redistributeAroundFixedMeals,
  sumFoodsMacros,
} from '../utils/macros';
import type { FixedMeal, MealPlanEntry } from '../utils/macros';
import type { AnalysisResult } from '../types';
import { generateMealSuggestions } from '../services/geminiService';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface SavedMealTemplate {
  id: string;
  name: string;
  meal_type: string | null;
  analysis_json: AnalysisResult;
  created_at: string;
}

interface MealPlanPanelProps {
  profile: UserProfile;
  targets: NutritionalTargets;
  /** Templates salvos do usuário (vindos do backend / localStorage) */
  savedTemplates?: SavedMealTemplate[];
  /** Callback para salvar um template */
  onSaveTemplate?: (name: string, meal_type: string, analysis: AnalysisResult) => void;
}

// ──────────────────────────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────────────────────────

const MEAL_SUGGESTIONS: Record<string, string[]> = {
  'Café da manhã': ['Pão francês com queijo minas ou ovos mexidos', 'Fruta (banana ou mamão) + café sem açúcar'],
  'Almoço': ['Arroz branco/integral (150g) + feijão carioca (100g)', 'Grelhado (frango ou carne, 120g) + salada de folhas à vontade'],
  'Lanche da tarde': ['Tapioca (50g) com queijo ou banana amassada com aveia (30g)', 'Iogurte natural ou mix de castanhas (30g)'],
  'Shake Pós-treino': ['Vitamina de leite integral/desnatado + banana + aveia + mel', 'Whey protein + tapioca com frango desfiado'],
  'Jantar': ['Arroz (120g) + feijão (100g) + filé de frango/peixe (120g)', 'Legumes cozidos no vapor (brócolis e cenoura) + azeite'],
  'Ceia': ['Abacate com limão ou mel (100g)', 'Iogurte natural com um punhado de granola'],
};

const MEAL_TYPE_MAP: Record<string, string> = {
  'Café da manhã': 'cafe',
  'Almoço': 'almoco',
  'Lanche da tarde': 'lanche_tarde',
  'Shake Pós-treino': 'pos_treino',
  'Jantar': 'jantar',
  'Ceia': 'ceia',
};

// ──────────────────────────────────────────────────────────────
// Sub-componentes
// ──────────────────────────────────────────────────────────────

interface MacroValueProps {
  label: string;
  value: number;
  unit?: string;
  changed?: boolean;
  colorClass: string;
}

const MacroValue: React.FC<MacroValueProps> = ({ label, value, unit = 'g', changed, colorClass }) => (
  <span className="flex items-center gap-0.5">
    <span className="text-gray-500">{label}:&nbsp;</span>
    <strong
      className={`font-mono transition-colors ${
        changed
          ? 'text-amber-400 animate-pulse'
          : colorClass
      }`}
    >
      {value}{unit}
    </strong>
    {changed && (
      <span
        className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5 mt-0.5"
        title="Macro recalculado"
        aria-label="Macro recalculado"
      />
    )}
  </span>
);

interface LockBadgeProps {}
const LockBadge: React.FC<LockBadgeProps> = () => (
  <span
    className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold"
    style={{ background: '#EEEDFE', color: '#534AB7' }}
    aria-label="Refeição travada"
  >
    🔒 Travada
  </span>
);

// ──────────────────────────────────────────────────────────────
// Modal de selecionar template salvo
// ──────────────────────────────────────────────────────────────

interface SelectTemplateModalProps {
  templates: SavedMealTemplate[];
  mealType: string;
  onSelect: (template: SavedMealTemplate) => void;
  onClose: () => void;
}

const SelectTemplateModal: React.FC<SelectTemplateModalProps> = ({
  templates,
  mealType,
  onSelect,
  onClose,
}) => {
  const filtered = templates.filter(
    t => !t.meal_type || t.meal_type === MEAL_TYPE_MAP[mealType] || t.meal_type === 'outro',
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Selecionar refeição salva para ${mealType}`}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="w-full max-w-sm bg-gray-900 border border-gray-700/60 rounded-3xl p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-white">Minhas refeições salvas</h4>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors text-lg leading-none"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            Nenhuma refeição salva ainda.<br />
            <span className="text-gray-500">Use "Salvar esta refeição" após analisar uma foto.</span>
          </p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filtered.map(t => {
              const macros = sumFoodsMacros(t.analysis_json);
              return (
                <li key={t.id}>
                  <button
                    onClick={() => onSelect(t)}
                    className="w-full text-left px-4 py-3 rounded-2xl bg-gray-800/60 hover:bg-gray-800 border border-gray-700/30 hover:border-gray-600/50 transition-all"
                  >
                    <div className="font-semibold text-sm text-white truncate">{t.name}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5 font-mono">
                      {macros.protein_g}g prot · {macros.carbs_g}g carbo · {macros.fat_g}g gord · {macros.kcal} kcal
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>
    </motion.div>
  );
};

// ──────────────────────────────────────────────────────────────
// Modal de salvar refeição como template
// ──────────────────────────────────────────────────────────────

interface SaveTemplateModalProps {
  mealType: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({ mealType, onSave, onClose }) => {
  const [name, setName] = useState(mealType);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Salvar refeição como modelo"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="w-full max-w-xs bg-gray-900 border border-gray-700/60 rounded-3xl p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h4 className="text-sm font-bold text-white mb-3">Salvar como modelo</h4>
        <p className="text-xs text-gray-400 mb-4">
          Dê um nome para guardar essa refeição em "Minhas refeições".
        </p>
        <input
          id="save-template-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value.slice(0, 120))}
          maxLength={120}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 mb-4"
          placeholder="Ex: Marmita de sempre"
          autoFocus
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => { if (name.trim()) { onSave(name.trim()); onClose(); } }}
            disabled={!name.trim()}
            className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Salvar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ──────────────────────────────────────────────────────────────
// Card de refeição
// ──────────────────────────────────────────────────────────────

interface MealCardProps {
  meal: MealPlanEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onSave: () => void;
  hasTemplates: boolean;
  userGoal: string;
}

const MealCard: React.FC<MealCardProps> = ({
  meal,
  isExpanded,
  onToggleExpand,
  onLock,
  onUnlock,
  onSave,
  userGoal,
}) => {
  const [dynSuggestions, setDynSuggestions] = useState<string[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);
  const kcal = meal.protein_g * 4 + meal.carbs_g * 4 + meal.fat_g * 9;

  useEffect(() => {
    if (isExpanded && dynSuggestions.length === 0) {
      setLoadingSug(true);
      generateMealSuggestions(
        meal.type,
        meal.role,
        { protein: meal.protein_g, carbs: meal.carbs_g, fat: meal.fat_g, kcal },
        userGoal
      )
        .then((sugs) => {
          setDynSuggestions(sugs);
        })
        .catch(() => {
          setDynSuggestions(MEAL_SUGGESTIONS[meal.type] || []);
        })
        .finally(() => {
          setLoadingSug(false);
        });
    }
  }, [isExpanded, meal.type, meal.role, meal.protein_g, meal.carbs_g, meal.fat_g, kcal, userGoal]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'pre_treino':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase tracking-wider">Pré-treino</span>;
      case 'pos_treino':
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-wider">Pós-treino</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-400 border border-gray-700/50 font-bold uppercase tracking-wider">Normal</span>;
    }
  };

  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all ${
        meal.isFixed
          ? 'border-indigo-500/30 bg-indigo-950/20'
          : 'border-gray-700/30 bg-gray-900/30 hover:border-gray-650'
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className="w-full p-4 flex items-center justify-between text-left"
        aria-expanded={isExpanded}
      >
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-200 text-sm">{meal.type}</span>
            {getRoleBadge(meal.role)}
            {meal.isFixed && <LockBadge />}
          </div>
          <div className="flex gap-3 text-xs text-gray-500 font-medium font-mono flex-wrap">
            <MacroValue
              label="P"
              value={meal.protein_g}
              colorClass="text-blue-400"
              changed={!meal.isFixed && meal.changedMacros?.protein}
            />
            <MacroValue
              label="C"
              value={meal.carbs_g}
              colorClass="text-yellow-400"
              changed={!meal.isFixed && meal.changedMacros?.carbs}
            />
            <MacroValue
              label="G"
              value={meal.fat_g}
              colorClass="text-orange-400"
              changed={!meal.isFixed && meal.changedMacros?.fat}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-bold text-gray-400 font-mono bg-gray-800 px-2 py-1 rounded-lg">
            {kcal} kcal
          </span>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Aviso empático */}
      {meal.warning && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 leading-relaxed">
          <span aria-hidden="true">💡 </span>{meal.warning}
        </div>
      )}

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-gray-800/50 bg-gray-900/10"
          >
            <div className="px-4 pt-3 pb-4 space-y-3">
              {/* Sugestões */}
              {(loadingSug || dynSuggestions.length > 0) && (
                <div>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    Sugestões Inteligentes (Flavos IA + TACO)
                    {loadingSug && (
                      <span className="inline-block w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </p>
                  <ul className="space-y-1.5">
                    {loadingSug ? (
                      <>
                        <li className="text-xs text-gray-400 animate-pulse bg-gray-800/40 rounded h-4 w-3/4"></li>
                        <li className="text-xs text-gray-400 animate-pulse bg-gray-800/40 rounded h-4 w-2/3"></li>
                      </>
                    ) : (
                      dynSuggestions.map((sug, sIdx) => (
                        <li key={sIdx} className="text-xs text-gray-300 flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5">•</span>
                          <span>{sug}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 pt-1">
                {meal.isFixed ? (
                  <button
                    onClick={onUnlock}
                    id={`btn-unlock-${meal.type.replace(/\s/g, '-')}`}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700/50 transition-all"
                  >
                    🔓 Destravar
                  </button>
                ) : (
                  <button
                    onClick={onLock}
                    id={`btn-lock-${meal.type.replace(/\s/g, '-')}`}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-all"
                  >
                    🔒 Travar com refeição salva
                  </button>
                )}
                <button
                  onClick={onSave}
                  id={`btn-save-${meal.type.replace(/\s/g, '-')}`}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/20 transition-all"
                >
                  💾 Salvar como modelo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────────────────────

export const MealPlanPanel: React.FC<MealPlanPanelProps> = ({
  profile,
  targets,
  savedTemplates = [],
  onSaveTemplate,
}) => {
  const [hasTraining, setHasTraining] = useState<boolean>(profile.activityLevel !== 'sedentario');
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [fixedMeals, setFixedMeals] = useState<Record<string, FixedMeal>>({} as Record<string, FixedMeal>);


  // Modal de seleção de template
  const [lockingMealType, setLockingMealType] = useState<string | null>(null);
  // Modal de salvar template
  const [savingMealType, setSavingMealType] = useState<string | null>(null);

  // ── Estratégia de carbo / volume ───────────────────────────
  const carbStrategy = carbLoadStrategy(
    targets.targetCarbs_g,
    profile.weightKg,
    hasTraining ? 5 : 4,
  );

  const volStrategy = volumeStrategy(targets.targetKcal, targets.tdeeKcal, profile.goal);

  // Contagem de refeições recomendada
  const recommendedCount =
    profile.goal === 'ganhar_massa'
      ? carbStrategy.recommendedMealCount
      : volStrategy.recommendedMealCount;

  // ── Configuração das refeições ──────────────────────────────
  const getMealConfigs = (count: number): MealConfig[] => {
    const baseMeals: MealConfig[] = [
      { type: 'Café da manhã', role: 'normal' },
      { type: 'Almoço',        role: 'normal' },
      { type: 'Lanche da tarde', role: hasTraining ? 'pre_treino' : 'normal' },
      { type: 'Shake Pós-treino', role: hasTraining ? 'pos_treino' : 'normal' },
      { type: 'Jantar',        role: 'normal' },
      { type: 'Ceia',          role: 'normal' },
    ];
    const sliced = baseMeals.slice(0, Math.max(4, count));
    const configs = [...sliced];

    // Se alguma refeição está fixada, garantimos que ela seja incluída para que suas calorias
    // sejam consideradas e exibidas visualmente.
    baseMeals.forEach((bm) => {
      if (fixedMeals[bm.type] && !configs.some(c => c.type === bm.type)) {
        configs.push(bm);
      }
    });

    // Ordenar de acordo com a ordem original do dia (cronológica)
    return configs.sort((a, b) => {
      const idxA = baseMeals.findIndex(m => m.type === a.type);
      const idxB = baseMeals.findIndex(m => m.type === b.type);
      return idxA - idxB;
    });
  };

  const allMealConfigs = getMealConfigs(recommendedCount);

  // ── Plano com redistribuição ────────────────────────────────
  const { meals, recalculatedCount, redistributionError } = useMemo(() => {
    const fixedList: FixedMeal[] = Object.values(fixedMeals) as FixedMeal[];

    const freeConfigs = allMealConfigs.filter(
      mc => !fixedMeals[mc.type],
    );

    if (fixedList.length === 0) {
      // Sem travamentos: distribuição padrão
      const plan = distributeMeals(targets, allMealConfigs);
      return {
        meals: plan.map(m => ({ ...m, isFixed: false })) as MealPlanEntry[],
        recalculatedCount: 0,
        redistributionError: null,
      };
    }

    try {
      const result = redistributeAroundFixedMeals(targets, fixedList, freeConfigs);

      // Reordenar para manter a ordem original das refeições
      const ordered: MealPlanEntry[] = allMealConfigs.map(mc => {
        const found = result.meals.find(m => m.type === mc.type);
        return found ?? { type: mc.type, role: mc.role, protein_g: 0, carbs_g: 0, fat_g: 0, isFixed: false };
      });

      return {
        meals: ordered,
        recalculatedCount: result.recalculatedCount,
        redistributionError: null,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
      const fallback = distributeMeals(targets, allMealConfigs);
      return {
        meals: fallback.map(m => ({ ...m, isFixed: false })) as MealPlanEntry[],
        recalculatedCount: 0,
        redistributionError: errorMsg,
      };
    }
  }, [fixedMeals, targets, allMealConfigs]);

  // ── Handlers ────────────────────────────────────────────────
  const handleLockWithTemplate = useCallback(
    (template: SavedMealTemplate, mealType: string) => {
      const mealConfig = allMealConfigs.find(m => m.type === mealType);
      if (!mealConfig) return;

      setFixedMeals(prev => ({
        ...prev,
        [mealType]: {
          type:     mealType,
          role:     mealConfig.role,
          analysis: template.analysis_json,
        },
      }));
      setLockingMealType(null);
    },
    [allMealConfigs],
  );

  const handleUnlock = useCallback((mealType: string) => {
    setFixedMeals(prev => {
      const next = { ...prev };
      delete next[mealType];
      return next;
    });
  }, []);

  const handleSaveTemplate = useCallback(
    (mealType: string, name: string) => {
      // Em produção, aqui enviaria para o backend.
      // Por agora, salva o estado da refeição atual (macros do plano).
      // Se houver análise travada, usa ela; senão cria um stub.
      const fixedMeal = fixedMeals[mealType];
      if (fixedMeal && onSaveTemplate) {
        onSaveTemplate(
          name,
          MEAL_TYPE_MAP[mealType] ?? 'outro',
          fixedMeal.analysis,
        );
      }
      setSavingMealType(null);
    },
    [fixedMeals, onSaveTemplate],
  );

  // ── Render ──────────────────────────────────────────────────
  const fixedCount = Object.keys(fixedMeals).length;
  const strategyTip = profile.goal === 'ganhar_massa' ? carbStrategy.tip : volStrategy.tip;

  return (
    <>
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-3xl p-5 w-full flex flex-col gap-4">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              📅 Plano de Refeições
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Periodização inteligente e fracionamento</p>
          </div>

          {profile.activityLevel !== 'sedentario' && (
            <button
              id="btn-toggle-training"
              onClick={() => setHasTraining(t => !t)}
              className={`text-xs px-3 py-1 rounded-full font-bold transition-all border ${
                hasTraining
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-gray-900/30 text-gray-500 border-gray-800'
              }`}
            >
              {hasTraining ? '💪 Treino Hoje' : '🛋️ Descanso Hoje'}
            </button>
          )}
        </div>

        {/* Banner de redistribuição */}
        <AnimatePresence>
          {recalculatedCount > 0 && fixedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-2.5 px-3.5 py-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/25"
              role="status"
              aria-live="polite"
            >
              <span className="text-indigo-400 text-base mt-0.5" aria-hidden="true">ℹ️</span>
              <p className="text-xs text-indigo-300 leading-relaxed">
                {fixedCount === 1
                  ? `1 refeição travada com "Minhas refeições".`
                  : `${fixedCount} refeições travadas com "Minhas refeições".`}{' '}
                As outras <strong>{recalculatedCount} refeições</strong> foram recalculadas
                para manter sua meta de <strong>{targets.targetKcal} kcal</strong>.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Erro de redistribuição (ex: tentar travar todas) */}
        {redistributionError && (
          <div
            className="flex items-start gap-2.5 px-3.5 py-3 rounded-2xl bg-red-500/10 border border-red-500/25"
            role="alert"
          >
            <span className="text-red-400 text-base mt-0.5" aria-hidden="true">⚠️</span>
            <p className="text-xs text-red-300 leading-relaxed">{redistributionError}</p>
          </div>
        )}

        {/* Estratégia (carbo/volume) */}
        <div className="bg-gray-900/35 border border-gray-750 rounded-2xl p-4 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-xs font-semibold">
            <span className="text-gray-400">Proporção por Kg:</span>
            <span className="text-emerald-400 font-mono">
              {(targets.targetCarbs_g / profile.weightKg).toFixed(1)} g/kg de Carbo
            </span>
          </div>
          {strategyTip && (
            <p className="text-[11px] text-gray-400 leading-relaxed">{strategyTip}</p>
          )}
        </div>

        {/* Lista de refeições */}
        <div className="flex flex-col gap-2.5">
          {meals.map(meal => (
            <MealCard
              key={meal.type}
              meal={meal}
              isExpanded={expandedMeal === meal.type}
              onToggleExpand={() => setExpandedMeal(prev => prev === meal.type ? null : meal.type)}
              onLock={() => setLockingMealType(meal.type)}
              onUnlock={() => handleUnlock(meal.type)}
              onSave={() => setSavingMealType(meal.type)}
              hasTemplates={savedTemplates.length > 0}
              userGoal={profile.goal}
            />
          ))}
        </div>
      </div>

      {/* Modal: selecionar template para travar */}
      <AnimatePresence>
        {lockingMealType && (
          <SelectTemplateModal
            templates={savedTemplates}
            mealType={lockingMealType}
            onSelect={template => handleLockWithTemplate(template, lockingMealType)}
            onClose={() => setLockingMealType(null)}
          />
        )}
      </AnimatePresence>

      {/* Modal: salvar template */}
      <AnimatePresence>
        {savingMealType && (
          <SaveTemplateModal
            mealType={savingMealType}
            onSave={name => handleSaveTemplate(savingMealType, name)}
            onClose={() => setSavingMealType(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};
