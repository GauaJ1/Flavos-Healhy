import { GoogleGenAI, Type } from '@google/genai';
//analyse.ts
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

// systemInstruction separado — contexto persistente que não consome tokens do turno de usuário
// Conforme documentação Gemini: "system instructions are passed separately from user turns"
const SYSTEM_INSTRUCTION = `Você é um especialista em nutrição com foco em alimentação brasileira.
Sua função é analisar imagens de refeições e retornar um JSON nutricional preciso, baseado na Tabela TACO/IBGE.
Regras fixas que NUNCA mudam:
- Responda SOMENTE com JSON válido, sem markdown, sem prefácio, sem explicações extras.
- NUNCA invente alimentos não visíveis nem deduzíveis pela imagem.
- NUNCA use "faz mal", "proibido", "comida ruim" ou faça diagnósticos médicos.
- Use SEMPRE dados da Tabela TACO como referência de macros por 100g.
- Priorize alimentos cozidos/prontos para consumo — nunca use valores de alimento cru se o alimento aparece cozido.`;

function buildPrompt(userContext?: string): string {
  // O system instruction fica fora do prompt do usuário (passa via config.systemInstruction)
  // Aqui ficam apenas as etapas da tarefa + exemplos few-shot
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

## EXEMPLOS FEW-SHOT DE ESTIMATIVA CORRETA
Use estes exemplos como âncora para calibrar suas estimativas:

Exemplo 1 — Prato de almoço típico (arroz + feijão + frango):
[
  {"name":"arroz branco cozido","estimatedWeightGrams":150,"carbohydrates":38.1,"protein":2.5,"fat":0.3,"calories":166},
  {"name":"feijão carioca cozido","estimatedWeightGrams":140,"carbohydrates":19.6,"protein":7.0,"fat":0.7,"calories":108},
  {"name":"peito de frango grelhado","estimatedWeightGrams":120,"carbohydrates":0.0,"protein":38.4,"fat":3.0,"calories":183}
]

Exemplo 2 — Tapioca recheada (SEMPRE decomposta em base + recheio):
[
  {"name":"goma de tapioca","estimatedWeightGrams":50,"carbohydrates":30.0,"protein":0.1,"fat":0.0,"calories":121},
  {"name":"queijo minas frescal","estimatedWeightGrams":30,"carbohydrates":0.5,"protein":4.9,"fat":3.5,"calories":52}
]

Exemplo 3 — Ovo (valores TACO para ovo cozido, não cru):
[
  {"name":"ovo de galinha cozido","estimatedWeightGrams":60,"carbohydrates":0.4,"protein":8.0,"fat":5.7,"calories":83}
]

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
  const MAX_CONTEXT_CHARS = 4000;
  const MAX_TEXT_PROMPT_CHARS = 8000;

  if (imageBase64 && typeof imageBase64 !== 'string') {
    return res.status(422).json({ error: 'imageBase64 deve ser uma string' });
  }
  if (imageBase64 && imageBase64.length > MAX_IMAGE_B64_CHARS) {
    return res.status(413).json({ error: 'Imagem muito grande. Limite: 2 MB.' });
  }
  if (userContext && (typeof userContext !== 'string' || userContext.length > MAX_CONTEXT_CHARS)) {
    return res.status(422).json({ error: 'Contexto do usuário muito longo. Limite: 4.000 caracteres.' });
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
      // Para prompts de texto (relatório, sugestões): modelo leve é suficiente e mais barato
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: [{ text: textPrompt }],
        config: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        }
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
      // Para análise de imagem: gemini-3.5-flash (geração 3, melhor visão, mais preciso)
      // systemInstruction é passado fora do contents — reduz tokens por turno e melhora consistência
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageBase64
                }
              },
              { text: buildPrompt(userContext) }
            ]
          }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.2,
          maxOutputTokens: 8192,   // Previne truncamento em refeições com muitos alimentos
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
