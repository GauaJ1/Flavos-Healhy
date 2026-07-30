export interface FollowUpChoice {
  label: string;
  calorieImpact: number;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  type: 'boolean' | 'fraction' | 'choice';
  calorieImpact: number;
  choices?: FollowUpChoice[];
}

export interface AnalysisMetadata {
  isRealFood: boolean;
  confidence: 'alta' | 'media' | 'baixa';
  isMixedDish: boolean;
  isPackagedFood: boolean;
  uncertaintyReasons: string[];
  requiresFollowUp: boolean;
  followUpQuestions: FollowUpQuestion[];
}

export interface NutritionalSummary {
  baseCalories: number;
  maxPossibleCalories: number;
  adjustedCalories?: number | null;
  calorieDensity: 'baixa' | 'media' | 'alta';
  satietyEstimate: 'baixa' | 'media' | 'alta';
  possiblePositiveComponents: string[];
  possibleAttentionPoints: string[];
  // Novos campos — Painel Nutricional Detalhado
  totalFiber: number;
  totalSugar: number;
  totalAddedSugar: number;
  totalSodium: number;
  totalSaturatedFat: number;
  // Fase 1:
  antiInflammatoryScore?: number;
  fiberTotal_g?: number;
  dailyCoveragePercent?: Record<string, number>;
}

export interface MicronutrientEstimate {
  name: string;
  level: 'baixo' | 'moderado' | 'bom' | 'alto';
  percentage: number; // 0-100, % da necessidade diária aproximada
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  estimatedAmount: number;
  unit: string;
  estimatedWeightGrams: number;
  portionDescription: string;
  carbohydrates: number;
  protein: number;
  fat: number;
  // Novos campos — Painel Nutricional Detalhado
  fiber: number;
  sugar: number;
  addedSugar: number;
  sodium: number;
  saturatedFat: number;
  micronutrients?: string;
  micronutrientEstimates?: MicronutrientEstimate[];
  source: 'visible' | 'inferred_from_context' | 'estimated_recipe_component';
  confidence: 'alta' | 'media' | 'baixa';
  preparationMethod: string;
  consumedFraction: number;
  healthHighlights: string[];
  attentionHighlights: string[];
  processingLevel: 'in natura' | 'minimamente processado' | 'processado' | 'ultraprocessado';
  possibleAddedSugars: boolean;
  possibleAddedFats: boolean;
  possibleExcessSodium: boolean;
  possibleIndustrializedSauces: boolean;
  // Fase 1:
  glycemicIndex?: number;
  glycemicLoad?: number;
  fiberDetailed?: {
    total_g: number;
    soluble_g: number;
    insoluble_g: number;
  };
  micronutrientsDetailed?: {
    iron_mg?: number;
    calcium_mg?: number;
    vitaminC_mg?: number;
    vitaminD_mcg?: number;
    magnesium_mg?: number;
    potassium_mg?: number;
    zinc_mg?: number;
    vitaminB12_mcg?: number;
  };
  // Fase 3:
  foodGroup?: string;
  dataSource?: 'TACO' | 'IBGE-POF';
}

// ────────────────────────────────────────────────────────
// Flavos Nutrition Score
// ────────────────────────────────────────────────────────

export type NutritionGrade = 'excelente' | 'boa' | 'moderada' | 'precisa_melhorar';

export interface NutritionScoreBreakdown {
  proteinScore: number;       // 0-20
  fiberScore: number;         // 0-20
  sugarPenalty: number;       // 0-20 (subtrai)
  sodiumPenalty: number;      // 0-15 (subtrai)
  macroBalance: number;       // 0-15
  processingScore: number;    // 0-15
  varietyBonus: number;       // 0-15
}

export interface NutritionScore {
  total: number;              // 0-100
  grade: NutritionGrade;
  breakdown: NutritionScoreBreakdown;
  explanation: string;        // Explicação em linguagem simples
}

// ────────────────────────────────────────────────────────
// Classificação de Qualidade Alimentar
// ────────────────────────────────────────────────────────

export interface ProcessingBreakdown {
  inNatura: number;
  minimamenteProcessado: number;
  processado: number;
  ultraprocessado: number;
}

// ────────────────────────────────────────────────────────
// Ajuste de Porções
// ────────────────────────────────────────────────────────

export type PortionSize = 'pequeno' | 'medio' | 'grande';

export interface PortionPreset {
  label: string;
  multiplier: number;
}

export const PORTION_PRESETS: Record<PortionSize, PortionPreset> = {
  pequeno: { label: 'Pequeno', multiplier: 0.6 },
  medio: { label: 'Médio', multiplier: 1.0 },
  grande: { label: 'Grande', multiplier: 1.4 },
};

export const HOUSEHOLD_MEASURES = [
  { label: 'Colher de sopa', grams: 25 },
  { label: 'Concha', grams: 140 },
  { label: 'Copo (200ml)', grams: 200 },
  { label: 'Fatia', grams: 30 },
  { label: 'Unidade', grams: 0 },
] as const;

export interface AnalysisResult {
  analysisMetadata?: AnalysisMetadata;
  nutritionalSummary?: NutritionalSummary;
  foods: FoodItem[];
  hiddenIngredientsPossible?: string[];
  feedback?: string;
  advice?: string;
  totalCalories?: number;
  harmonyScore?: number;
  inflammatoryClassification?: string;
  suggestions?: {
    title: string;
    details: string;
  }[];
}

export interface HistoryEntry {
  id: number;
  date: string;
  totalCalories: number;
  foods: FoodItem[];
  nutritionScore?: NutritionScore;
}

export interface SavedProduct {
  id: string;
  barcode?: string;              // ausente se cadastro manual
  name: string;
  brand?: string;
  imageUrl?: string;
  // SEMPRE por 100g — base canônica para qualquer cálculo de quantidade
  nutritionPer100g: {
    calories: number;
    carbohydrates: number;
    protein: number;
    fat: number;
    fiber: number;
    sugar: number;
    addedSugar: number;
    sodium: number;
    saturatedFat: number;
  };
  packageNetWeightGrams?: number;  // "pacote de 400g" — permite "comi o pacote todo"
  unitWeightGrams?: number;        // peso de 1 unidade/porção, se conhecido
  unitLabel?: string;              // "barra", "fatia", "unidade"
  processingLevel: FoodItem['processingLevel'];
  ingredientsText?: string;
  allergens?: string[];
  nutriScoreGrade?: string;
  source: 'barcode' | 'manual';
  createdAt: string;
  lastUsedAt?: string;
  useCount: number;
}

