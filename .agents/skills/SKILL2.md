---
name: flavos-share-message
description: >
  Skill especializada em melhorar a função `handleShare` e criar a função `buildMealShareMessage`
  no componente `AnalysisView.tsx` do Flavos Healthy. Use este skill sempre que o usuário
  mencionar: compartilhamento de refeição, handleShare, buildMealShareMessage, mensagem de
  compartilhamento, share message, AnalysisView, Flavos Healthy, ou qualquer melhoria de
  UX writing para apps de nutrição com IA. Também use quando o usuário pedir para melhorar
  texto de compartilhamento em apps de saúde, nutrição ou fitness em React/TypeScript.
---

# Skill — Flavos Healthy: Share Message

Você é um especialista sênior em UX writing, copywriting para apps de saúde/nutrição e React/TypeScript.

## Contexto do Produto

**Flavos Healthy** é um app premium de nutrição inteligente da Flavos Company. Analisa refeições por foto via IA, calcula calorias, macros, fibras, sódio, açúcar, nível de processamento, micronutrientes e gera um **Flavos Nutrition Score**.

**Identidade visual da marca:**
- Moderna, premium, tecnológica, limpa, confiável
- Sem tom infantil, sem exagero de emojis
- Não parece app fitness genérico

---

## Tarefa Principal

Quando o usuário pedir para melhorar a mensagem de compartilhamento, entregue:

1. Análise breve dos problemas do código atual (se fornecido)
2. Interface TypeScript `BuildMealShareMessageParams`
3. Tipo `ShareMessageVariant`
4. Função `buildMealShareMessage()` completa
5. Função `handleShare` atualizada
6. Sugestão de organização de arquivos

---

## Tipos TypeScript

```ts
type ShareMessageVariant = 'default' | 'compact' | 'social' | 'professional';

interface BuildMealShareMessageParams {
  nutritionScore: NutritionScore;         // { score: number; label: string }
  processingBreakdown: ProcessingBreakdown; // { realFoodPercentage: number; ultraProcessedPercentage: number }
  adjustedFoods: FoodItem[];              // [{ name: string; ... }]
  finalCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  variant?: ShareMessageVariant;          // default: 'default'
}
```

> Se os tipos exatos do projeto forem diferentes, adapte mantendo a lógica.

---

## Lógica do Insight Automático

Gere um insight curto (1–2 frases) com base nos dados:

| Condição | Insight |
|---|---|
| `protein >= 30g` | "Boa presença de proteína nessa refeição." |
| `fiber >= 7g` | "Bom aporte de fibras." |
| `fiber < 3g` | "Ponto de atenção: fibras abaixo do ideal. Vegetais, frutas ou leguminosas fariam bem." |
| `realFood >= 75%` | "Predominância de comida de verdade — boa escolha." |
| `ultraProcessed >= 40%` | "Atenção ao nível de ultraprocessamento." |
| `score >= 80` | "Refeição com boa qualidade nutricional geral." |
| `score < 50` | "Há espaço para melhorar o equilíbrio nutricional." |

**Nunca usar:** "refeição ruim", "você comeu errado", "isso engorda", "não coma isso", "isso faz mal"  
**Sempre usar:** "pode melhorar", "ponto de atenção", "uma alternativa seria", "boa base nutricional", "estimativa nutricional"

Combine até 2 insights. Nunca use linguagem médica ou diagnóstica.

---

## Estrutura da Mensagem (`default`)

```
Análise nutricional feita no Flavos Healthy

Flavos Nutrition Score: {score}/100 — {label}

Estimativa da refeição:
• {calorias} kcal
• {proteína}g proteína
• {carbs}g carboidratos
• {gorduras}g gorduras
• {fibras}g fibras

Qualidade alimentar:
• {realFood}% comida de verdade
• {nivelProcessamento}

Alimentos identificados:
{lista de alimentos separados por vírgula}

Insight:
{insight gerado automaticamente}

Analisado com IA pelo Flavos Healthy.
```

### Variante `compact` (WhatsApp)
```
Flavos Nutrition Score: {score}/100 — {label}
{calorias} kcal · {proteína}g prot · {carbs}g carb · {gorduras}g gord · {fibras}g fibras
{realFood}% comida de verdade
{insight curto}
— Flavos Healthy
```

### Variante `social` (Instagram, Twitter)
```
Minha refeição analisada pelo Flavos Healthy ✨
Score: {score}/100 — {label}
{calorias} kcal | {proteína}g proteína | {carbs}g carbs
{insight curto}
#FlavosHealthy #NutriçãoInteligente
```

### Variante `professional` (limpa, sem emojis)
```
Análise nutricional — Flavos Healthy
Score: {score}/100 ({label})
{calorias} kcal | {proteína}g proteína | {carbs}g carboidratos | {gorduras}g gorduras | {fibras}g fibras
{realFood}% comida de verdade
{insight}
Estimativa gerada por IA. Flavos Healthy.
```

---

## Nível de Processamento (helper)

```ts
function getProcessingLabel(ultraProcessedPct: number): string {
  if (ultraProcessedPct <= 10) return 'Baixo ultraprocessamento';
  if (ultraProcessedPct <= 30) return 'Ultraprocessamento moderado';
  return 'Alto nível de ultraprocessamento — ponto de atenção';
}
```

---

## Código de Referência

### `buildMealShareMessage`

```ts
function buildMealShareMessage(params: BuildMealShareMessageParams): string {
  const {
    nutritionScore,
    processingBreakdown,
    adjustedFoods,
    finalCalories,
    macros,
    variant = 'default',
  } = params;

  const { score, label } = nutritionScore;
  const { realFoodPercentage, ultraProcessedPercentage } = processingBreakdown;
  const { protein, carbs, fat, fiber } = macros;

  const foodsList = adjustedFoods
    .map((f) => f.name)
    .filter(Boolean)
    .join(', ');

  const insights: string[] = [];
  if (protein >= 30) insights.push('Boa presença de proteína nessa refeição.');
  if (fiber >= 7) insights.push('Bom aporte de fibras.');
  else if (fiber < 3) insights.push('Ponto de atenção: fibras abaixo do ideal. Vegetais ou leguminosas fariam bem.');
  if (realFoodPercentage >= 75) insights.push('Predominância de comida de verdade — boa escolha.');
  if (ultraProcessedPercentage >= 40) insights.push('Atenção ao nível de ultraprocessamento.');
  if (score >= 80 && insights.length === 0) insights.push('Refeição com boa qualidade nutricional geral.');
  if (score < 50 && insights.length === 0) insights.push('Há espaço para melhorar o equilíbrio nutricional.');

  const insightText = insights.slice(0, 2).join(' ');
  const processingLabel = getProcessingLabel(ultraProcessedPercentage);

  switch (variant) {
    case 'compact':
      return [
        `Flavos Nutrition Score: ${score}/100 — ${label}`,
        `${Math.round(finalCalories)} kcal · ${Math.round(protein)}g prot · ${Math.round(carbs)}g carb · ${Math.round(fat)}g gord · ${Math.round(fiber)}g fibras`,
        `${Math.round(realFoodPercentage)}% comida de verdade`,
        insightText,
        '— Flavos Healthy',
      ].filter(Boolean).join('\n');

    case 'social':
      return [
        'Minha refeição analisada pelo Flavos Healthy ✨',
        `Score: ${score}/100 — ${label}`,
        `${Math.round(finalCalories)} kcal | ${Math.round(protein)}g proteína | ${Math.round(carbs)}g carbs`,
        insightText,
        '#FlavosHealthy #NutriçãoInteligente',
      ].filter(Boolean).join('\n');

    case 'professional':
      return [
        'Análise nutricional — Flavos Healthy',
        `Score: ${score}/100 (${label})`,
        `${Math.round(finalCalories)} kcal | ${Math.round(protein)}g proteína | ${Math.round(carbs)}g carboidratos | ${Math.round(fat)}g gorduras | ${Math.round(fiber)}g fibras`,
        `${Math.round(realFoodPercentage)}% comida de verdade`,
        insightText,
        'Estimativa gerada por IA. Flavos Healthy.',
      ].filter(Boolean).join('\n');

    default:
      return [
        'Análise nutricional feita no Flavos Healthy',
        '',
        `Flavos Nutrition Score: ${score}/100 — ${label}`,
        '',
        'Estimativa da refeição:',
        `• ${Math.round(finalCalories)} kcal`,
        `• ${Math.round(protein)}g proteína`,
        `• ${Math.round(carbs)}g carboidratos`,
        `• ${Math.round(fat)}g gorduras`,
        `• ${Math.round(fiber)}g fibras`,
        '',
        'Qualidade alimentar:',
        `• ${Math.round(realFoodPercentage)}% comida de verdade`,
        `• ${processingLabel}`,
        '',
        'Alimentos identificados:',
        foodsList,
        '',
        'Insight:',
        insightText,
        '',
        'Analisado com IA pelo Flavos Healthy.',
      ].join('\n');
  }
}
```

### `handleShare` atualizado

```ts
const handleShare = async () => {
  const shareText = buildMealShareMessage({
    nutritionScore,
    processingBreakdown,
    adjustedFoods,
    finalCalories,
    macros: {
      protein: nutritionData.protein,
      carbs: nutritionData.carbs,
      fat: nutritionData.fat,
      fiber: nutritionData.fiber,
    },
    variant: 'default',
  });

  const shareTitle = 'Análise Nutricional — Flavos Healthy';

  try {
    if (capturedImage && navigator.canShare?.({ files: [] })) {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      const file = new File([blob], 'analise-flavos.jpg', { type: 'image/jpeg' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ title: shareTitle, text: shareText, files: [file] });
        return;
      }
    }

    if (navigator.share) {
      await navigator.share({ title: shareTitle, text: shareText });
      return;
    }

    await navigator.clipboard.writeText(shareText);
    alert('Análise copiada para a área de transferência!');
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Análise copiada para a área de transferência!');
      } catch {
        console.error('Erro ao compartilhar:', error);
      }
    }
  }
};
```

---

## Organização de Arquivos

**Opção A — dentro do componente** (mais simples, recomendado para projetos menores):
```
AnalysisView.tsx  ← funções acima do componente principal
```

**Opção B — utilitário separado** (recomendado para projetos maiores):
```
src/utils/shareMessage.ts  ← buildMealShareMessage + tipos + getProcessingLabel
AnalysisView.tsx            ← importa e usa handleShare
```

---

## Restrições

- Não alterar componentes visuais: `NutritionScoreBadge`, `DetailedNutritionPanel`, `ProcessingBreakdownComp`, `MicronutrientPanel`, `NutritionalAlerts`, `PortionAdjuster`
- Não remover compartilhamento de imagem
- Não adicionar bibliotecas externas
- Não usar linguagem médica ou prometer precisão absoluta
- Sempre tratar dados como estimativas nutricionais
- Manter compatibilidade com React + TypeScript