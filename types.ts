export interface FoodItem {
  name: string;
  calories: number;
  quantity: string;
  carbohydrates: number;
  protein: number;
  fat: number;
  micronutrients?: string;
}

export interface AnalysisResult {
  isRealFood: boolean;
  totalCalories: number;
  foods: FoodItem[];
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