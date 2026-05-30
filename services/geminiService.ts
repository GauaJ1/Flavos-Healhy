import { GoogleGenAI, Type } from '@google/genai';
import type { AnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
          processingLevel: { type: Type.STRING, description: '"in_natura", "minimamente_processado", "processado", "ultraprocessado" ou "indeterminado".' },
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

// ──────────────────────────────────────────────────────────────
// Prompt multimodal — Baseado na SKILL.md (Prompts Base)
// ──────────────────────────────────────────────────────────────

function buildPrompt(userContext?: string): string {
  let prompt = `Você é um especialista em nutrição com foco em alimentação brasileira.
Analise a imagem enviada e responda SOMENTE com um JSON válido, sem markdown, sem prefácio.

## REGRAS OBRIGATÓRIAS

1. Se a imagem NÃO contiver alimento identificável, retorne isRealFood: false e zere tudo.
2. Nunca invente alimentos que não são visíveis nem deduzíveis pelo contexto visual.
3. Se houver dúvida sobre um alimento, use confidence: "baixa" e gere followUpQuestion.

## ETAPA 1 — IDENTIFICAÇÃO
- Identifique CADA alimento visível: prato principal, acompanhamentos, molhos, farofas, saladas, bebidas, sobremesas, produtos embalados.
- Classifique isMixedDish (prato misturado) e isPackagedFood (produto embalado).
- Liste uncertaintyReasons específicos (ex: "molho pode conter creme de leite", "não é possível ver a base do prato").
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

## ETAPA 3 — CÁLCULO POR ALIMENTO (foods[])
Para CADA alimento:
- Calcule calories, protein, carbohydrates, fat baseado no peso estimado × valores nutricionais TACO/IBGE.
- Calcule também: fiber (fibras g), sugar (açúcar total g), addedSugar (açúcar adicionado g), sodium (sódio mg), saturatedFat (gordura saturada g).
- Estime micronutrientEstimates: para cada micronutriente relevante, informe name, level e percentage (% da necessidade diária).
  - Micronutrientes a considerar: Ferro, Cálcio, Potássio, Magnésio, Vitamina C, Vitamina A, Vitaminas B.
  - Inclua apenas os que tenham >5% da necessidade diária.
- Considere método de preparo: fritura adiciona ~30% de calorias, grelha mantém, refogado adiciona ~15%.
- consumedFraction = 1.0 (padrão, o usuário ajusta depois).
- processingLevel: classificar de "in_natura" a "ultraprocessado".
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

// ──────────────────────────────────────────────────────────────
// Pós-processamento determinístico
// (Skill: "nunca confiar no baseCalories da IA — recalcular")
// ──────────────────────────────────────────────────────────────

function enforceConsistency(result: AnalysisResult): AnalysisResult {
  if (!result.foods || result.foods.length === 0) {
    return result;
  }

  // Recalcular baseCalories como soma exata dos alimentos
  const calculatedCalories = result.foods.reduce(
    (sum, food) => sum + (food.calories || 0), 0
  );

  // Se a IA retornou baseCalories diferente, corrigir deterministicamente
  if (result.nutritionalSummary.baseCalories !== calculatedCalories) {
    console.warn(
      `[NutritionAnalysis] Inconsistência corrigida: IA retornou baseCalories=${result.nutritionalSummary.baseCalories}, ` +
      `soma real dos alimentos=${calculatedCalories}. Usando soma real.`
    );
    result.nutritionalSummary.baseCalories = calculatedCalories;
  }

  // Garantir maxPossibleCalories >= baseCalories
  if (result.nutritionalSummary.maxPossibleCalories < calculatedCalories) {
    result.nutritionalSummary.maxPossibleCalories = Math.round(calculatedCalories * 1.2);
  }

  // Recalcular totais nutricionais detalhados (determinístico)
  result.nutritionalSummary.totalFiber = Math.round(
    result.foods.reduce((s, f) => s + (f.fiber || 0), 0) * 10
  ) / 10;
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

  // Garantir IDs únicos nos alimentos
  result.foods.forEach((food, i) => {
    if (!food.id) food.id = `food_${i + 1}`;
    if (food.consumedFraction === undefined || food.consumedFraction === null) {
      food.consumedFraction = 1.0;
    }
    // Garantir defaults para novos campos
    if (food.fiber === undefined) food.fiber = 0;
    if (food.sugar === undefined) food.sugar = 0;
    if (food.addedSugar === undefined) food.addedSugar = 0;
    if (food.sodium === undefined) food.sodium = 0;
    if (food.saturatedFat === undefined) food.saturatedFat = 0;
  });

  return result;
}

// ──────────────────────────────────────────────────────────────
// Função pública — Análise de imagem
// ──────────────────────────────────────────────────────────────

export const analyzeImage = async (base64Image: string, userContext?: string): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;

  if (apiKey) {
    // -------------------------------------------------------------------------
    // Desenvolvimento Local: Chamada direta à API do Gemini usando chave do .env
    // -------------------------------------------------------------------------
    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image
      }
    };

    const promptText = buildPrompt(userContext);
    const textPart = { text: promptText };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: { parts: [imagePart, textPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });

      const jsonText = response.text?.trim();
      if (!jsonText) {
        throw new Error('Resposta vazia da IA');
      }

      const parsed = JSON.parse(jsonText) as AnalysisResult;
      return enforceConsistency(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[NutritionAnalysis] Falha na análise local:', message);
      throw new Error('Falha ao processar a imagem localmente. Tente novamente.');
    }
  } else {
    // -------------------------------------------------------------------------
    // Produção / APK Nativo: Chamada segura através do Backend Proxy na Vercel
    // -------------------------------------------------------------------------
    const isLocalWebDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // No app Capacitor no celular, window.location é http://localhost ou capacitor://localhost,
    // então precisamos apontar obrigatoriamente para a URL absoluta da produção.
    const hasCapacitor = window.hasOwnProperty('Capacitor') || window.location.protocol.startsWith('capacitor') || window.location.protocol.startsWith('http-case');
    const proxyUrl = (isLocalWebDev && !hasCapacitor)
      ? '/api/analyze'
      : 'https://healthy.flavoscompany.xyz/api/analyze';

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: base64Image,
          userContext
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro HTTP no proxy: ${response.status} - ${errorText}`);
      }

      const parsed = await response.json() as AnalysisResult;
      return enforceConsistency(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('[NutritionAnalysis] Falha na análise via proxy:', message);
      throw new Error('Falha ao processar a imagem via servidor de produção. Tente novamente.');
    }
  }
};
