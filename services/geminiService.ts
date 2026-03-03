import { GoogleGenAI, Type } from '@google/genai';
import type { AnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: "AIzaSyDMBJYne3II26OKIZrGimogMbzPyYDEjls"});

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    isRealFood: {
      type: Type.BOOLEAN,
      description: 'Defina como true se a imagem for uma fotografia real de comida, refeição ou PRODUTO ALIMENTÍCIO (embalagens, caixas, latas, garrafas). Defina como false para desenhos, telas de computador, pessoas ou objetos não comestíveis.'
    },
    totalCalories: {
      type: Type.INTEGER,
      description: 'O total de calorias. Se isRealFood for false, deve ser 0.'
    },
    foods: {
      type: Type.ARRAY,
      description: 'Lista de alimentos identificados. Se isRealFood for false, envie uma lista vazia.',
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: 'O nome específico do alimento ou produto (ex: Leite Integral, Biscoito Recheado).'
          },
          calories: {
            type: Type.INTEGER,
            description: 'A contagem de calorias estimada.'
          },
          quantity: {
            type: Type.STRING,
            description: 'A quantidade estimada (ex: 100g, 1 caixa, 1 copo, 200ml).'
          },
          carbohydrates: {
            type: Type.NUMBER,
            description: 'Carboidratos em gramas.'
          },
          protein: {
            type: Type.NUMBER,
            description: 'Proteína em gramas.'
          },
          fat: {
            type: Type.NUMBER,
            description: 'Gordura em gramas.'
          },
          micronutrients: {
            type: Type.STRING,
            description: 'Micronutrientes e minerais notáveis (ex: Ferro, Cálcio, Vitamina C, Fibras). Se não houver destaque, deixe vazio.'
          }
        },
        required: ['name', 'calories', 'quantity', 'carbohydrates', 'protein', 'fat']
      }
    },
    feedback: {
        type: Type.STRING,
        description: 'Se isRealFood for false, explique polidamente que o app só analisa fotos reais de alimentos ou produtos alimentícios. Se for true, dê o feedback nutricional.'
    },
    suggestions: {
        type: Type.ARRAY,
        description: 'Sugestões práticas de saúde ou consumo. Se isRealFood for false, envie uma lista vazia.',
        items: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                details: { type: Type.STRING }
            },
            required: ['title', 'details']
        }
    }
  },
  required: ['isRealFood', 'totalCalories', 'foods', 'feedback', 'suggestions']
};

export const analyzeImage = async (base64Image: string, userContext?: string): Promise<AnalysisResult> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image
    }
  };

  let promptText = `Você é um nutricionista rigoroso e um especialista em visão computacional.
    
    SUA PRIMEIRA E MAIS IMPORTANTE TAREFA É A VALIDAÇÃO DA IMAGEM.

    CRITÉRIOS DE REJEIÇÃO (isRealFood = false):
    1. Desenhos, ilustrações, cartoons, animes ou arte digital.
    2. Imagens de telas (fotos de monitores, TVs ou celulares exibindo comida).
    3. Objetos que NÃO são comida nem produtos alimentícios (carros, pessoas, paisagens, eletrônicos, móveis, animais vivos).
    4. Imagens excessivamente borradas onde nada é distinguível.
    
    CRITÉRIOS DE ACEITE (isRealFood = true):
    1. Fotografias reais de refeições prontas (pratos, lanches).
    2. Fotografias reais de PRODUTOS ALIMENTÍCIOS e EMBALAGENS (ex: caixas de leite, latas de achocolatado (Nescau, Toddy), pacotes de biscoito, sacos de salgadinho, garrafas de suco/refrigerante).
    3. Fotografias reais de ingredientes crus (frutas, legumes, carnes, ovos).

    Se a imagem for rejeitada:
    - Defina 'isRealFood' como false.
    - Defina 'totalCalories' como 0.
    - Deixe a lista 'foods' vazia.
    - No 'feedback', explique que o Flavos Healthy analisa apenas alimentos reais ou produtos alimentícios (inclusive embalagens).

    Se a imagem for aceita (Comida ou Produto):
    - Identifique o alimento com a MAIOR PRECISÃO POSSÍVEL.
    - Estime as quantidades de forma EXTREMAMENTE PRECISA (ex: 150g, 2 colheres de sopa cheias, 1 unidade média de 120g).
    - Estime as calorias e macronutrientes com base nessas quantidades exatas.
    - Identifique micronutrientes importantes presentes no alimento (ex: Ferro no feijão, Vitamina C na laranja, Cálcio no leite) e preencha o campo 'micronutrients'.
    - Nas 'suggestions' (Dicas do Chef), seja REALISTA e PRÁTICO. Baseie-se no prato ATUAL. NÃO peça para o usuário trocar o que ele já está comendo (ex: não peça para trocar arroz branco por integral se ele já está comendo o branco). Em vez disso, sugira ADIÇÕES FÁCEIS e ACESSÍVEIS que a maioria das pessoas tem em casa (ex: adicionar uma folha de alface, um ovo cozido, um fio de azeite, sementes, tomate) para melhorar o valor nutricional da refeição que já está ali.`;

  if (userContext) {
    promptText += `\n\nCONTEXTO ADICIONAL FORNECIDO PELO USUÁRIO: "${userContext}". 
    Use esta informação para ajudar a identificar ingredientes que podem não estar visíveis ou clarificar o que é o prato. 
    No entanto, se a descrição do usuário contradizer completamente a imagem visual (ex: usuário diz que é salada, mas a foto é de um hambúrguer), confie na imagem e mencione a discrepância no feedback.`;
  }

  promptText += `\nResponda estritamente no formato JSON solicitado.`;

  const textPart = {
    text: promptText
  };

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
    const result = JSON.parse(jsonText) as AnalysisResult;
    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Falha ao processar a imagem. Tente novamente.");
  }
};