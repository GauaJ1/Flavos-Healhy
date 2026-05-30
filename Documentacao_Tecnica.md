# Documentação Técnica — App de Saúde e Nutrição

> Versão 1.0 — Documento vivo. Atualizar a cada nova fase entregue.

---

## Índice

1. [Visão geral do produto](#1-visão-geral-do-produto)
2. [Princípios inegociáveis](#2-princípios-inegociáveis)
3. [Arquitetura de dados](#3-arquitetura-de-dados)
4. [Fases de implementação](#4-fases-de-implementação)
5. [Fase 0 — Fundação](#fase-0--fundação)
6. [Fase 1 — Profundidade nutricional](#fase-1--profundidade-nutricional)
7. [Fase 2 — Metas e progresso](#fase-2--metas-e-progresso)
8. [Fase 3 — Padrões e hábitos](#fase-3--padrões-e-hábitos)
9. [Fase 4 — Correlações de bem-estar](#fase-4--correlações-de-bem-estar)
10. [Segurança e LGPD](#10-segurança-e-lgpd)
11. [Regras de qualidade](#11-regras-de-qualidade)
12. [Checklist de entrega por fase](#12-checklist-de-entrega-por-fase)

---

## 1. Visão geral do produto

Um aplicativo mobile de saúde e nutrição centrado em análise nutricional por imagem. O usuário fotografa uma refeição e recebe, em segundos, estimativa de calorias, macronutrientes, identificação dos alimentos e feedback empático — sem julgamento, sem terrorismo nutricional.

### Pilares do produto

| Pilar | Descrição |
|---|---|
| Análise visual | Identificação de alimentos por foto com estimativa calórica |
| Diário alimentar | Registro histórico de todas as refeições |
| Profundidade nutricional | Micronutrientes, fibras, índice glicêmico, score anti-inflamatório |
| Metas e progresso | TMB/TDEE personalizado, streaks, conquistas, comparativos |
| Padrões e hábitos | Diversidade alimentar, janela alimentar, relatório semanal por IA |
| Correlações de bem-estar | Humor, energia e sono correlacionados com alimentação |

### Stack recomendada

- **Frontend/Mobile:** React Native (Expo) ou Flutter
- **Backend:** Node.js (TypeScript) com Fastify ou Express
- **Banco de dados:** PostgreSQL + Redis (cache)
- **IA:** Claude API (análise visual multimodal)
- **Autenticação:** Supabase Auth ou Auth.js
- **Notificações push:** Expo Notifications ou Firebase Cloud Messaging

---

## 2. Princípios inegociáveis

Estes princípios se aplicam a toda decisão técnica e de produto. Nunca negociá-los.

### Técnicos

1. **`baseCalories` = soma exata de `foods[].calories`** — sempre. O backend recalcula e nunca confia no valor retornado pela IA.
2. **Nunca inventar alimentos** — se não há evidência visual ou contextual, `isRealFood: false`.
3. **JSON válido antes de persistir** — validar schema Zod no backend antes de qualquer `INSERT`.
4. **Sem PII em logs** — nenhum campo pessoal (email, nome, base64 de imagem) em qualquer log de sistema.
5. **Estimativas, não certezas** — sempre expor `confidence` e faixas de incerteza ao usuário.

### De produto

1. **Tom empático** — nunca usar expressões de julgamento alimentar.
2. **Limites médicos respeitados** — orientação educacional apenas; jamais diagnóstico ou prescrição.
3. **Tudo opcional** — nenhuma feature de check-in ou acompanhamento deve bloquear o uso principal do app.
4. **Privacidade por design** — minimizar coleta, maximizar transparência.

---

## 3. Arquitetura de dados

### 3.1 Tabelas principais

```sql
-- Perfil do usuário
CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            TEXT UNIQUE NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  -- Perfil físico (para cálculo de TMB/TDEE)
  birth_date       DATE,
  sex              CHAR(1) CHECK (sex IN ('M','F','O')),
  height_cm        SMALLINT,
  weight_kg        NUMERIC(5,2),
  activity_level   TEXT CHECK (activity_level IN (
                     'sedentario','leve','moderado','intenso','muito_intenso'
                   )),
  goal             TEXT CHECK (goal IN ('perder_peso','manter','ganhar_massa')),
  -- Metas calculadas (atualizar quando o perfil mudar)
  tmb_kcal         SMALLINT,
  tdee_kcal        SMALLINT,
  target_kcal      SMALLINT,
  target_protein_g SMALLINT,
  target_carbs_g   SMALLINT,
  target_fat_g     SMALLINT
);

-- Registros de refeição
CREATE TABLE meal_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  meal_type       TEXT CHECK (meal_type IN ('cafe','lanche_manha','almoco','lanche_tarde','jantar','ceia','outro')),
  -- Dados da análise
  analysis_json   JSONB NOT NULL,        -- JSON completo retornado pela IA (após validação)
  base_calories   SMALLINT NOT NULL,     -- recalculado pelo backend
  max_calories    SMALLINT,
  confidence      TEXT CHECK (confidence IN ('alta','media','baixa')),
  -- Imagem (apenas referência; não armazenar base64)
  image_url       TEXT,
  image_hash      TEXT,                  -- SHA256 para deduplicação
  -- Metadados
  version         SMALLINT DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Índices críticos
CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, logged_at DESC);
CREATE INDEX idx_meal_logs_calories  ON meal_logs(user_id, base_calories);

-- Registro de peso
CREATE TABLE weight_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight_kg   NUMERIC(5,2) NOT NULL,
  logged_at   TIMESTAMPTZ DEFAULT now()
);

-- Hidratação
CREATE TABLE hydration_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_ml   SMALLINT NOT NULL,
  logged_at   TIMESTAMPTZ DEFAULT now()
);

-- Streaks e conquistas
CREATE TABLE streaks (
  user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  consistency  SMALLINT DEFAULT 0,  -- dias consecutivos com ≥2 refeições
  calorie_goal SMALLINT DEFAULT 0,  -- dias consecutivos dentro da meta ±15%
  diversity    SMALLINT DEFAULT 0,  -- semanas com score de diversidade ≥60
  best_consistency  SMALLINT DEFAULT 0,
  best_calorie_goal SMALLINT DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE achievements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement  TEXT NOT NULL,       -- ex: 'first_log', 'streak_7', 'diversity_80'
  unlocked_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement)
);

-- Tabela TACO (importar ~600 registros)
CREATE TABLE taco_nutrients (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  name_normalized  TEXT NOT NULL,  -- lowercase, sem acento, para fuzzy match
  calories_kcal    NUMERIC(7,2),
  protein_g        NUMERIC(7,2),
  carbs_g          NUMERIC(7,2),
  fat_g            NUMERIC(7,2),
  fiber_g          NUMERIC(7,2),
  iron_mg          NUMERIC(7,3),
  calcium_mg       NUMERIC(7,2),
  vitamin_c_mg     NUMERIC(7,2),
  vitamin_d_mcg    NUMERIC(7,3),
  magnesium_mg     NUMERIC(7,2),
  potassium_mg     NUMERIC(7,2),
  zinc_mg          NUMERIC(7,3),
  sodium_mg        NUMERIC(7,2),
  per_100g         BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_taco_name ON taco_nutrients USING gin(name_normalized gin_trgm_ops);
```

### 3.2 Tabelas das fases 3 e 4

```sql
-- Fase 3: padrões e hábitos
CREATE TABLE weekly_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  stats_json   JSONB NOT NULL,   -- stats agregados que foram enviados à IA
  report_json  JSONB NOT NULL,   -- { highlight, attention, suggestion }
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);

-- Fase 4: correlações de bem-estar
CREATE TABLE wellbeing_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  meal_id     UUID REFERENCES meal_logs(id) ON DELETE SET NULL,
  logged_at   TIMESTAMPTZ DEFAULT now(),
  energy      SMALLINT CHECK (energy BETWEEN 1 AND 5),
  mood        SMALLINT CHECK (mood BETWEEN 1 AND 5),
  sleep       SMALLINT CHECK (sleep BETWEEN 1 AND 5),  -- sono da noite anterior
  notes       TEXT
);

CREATE INDEX idx_wellbeing_user ON wellbeing_logs(user_id, logged_at DESC);
```

---

## 4. Fases de implementação

| Fase | Nome | Duração estimada | Dependências |
|---|---|---|---|
| 0 | Fundação | 2 semanas | — |
| 1 | Profundidade nutricional | 2 semanas | Fase 0 |
| 2 | Metas e progresso | 2 semanas | Fase 0 |
| 3 | Padrões e hábitos | 2 semanas | Fase 0 + Fase 1 + Fase 2 |
| 4 | Correlações de bem-estar | 2 semanas | Fase 0 + 14 dias de dados |

> Fases 1 e 2 podem correr em paralelo com times diferentes.

---

## Fase 0 — Fundação

### Objetivo
Ter o fluxo completo de análise nutricional por foto funcionando do zero ao fim: upload → análise IA → validação → persistência → exibição.

### Entregáveis

#### Backend

**`POST /meals/analyze`**
```typescript
// Request
{ image: string }  // base64, max 5MB

// Validações de entrada
// 1. MIME type: image/jpeg ou image/png apenas
// 2. Tamanho máximo: 5MB
// 3. Não logar o base64

// Fluxo
async function analyzeMeal(base64: string): Promise<AnalysisResult> {
  // 1. Validar imagem
  // 2. Enviar para Claude API com o prompt base
  // 3. Extrair JSON da resposta (handle erros de parse)
  // 4. Validar schema com Zod
  // 5. RECALCULAR baseCalories = SUM(foods[].calories)
  // 6. Retornar resultado validado
}
```

**`POST /meals`** — Persiste a refeição após confirmação do usuário

**`GET /meals`** — Lista refeições do usuário (paginado, filtro por data)

**`GET /meals/:id`** — Detalhe de uma refeição

#### Schema Zod (Fase 0)

```typescript
const FoodItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  calories: z.number().nonnegative(),
  estimatedAmount: z.number().nonnegative(),
  unit: z.string(),
  estimatedWeightGrams: z.number().nonnegative(),
  portionDescription: z.string(),
  carbohydrates: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  micronutrients: z.string().optional(),
  source: z.enum(['visible','inferred_from_context','estimated_recipe_component']),
  confidence: z.enum(['alta','media','baixa']),
  preparationMethod: z.string(),
  consumedFraction: z.number().min(0).max(1).default(1.0),
  healthHighlights: z.array(z.string()),
  attentionHighlights: z.array(z.string()),
  processingLevel: z.enum([
    'in natura','minimamente processado','processado','ultraprocessado'
  ]),
  possibleAddedSugars: z.boolean(),
  possibleAddedFats: z.boolean(),
  possibleExcessSodium: z.boolean(),
  possibleIndustrializedSauces: z.boolean(),
})

const AnalysisMealSchema = z.object({
  analysisMetadata: z.object({
    isRealFood: z.boolean(),
    confidence: z.enum(['alta','media','baixa']),
    isMixedDish: z.boolean(),
    isPackagedFood: z.boolean(),
    uncertaintyReasons: z.array(z.string()),
    requiresFollowUp: z.boolean(),
    followUpQuestions: z.array(z.object({
      id: z.string(),
      question: z.string(),
      type: z.enum(['boolean','fraction','multiple_choice','text']),
      estimatedCalorieImpact: z.number().optional(),
    })),
  }),
  nutritionalSummary: z.object({
    baseCalories: z.number().nonnegative(),
    maxPossibleCalories: z.number().nonnegative(),
    calorieDensity: z.enum(['baixa','media','alta']),
    satietyEstimate: z.enum(['baixa','media','alta']),
    possiblePositiveComponents: z.array(z.string()),
    possibleAttentionPoints: z.array(z.string()),
  }),
  foods: z.array(FoodItemSchema),
  hiddenIngredientsPossible: z.array(z.string()),
  feedback: z.string(),
  suggestions: z.array(z.object({
    title: z.string(),
    details: z.string(),
  })),
})
```

#### Frontend

- Tela de câmera / upload de foto
- Tela de resultado da análise (cards de alimentos, totais, feedback)
- Fluxo de follow-up questions (bottom sheet)
- Ajuste de fração consumida
- Confirmação e salvamento
- Histórico de refeições (lista + filtro por data)
- Estados: loading, erro, vazio, sucesso

---

## Fase 1 — Profundidade nutricional

### Objetivo
Ir além de calorias e macros: micronutrientes, índice glicêmico, fibras e score anti-inflamatório.

### Alterações no schema

```typescript
// Adicionar a FoodItemSchema:
glycemicIndex: z.number().min(0).max(100).optional(),
glycemicLoad: z.number().nonnegative().optional(),
fiber: z.object({
  total_g: z.number().nonnegative(),
  soluble_g: z.number().nonnegative(),
  insoluble_g: z.number().nonnegative(),
}).optional(),
micronutrientsDetailed: z.object({
  iron_mg: z.number().nonnegative().optional(),
  calcium_mg: z.number().nonnegative().optional(),
  vitaminC_mg: z.number().nonnegative().optional(),
  vitaminD_mcg: z.number().nonnegative().optional(),
  magnesium_mg: z.number().nonnegative().optional(),
  potassium_mg: z.number().nonnegative().optional(),
  zinc_mg: z.number().nonnegative().optional(),
  vitaminB12_mcg: z.number().nonnegative().optional(),
}).optional(),

// Adicionar a nutritionalSummary:
antiInflammatoryScore: z.number().min(0).max(10).optional(),
fiberTotal_g: z.number().nonnegative().optional(),
dailyCoveragePercent: z.record(z.number()).optional(),
```

### Lógica backend — enriquecimento TACO

```typescript
// Após validar o JSON da IA, enriquecer com dados TACO
async function enrichWithTACO(foods: FoodItem[]): Promise<FoodItem[]> {
  return Promise.all(foods.map(async (food) => {
    const match = await findTACOMatch(food.name)  // fuzzy match pg_trgm
    if (!match || match.similarity < 0.6) return food

    const factor = food.estimatedWeightGrams / 100
    return {
      ...food,
      micronutrientsDetailed: {
        iron_mg:      +(match.iron_mg * factor).toFixed(2),
        calcium_mg:   +(match.calcium_mg * factor).toFixed(1),
        vitaminC_mg:  +(match.vitamin_c_mg * factor).toFixed(1),
        vitaminD_mcg: +(match.vitamin_d_mcg * factor).toFixed(3),
        magnesium_mg: +(match.magnesium_mg * factor).toFixed(1),
        potassium_mg: +(match.potassium_mg * factor).toFixed(1),
        zinc_mg:      +(match.zinc_mg * factor).toFixed(2),
      },
      fiber: {
        total_g: +(match.fiber_g * factor).toFixed(1),
        // TACO não separa solúvel/insolúvel — estimar 35/65%
        soluble_g:   +(match.fiber_g * factor * 0.35).toFixed(1),
        insoluble_g: +(match.fiber_g * factor * 0.65).toFixed(1),
      }
    }
  }))
}
```

### IDR brasileira (ANVISA RDC 269/2005) para `dailyCoveragePercent`

```typescript
const IDR_BRASIL = {
  iron_mg: 14,       calcium_mg: 1000,
  vitaminC_mg: 45,   vitaminD_mcg: 5,
  magnesium_mg: 260, potassium_mg: 2000,
  zinc_mg: 7,        vitaminB12_mcg: 2.4,
  fiber_g: 25,
}

function calcDailyCoverage(totals: MicronutrientTotals): Record<string, number> {
  return Object.fromEntries(
    Object.entries(IDR_BRASIL).map(([key, idr]) => [
      key,
      Math.round(((totals[key] ?? 0) / idr) * 100)
    ])
  )
}
```

### Frontend

- Seção "Nutrientes detalhados" expansível na tela de análise
- Gráfico radar (6 eixos: ferro, cálcio, vit. C, vit. D, magnésio, zinco) vs meta diária
- Badge de índice glicêmico: verde (≤55) / amarelo (56–69) / vermelho (≥70)
- Barra de fibras (total, solúvel, insolúvel) com meta de 25g/dia
- Score anti-inflamatório: ícone de chama (vermelho) a folha (verde)

---

## Fase 2 — Metas e progresso

### Objetivo
Personalizar a experiência com metas baseadas no perfil do usuário, streaks de consistência e comparativos históricos.

### TMB / TDEE (Mifflin-St Jeor)

```typescript
// Fórmulas
// TMB homem = 10×peso + 6.25×altura − 5×idade + 5
// TMB mulher = 10×peso + 6.25×altura − 5×idade − 161

const ACTIVITY_FACTOR: Record<string, number> = {
  sedentario:    1.2,
  leve:          1.375,
  moderado:      1.55,
  intenso:       1.725,
  muito_intenso: 1.9,
}

const GOAL_DELTA: Record<string, number> = {
  perder_peso:  -300,
  manter:        0,
  ganhar_massa: +300,
}

function calcProfile(user: UserProfile): NutritionalTargets {
  const age = differenceInYears(new Date(), user.birthDate)
  const base = 10*user.weightKg + 6.25*user.heightCm - 5*age
  const tmb = user.sex === 'M' ? base + 5 : base - 161
  const tdee = Math.round(tmb * ACTIVITY_FACTOR[user.activityLevel])
  const targetKcal = tdee + GOAL_DELTA[user.goal]

  // Macros: 30% proteína, 45% carbs, 25% gordura (ajustável)
  return {
    tmbKcal: Math.round(tmb),
    tdeeKcal: tdee,
    targetKcal,
    targetProtein_g: Math.round((targetKcal * 0.30) / 4),
    targetCarbs_g:   Math.round((targetKcal * 0.45) / 4),
    targetFat_g:     Math.round((targetKcal * 0.25) / 9),
  }
}
```

### Sistema de streaks

```typescript
// Rodar diariamente via cron (00:05 horário local do usuário)
async function updateStreaks(userId: string): Promise<void> {
  const yesterday = subDays(new Date(), 1)

  // 1. Streak de consistência: ≥2 refeições registradas ontem?
  const mealsYesterday = await countMeals(userId, yesterday)
  if (mealsYesterday >= 2) {
    await incrementStreak(userId, 'consistency')
  } else {
    await resetStreak(userId, 'consistency')
  }

  // 2. Streak de meta calórica: calorias totais dentro de ±15% da meta?
  const caloriesYesterday = await sumCalories(userId, yesterday)
  const target = await getUserTargetKcal(userId)
  const inRange = Math.abs(caloriesYesterday - target) / target <= 0.15
  if (inRange) {
    await incrementStreak(userId, 'calorie_goal')
  } else {
    await resetStreak(userId, 'calorie_goal')
  }

  // 3. Verificar conquistas desbloqueadas
  await checkAchievements(userId)
}
```

### Conquistas

```typescript
const ACHIEVEMENTS_DEF = [
  { id: 'first_log',    title: 'Primeira refeição',    threshold: () => true },
  { id: 'streak_7',     title: '7 dias seguidos',      threshold: (s) => s.consistency >= 7 },
  { id: 'streak_30',    title: 'Mês consistente',      threshold: (s) => s.consistency >= 30 },
  { id: 'goal_week',    title: 'Meta semanal batida',  threshold: (s) => s.calorie_goal >= 7 },
  { id: 'diversity_80', title: 'Prato colorido',       threshold: (_, ds) => ds >= 80 },
  { id: 'iron_week',    title: 'Semana rica em ferro', threshold: (_, __, micro) => micro.avgIron >= 14 },
]
```

### Frontend

- Tela de onboarding: coletar perfil físico (peso, altura, idade, sexo, atividade, objetivo)
- Card de resumo diário com: calorias consumidas vs meta, barra de macros
- Tela de progresso: gráfico de peso (linha) + linha de tendência
- Gráfico semanal de calorias com linha de meta
- Seção de streaks com ícone de chama animado
- Galeria de conquistas (desbloqueadas + bloqueadas com progresso)

---

## Fase 3 — Padrões e hábitos

### Objetivo
Mostrar ao usuário padrões ao longo do tempo: diversidade alimentar, janela de alimentação e relatório semanal gerado por IA.

### Score de diversidade alimentar

```typescript
const FOOD_GROUPS: Record<string, string[]> = {
  cereais:    ['arroz','macarrão','pão','aveia','tapioca','cuscuz','batata'],
  proteinas:  ['frango','carne','peixe','ovo','atum','salmão','sardinha'],
  leguminosas:['feijão','lentilha','grão-de-bico','soja','ervilha'],
  vegetais:   ['alface','tomate','brócolis','cenoura','couve','espinafre','chuchu'],
  frutas:     ['banana','maçã','laranja','manga','morango','melancia','mamão'],
  laticinios: ['queijo','iogurte','leite','requeijão','whey'],
  gorduras:   ['azeite','abacate','castanha','amendoim','semente'],
  ultra:      ['refrigerante','salgadinho','biscoito_recheado','nugget','macarrão_instant']
}

const QUALITY_WEIGHT: Record<string, number> = {
  'in natura': 1.0,
  'minimamente processado': 0.85,
  'processado': 0.5,
  'ultraprocessado': 0.15,
}

function classifyFoodGroup(name: string): string | null {
  const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  for (const [group, keywords] of Object.entries(FOOD_GROUPS)) {
    if (keywords.some(kw => normalized.includes(kw))) return group
  }
  return null
}

function weeklyDiversityScore(weekMeals: Meal[]): number {
  const allFoods = weekMeals.flatMap(m => m.analysis.foods)
  const groupsSeen = new Set<string>()
  let totalQuality = 0
  let count = 0

  allFoods.forEach(food => {
    const group = classifyFoodGroup(food.name)
    if (group) groupsSeen.add(group)
    totalQuality += QUALITY_WEIGHT[food.processingLevel] ?? 0.5
    count++
  })

  const groupScore = groupsSeen.size / Object.keys(FOOD_GROUPS).length  // 0–1
  const qualityScore = count > 0 ? totalQuality / count : 0.5           // 0–1
  // Penalizar ultraprocessados: reduzir qualityScore se % ultra > 30%
  const ultraCount = allFoods.filter(f => f.processingLevel === 'ultraprocessado').length
  const ultraPenalty = Math.max(0, (ultraCount / Math.max(count,1)) - 0.3) * 0.5

  return Math.round(Math.min(100, (groupScore * 0.6 + qualityScore * 0.4 - ultraPenalty) * 100))
}
```

### Análise de janela alimentar

```typescript
interface DailyPattern {
  date: string
  firstMealAt: Date
  lastMealAt: Date
  windowHours: number
  lateNightEating: boolean  // última refeição após 21h
  mealCount: number
  avgGapBetweenMeals: number  // em horas
}

function analyzeDailyPattern(meals: Meal[]): DailyPattern {
  const sorted = [...meals].sort((a,b) =>
    new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  )
  const first = new Date(sorted[0].loggedAt)
  const last  = new Date(sorted[sorted.length-1].loggedAt)
  const windowHours = (last.getTime() - first.getTime()) / 3_600_000

  return {
    date: first.toDateString(),
    firstMealAt: first,
    lastMealAt: last,
    windowHours: +windowHours.toFixed(1),
    lateNightEating: last.getHours() >= 21,
    mealCount: meals.length,
    avgGapBetweenMeals: +(windowHours / Math.max(meals.length - 1, 1)).toFixed(1),
  }
}
```

### Relatório semanal (cron toda segunda-feira)

```typescript
async function generateWeeklyReport(userId: string): Promise<WeeklyReport> {
  const stats = await aggregateWeekStats(userId)

  // NUNCA enviar dados individuais para a IA — apenas agregados
  const prompt = `
Analise os padrões alimentares desta semana. Dados agregados:
${JSON.stringify(stats, null, 2)}

Responda APENAS com JSON válido (sem markdown):
{
  "highlight": "string — ponto mais positivo da semana (1-2 frases)",
  "attention": "string — principal ponto de atenção (1-2 frases, sem julgamento)",
  "suggestion": "string — sugestão prática e viável para a próxima semana"
}

Tom: empático, construtivo, sem terrorismo nutricional.
Nunca usar: 'ruim', 'errado', 'proibido', 'faz mal', 'você errou'.
  `.trim()

  const response = await callClaudeAPI(prompt)
  const report = JSON.parse(response)  // validar schema antes de persistir

  await saveWeeklyReport(userId, stats, report)
  return report
}

// Stats que serão enviados (sem PII)
interface WeekStats {
  avgCalories: number
  avgProtein_g: number
  avgCarbs_g: number
  avgFat_g: number
  diversityScore: number
  ultraProcessedMeals: number   // contagem, não lista
  avgEatingWindowHours: number
  lateNightEatingDays: number
  mealLoggingDays: number       // de 7 possíveis
  missingFoodGroups: string[]
  topFoodGroups: string[]
}
```

---

## Fase 4 — Correlações de bem-estar

### Objetivo
Conectar a alimentação com como o usuário se sente (energia, humor, sono) e gerar insights personalizados e empáticos.

### Fluxo do check-in

```
Usuário registra refeição
       ↓
Backend agenda check-in para +90 minutos
       ↓
Push notification discreta: "Como você está se sentindo?"
       ↓
Usuário abre app → bottom sheet com check-in (opcional)
       ↓
Dados salvos em wellbeing_logs vinculados ao meal_id
```

### Motor de correlação

```sql
-- Correlação: proteína da refeição vs energia reportada 90min depois
SELECT
  CASE
    WHEN m.analysis_json->>'protein_total' :: NUMERIC < 15 THEN 'baixa_proteina'
    WHEN m.analysis_json->>'protein_total' :: NUMERIC < 30 THEN 'media_proteina'
    ELSE 'alta_proteina'
  END AS protein_tier,
  ROUND(AVG(w.energy), 2) AS avg_energy,
  ROUND(AVG(w.mood), 2)   AS avg_mood,
  COUNT(*)                 AS sample_count
FROM meal_logs m
JOIN wellbeing_logs w ON w.meal_id = m.id
WHERE m.user_id = $1
  AND m.logged_at > now() - INTERVAL '60 days'
  AND w.energy IS NOT NULL
GROUP BY 1
HAVING COUNT(*) >= 5  -- apenas correlações com amostra suficiente
ORDER BY avg_energy DESC;
```

### Geração de insight de correlação (IA)

```typescript
// Rodar semanalmente; só gerar se houver ≥20 check-ins
async function generateCorrelationInsight(userId: string): Promise<string | null> {
  const correlations = await queryCorrelations(userId)
  if (!correlations || correlations.totalSamples < 20) return null

  const prompt = `
Analise as correlações alimentares desta pessoa nos últimos 60 dias.
Dados agregados (sem informação pessoal):
${JSON.stringify(correlations, null, 2)}

Gere UM insight curto (2-3 frases) em português, identificando
a correlação mais relevante e prática entre alimentação e bem-estar.

Regras:
- Tom empático e positivo
- Começar com algo encorajador
- Nunca usar linguagem de julgamento
- Nunca diagnosticar
- Mencionar apenas padrões com ≥5 amostras
- Responda apenas com o texto do insight, sem prefácio
  `.trim()

  return await callClaudeAPI(prompt)
}
```

### Frontend

- Bottom sheet pós-refeição (aparece 90min depois, push notification)
- 3 ícones de energia (⚡baixa / ⚡⚡média / ⚡⚡⚡alta)
- 3 ícones de humor (😔 / 😐 / 😊)
- Campo opcional de nota livre (máximo 140 chars)
- Tela de correlações: gráfico de dispersão (proteína × energia)
- Card de insight semanal no topo do resumo da semana
- Linha do tempo diária: horário das refeições + qualidade do sono seguinte

---

## 10. Segurança e LGPD

### Dados sensíveis de saúde

| Dado | Classificação | Regra |
|---|---|---|
| Foto da refeição | Sensível | Não armazenar além do necessário; hash para dedup |
| Peso, altura, idade | Sensível | Criptografar em repouso; nunca expor em logs |
| Diário alimentar | Sensível | Acesso apenas pelo próprio usuário |
| Check-ins de humor/energia | Sensível | Nunca agregar com outros usuários |
| Email | PII | Nunca em logs; hash em analytics |

### Checklist de segurança

- [ ] TLS obrigatório em todas as rotas
- [ ] JWT com expiração de 15min + refresh token de 7 dias
- [ ] Rate limiting: 10 req/min em `/meals/analyze` por usuário
- [ ] Validação de MIME type e tamanho antes de processar imagem
- [ ] Nunca logar base64, email, peso ou qualquer PII
- [ ] Dados enviados à Claude API: nunca incluir email ou identificadores pessoais
- [ ] Endpoint de exclusão de conta: apagar todos os dados em cascata
- [ ] Endpoint de exportação de dados (LGPD Art. 18)
- [ ] Política de privacidade explicando uso de IA para análise

---

## 11. Regras de qualidade

### Regras críticas (nunca violar)

1. `baseCalories` no banco de dados = soma recalculada pelo backend de `foods[].calories`
2. Nunca persistir JSON de análise sem passar pelo schema Zod
3. Nunca retornar PII em logs de erro
4. Nunca gerar relatório ou insight com menos de N amostras (Fase 3: 7 dias; Fase 4: 20 check-ins)
5. Nunca usar linguagem de julgamento em qualquer texto gerado por IA

### Limites médicos

O app **nunca** deve:
- Diagnosticar doenças ou condições de saúde
- Prescrever dietas clínicas ou suplementação terapêutica
- Substituir nutricionista, médico ou profissional de saúde

O app **sempre** deve:
- Recomendar profissional de saúde em contextos clínicos
- Deixar claro que as análises são estimativas educacionais
- Exibir disclaimer em contextos de déficit calórico severo (< TMB)

---

## 12. Checklist de entrega por fase

### Fase 0 ✅
- [ ] Endpoint `POST /meals/analyze` funcionando com validação Zod
- [ ] `baseCalories` recalculado no backend
- [ ] Fluxo completo: foto → análise → confirmação → histórico
- [ ] Testes unitários: validação de schema, recálculo de calorias
- [ ] Sem PII em logs

### Fase 1 ✅
- [ ] Tabela `taco_nutrients` importada com pg_trgm
- [ ] Enriquecimento TACO funcionando (fuzzy match > 0.6)
- [ ] Micronutrientes, GI, fibras e score anti-inflamatório no JSON
- [ ] `dailyCoveragePercent` calculado com IDR ANVISA
- [ ] Gráfico radar de micronutrientes no frontend

### Fase 2 ✅
- [ ] Onboarding coleta perfil e calcula TMB/TDEE
- [ ] `users.target_kcal` atualiza quando peso muda
- [ ] Cron de streaks rodando (00:05 UTC-3)
- [ ] Conquistas desbloqueando corretamente
- [ ] Tela de progresso com gráfico de peso e tendência

### Fase 3 ✅
- [ ] Classificação de alimentos em grupos funcionando
- [ ] Score de diversidade calculado semanalmente
- [ ] Análise de janela alimentar por dia
- [ ] Cron de relatório semanal (segunda-feira)
- [ ] Push notification de relatório funcionando

### Fase 4 ✅
- [ ] Tabela `wellbeing_logs` criada
- [ ] Push notification 90min pós-refeição
- [ ] Bottom sheet de check-in no app
- [ ] Queries de correlação funcionando (mínimo 20 amostras)
- [ ] Insight semanal de correlação gerado pela IA