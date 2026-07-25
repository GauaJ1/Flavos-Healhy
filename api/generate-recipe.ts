import { GoogleGenAI } from '@google/genai';

// Rate limiter simples em memória (adequado para serverless edge — cada instância mantém seu
// próprio contador; para produção com múltiplas instâncias usar Vercel KV / Redis).
// Este rate limit é TÉCNICO (custo de API), nunca de monetização.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const MAX_GENERATIONS_PER_DAY = 8;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `${userId}:${today}`;

  const entry = rateLimitStore.get(key);
  if (entry) {
    if (now > entry.resetAt) {
      // Expirou — resetar
      rateLimitStore.set(key, { count: 1, resetAt: now + 86400_000 });
      return true;
    }
    if (entry.count >= MAX_GENERATIONS_PER_DAY) return false;
    entry.count++;
    return true;
  }

  // Primeira requisição do dia
  rateLimitStore.set(key, { count: 1, resetAt: now + 86400_000 });
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req: any, res: any) {
  // CORS — espelha a origem da requisição (padrão do api/analyze.ts)
  const origin = req.headers['origin'] || '';
  const allowedOrigins = [
    'https://healthy.flavoscompany.xyz',
    'capacitor://localhost',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost',
  ];
  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Identificador simples sem auth (IP ou device-id enviado pelo cliente)
  const userId = (req.headers['x-device-id'] as string) || req.socket?.remoteAddress || 'unknown';

  if (!checkRateLimit(userId)) {
    return res.status(429).json({
      error: 'Limite diário de gerações de receitas atingido. Tente novamente amanhã.'
    });
  }

  const { userIngredients, remainingCalories, remainingProtein, remainingCarbs, remainingFat } = req.body ?? {};

  // Validações de entrada
  if (!userIngredients || typeof userIngredients !== 'string') {
    return res.status(400).json({ error: "Campo 'userIngredients' é obrigatório." });
  }
  if (userIngredients.length > 500) {
    return res.status(413).json({ error: 'Lista de ingredientes muito longa. Limite: 500 caracteres.' });
  }

  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[generate-recipe] API_KEY ausente no ambiente serverless');
    return res.status(500).json({ error: 'Configuração do servidor inválida.' });
  }

  // Guard: saldo negativo — usuário já bateu a meta
  const hasNegativeBalance =
    typeof remainingCalories === 'number' && remainingCalories < 0;

  const balanceText = hasNegativeBalance
    ? 'O usuário já atingiu suas metas nutricionais principais hoje. Sugira receitas LEVES e de baixa caloria para complementar o dia sem exceder muito o planejado.'
    : `Saldo nutricional que ele precisa atingir no dia:
- Calorias alvo: ~${remainingCalories ?? 500} kcal
- Proteína alvo: ~${remainingProtein ?? 30}g
- Carboidrato alvo: ~${remainingCarbs ?? 50}g
- Gordura alvo: ~${remainingFat ?? 15}g`;

  const prompt = `Você é um chef e nutricionista brasileiro.
O usuário tem os seguintes ingredientes em casa: "${userIngredients}".
${balanceText}

Gere 2 receitas práticas e saborosas utilizando prioritariamente esses ingredientes.
Retorne APENAS um JSON válido (sem markdown) no formato:
{
  "recipes": [
    {
      "title": "Nome da Receita",
      "prepTimeMinutes": 15,
      "ingredientsUsed": ["ingrediente 1 (quantidade)", "..."],
      "missingIngredients": ["ingrediente faltante (quantidade)", "..."],
      "instructions": ["Passo 1...", "Passo 2..."],
      "estimatedCalories": 400,
      "estimatedProtein": 30,
      "estimatedCarbs": 40,
      "estimatedFat": 10
    }
  ]
}`;

  // Retry com backoff exponencial (até 3 tentativas)
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [{ text: prompt }],
        config: { responseMimeType: 'application/json' },
      });

      const rawText = response.text?.trim();
      if (!rawText) throw new Error('Resposta vazia da IA');

      const parsed = JSON.parse(rawText);
      return res.status(200).json(parsed);
    } catch (err: any) {
      if (attempt === MAX_RETRIES - 1) {
        console.error('[generate-recipe] Todas as tentativas falharam:', err.message);
        return res.status(500).json({
          error: 'Não foi possível gerar a receita agora. Tente novamente em instantes.'
        });
      }
      // Backoff exponencial: 500ms, 1s, 2s
      await sleep(Math.pow(2, attempt) * 500);
    }
  }
}
