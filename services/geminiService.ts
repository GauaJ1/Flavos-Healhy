import { GoogleGenAI, Type } from '@google/genai';
import type { AnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    analysisMetadata: {
      type: Type.OBJECT,
      properties: {
        isRealFood: { type: Type.BOOLEAN, description: 'True se for foto real de comida/produto.' },
        confidence: { type: Type.STRING, description: '"alta", "media" ou "baixa".' },
        isMixedDish: { type: Type.BOOLEAN },
        isPackagedFood: { type: Type.BOOLEAN },
        uncertaintyReasons: { type: Type.ARRAY, items: { type: Type.STRING } },
        requiresFollowUp: { type: Type.BOOLEAN, description: 'True se a confiança for baixa, prato misturado, ou variância calórica > 200kcal.' },
        followUpQuestions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question: { type: Type.STRING },
              type: { type: Type.STRING, description: '"boolean" ou "fraction"' },
              calorieImpact: { type: Type.INTEGER, description: 'Calorias a adicionar se a resposta for sim (ex: 90 para óleo)' }
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
        baseCalories: { type: Type.INTEGER, description: 'Calorias apenas dos itens 100% visíveis e crus/cozidos sem adição de gordura invisível.' },
        maxPossibleCalories: { type: Type.INTEGER, description: 'baseCalories + pior cenário dos ingredientes ocultos (ex: +óleo, +açúcar).' },
        calorieDensity: { type: Type.STRING, description: '"baixa", "media" ou "alta"' },
        satietyEstimate: { type: Type.STRING, description: '"baixa", "media" ou "alta"' },
        possiblePositiveComponents: { type: Type.ARRAY, items: { type: Type.STRING } },
        possibleAttentionPoints: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ['baseCalories', 'maxPossibleCalories', 'calorieDensity', 'satietyEstimate', 'possiblePositiveComponents', 'possibleAttentionPoints']
    },
    foods: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          calories: { type: Type.INTEGER },
          estimatedAmount: { type: Type.NUMBER },
          unit: { type: Type.STRING },
          estimatedWeightGrams: { type: Type.INTEGER },
          portionDescription: { type: Type.STRING },
          carbohydrates: { type: Type.NUMBER },
          protein: { type: Type.NUMBER },
          fat: { type: Type.NUMBER },
          micronutrients: { type: Type.STRING },
          source: { type: Type.STRING, description: '"visible", "inferred_from_context" ou "estimated_recipe_component"' },
          confidence: { type: Type.STRING },
          preparationMethod: { type: Type.STRING },
          consumedFraction: { type: Type.NUMBER, description: 'Sempre 1.0 inicialmente' },
          healthHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
          attentionHighlights: { type: Type.ARRAY, items: { type: Type.STRING } },
          processingLevel: { type: Type.STRING },
          possibleAddedSugars: { type: Type.BOOLEAN },
          possibleAddedFats: { type: Type.BOOLEAN },
          possibleExcessSodium: { type: Type.BOOLEAN },
          possibleIndustrializedSauces: { type: Type.BOOLEAN }
        },
        required: ['id', 'name', 'calories', 'estimatedAmount', 'unit', 'estimatedWeightGrams', 'portionDescription', 'carbohydrates', 'protein', 'fat', 'micronutrients', 'source', 'confidence', 'preparationMethod', 'consumedFraction', 'healthHighlights', 'attentionHighlights', 'processingLevel', 'possibleAddedSugars', 'possibleAddedFats', 'possibleExcessSodium', 'possibleIndustrializedSauces']
      }
    },
    hiddenIngredientsPossible: { type: Type.ARRAY, items: { type: Type.STRING } },
    feedback: { type: Type.STRING },
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { title: { type: Type.STRING }, details: { type: Type.STRING } },
        required: ['title', 'details']
      }
    }
  },
  required: ['analysisMetadata', 'nutritionalSummary', 'foods', 'hiddenIngredientsPossible', 'feedback', 'suggestions']
};

export const analyzeImage = async (base64Image: string, userContext?: string): Promise<AnalysisResult> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image
    }
  };

  let promptText = `Você é um arquiteto de produto nutricional e especialista em visão computacional.
    
    SUA PRIMEIRA E MAIS IMPORTANTE TAREFA É A VALIDAÇÃO DA IMAGEM.
    Se não for comida real ou produto alimentício, defina analysisMetadata.isRealFood = false e zere as calorias.

    Se for comida real, siga esta pipeline rigorosa:
    
    1. FASE DE INFERÊNCIA E INCERTEZA (analysisMetadata):
       - Defina se é prato misturado (isMixedDish) ou produto embalado (isPackagedFood).
       - Liste os motivos de incerteza (uncertaintyReasons).
       - REGRA DE REFINAMENTO: Se a confiança for 'baixa', for um prato misturado, ou a variância calórica for > 200kcal, defina requiresFollowUp = true.
       - Se requiresFollowUp = true, crie followUpQuestions (ex: "Foi adicionado óleo no preparo?" com calorieImpact = 90, ou "Quanto você comeu?" com type="fraction" e calorieImpact = 0).

    2. FASE DE CÁLCULO CALÓRICO (nutritionalSummary):
       - baseCalories: Apenas itens 100% visíveis e crus/cozidos SEM adição de gordura invisível. Seja conservador.
       - maxPossibleCalories: baseCalories + pior cenário dos ingredientes ocultos (ex: +1 colher de óleo, +queijo no molho).
       - Liste componentes positivos e pontos de atenção gerais.

    3. ESTRUTURAÇÃO DOS ALIMENTOS (foods):
       - Para cada alimento, defina id, nome, quantidade, macros.
       - Defina a origem (source): 'visible', 'inferred_from_context', 'estimated_recipe_component'.
       - SEPARE O NATURAL DO ADICIONADO: Marque as flags 'possibleAddedSugars', 'possibleAddedFats', etc., como true APENAS se forem adicionados/industriais.
       - Destaque micronutrientes. Se não houver, escreva "Sem destaques".

    4. FEEDBACK E SUGESTÕES:
       - Use tom profissional, amigável e transparente. NUNCA use "faz mal" ou "ruim".
       - Sugira adições fáceis para melhorar o prato atual.`;

  if (userContext) {
    promptText += `\n\nCONTEXTO ADICIONAL FORNECIDO PELO USUÁRIO: "${userContext}". Use para refinar a análise.`;
  }

  promptText += `\nResponda estritamente no formato JSON solicitado.`;

  const textPart = { text: promptText };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as AnalysisResult;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Falha ao processar a imagem. Tente novamente.");
  }
};
