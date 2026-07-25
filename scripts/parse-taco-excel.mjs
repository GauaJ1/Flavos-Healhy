import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const excelPath = path.resolve('TACO_4ed_Composicao_Alimentos.xlsx');
console.log('📦 Carregando dados nutricionais da planilha oficial TACO...');

const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets['1. Centesimal-Minerais-Vit'];
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Mapeamento dos grupos de alimentos para slugs limpos e amigáveis
function mapFoodGroup(categoryName) {
  if (!categoryName) return 'outros';
  const cat = categoryName.toString().toLowerCase();
  if (cat.includes('cereais')) return 'cereais';
  if (cat.includes('verduras')) return 'verduras_hortalicas';
  if (cat.includes('frutas')) return 'frutas';
  if (cat.includes('gorduras')) return 'gorduras_oleos';
  if (cat.includes('pescados')) return 'pescados';
  if (cat.includes('carnes')) return 'carnes';
  if (cat.includes('leite')) return 'laticinios';
  if (cat.includes('bebidas')) return 'bebidas';
  if (cat.includes('ovos')) return 'ovos';
  if (cat.includes('açucarados') || cat.includes('açúcar')) return 'doces';
  if (cat.includes('miscelâneas')) return 'miscelaneas';
  if (cat.includes('industrializados')) return 'industrializados';
  if (cat.includes('preparados')) return 'preparados';
  if (cat.includes('leguminosas')) return 'leguminosas';
  if (cat.includes('nozes')) return 'nozes_sementes';
  return 'outros';
}

function generateSlug(name) {
  return name
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function computeGlycemicIndex(carbs, fiber, name) {
  const lower = name.toString().toLowerCase();
  if (lower.includes('açúcar') || lower.includes('refrigerante') || lower.includes('mel') || lower.includes('tapioca') || lower.includes('doce')) return 85;
  if (lower.includes('pão francês') || lower.includes('batata') || lower.includes('arroz branco')) return 75;
  if (lower.includes('integral') || lower.includes('aveia') || lower.includes('maçã') || lower.includes('banana')) return 55;
  if (lower.includes('feijão') || lower.includes('lentilha') || lower.includes('grão-de-bico') || lower.includes('folha') || lower.includes('alface')) return 32;
  return Math.min(85, Math.max(25, Math.round(50 + (carbs * 0.4) - (fiber * 2.5))));
}

function computeAntiInflammatoryScore(fiber, fat, satFat, vitC, name) {
  const lower = name.toString().toLowerCase();
  let score = 5;
  if (fiber > 5) score += 2;
  if (vitC > 20) score += 1.5;
  if (lower.includes('azeite') || lower.includes('peixe') || lower.includes('salmão') || lower.includes('sardinha') || lower.includes('linhaça') || lower.includes('brócolis')) score += 2;
  if (satFat > 5 || lower.includes('frito') || lower.includes('refrigerante') || lower.includes('salsicha') || lower.includes('bacon')) score -= 3.5;
  return Math.min(10, Math.max(1, Math.round(score * 10) / 10));
}

function parseNum(val) {
  if (val === undefined || val === null || val === 'NA' || val === 'Tr' || val === '*' || val === '-') return 0;
  if (typeof val === 'number') return val;
  const parsed = parseFloat(val.toString().replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
}

const header = rows[0];
const dataRows = rows.slice(1);

const foods = [];
const slugCounts = new Map();

dataRows.forEach((row) => {
  const num = row[0];
  const category = row[1];
  const name = row[2];

  if (!num || !name) return;

  const calories = parseNum(row[4]);
  const protein = parseNum(row[6]);
  const fat = parseNum(row[7]);
  const carbohydrates = parseNum(row[9]);
  const fiber = parseNum(row[10]);
  const sodium = parseNum(row[17]);
  const calcium_mg = parseNum(row[12]);
  const magnesium_mg = parseNum(row[13]);
  const iron_mg = parseNum(row[16]);
  const potassium_mg = parseNum(row[18]);
  const zinc_mg = parseNum(row[20]);
  const vitaminC_mg = parseNum(row[28]);
  const saturatedFat = Math.round(fat * 0.2 * 10) / 10;

  const foodGroup = mapFoodGroup(category);
  const glycemicIndex = computeGlycemicIndex(carbohydrates, fiber, name);
  const antiInflammatoryScore = computeAntiInflammatoryScore(fiber, fat, saturatedFat, vitaminC_mg, name);

  let slug = generateSlug(name);
  if (slugCounts.has(slug)) {
    const count = slugCounts.get(slug) + 1;
    slugCounts.set(slug, count);
    slug = `${slug}-${count}`;
  } else {
    slugCounts.set(slug, 1);
  }

  foods.push({
    name: name.toString().toLowerCase().trim(),
    calories,
    carbohydrates,
    protein,
    fat,
    fiber,
    sugar: 0,
    addedSugar: 0,
    sodium,
    saturatedFat,
    glycemicIndex,
    antiInflammatoryScore,
    iron_mg,
    calcium_mg,
    vitaminC_mg,
    vitaminD_mcg: 0,
    magnesium_mg,
    potassium_mg,
    zinc_mg,
    vitaminB12_mcg: 0,
    foodGroup,
    slug
  });
});

console.log(`✅ Sucesso! Processados exatamente ${foods.length} alimentos da planilha oficial TACO.`);

// 1. Salvar no subprojeto SEO em packages/alimentos-seo/src/data/taco-reference.json
const tacoSeoPath = 'packages/alimentos-seo/src/data/taco-reference.json';
fs.writeFileSync(tacoSeoPath, JSON.stringify(foods, null, 2), 'utf8');
console.log(`💾 Salvo em ${tacoSeoPath} (${foods.length} itens)`);

// 2. Atualizar utils/tacoDatabase.ts do App Principal
const tacoDatabaseTsPath = 'utils/tacoDatabase.ts';
const tsContent = `/**
 * Taco/IBGE Client-side Database and Fuzzy Match.
 * Base completa de ${foods.length} alimentos extraídos da planilha oficial TACO (4ª Edição, NEPA-UNICAMP).
 *
 * Valores nutricionais por 100g de parte comestível.
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
  antiInflammatoryScore: number; // 0-10
  iron_mg: number;
  calcium_mg: number;
  vitaminC_mg: number;
  vitaminD_mcg: number;
  magnesium_mg: number;
  potassium_mg: number;
  zinc_mg: number;
  vitaminB12_mcg: number;
  foodGroup: string;
  slug?: string;
}

export const TACO_DATABASE: TacoNutrient[] = ${JSON.stringify(foods, null, 2)};
`;

fs.writeFileSync(tacoDatabaseTsPath, tsContent, 'utf8');
console.log(`💾 Salvo em ${tacoDatabaseTsPath}`);
