export interface FollowUpQuestion {
  id: string;
  question: string;
  type: 'boolean' | 'fraction';
  calorieImpact: number;
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
  micronutrients?: string;
  source: 'visible' | 'inferred_from_context' | 'estimated_recipe_component';
  confidence: 'alta' | 'media' | 'baixa';
  preparationMethod: string;
  consumedFraction: number;
  healthHighlights: string[];
  attentionHighlights: string[];
  processingLevel: 'in_natura' | 'minimamente_processado' | 'processado' | 'ultraprocessado' | 'indeterminado';
  possibleAddedSugars: boolean;
  possibleAddedFats: boolean;
  possibleExcessSodium: boolean;
  possibleIndustrializedSauces: boolean;
}

export interface AnalysisResult {
  analysisMetadata: AnalysisMetadata;
  nutritionalSummary: NutritionalSummary;
  foods: FoodItem[];
  hiddenIngredientsPossible: string[];
  feedback: string;
  suggestions: {
    title: string;
    details: string;
  }[];
}

export interface HistoryEntry {
  id: number;
  date: string;
  totalCalories: number;
  foods: FoodItem[];
}
