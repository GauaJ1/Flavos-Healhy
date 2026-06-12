/**
 * Taco/IBGE Client-side Database and Fuzzy Match.
 * Simulates pg_trgm fuzzy matching (similarity >= 0.4) and enriches meal analysis.
 *
 * Nutritional values are per 100g.
 */

export interface TacoNutrient {
  name: string;
  calories: number;
  carbohydrates: number;
  protein: number;
  fat: number;
  fiber: number;
  sugar: number;
  addedSugar: number;
  sodium: number; // mg
  saturatedFat: number;
  glycemicIndex: number; // 0-100
  antiInflammatoryScore: number; // 0-10 (10 is highly anti-inflammatory, 0 is inflammatory)
  iron_mg: number;
  calcium_mg: number;
  vitaminC_mg: number;
  vitaminD_mcg: number;
  magnesium_mg: number;
  potassium_mg: number;
  zinc_mg: number;
  vitaminB12_mcg: number;
  foodGroup: string;
}

export const TACO_DATABASE: TacoNutrient[] = [
  {
    name: 'arroz branco cozido',
    calories: 130, carbohydrates: 28, protein: 2.5, fat: 0.2, fiber: 1.6, sugar: 0, addedSugar: 0, sodium: 1, saturatedFat: 0.05,
    glycemicIndex: 73, antiInflammatoryScore: 4,
    iron_mg: 0.2, calcium_mg: 4, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 12, potassium_mg: 35, zinc_mg: 0.5, vitaminB12_mcg: 0,
    foodGroup: 'cereais'
  },
  {
    name: 'arroz integral cozido',
    calories: 124, carbohydrates: 25.8, protein: 2.6, fat: 1.0, fiber: 2.7, sugar: 0, addedSugar: 0, sodium: 1, saturatedFat: 0.2,
    glycemicIndex: 55, antiInflammatoryScore: 6,
    iron_mg: 0.4, calcium_mg: 9, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 43, potassium_mg: 79, zinc_mg: 0.7, vitaminB12_mcg: 0,
    foodGroup: 'cereais'
  },
  {
    name: 'feijao carioquinha cozido',
    calories: 76, carbohydrates: 14, protein: 4.8, fat: 0.5, fiber: 8.5, sugar: 0.2, addedSugar: 0, sodium: 2, saturatedFat: 0.1,
    glycemicIndex: 35, antiInflammatoryScore: 7,
    iron_mg: 1.3, calcium_mg: 35, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 42, potassium_mg: 250, zinc_mg: 0.7, vitaminB12_mcg: 0,
    foodGroup: 'leguminosas'
  },
  {
    name: 'feijao preto cozido',
    calories: 77, carbohydrates: 14, protein: 4.5, fat: 0.5, fiber: 8.4, sugar: 0.2, addedSugar: 0, sodium: 2, saturatedFat: 0.1,
    glycemicIndex: 30, antiInflammatoryScore: 7.5,
    iron_mg: 1.5, calcium_mg: 38, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 40, potassium_mg: 280, zinc_mg: 0.8, vitaminB12_mcg: 0,
    foodGroup: 'leguminosas'
  },
  {
    name: 'peito de frango grelhado',
    calories: 160, carbohydrates: 0, protein: 32, fat: 2.5, fiber: 0, sugar: 0, addedSugar: 0, sodium: 70, saturatedFat: 0.7,
    glycemicIndex: 0, antiInflammatoryScore: 5.5,
    iron_mg: 0.4, calcium_mg: 5, vitaminC_mg: 0, vitaminD_mcg: 0.1, magnesium_mg: 28, potassium_mg: 256, zinc_mg: 0.9, vitaminB12_mcg: 0.3,
    foodGroup: 'proteinas'
  },
  {
    name: 'file de frango grelhado',
    calories: 160, carbohydrates: 0, protein: 32, fat: 2.5, fiber: 0, sugar: 0, addedSugar: 0, sodium: 70, saturatedFat: 0.7,
    glycemicIndex: 0, antiInflammatoryScore: 5.5,
    iron_mg: 0.4, calcium_mg: 5, vitaminC_mg: 0, vitaminD_mcg: 0.1, magnesium_mg: 28, potassium_mg: 256, zinc_mg: 0.9, vitaminB12_mcg: 0.3,
    foodGroup: 'proteinas'
  },
  {
    name: 'bife de carne bovina grelhado',
    calories: 210, carbohydrates: 0, protein: 26, fat: 11, fiber: 0, sugar: 0, addedSugar: 0, sodium: 60, saturatedFat: 4.5,
    glycemicIndex: 0, antiInflammatoryScore: 4.5,
    iron_mg: 2.5, calcium_mg: 12, vitaminC_mg: 0, vitaminD_mcg: 0.1, magnesium_mg: 22, potassium_mg: 315, zinc_mg: 4.5, vitaminB12_mcg: 2.0,
    foodGroup: 'proteinas'
  },
  {
    name: 'bife de alcatra grelhado',
    calories: 200, carbohydrates: 0, protein: 28, fat: 9, fiber: 0, sugar: 0, addedSugar: 0, sodium: 60, saturatedFat: 3.5,
    glycemicIndex: 0, antiInflammatoryScore: 4.5,
    iron_mg: 2.6, calcium_mg: 10, vitaminC_mg: 0, vitaminD_mcg: 0.1, magnesium_mg: 24, potassium_mg: 330, zinc_mg: 4.7, vitaminB12_mcg: 2.2,
    foodGroup: 'proteinas'
  },
  {
    name: 'ovo frito',
    calories: 180, carbohydrates: 0.8, protein: 13, fat: 13.5, fiber: 0, sugar: 0.2, addedSugar: 0, sodium: 140, saturatedFat: 3.8,
    glycemicIndex: 0, antiInflammatoryScore: 5.0,
    iron_mg: 1.4, calcium_mg: 50, vitaminC_mg: 0, vitaminD_mcg: 1.1, magnesium_mg: 10, potassium_mg: 130, zinc_mg: 1.1, vitaminB12_mcg: 0.8,
    foodGroup: 'proteinas'
  },
  {
    name: 'ovo cozido',
    calories: 155, carbohydrates: 1.1, protein: 13, fat: 10.6, fiber: 0, sugar: 0.2, addedSugar: 0, sodium: 124, saturatedFat: 3.3,
    glycemicIndex: 0, antiInflammatoryScore: 5.5,
    iron_mg: 1.2, calcium_mg: 50, vitaminC_mg: 0, vitaminD_mcg: 1.0, magnesium_mg: 10, potassium_mg: 126, zinc_mg: 1.0, vitaminB12_mcg: 0.9,
    foodGroup: 'proteinas'
  },
  {
    name: 'pao frances',
    calories: 270, carbohydrates: 58.6, protein: 8.0, fat: 3.0, fiber: 2.3, sugar: 1.5, addedSugar: 0, sodium: 640, saturatedFat: 0.8,
    glycemicIndex: 95, antiInflammatoryScore: 3.0,
    iron_mg: 1.0, calcium_mg: 20, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 25, potassium_mg: 110, zinc_mg: 0.8, vitaminB12_mcg: 0,
    foodGroup: 'cereais'
  },
  {
    name: 'pao integral',
    calories: 240, carbohydrates: 43.0, protein: 9.4, fat: 3.7, fiber: 6.9, sugar: 3.0, addedSugar: 1.5, sodium: 450, saturatedFat: 0.7,
    glycemicIndex: 50, antiInflammatoryScore: 6.0,
    iron_mg: 1.8, calcium_mg: 80, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 75, potassium_mg: 220, zinc_mg: 1.2, vitaminB12_mcg: 0,
    foodGroup: 'cereais'
  },
  {
    name: 'tapioca',
    calories: 240, carbohydrates: 60.0, protein: 0.2, fat: 0, fiber: 0.4, sugar: 0, addedSugar: 0, sodium: 3, saturatedFat: 0,
    glycemicIndex: 85, antiInflammatoryScore: 3.5,
    iron_mg: 0.1, calcium_mg: 5, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 3, potassium_mg: 10, zinc_mg: 0.1, vitaminB12_mcg: 0,
    foodGroup: 'cereais'
  },
  {
    name: 'cuscuz de milho',
    calories: 112, carbohydrates: 25.0, protein: 2.2, fat: 0.6, fiber: 2.1, sugar: 0.5, addedSugar: 0, sodium: 2, saturatedFat: 0.1,
    glycemicIndex: 65, antiInflammatoryScore: 5.0,
    iron_mg: 0.5, calcium_mg: 3, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 18, potassium_mg: 60, zinc_mg: 0.4, vitaminB12_mcg: 0,
    foodGroup: 'cereais'
  },
  {
    name: 'aveia em flocos',
    calories: 390, carbohydrates: 67.0, protein: 14.0, fat: 7.0, fiber: 9.1, sugar: 1.0, addedSugar: 0, sodium: 2, saturatedFat: 1.3,
    glycemicIndex: 55, antiInflammatoryScore: 7.0,
    iron_mg: 4.3, calcium_mg: 52, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 177, potassium_mg: 360, zinc_mg: 3.6, vitaminB12_mcg: 0,
    foodGroup: 'cereais'
  },
  {
    name: 'granola',
    calories: 450, carbohydrates: 65.0, protein: 10.0, fat: 15.0, fiber: 8.0, sugar: 18.0, addedSugar: 12.0, sodium: 50, saturatedFat: 2.5,
    glycemicIndex: 65, antiInflammatoryScore: 5.5,
    iron_mg: 3.0, calcium_mg: 60, vitaminC_mg: 1, vitaminD_mcg: 0, magnesium_mg: 90, potassium_mg: 280, zinc_mg: 2.0, vitaminB12_mcg: 0,
    foodGroup: 'cereais'
  },
  {
    name: 'mel de abelha',
    calories: 304, carbohydrates: 82.0, protein: 0.3, fat: 0, fiber: 0.2, sugar: 81.0, addedSugar: 0, sodium: 4, saturatedFat: 0,
    glycemicIndex: 60, antiInflammatoryScore: 6.5,
    iron_mg: 0.4, calcium_mg: 6, vitaminC_mg: 0.5, vitaminD_mcg: 0, magnesium_mg: 2, potassium_mg: 52, zinc_mg: 0.1, vitaminB12_mcg: 0,
    foodGroup: 'gorduras'
  },
  {
    name: 'banana',
    calories: 90, carbohydrates: 23.0, protein: 1.1, fat: 0.3, fiber: 2.0, sugar: 12.0, addedSugar: 0, sodium: 1, saturatedFat: 0.1,
    glycemicIndex: 51, antiInflammatoryScore: 6.5,
    iron_mg: 0.3, calcium_mg: 5, vitaminC_mg: 8.7, vitaminD_mcg: 0, magnesium_mg: 27, potassium_mg: 358, zinc_mg: 0.1, vitaminB12_mcg: 0,
    foodGroup: 'frutas'
  },
  {
    name: 'maca',
    calories: 52, carbohydrates: 13.8, protein: 0.3, fat: 0.2, fiber: 2.4, sugar: 10.4, addedSugar: 0, sodium: 1, saturatedFat: 0.05,
    glycemicIndex: 36, antiInflammatoryScore: 7.0,
    iron_mg: 0.1, calcium_mg: 6, vitaminC_mg: 4.6, vitaminD_mcg: 0, magnesium_mg: 5, potassium_mg: 107, zinc_mg: 0.04, vitaminB12_mcg: 0,
    foodGroup: 'frutas'
  },
  {
    name: 'abacate',
    calories: 160, carbohydrates: 8.5, protein: 2.0, fat: 14.7, fiber: 6.7, sugar: 0.7, addedSugar: 0, sodium: 7, saturatedFat: 2.1,
    glycemicIndex: 10, antiInflammatoryScore: 8.0,
    iron_mg: 0.6, calcium_mg: 12, vitaminC_mg: 10, vitaminD_mcg: 0, magnesium_mg: 29, potassium_mg: 485, zinc_mg: 0.6, vitaminB12_mcg: 0,
    foodGroup: 'gorduras'
  },
  {
    name: 'azeite de oliva',
    calories: 884, carbohydrates: 0, protein: 0, fat: 100, fiber: 0, sugar: 0, addedSugar: 0, sodium: 2, saturatedFat: 13.8,
    glycemicIndex: 0, antiInflammatoryScore: 9.0,
    iron_mg: 0.6, calcium_mg: 1, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 0, potassium_mg: 1, zinc_mg: 0.03, vitaminB12_mcg: 0,
    foodGroup: 'gorduras'
  },
  {
    name: 'farofa',
    calories: 360, carbohydrates: 70.0, protein: 2.0, fat: 8.0, fiber: 5.5, sugar: 1.0, addedSugar: 0, sodium: 580, saturatedFat: 2.2,
    glycemicIndex: 80, antiInflammatoryScore: 3.5,
    iron_mg: 1.2, calcium_mg: 30, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 22, potassium_mg: 140, zinc_mg: 0.6, vitaminB12_mcg: 0,
    foodGroup: 'cereais'
  },
  {
    name: 'alface',
    calories: 15, carbohydrates: 2.9, protein: 1.4, fat: 0.2, fiber: 1.3, sugar: 0.8, addedSugar: 0, sodium: 28, saturatedFat: 0.03,
    glycemicIndex: 15, antiInflammatoryScore: 8.5,
    iron_mg: 0.9, calcium_mg: 36, vitaminC_mg: 9.2, vitaminD_mcg: 0, magnesium_mg: 13, potassium_mg: 194, zinc_mg: 0.2, vitaminB12_mcg: 0,
    foodGroup: 'vegetais'
  },
  {
    name: 'tomate',
    calories: 18, carbohydrates: 3.9, protein: 0.9, fat: 0.2, fiber: 1.2, sugar: 2.6, addedSugar: 0, sodium: 5, saturatedFat: 0.03,
    glycemicIndex: 15, antiInflammatoryScore: 8.0,
    iron_mg: 0.3, calcium_mg: 10, vitaminC_mg: 13.7, vitaminD_mcg: 0, magnesium_mg: 11, potassium_mg: 237, zinc_mg: 0.1, vitaminB12_mcg: 0,
    foodGroup: 'vegetais'
  },
  {
    name: 'brocolis cozido',
    calories: 35, carbohydrates: 7.2, protein: 2.4, fat: 0.4, fiber: 3.3, sugar: 1.4, addedSugar: 0, sodium: 40, saturatedFat: 0.08,
    glycemicIndex: 15, antiInflammatoryScore: 8.5,
    iron_mg: 0.7, calcium_mg: 40, vitaminC_mg: 64.9, vitaminD_mcg: 0, magnesium_mg: 21, potassium_mg: 293, zinc_mg: 0.4, vitaminB12_mcg: 0,
    foodGroup: 'vegetais'
  },
  {
    name: 'cenoura cozida',
    calories: 35, carbohydrates: 8.2, protein: 0.8, fat: 0.2, fiber: 3.0, sugar: 3.5, addedSugar: 0, sodium: 58, saturatedFat: 0.04,
    glycemicIndex: 39, antiInflammatoryScore: 7.5,
    iron_mg: 0.3, calcium_mg: 30, vitaminC_mg: 3.6, vitaminD_mcg: 0, magnesium_mg: 10, potassium_mg: 230, zinc_mg: 0.2, vitaminB12_mcg: 0,
    foodGroup: 'vegetais'
  },
  {
    name: 'batata-doce cozida',
    calories: 77, carbohydrates: 17.7, protein: 1.4, fat: 0.1, fiber: 2.2, sugar: 4.2, addedSugar: 0, sodium: 27, saturatedFat: 0.02,
    glycemicIndex: 44, antiInflammatoryScore: 7.0,
    iron_mg: 0.5, calcium_mg: 28, vitaminC_mg: 12.8, vitaminD_mcg: 0, magnesium_mg: 18, potassium_mg: 230, zinc_mg: 0.2, vitaminB12_mcg: 0,
    foodGroup: 'cereais'
  },
  {
    name: 'batata inglesa cozida',
    calories: 86, carbohydrates: 20.0, protein: 1.7, fat: 0.1, fiber: 1.6, sugar: 0.8, addedSugar: 0, sodium: 3, saturatedFat: 0.03,
    glycemicIndex: 82, antiInflammatoryScore: 4.5,
    iron_mg: 0.3, calcium_mg: 8, vitaminC_mg: 7.4, vitaminD_mcg: 0, magnesium_mg: 20, potassium_mg: 328, zinc_mg: 0.3, vitaminB12_mcg: 0,
    foodGroup: 'cereais'
  },
  {
    name: 'leite integral',
    calories: 62, carbohydrates: 4.8, protein: 3.2, fat: 3.3, fiber: 0, sugar: 4.8, addedSugar: 0, sodium: 49, saturatedFat: 1.9,
    glycemicIndex: 30, antiInflammatoryScore: 5.5,
    iron_mg: 0.05, calcium_mg: 120, vitaminC_mg: 1.0, vitaminD_mcg: 0.1, magnesium_mg: 11, potassium_mg: 140, zinc_mg: 0.4, vitaminB12_mcg: 0.4,
    foodGroup: 'laticinios'
  },
  {
    name: 'queijo mucarela',
    calories: 300, carbohydrates: 3.0, protein: 22.0, fat: 22.0, fiber: 0, sugar: 1.0, addedSugar: 0, sodium: 580, saturatedFat: 14.0,
    glycemicIndex: 27, antiInflammatoryScore: 4.0,
    iron_mg: 0.2, calcium_mg: 500, vitaminC_mg: 0, vitaminD_mcg: 0.3, magnesium_mg: 20, potassium_mg: 75, zinc_mg: 2.8, vitaminB12_mcg: 0.8,
    foodGroup: 'laticinios'
  },
  {
    name: 'iogurte natural',
    calories: 60, carbohydrates: 5.0, protein: 3.5, fat: 3.0, fiber: 0, sugar: 5.0, addedSugar: 0, sodium: 50, saturatedFat: 1.8,
    glycemicIndex: 35, antiInflammatoryScore: 6.5,
    iron_mg: 0.05, calcium_mg: 120, vitaminC_mg: 0.8, vitaminD_mcg: 0.05, magnesium_mg: 12, potassium_mg: 150, zinc_mg: 0.6, vitaminB12_mcg: 0.4,
    foodGroup: 'laticinios'
  },
  {
    name: 'castanha-do-para',
    calories: 656, carbohydrates: 12.0, protein: 14.0, fat: 66.0, fiber: 7.5, sugar: 2.3, addedSugar: 0, sodium: 3, saturatedFat: 15.0,
    glycemicIndex: 15, antiInflammatoryScore: 8.5,
    iron_mg: 2.4, calcium_mg: 160, vitaminC_mg: 0.7, vitaminD_mcg: 0, magnesium_mg: 376, potassium_mg: 597, zinc_mg: 4.1, vitaminB12_mcg: 0,
    foodGroup: 'gorduras'
  },
  {
    name: 'whey protein',
    calories: 370, carbohydrates: 8.0, protein: 80.0, fat: 3.0, fiber: 0, sugar: 4.0, addedSugar: 0, sodium: 160, saturatedFat: 1.5,
    glycemicIndex: 30, antiInflammatoryScore: 6.0,
    iron_mg: 0.5, calcium_mg: 450, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 30, potassium_mg: 350, zinc_mg: 0.5, vitaminB12_mcg: 0.5,
    foodGroup: 'laticinios'
  },
  {
    name: 'suco de laranja',
    calories: 45, carbohydrates: 10.4, protein: 0.7, fat: 0.2, fiber: 0.2, sugar: 9.0, addedSugar: 0, sodium: 1, saturatedFat: 0.02,
    glycemicIndex: 50, antiInflammatoryScore: 7.0,
    iron_mg: 0.2, calcium_mg: 11, vitaminC_mg: 50, vitaminD_mcg: 0, magnesium_mg: 11, potassium_mg: 200, zinc_mg: 0.05, vitaminB12_mcg: 0,
    foodGroup: 'frutas'
  },
  {
    name: 'refrigerante',
    calories: 40, carbohydrates: 10.5, protein: 0, fat: 0, fiber: 0, sugar: 10.5, addedSugar: 10.5, sodium: 10, saturatedFat: 0,
    glycemicIndex: 70, antiInflammatoryScore: 1.0,
    iron_mg: 0, calcium_mg: 2, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 0, potassium_mg: 2, zinc_mg: 0.01, vitaminB12_mcg: 0,
    foodGroup: 'ultra'
  },
  {
    name: 'refrigerante zero',
    calories: 0, carbohydrates: 0, protein: 0, fat: 0, fiber: 0, sugar: 0, addedSugar: 0, sodium: 10, saturatedFat: 0,
    glycemicIndex: 0, antiInflammatoryScore: 3.0,
    iron_mg: 0, calcium_mg: 2, vitaminC_mg: 0, vitaminD_mcg: 0, magnesium_mg: 0, potassium_mg: 2, zinc_mg: 0.01, vitaminB12_mcg: 0,
    foodGroup: 'ultra'
  },
  {
    name: 'presunto',
    calories: 145, carbohydrates: 1.5, protein: 16.5, fat: 8.0, fiber: 0, sugar: 1.0, addedSugar: 0.5, sodium: 1100, saturatedFat: 2.7,
    glycemicIndex: 0, antiInflammatoryScore: 2.0,
    iron_mg: 0.8, calcium_mg: 10, vitaminC_mg: 0, vitaminD_mcg: 0.1, magnesium_mg: 15, potassium_mg: 250, zinc_mg: 2.0, vitaminB12_mcg: 0.6,
    foodGroup: 'ultra'
  },
  {
    name: 'salsicha',
    calories: 290, carbohydrates: 2.5, protein: 12.0, fat: 26.0, fiber: 0, sugar: 1.0, addedSugar: 1.0, sodium: 1050, saturatedFat: 9.0,
    glycemicIndex: 0, antiInflammatoryScore: 1.5,
    iron_mg: 1.2, calcium_mg: 15, vitaminC_mg: 0, vitaminD_mcg: 0.2, magnesium_mg: 12, potassium_mg: 170, zinc_mg: 1.8, vitaminB12_mcg: 0.8,
    foodGroup: 'ultra'
  },
  {
    name: 'bacon',
    calories: 540, carbohydrates: 1.5, protein: 37.0, fat: 42.0, fiber: 0, sugar: 0.5, addedSugar: 0.5, sodium: 1500, saturatedFat: 15.0,
    glycemicIndex: 0, antiInflammatoryScore: 1.0,
    iron_mg: 1.5, calcium_mg: 18, vitaminC_mg: 0, vitaminD_mcg: 0.1, magnesium_mg: 19, potassium_mg: 400, zinc_mg: 2.5, vitaminB12_mcg: 1.2,
    foodGroup: 'ultra'
  }
];

export function trigramSimilarity(str1: string, str2: string): number {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

  const s1 = clean(str1);
  const s2 = clean(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  // Se uma string for substring exata da outra e tiver comprimento significativo
  if ((s1.includes(s2) || s2.includes(s1)) && Math.min(s1.length, s2.length) >= 4) {
    // Dá um bônus proporcional ao tamanho da menor substring
    const ratio = Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
    return Math.max(0.5, ratio);
  }

  if (s1.length < 3 || s2.length < 3) {
    return 0.0;
  }

  const getTrigrams = (s: string) => {
    const list = [];
    for (let i = 0; i < s.length - 2; i++) {
      list.push(s.slice(i, i + 3));
    }
    return new Set(list);
  };

  const t1 = getTrigrams(s1);
  const t2 = getTrigrams(s2);

  let intersection = 0;
  t1.forEach(trigram => {
    if (t2.has(trigram)) {
      intersection++;
    }
  });

  const union = t1.size + t2.size - intersection;
  return intersection / union;
}

export function findTACOMatch(foodName: string): { match: TacoNutrient; similarity: number } | null {
  let bestMatch: TacoNutrient | null = null;
  let maxSimilarity = 0;

  for (const item of TACO_DATABASE) {
    const sim = trigramSimilarity(foodName, item.name);
    if (sim > maxSimilarity) {
      maxSimilarity = sim;
      bestMatch = item;
    }
  }

  if (bestMatch && maxSimilarity >= 0.4) {
    return { match: bestMatch, similarity: maxSimilarity };
  }

  return null;
}
