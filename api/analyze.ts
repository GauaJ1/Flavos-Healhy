import { GoogleGenAI, Type } from '@google/genai';

// Definição do schema idêntico ao do frontend para validação/garantia
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

function buildPrompt(userContext?: string): string {
  let prompt = `Você é uma IA especialista em nutrição clínica e análise de refeições brasileiras.
Sua tarefa é analisar a imagem de uma refeição fornecida e extrair os dados nutricionais detalhados em português do Brasil.

Siga rigorosamente as diretrizes abaixo:

## ETAPA 1 — IDENTIFICAÇÃO E PESAGEM DOS ALIMENTOS (Tabela TACO como referência)
- Identifique cada alimento ou bebida visível na imagem.
- Estime o peso de cada item em gramas. Use sua base de dados clínica baseada na Tabela TACO (Tabela Brasileira de Composição de Alimentos) para alimentos típicos do Brasil (ex: arroz, feijão carioquinha, bife de alcatra, filé de frango grelhado, ovo cozido/frito, cuscuz paulista/nordestino, tapioca, farofa).
- Descreva a porção em linguagem natural e estimativa de medida caseira (ex: "1 concha média cheia", "2 colheres de sopa cheias", "1 fatia fina").

## ETAPA 2 — CÁLCULO DE MACRONUTRIENTES E CALORIAS
- Calcule as proteínas, carboidratos e gorduras de cada item com precisão científica baseando-se no peso estimado.
- Calcule as calorias individuais usando os fatores de Atwater (4 kcal/g para carboidratos e proteínas, 9 kcal/g para gorduras).
- Regra de Ouro: A soma das calorias de todos os itens do array 'foods' deve ser EXATAMENTE igual a 'baseCalories' no resumo nutricional.

## ETAPA 3 — ANÁLISE DE FIBRAS, AÇÚCARES E SÓDIO
- Estime as fibras (g), açúcar total (g), açúcar adicionado (g), sódio (mg) e gordura saturada (g) para cada item de forma realista.
- Açúcar Adicionado: identifique se há açúcar de mesa, xaropes ou mel adicionados. Frutas possuem açúcar natural, então seu açúcar adicionado deve ser 0.
- Sódio: preste atenção especial a itens industrializados, embutidos ou molhos.

## ETAPA 4 — SEGMENTAÇÃO E PREPARO DE FOLLOW-UP
- Se o prato for misturado (ex: estrogonoff, feijoada, mexido) onde ingredientes podem estar ocultos ou o método de preparo (óleo usado, fritura vs. grelhado) cause variação calórica superior a 200 kcal:
  - Defina 'requiresFollowUp' como true.
  - Gere perguntas estruturadas em 'followUpQuestions' com até 3 perguntas relevantes sobre preparo ou ingredientes invisíveis.
  - Defina 'calorieImpact' se a resposta for Sim (para perguntas booleanas).
- Calcule a densidade calórica:
  - Baixa: < 1.0 kcal/g
  - Média: 1.0 - 2.5 kcal/g
  - Alta: > 2.5 kcal/g

## ETAPA 5 — FEEDBACK
- Tom: profissional, empático, construtivo, leve. NUNCA terrorismo nutricional.
- Estrutura: pontos positivos primeiro (verdes) -> pontos de atenção -> sugestões práticas.`;

  if (userContext) {
    prompt += `\n\nCONTEXTO ADICIONAL DO USUÁRIO: "${userContext}". Use para refinar porções e detalhes.`;
  }

  prompt += `\n\nResponda no schema JSON definido. Lembre-se da regra mais importante: baseCalories = soma exata de foods[].calories.`;
  return prompt;
}

export default async function handler(req: any, res: any) {
  // ── CORS com allowlist explícita ───────────────────────────────────────
  // NUNCA usar `origin` refletido — isso equivale a Allow-Origin: * com credenciais.
  // Adicione aqui os domínios autorizados a chamar este proxy.
  const ALLOWED_ORIGINS = [
    'https://healthy.flavoscompany.xyz',    // Produção web
    'capacitor://localhost',                // APK Android (Capacitor — protocolo nativo)
    'https://localhost',                    // APK Android (Capacitor — WebView com androidScheme: https)
    'http://localhost',                     // APK Android (Capacitor — WebView com androidScheme: http)
    'http://localhost:5173',               // Desenvolvimento local (Vite)
    'http://localhost:4173',               // Vite preview
  ];

  const requestOrigin = req.headers.origin || '';
  const isAllowed = ALLOWED_ORIGINS.includes(requestOrigin);

  // Só seta o header se a origem for permitida
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // Origem não autorizada: responde sem o header de CORS
    // (o browser vai bloquear a requisição)
    if (req.method === 'OPTIONS') {
      return res.status(403).end();
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Accept, Content-Type, Content-Length'
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { imageBase64, userContext, textPrompt } = req.body;

  if (!imageBase64 && !textPrompt) {
    return res.status(400).json({ error: 'Imagem base64 ou prompt de texto é obrigatório' });
  }

  // ── Validação de tamanho de payload (anti-DoS) ─────────────────────────
  // imageBase64: imagem 1280px JPEG ~0.75 qual ≈ ~500 KB → base64 ≈ 680 KB
  // Limite generoso de 2 MB para absorver variações de qualidade
  const MAX_IMAGE_B64_CHARS = 2 * 1024 * 1024; // 2 MB em caracteres base64
  const MAX_CONTEXT_CHARS = 500;
  const MAX_TEXT_PROMPT_CHARS = 8000;

  if (imageBase64 && typeof imageBase64 !== 'string') {
    return res.status(422).json({ error: 'imageBase64 deve ser uma string' });
  }
  if (imageBase64 && imageBase64.length > MAX_IMAGE_B64_CHARS) {
    return res.status(413).json({ error: 'Imagem muito grande. Limite: 2 MB.' });
  }
  if (userContext && (typeof userContext !== 'string' || userContext.length > MAX_CONTEXT_CHARS)) {
    return res.status(422).json({ error: 'Contexto do usuário muito longo. Limite: 500 caracteres.' });
  }
  if (textPrompt && typeof textPrompt !== 'string') {
    return res.status(422).json({ error: 'textPrompt deve ser uma string' });
  }
  if (textPrompt && textPrompt.length > MAX_TEXT_PROMPT_CHARS) {
    return res.status(413).json({ error: 'Prompt de texto muito longo. Limite: 8.000 caracteres.' });
  }

  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('API_KEY não configurada no servidor Vercel/Render');
    return res.status(500).json({ error: 'Configuração do servidor inválida (API Key ausente)' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    if (textPrompt) {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [{ text: textPrompt }]
      });
      const textVal = response.text?.trim();
      if (!textVal) {
        throw new Error('Resposta vazia da IA');
      }
      try {
        const parsed = JSON.parse(textVal);
        return res.status(200).json(parsed);
      } catch {
        return res.status(200).json({ text: textVal });
      }
    } else {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: imageBase64
            }
          },
          { text: buildPrompt(userContext) }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema
        }
      });

      const jsonText = response.text?.trim();
      if (!jsonText) {
        throw new Error('Resposta vazia da IA');
      }

      const parsed = JSON.parse(jsonText);
      return res.status(200).json(parsed);
    }
  } catch (error: any) {
    console.error('Erro no proxy de IA:', error);
    return res.status(500).json({ error: error.message || 'Erro interno ao processar a requisição' });
  }
}
