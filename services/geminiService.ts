import { Type } from '@google/genai';
import type { AnalysisResult } from '../types';
import { isCompositeDish } from '../utils/tacoDatabase';
import { findEnrichmentMatch } from '../utils/food-search';
import { classifyFoodGroup } from '../hooks/useFoodDiversity';
//geminiService.ts
// ──────────────────────────────────────────────────────────────
// Proxy URL helper — toda chamada à IA vai SEMPRE pelo backend Vercel.
// A chave Gemini (API_KEY / GEMINI_API_KEY) NUNCA existe no bundle cliente.
// ──────────────────────────────────────────────────────────────
function getProxyUrl(): string {
  const isCapacitor =
    typeof window !== 'undefined' &&
    (Object.prototype.hasOwnProperty.call(window, 'Capacitor') ||
      window.location.protocol.startsWith('capacitor') ||
      window.location.protocol.startsWith('http-case'));
  const isLocalWeb =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');
  return isLocalWeb && !isCapacitor
    ? '/api/analyze'
    : 'https://healthy.flavoscompany.xyz/api/analyze';
}

// ──────────────────────────────────────────────────────────────
// Guard-rail constants for enforceConsistency
// ──────────────────────────────────────────────────────────────

/**
 * Minimum Dice similarity for TACO/IBGE enrichment to be applied.
 * Below this threshold the IA-generated macros are kept as-is.
 */
const MIN_TACO_SIMILARITY = 0.65;

/**
 * Maximum allowed relative deviation between the AI macro and the TACO/IBGE
 * macro before the enrichment is considered unreliable and discarded.
 * Formula: |ai - taco| / max(ai, 1) > MAX_MACRO_DEVIATION → skip
 */
const MAX_MACRO_DEVIATION = 0.30;

// ──────────────────────────────────────────────────────────────
// Schema JSON — Referência canônica (alinhado com SKILL.md)
// ──────────────────────────────────────────────────────────────

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    analysisMetadata: {
      type: Type.OBJECT,
      properties: {
        isRealFood: { type: Type.BOOLEAN, description: 'True se a imagem contiver comida real, refeição, bebida ou produto alimentício identificável.' },
        confidence: { type: Type.STRING, description: '"alta", "media" ou "baixa". Baseado na clareza visual e identificação dos alimentos.' },
        isMixedDish: { type: Type.BOOLEAN, description: 'True se for um prato misturado (ex: strogonoff, marmita, yakisoba).' },
        isPackagedFood: { type: Type.BOOLEAN, description: 'True se for produto embalado/industrializado com rótulo visível.' },
        uncertaintyReasons: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Lista de motivos específicos de incerteza (ex: "molho pode conter creme de leite").' },
        requiresFollowUp: { type: Type.BOOLEAN, description: 'True se: confiança baixa, prato misturado, ingredientes ocultos prováveis, ou variância calórica > 200kcal.' },
        followUpQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: 'ID único da pergunta (ex: "q1", "q2").' },
              question: { type: Type.STRING, description: 'Pergunta em português, clara e direta. Ex: "Como o frango foi preparado?"' },
              type: { type: Type.STRING, description: '"boolean" (sim/não), "fraction" (quanto comeu, 0.0–1.0) ou "choice" (múltipla escolha).' },
              calorieImpact: { type: Type.INTEGER, description: 'Calorias a adicionar se tipo for boolean e resposta for sim. Para choice e fraction, use 0.' },
              choices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING, description: 'Texto curto do botão (ex: "Frito por imersão", "Grelhado/Assado", "Com açúcar", "Sem açúcar").' },
                    calorieImpact: { type: Type.INTEGER, description: 'Calorias a adicionar/subtrair para esta opção específica.' }
                  },
                  required: ['label', 'calorieImpact']
                },
                description: 'Obrigatório APENAS se o tipo for "choice". Lista de opções customizadas para os botões.'
              }
            },
            required: ['id', 'question', 'type', 'calorieImpact']
          }
        }
      },
      required: ['isRealFood', 'confidence', 'isMixedDish', 'isPackagedFood', 'uncertaintyReasons', 'requiresFollowUp', 'followUpQuestions']
    },
    nutritionalSummary: {
      type: Type.OBJECT,
      properties: {
        baseCalories: { type: Type.INTEGER, description: 'OBRIGATÓRIO: deve ser a soma exata de todos os foods[].calories. Calcule cada alimento primeiro, depois some.' },
        maxPossibleCalories: { type: Type.INTEGER, description: 'baseCalories + calorias estimadas de ingredientes ocultos prováveis (óleo, molhos, açúcar, frituras). Sempre >= baseCalories.' },
        calorieDensity: { type: Type.STRING, description: '"baixa" (<1.0 kcal/g), "media" (1.0–2.5 kcal/g) ou "alta" (>2.5 kcal/g).' },
        satietyEstimate: { type: Type.STRING, description: '"baixa", "media" ou "alta". Baseado em fibra, proteína e volume.' },
        possiblePositiveComponents: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Aspectos positivos: ex. "rica em fibras", "boa fonte de proteína".' },
        possibleAttentionPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Pontos de atenção (sem julgamento): ex. "pode conter sódio elevado".' },
        totalFiber: { type: Type.NUMBER, description: 'Fibras totais (g) — soma de foods[].fiber.' },
        totalSugar: { type: Type.NUMBER, description: 'Açúcar total (g) — soma de foods[].sugar (natural + adicionado).' },
        totalAddedSugar: { type: Type.NUMBER, description: 'Açúcar adicionado (g) — soma de foods[].addedSugar (apenas açúcar não-natural).' },
        totalSodium: { type: Type.NUMBER, description: 'Sódio total (mg) — soma de foods[].sodium.' },
        totalSaturatedFat: { type: Type.NUMBER, description: 'Gordura saturada total (g) — soma de foods[].saturatedFat.' }
      },
      required: ['baseCalories', 'maxPossibleCalories', 'calorieDensity', 'satietyEstimate', 'possiblePositiveComponents', 'possibleAttentionPoints', 'totalFiber', 'totalSugar', 'totalAddedSugar', 'totalSodium', 'totalSaturatedFat']
    },
    foods: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'ID único do alimento (ex: "food_1", "food_2").' },
          name: { type: Type.STRING, description: 'Nome do alimento em português.' },
          calories: { type: Type.INTEGER, description: 'Calorias (kcal) deste alimento específico, calculado a partir do peso estimado e tabela TACO.' },
          estimatedAmount: { type: Type.NUMBER, description: 'Quantidade estimada na unidade especificada.' },
          unit: { type: Type.STRING, description: 'Unidade de medida (ex: "colheres de sopa", "unidade", "fatia", "gramas").' },
          estimatedWeightGrams: { type: Type.INTEGER, description: 'Peso estimado em gramas.' },
          portionDescription: { type: Type.STRING, description: 'Descrição da porção em linguagem natural (ex: "2 colheres de sopa cheias").' },
          carbohydrates: { type: Type.NUMBER, description: 'Carboidratos em gramas.' },
          protein: { type: Type.NUMBER, description: 'Proteínas em gramas.' },
          fat: { type: Type.NUMBER, description: 'Gorduras totais em gramas.' },
          fiber: { type: Type.NUMBER, description: 'Fibras em gramas.' },
          sugar: { type: Type.NUMBER, description: 'Açúcar total (natural + adicionado) em gramas.' },
          addedSugar: { type: Type.NUMBER, description: 'Açúcar adicionado em gramas (não inclui açúcar natural de frutas). Use 0 se não houver adição.' },
          sodium: { type: Type.NUMBER, description: 'Sódio em miligramas.' },
          saturatedFat: { type: Type.NUMBER, description: 'Gordura saturada em gramas.' },
          micronutrients: { type: Type.STRING, description: 'Principais micronutrientes (ex: "Ferro, Vitamina C, Potássio"). Se não houver destaques, escreva "Sem destaques".' },
          micronutrientEstimates: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: 'Nome do micronutriente (ex: "Ferro", "Cálcio", "Vitamina C", "Potássio", "Magnésio", "Vitamina A", "Vitaminas B").' },
                level: { type: Type.STRING, description: '"baixo", "moderado", "bom" ou "alto".' },
                percentage: { type: Type.INTEGER, description: 'Percentual aproximado da necessidade diária que este alimento fornece (0-100). Estimar com base em tabela TACO.' }
              },
              required: ['name', 'level', 'percentage']
            },
            description: 'Estimativas de micronutrientes relevantes para este alimento. Incluir apenas micronutrientes com presença significativa (>5% da necessidade diária).'
          },
          source: { type: Type.STRING, description: '"visible" (claramente visível), "inferred_from_context" (deduzido do contexto visual) ou "estimated_recipe_component" (ingrediente de receita).' },
          confidence: { type: Type.STRING, description: '"alta", "media" ou "baixa" para este alimento específico.' },
          preparationMethod: { type: Type.STRING, description: 'Método de preparo identificado (ex: "grelhado", "frito", "cozido", "cru", "assado", "refogado").' },
          consumedFraction: { type: Type.NUMBER, description: 'Fração consumida. Sempre 1.0 inicialmente (usuário ajusta depois).' },
          healthHighlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Destaques positivos do alimento.' },
          attentionHighlights: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Pontos de atenção (sem julgamento).' },
          processingLevel: { type: Type.STRING, description: '"in natura", "minimamente processado", "processado" ou "ultraprocessado".' },
          possibleAddedSugars: { type: Type.BOOLEAN, description: 'True apenas se houver açúcar ADICIONADO (não natural da fruta).' },
          possibleAddedFats: { type: Type.BOOLEAN, description: 'True apenas se houver gordura ADICIONADA (óleo, manteiga, fritura).' },
          possibleExcessSodium: { type: Type.BOOLEAN, description: 'True se houver risco de sódio elevado.' },
          possibleIndustrializedSauces: { type: Type.BOOLEAN, description: 'True se houver molhos industrializados visíveis ou prováveis.' }
        },
        required: ['id', 'name', 'calories', 'estimatedAmount', 'unit', 'estimatedWeightGrams', 'portionDescription', 'carbohydrates', 'protein', 'fat', 'fiber', 'sugar', 'addedSugar', 'sodium', 'saturatedFat', 'micronutrients', 'source', 'confidence', 'preparationMethod', 'consumedFraction', 'healthHighlights', 'attentionHighlights', 'processingLevel', 'possibleAddedSugars', 'possibleAddedFats', 'possibleExcessSodium', 'possibleIndustrializedSauces']
      }
    },
    hiddenIngredientsPossible: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Ingredientes não visíveis mas prováveis (ex: "óleo de preparo", "sal", "açúcar").' },
    feedback: { type: Type.STRING, description: 'Feedback empático. Começar com pontos positivos, depois atenção, depois sugestões. NUNCA usar "faz mal", "ruim", "proibido".' },
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Título curto da sugestão.' },
          details: { type: Type.STRING, description: 'Detalhes práticos e viáveis.' }
        },
        required: ['title', 'details']
      }
    }
  },
  required: ['analysisMetadata', 'nutritionalSummary', 'foods', 'hiddenIngredientsPossible', 'feedback', 'suggestions']
};

const IDR_BRASIL: Record<string, number> = {
  iron_mg: 14,
  calcium_mg: 1000,
  vitaminC_mg: 45,
  vitaminD_mcg: 5,
  magnesium_mg: 260,
  potassium_mg: 2000,
  zinc_mg: 7,
  vitaminB12_mcg: 2.4,
  fiber_g: 25,
};

// ──────────────────────────────────────────────────────────────
// Identidade e regras fixas do modelo (espelhada de api/analyze.ts)
// Passada via config.systemInstruction em analyze.ts (server-side).
// Aqui serve como referência documental e para testes locais.
// ──────────────────────────────────────────────────────────────
export const SYSTEM_INSTRUCTION = `Você é um especialista em nutrição com foco em alimentação brasileira.
Sua função é analisar imagens de refeições e retornar um JSON nutricional preciso, baseado na Tabela TACO/IBGE.
Regras fixas que NUNCA mudam:
- Responda SOMENTE com JSON válido, sem markdown, sem prefácio, sem explicações extras.
- NUNCA invente alimentos não visíveis nem deduzíveis pela imagem.
- NUNCA use "faz mal", "proibido", "comida ruim" ou faça diagnósticos médicos.
- Use SEMPRE dados da Tabela TACO como referência de macros por 100g.
- Priorize alimentos cozidos/prontos para consumo — nunca use valores de alimento cru se o alimento aparece cozido.`;

function buildPrompt(userContext?: string): string {
  // NOTA: A persona/systemInstruction é passada via config.systemInstruction no server (analyze.ts),
  // não no corpo do prompt. Aqui ficam apenas as etapas da tarefa + exemplos few-shot.
  let prompt = `## REGRAS OBRIGATÓRIAS

1. Se a imagem NÃO contiver alimento identificável, retorne isRealFood: false e zere tudo.
2. Nunca invente alimentos que não são visíveis nem deduzíveis pelo contexto visual.
3. Se houver dúvida sobre um alimento, use confidence: "baixa" e gere followUpQuestion.
4. Use SEMPRE a Tabela TACO como referência de macros (valores por 100g, depois escale pelo peso estimado).

## ETAPA 1 — IDENTIFICAÇÃO
- Identifique CADA alimento visível: prato principal, acompanhamentos, molhos, farofas, saladas, bebidas, sobremesas, produtos embalados.
- Classifique isMixedDish (prato misturado) e isPackagedFood (produto embalado).
- Liste uncertaintyReasons específicos (ex: "molho pode conter creme de leite", "não é possível ver a base do prato").

⚠️ REGRA DE DECOMPOSIÇÃO OBRIGATÓRIA:
  Se o alimento principal for um PRATO COMPOSTO ou RECHEADO — exemplos: tapioca com recheio,
  sanduíche, omelete, wrap, panqueca, crepe, pastel, vitamina com ingredientes, marmita —
  você DEVE decompô-lo em itens SEPARADOS dentro de foods[]:
    → um item para a BASE/MASSA (ex: "goma de tapioca", "pão francês", "massa de panqueca")
    → um item para CADA RECHEIO/INGREDIENTE identificado (ex: "frango desfiado", "queijo minas", "ovo").
  NUNCA crie um único item do tipo "tapioca com frango e queijo" — isso impede a análise correta.
  O nome de cada item DEVE ser o do INGREDIENTE SIMPLES (não o prato composto).
  Se o userContext descrever os ingredientes com mais precisão que a imagem, o userContext PREVALECE.

- REGRA DE FOLLOW-UP: Se confiança = "baixa", prato misturado, ingredientes ocultos prováveis, ou variância calórica > 200kcal → requiresFollowUp = true.
- REGRAS IMPORTANTES PARA PERGUNTAS (followUpQuestions):
  - NUNCA use type="boolean" para perguntas que apresentam opções (ex: "Foi preparado frito ou grelhado?"). Responder "Sim" ou "Não" para isso é um erro grave de interface.
  - Se a pergunta exigir que o usuário selecione entre opções específicas de preparo, tipos de molhos, complementos, etc., use obrigatoriamente type="choice" e defina a lista de botões personalizados no array choices[].
  - Para perguntas simples de Sim ou Não (ex: "Foi adicionado azeite extra por cima?"), use type="boolean".
  - Para medir a quantidade consumida (ex: "Você comeu todo o prato ou apenas uma parte?"), use type="fraction".
- Exemplos de boas followUpQuestions:
  - "Foi adicionado óleo ou azeite extra por cima do prato pronto?" → type="boolean", calorieImpact=120
  - "Você comeu tudo ou apenas parte do prato?" → type="fraction", calorieImpact=0
  - "Como o frango/carne foi preparado?" → type="choice", calorieImpact=0, choices=[{"label": "Grelhado, assado ou cozido", "calorieImpact": 0}, {"label": "Grelhado com azeite ou manteiga", "calorieImpact": 60}, {"label": "Frito por imersão ou empanado", "calorieImpact": 150}]
  - "Qual era a base do molho utilizado?" → type="choice", calorieImpact=0, choices=[{"label": "Tomate, vinagrete ou shoyu", "calorieImpact": 20}, {"label": "Branco, quatro queijos ou maionese", "calorieImpact": 120}, {"label": "Sem molho", "calorieImpact": 0}]
  - "A bebida continha açúcar?" → type="choice", calorieImpact=0, choices=[{"label": "Sem açúcar / Zero / Adoçante", "calorieImpact": 0}, {"label": "Com açúcar adicionado", "calorieImpact": 80}]

## ETAPA 2 — ESTIMATIVA DE PORÇÕES
Use referências visuais brasileiras para estimar o peso de cada alimento:
- Prato raso padrão ≈ 24 cm de diâmetro
- 1 colher de sopa de arroz branco ≈ 25g → 32 kcal | 7g carb | 0.5g prot | 0g fat
- 1 concha média de feijão caldo ≈ 140g → 77 kcal | 14g carb | 5g prot | 0.5g fat
- 1 concha média de feijão tropeiro ≈ 140g → 185 kcal | 18g carb | 10g prot | 8g fat
- 1 filé de frango grelhado médio ≈ 120g → 192 kcal | 0g carb | 38g prot | 4g fat
- 1 bife bovino grelhado médio ≈ 100g → 210 kcal | 0g carb | 26g prot | 11g fat
- 1 ovo frito ≈ 60g → 107 kcal | 0.4g carb | 7g prot | 8.5g fat
- 1 porção de salada verde ≈ 50g → 10 kcal
- 1 colher de sopa de farofa ≈ 25g → 90 kcal | 13g carb | 1g prot | 4g fat
- 1 colher de sopa de óleo/azeite ≈ 13ml → 117 kcal | 0g carb | 0g prot | 13g fat
- 1 fatia de pão francês ≈ 50g → 137 kcal | 28g carb | 4g prot | 1g fat
- 1 copo de suco natural ≈ 200ml → 80-120 kcal
- 1 lata de refrigerante ≈ 350ml → 140 kcal
Considere profundidade e empilhamento. Evite falsa precisão — quando houver dúvida, gere follow-up.

## EXEMPLOS FEW-SHOT DE ESTIMATIVA CORRETA (âncora TACO)
Use os valores abaixo como referência exata para calibrar suas estimativas:

Exemplo 1 — Prato de almoço típico:
- arroz branco cozido: 150g → carb 38.1g | prot 2.5g | gord 0.3g | 166kcal
- feijão carioca cozido: 140g → carb 19.6g | prot 7.0g | gord 0.7g | 108kcal
- peito de frango grelhado: 120g → carb 0g | prot 38.4g | gord 3.0g | 183kcal

Exemplo 2 — Tapioca recheada (SEMPRE decomposta em base + recheio):
- goma de tapioca: 50g → carb 30.0g | prot 0.1g | gord 0g | 121kcal
- queijo minas frescal: 30g → carb 0.5g | prot 4.9g | gord 3.5g | 52kcal

Exemplo 3 — Ovo cozido (valores TACO, não cru):
- ovo de galinha cozido: 60g → carb 0.4g | prot 8.0g | gord 5.7g | 83kcal

## ETAPA 3 — CÁLCULO POR ALIMENTO (foods[])
Para CADA alimento:
- Calcule calories, protein, carbohydrates, fat baseado no peso estimado × valores nutricionais TACO/IBGE.
- Calcule também: fiber (fibras g), sugar (açúcar total g), addedSugar (açúcar adicionado g), sodium (sódio mg), saturatedFat (gordura saturada g).
- Estime micronutrientEstimates: para cada micronutriente relevante, informe name, level e percentage (% da necessidade diária).
  - Micronutrientes a considerar: Ferro, Cálcio, Potássio, Magnésio, Vitamina C, Vitamina A, Vitaminas B.
  - Inclua apenas os que tenham >5% da necessidade diária.
- Considere método de preparo: fritura adiciona ~30% de calorias, grelha mantém, refogado adiciona ~15%.
- consumedFraction = 1.0 (padrão, o usuário ajusta depois).
- processingLevel: classificar de "in natura" a "ultraprocessado".
- Marque flags (possibleAddedSugars, possibleAddedFats, etc.) APENAS para adições industriais/artificiais.

## ETAPA 4 — TOTAIS (nutritionalSummary)
⚠️ REGRA CRÍTICA DE CONSISTÊNCIA:
- PRIMEIRO calcule as calorias de cada alimento individualmente na etapa 3.
- DEPOIS some: baseCalories = foods[0].calories + foods[1].calories + ... + foods[n].calories.
- baseCalories NÃO é uma estimativa independente — é DERIVADO da soma.
- totalFiber = soma de foods[].fiber. totalSugar = soma de foods[].sugar. totalAddedSugar = soma de foods[].addedSugar.
- totalSodium = soma de foods[].sodium. totalSaturatedFat = soma de foods[].saturatedFat.
- maxPossibleCalories = baseCalories + calorias estimadas de ingredientes ocultos.
- maxPossibleCalories DEVE ser >= baseCalories.
EXEMPLO: arroz 180 + feijão 95 + frango 165 = baseCalories: 440 ✓

## ETAPA 5 — FEEDBACK
- Tom: profissional, empático, construtivo, leve. NUNCA terrorismo nutricional.
- Estrutura: ✅ pontos positivos primeiro → ⚠️ pontos de atenção → 💡 sugestões práticas.
- EXPRESSÕES PROIBIDAS: "faz mal", "comida ruim", "proibido", "você errou", "não coma isso", "pode causar obesidade".
- EXPRESSÕES PREFERIDAS: "ponto de atenção", "pode ser ajustado", "uma melhoria simples seria", "boa fonte de energia", "pode ficar mais equilibrado com".
- NUNCA faça diagnósticos médicos.`;

  if (userContext) {
    prompt += `\n\nCONTEXTO ADICIONAL DO USUÁRIO: "${userContext}". Use para refinar porções, identificação e personalização.`;
  }

  prompt += `\n\nResponda no schema JSON definido. Lembre-se da regra mais importante: baseCalories = soma exata de foods[].calories.`;

  return prompt;
}

/**
 * Checks whether the TACO macro deviation is within the acceptable threshold.
 * Returns true when the TACO values are close enough to the AI values to be
 * applied as an enrichment without distorting the analysis.
 *
 * @param aiProtein   Protein value from the AI analysis (g)
 * @param tacoProtein Protein value from the TACO lookup (g per estimatedWeightGrams)
 * @param aiCarbs     Carbohydrates value from the AI analysis (g)
 * @param tacoCarbs   Carbohydrates from the TACO lookup (g per estimatedWeightGrams)
 */
function isTACODevAcceptable(
  aiProtein: number,
  tacoProtein: number,
  aiCarbs: number,
  tacoCarbs: number,
): boolean {
  const protDev = Math.abs(aiProtein - tacoProtein) / Math.max(aiProtein, 1);
  const carbDev = Math.abs(aiCarbs - tacoCarbs) / Math.max(aiCarbs, 1);
  // Both macros must be within MAX_MACRO_DEVIATION — if either diverges too much,
  // the TACO match is probably a false positive and must be skipped.
  return protDev <= MAX_MACRO_DEVIATION && carbDev <= MAX_MACRO_DEVIATION;
}

export async function enforceConsistency(result: AnalysisResult): Promise<AnalysisResult> {
  if (!result.foods || result.foods.length === 0) {
    return result;
  }

  let totalAntiInflammatory = 0;
  let totalWeightGrams = 0;

  const totalMicroValues = {
    iron_mg: 0,
    calcium_mg: 0,
    vitaminC_mg: 0,
    vitaminD_mcg: 0,
    magnesium_mg: 0,
    potassium_mg: 0,
    zinc_mg: 0,
    vitaminB12_mcg: 0,
    fiber_g: 0,
  };

  let i = 0;
  for (const food of result.foods) {
    i++;
    if (!food.id) food.id = `food_${i}`;
    if (food.consumedFraction === undefined || food.consumedFraction === null) {
      food.consumedFraction = 1.0;
    }

    // @ts-ignore
    food.foodGroup = food.foodGroup || classifyFoodGroup(food.name) || 'outro';

    // ─── TACO/IBGE ENRICHMENT GUARD-RAILS ─────────────────────────────────────
    // RULE 1 — Never override a composite dish name:
    //   "tapioca com frango, ovo e queijo" must NOT be matched against
    //   "tapioca" in the TACO table.
    // RULE 2 — MIN_TACO_SIMILARITY threshold (0.65):
    //   Only apply TACO/IBGE data when the fuzzy match is confident.
    // RULE 3 — MAX_MACRO_DEVIATION (30%):
    //   If the TACO/IBGE protein or carb differs >30% from the AI value, skip.
    // ──────────────────────────────────────────────────────────────────────────

    const composite = isCompositeDish(food.name);
    const matchInfo = composite
      ? null // RULE 1: composite dishes are never TACO/IBGE-overridden
      : await findEnrichmentMatch(food.name, MIN_TACO_SIMILARITY); // RULE 2 (TACO + IBGE fallback)

    let tacoApplied = false;

    if (matchInfo) {
      const match = matchInfo.match;
      food.dataSource = matchInfo.source;
      const factor = food.estimatedWeightGrams / 100;

      const tacoProtein = Math.round(match.protein * factor * 10) / 10;
      const tacoCarbs   = Math.round(match.carbohydrates * factor * 10) / 10;

      // RULE 3: Deviation guard
      if (isTACODevAcceptable(food.protein || 0, tacoProtein, food.carbohydrates || 0, tacoCarbs)) {
        // ✅ Safe to enrich — apply TACO/IBGE secondary nutrients
        food.carbohydrates = tacoCarbs;
        food.protein       = tacoProtein;
        food.fat           = Math.round(match.fat * factor * 10) / 10;
        food.fiber         = Math.round(match.fiber * factor * 10) / 10;
        food.sugar         = Math.round(match.sugar * factor * 10) / 10;
        food.addedSugar    = Math.round(match.addedSugar * factor * 10) / 10;
        food.sodium        = Math.round(match.sodium * factor);
        food.saturatedFat  = Math.round(match.saturatedFat * factor * 10) / 10;

        // @ts-ignore
        food.glycemicIndex = match.glycemicIndex || 0;
        // @ts-ignore
        food.glycemicLoad = Math.round((((match.glycemicIndex || 0) * food.carbohydrates) / 100) * 10) / 10;

        // @ts-ignore
        food.fiberDetailed = {
          total_g: food.fiber,
          soluble_g: Math.round(food.fiber * 0.35 * 10) / 10,
          insoluble_g: Math.round(food.fiber * 0.65 * 10) / 10,
        };

        const micro = {
          iron_mg:       +(match.iron_mg * factor).toFixed(2),
          calcium_mg:    +(match.calcium_mg * factor).toFixed(1),
          vitaminC_mg:   +(match.vitaminC_mg * factor).toFixed(1),
          vitaminD_mcg:  +(match.vitaminD_mcg * factor).toFixed(3),
          magnesium_mg:  +(match.magnesium_mg * factor).toFixed(1),
          potassium_mg:  +(match.potassium_mg * factor).toFixed(1),
          zinc_mg:       +(match.zinc_mg * factor).toFixed(2),
          vitaminB12_mcg:+(match.vitaminB12_mcg * factor).toFixed(2),
        };
        // @ts-ignore
        food.micronutrientsDetailed = micro;

        const estimates: any[] = [];
        Object.entries(micro).forEach(([key, val]) => {
          const idrVal = IDR_BRASIL[key];
          if (idrVal) {
            const pct = Math.round((val / idrVal) * 100);
            if (pct >= 5) {
              const nameMap: Record<string, string> = {
                iron_mg:       'Ferro',
                calcium_mg:    'Cálcio',
                vitaminC_mg:   'Vitamina C',
                vitaminD_mcg:  'Vitamina D',
                magnesium_mg:  'Magnésio',
                potassium_mg:  'Potássio',
                zinc_mg:       'Zinco',
                vitaminB12_mcg:'Vitamina B12',
              };
              const level = pct >= 30 ? 'alto' : pct >= 15 ? 'bom' : pct >= 5 ? 'moderado' : 'baixo';
              estimates.push({ name: nameMap[key] || key, level, percentage: pct });
            }
          }
        });
        food.micronutrientEstimates = estimates.sort((a, b) => b.percentage - a.percentage);

        // Fix 5: Ponderação por peso (estimatedWeightGrams)
        const itemScore = match.antiInflammatoryScore || 5.0;
        totalAntiInflammatory += itemScore * food.estimatedWeightGrams;
        totalWeightGrams += food.estimatedWeightGrams;

        totalMicroValues.iron_mg        += micro.iron_mg;
        totalMicroValues.calcium_mg     += micro.calcium_mg;
        totalMicroValues.vitaminC_mg    += micro.vitaminC_mg;
        totalMicroValues.vitaminD_mcg   += micro.vitaminD_mcg;
        totalMicroValues.magnesium_mg   += micro.magnesium_mg;
        totalMicroValues.potassium_mg   += micro.potassium_mg;
        totalMicroValues.zinc_mg        += micro.zinc_mg;
        totalMicroValues.vitaminB12_mcg += micro.vitaminB12_mcg;

        tacoApplied = true;
      } else {
        // Deviation too large — log and fall through to the "AI-only" path
        console.warn(
          `[enforceConsistency] TACO/IBGE deviation too large for "${food.name}" ` +
          `(sim=${matchInfo.similarity.toFixed(2)}, matched="${match.name}"). ` +
          'Keeping AI macros.',
        );
      }
    }

    if (!tacoApplied) {
      // ── AI-only path: normalise secondary nutrients, keep AI macros ──────────
      food.fiber        = food.fiber        ?? 0;
      food.sugar        = food.sugar        ?? 0;
      food.addedSugar   = food.addedSugar   ?? 0;
      food.sodium       = food.sodium       ?? 0;
      food.saturatedFat = food.saturatedFat ?? 0;

      // @ts-ignore
      food.glycemicIndex = food.glycemicIndex || (food.possibleAddedSugars ? 70 : 45);
      // @ts-ignore
      food.glycemicLoad = Math.round(((food.glycemicIndex * (food.carbohydrates || 0)) / 100) * 10) / 10;

      // @ts-ignore
      food.fiberDetailed = {
        total_g:     food.fiber,
        soluble_g:   Math.round(food.fiber * 0.35 * 10) / 10,
        insoluble_g: Math.round(food.fiber * 0.65 * 10) / 10,
      };

      const micro = {
        iron_mg: 0, calcium_mg: 0, vitaminC_mg: 0, vitaminD_mcg: 0,
        magnesium_mg: 0, potassium_mg: 0, zinc_mg: 0, vitaminB12_mcg: 0,
      };

      if (food.micronutrientEstimates) {
        food.micronutrientEstimates.forEach(est => {
          const n = est.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (n.includes('ferro'))       micro.iron_mg        = +(est.percentage / 100 * IDR_BRASIL.iron_mg).toFixed(2);
          if (n.includes('calcio'))      micro.calcium_mg     = +(est.percentage / 100 * IDR_BRASIL.calcium_mg).toFixed(1);
          if (n.includes('vitamina c'))  micro.vitaminC_mg    = +(est.percentage / 100 * IDR_BRASIL.vitaminC_mg).toFixed(1);
          if (n.includes('vitamina d'))  micro.vitaminD_mcg   = +(est.percentage / 100 * IDR_BRASIL.vitaminD_mcg).toFixed(3);
          if (n.includes('magnesio'))    micro.magnesium_mg   = +(est.percentage / 100 * IDR_BRASIL.magnesium_mg).toFixed(1);
          if (n.includes('potassio'))    micro.potassium_mg   = +(est.percentage / 100 * IDR_BRASIL.potassium_mg).toFixed(1);
          if (n.includes('zinco'))       micro.zinc_mg        = +(est.percentage / 100 * IDR_BRASIL.zinc_mg).toFixed(2);
          if (n.includes('vitamina b12'))micro.vitaminB12_mcg = +(est.percentage / 100 * IDR_BRASIL.vitaminB12_mcg).toFixed(2);
        });
      }
      // @ts-ignore
      food.micronutrientsDetailed = micro;

      totalMicroValues.iron_mg        += micro.iron_mg;
      totalMicroValues.calcium_mg     += micro.calcium_mg;
      totalMicroValues.vitaminC_mg    += micro.vitaminC_mg;
      totalMicroValues.vitaminD_mcg   += micro.vitaminD_mcg;
      totalMicroValues.magnesium_mg   += micro.magnesium_mg;
      totalMicroValues.potassium_mg   += micro.potassium_mg;
      totalMicroValues.zinc_mg        += micro.zinc_mg;
      totalMicroValues.vitaminB12_mcg += micro.vitaminB12_mcg;

      // Fix 5: Ponderação por peso (estimatedWeightGrams) no caminho AI-only
      const itemScore = food.processingLevel === 'ultraprocessado' ? 2
        : food.processingLevel === 'processado' ? 4 : 6;
      totalAntiInflammatory += itemScore * food.estimatedWeightGrams;
      totalWeightGrams += food.estimatedWeightGrams;
    }

    // ── Always recalculate calories from macros (do NOT trust baseCalories) ──
    const carbCal = (food.carbohydrates || 0) * 4;
    const protCal = (food.protein       || 0) * 4;
    const fatCal  = (food.fat           || 0) * 9;
    food.calories = Math.round(carbCal + protCal + fatCal);
  }

  // ── Recalculate summary from foods[] (never from AI's baseCalories) ─────────
  const calculatedCalories = result.foods.reduce((sum, food) => sum + (food.calories || 0), 0);
  result.nutritionalSummary.baseCalories = calculatedCalories;

  if (result.nutritionalSummary.maxPossibleCalories < calculatedCalories) {
    result.nutritionalSummary.maxPossibleCalories = Math.round(calculatedCalories * 1.2);
  }

  const finalFiber = Math.round(result.foods.reduce((s, f) => s + (f.fiber || 0), 0) * 10) / 10;
  result.nutritionalSummary.totalFiber = finalFiber;
  // @ts-ignore
  result.nutritionalSummary.fiberTotal_g = finalFiber;

  result.nutritionalSummary.totalSugar = Math.round(
    result.foods.reduce((s, f) => s + (f.sugar || 0), 0) * 10
  ) / 10;
  result.nutritionalSummary.totalAddedSugar = Math.round(
    result.foods.reduce((s, f) => s + (f.addedSugar || 0), 0) * 10
  ) / 10;
  result.nutritionalSummary.totalSodium = Math.round(
    result.foods.reduce((s, f) => s + (f.sodium || 0), 0)
  );
  result.nutritionalSummary.totalSaturatedFat = Math.round(
    result.foods.reduce((s, f) => s + (f.saturatedFat || 0), 0) * 10
  ) / 10;

  // Fix 5: Calcular score anti-inflamatório médio ponderado por peso
  result.nutritionalSummary.antiInflammatoryScore = totalWeightGrams > 0
    ? Math.round((totalAntiInflammatory / totalWeightGrams) * 10) / 10
    : 5.0;

  // Fase 1: Calcular percentuais de cobertura diária (% da IDR ANVISA)
  totalMicroValues.fiber_g = finalFiber;
  const dailyCoveragePercent: Record<string, number> = {};
  Object.entries(IDR_BRASIL).forEach(([key, idr]) => {
    const val = totalMicroValues[key as keyof typeof totalMicroValues] || 0;
    dailyCoveragePercent[key] = Math.round((val / idr) * 100);
  });
  result.nutritionalSummary.dailyCoveragePercent = dailyCoveragePercent;

  return result;
}

// ──────────────────────────────────────────────────────────────
// Função pública — Análise de imagem
// ──────────────────────────────────────────────────────────────

export const analyzeImage = async (base64Image: string, userContext?: string): Promise<AnalysisResult> => {
  // Sempre usa o proxy serverless — a API key nunca está no bundle do cliente.
  const proxyUrl = getProxyUrl();
  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64Image, userContext }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP no proxy: ${response.status} - ${errorText}`);
    }
    const parsed = await response.json() as AnalysisResult;
    return await enforceConsistency(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[NutritionAnalysis] Falha na análise via proxy:', message);
    throw new Error('Falha ao processar a imagem via servidor de produção. Tente novamente.');
  }
};

export const generateWeeklyReportText = async (weekStats: any): Promise<{ highlight: string; attention: string; suggestion: string }> => {
  const prompt = `Analise os padrões alimentares desta semana. Dados agregados (sem informação pessoal):
${JSON.stringify(weekStats, null, 2)}

Responda APENAS com um objeto JSON válido no seguinte formato:
{
  "highlight": "ponto mais positivo da semana (1-2 frases empáticas)",
  "attention": "principal ponto de atenção (1-2 frases, sem julgamento)",
  "suggestion": "sugestão prática e viável para a próxima semana"
}

Tom: empático, construtivo, leve. Nunca usar: "ruim", "errado", "proibido", "faz mal", "você errou", "não deveria". Começar com algo positivo.`;

  try {
    const response = await fetch(getProxyUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textPrompt: prompt }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP no proxy: ${response.status} - ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[WeeklyReport] Falha no proxy:', error);
    throw new Error('Falha ao gerar o relatório via servidor.');
  }
};

export const generateCorrelationInsightText = async (stats: any): Promise<string | null> => {
  const prompt = `Analise as correlações alimentares desta pessoa nos últimos 60 dias.
Dados agregados (sem informação pessoal):
${JSON.stringify(stats, null, 2)}

Gere UM insight curto (2-3 frases) em português, identificando a correlação mais relevante e prática entre alimentação e bem-estar.

Regras:
- Tom encorajador, baseado em dados, sem julgamento médico.
- Nunca diagnosticar condições de saúde.
- Só gerar insight se houver algum bucket com >=5 amostras. Se não houver amostras suficientes, responda apenas: null.
- Responder apenas com o texto do insight, sem prefácio, sem JSON.`;

  try {
    const response = await fetch(getProxyUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textPrompt: prompt }),
    });
    if (!response.ok) {
      throw new Error(`Erro HTTP no proxy: ${response.status}`);
    }
    const parsed = await response.json();
    const text = (typeof parsed === 'string' ? parsed : (parsed.text || parsed.insight || JSON.stringify(parsed))).trim();
    return text === 'null' ? null : text;
  } catch (error) {
    console.error('[CorrelationInsight] Falha no proxy:', error);
    return null;
  }
};

const STATIC_FALLBACK_SUGGESTIONS: Record<string, string[]> = {
  'Café da manhã': ['Pão francês com queijo minas ou ovos mexidos', 'Fruta (banana ou mamão) + café sem açúcar'],
  'Almoço': ['Arroz branco/integral (150g) + feijão carioca (100g)', 'Grelhado (frango ou carne, 120g) + salada de folhas à vontade'],
  'Lanche da tarde': ['Tapioca (50g) com queijo ou banana amassada com aveia (30g)', 'Iogurte natural ou mix de castanhas (30g)'],
  'Shake Pós-treino': ['Vitamina de leite integral/desnatado + banana + aveia + mel', 'Whey protein + tapioca com frango desfiado'],
  'Jantar': ['Arroz (120g) + feijão (100g) + filé de frango/peixe (120g)', 'Legumes cozidos no vapor (brócolis e cenoura) + azeite'],
  'Ceia': ['Abacate com limão ou mel (100g)', 'Iogurte natural com um punhado de granola'],
};

export const generateMealSuggestions = async (
  mealType: string,
  role: string,
  targets: { protein: number; carbs: number; fat: number; kcal: number },
  userGoal: string
): Promise<string[]> => {
  const cacheKey = `meal_sug_${mealType.replace(/\s/g, '_')}_${role}_${targets.protein}_${targets.carbs}_${targets.fat}_${userGoal}`;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  const prompt = `Você é um nutricionista focado em sugestões baseadas na tabela TACO e diretrizes de nutrição esportiva.
Gere exatamente 2 sugestões práticas de alimentos/refeições em português para a refeição "${mealType}" (papel: ${role}), que ajudem a atingir aproximadamente as seguintes metas:
- Calorias: ~${targets.kcal} kcal
- Proteínas: ~${targets.protein}g
- Carboidratos: ~${targets.carbs}g
- Gorduras: ~${targets.fat}g

Objetivo geral do usuário: ${userGoal.replace('_', ' ')}.

Regras das sugestões:
1. Devem ser opções realistas e comuns no Brasil (ex: pão, frango, arroz, feijão, banana, ovos, aveia).
2. Devem especificar porções ou quantidades estimadas aproximadas (ex: "150g de arroz + 100g de feijão + 120g de peito de frango grelhado").
3. NUNCA faça julgamentos morais ("bom", "ruim", "proibido", "correto").
4. Se o carboidrato for alto (> 80g para esta refeição), sugira fontes densas (aveia, tapioca, granola, banana, mel) ou opções líquidas/vitaminas se for pós-treino.
5. Se for pré/pós-treino, atente-se a menor quantidade de gorduras e fibras para acelerar a absorção de nutrientes.

Retorne APENAS um array JSON de strings com as 2 sugestões de refeições, sem qualquer outra introdução ou explicação.
Formato de resposta esperado: ["Sugestão 1...", "Sugestão 2..."]`;

  let suggestions: string[] = [];

  try {
    const response = await fetch(getProxyUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textPrompt: prompt }),
    });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        suggestions = data;
      } else if (data.text) {
        suggestions = JSON.parse(data.text);
      }
    }
  } catch (error) {
    console.error('[MealSuggestions] Falha no proxy:', error);
  }

  // Fallback se a IA falhar
  if (!suggestions || suggestions.length === 0) {
    suggestions = STATIC_FALLBACK_SUGGESTIONS[mealType] || [
      'Refeição equilibrada com fontes de proteína magra e vegetais.'
    ];
  }

  // Cache o resultado
  try {
    localStorage.setItem(cacheKey, JSON.stringify(suggestions));
  } catch {}

  return suggestions;
};

// ──────────────────────────────────────────────────────────────
// Sugestão de Ciclo de Carboidratos baseada em atividades da semana
// ──────────────────────────────────────────────────────────────

export interface AIWeeklyCycleDay {
  dayIndex: number; // 0 = Segunda, 6 = Domingo
  activity: string; // Nome da atividade extraída (ex: "Musculação (Peito/Tríceps)", "Corrida 5km", "Descanso")
  type: 'high' | 'mod' | 'low';
  reasoning: string; // Explicação resumida (até 10 palavras)
}

/**
 * Usa o Gemini para interpretar uma descrição em texto livre de toda a semana do usuário,
 * identificando as atividades corretas de Segunda a Domingo e definindo
 * o nível do ciclo de carboidratos (high/mod/low) para cada dia.
 *
 * @param rawText    O texto livre digitado pelo usuário descrevendo a semana
 * @param userGoal   Objetivo do usuário: 'perder', 'manter' ou 'ganhar'
 * @param tdeeKcal   TDEE estimado em kcal
 */
export const interpretWeeklyRoutineWithAI = async (
  rawText: string,
  userGoal: string,
  tdeeKcal: number
): Promise<AIWeeklyCycleDay[]> => {
  const goalMap: Record<string, string> = {
    perder: 'perda de gordura (déficit calórico)',
    manter: 'manutenção de peso',
    ganhar: 'ganho de massa muscular (superávit calórico)',
  };
  const goalLabel = goalMap[userGoal] || 'manutenção de peso';

  const prompt = `Você é um nutricionista esportivo especialista em periodização de carboidratos (carb cycling).

O usuário tem objetivo de ${goalLabel} e TDEE de ${tdeeKcal} kcal/dia.

Ele descreveu a rotina da semana dele da seguinte forma:
"${rawText}"

Sua tarefa é analisar esse texto e estruturar a semana de Segunda-feira (dayIndex: 0) até Domingo (dayIndex: 6). Para cada dia, você deve identificar a atividade realizada e o nível recomendado de carboidratos (high, mod ou low).

## Regras de Classificação de Carboidratos:
- **ALTO (high)**: Dias de treinos muito intensos (ex: musculação pesada, pernas, HIIT, corridas longas, esportes intensos).
- **MODERADO (mod)**: Dias de treinos moderados (ex: musculação de membros superiores menores, cardio leve, funcional intermediário) ou quando a atividade for vaga (ex: "treino", "academia").
- **BAIXO (low)**: Dias de descanso total, descanso ativo muito leve (caminhada leve, alongamento) ou sem nenhuma atividade descrita.

## Regras de Formatação das Atividades:
- Seja sucinto ao descrever a atividade (ex: "Musculação (Membros Superiores)", "Corrida 5km", "Futebol com amigos", "Descanso").
- Se o usuário não mencionar um dia específico da semana, assuma que é um dia de "Descanso" (type: "low", reasoning: "Dia não mencionado no relato do usuário").
- O reasoning deve ser uma explicação curta de até 10 palavras em português.

Retorne APENAS um JSON válido contendo a estrutura:
{
  "days": [
    { "dayIndex": 0, "activity": "Musculação (Peito/Tríceps)", "type": "high", "reasoning": "Treino intenso exige cargas de glicogênio elevadas" },
    ...
  ]
}`;

  const parseResult = (raw: string): AIWeeklyCycleDay[] => {
    const parsed = JSON.parse(raw);
    const arr = parsed.days ?? parsed;
    if (!Array.isArray(arr)) throw new Error('Formato de resposta inválido');
    return arr.map((item: any) => ({
      dayIndex: Number(item.dayIndex),
      activity: String(item.activity || 'Descanso'),
      type: ['high', 'mod', 'low'].includes(item.type) ? item.type : 'mod',
      reasoning: String(item.reasoning || ''),
    }));
  };

  try {
    const response = await fetch(getProxyUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textPrompt: prompt }),
    });
    if (!response.ok) {
      throw new Error(`Erro HTTP no proxy: ${response.status}`);
    }
    const data = await response.json();
    const rawText = typeof data === 'string' ? data : (data.text || data.result || JSON.stringify(data));
    return parseResult(rawText);
  } catch (error) {
    console.error('[interpretWeeklyRoutineWithAI] Falha no proxy:', error);
    throw new Error('Falha ao interpretar rotina via servidor.');
  }
};

