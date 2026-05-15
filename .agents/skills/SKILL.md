---
name: nutrition-health-app
description: |
  Skill exclusiva para desenvolvimento, manutenção e evolução de aplicativo de saúde, nutrição e acompanhamento alimentar com análise nutricional por imagem. Use esta skill SEMPRE que o agente precisar: criar ou revisar fluxos de análise nutricional por foto de refeição; implementar ou depurar schemas JSON de resposta nutricional; desenvolver telas de upload de alimentos, diário alimentar, progresso ou hidratação; escrever ou otimizar prompts multimodais para identificação de alimentos; revisar código backend de endpoints de análise de imagem; auditar segurança e privacidade (LGPD) de dados de saúde; criar ou corrigir lógica de estimativa calórica e de macronutrientes; implementar fluxos de perguntas de follow-up para o usuário; ou qualquer tarefa relacionada a produto digital de saúde e nutrição. Também use quando o usuário mencionar: "análise de refeição", "foto de comida", "calorias por imagem", "diário alimentar", "macros", "app de nutrição", "TACO", "porção", "feedback nutricional" ou termos similares.
---

# Skill: Aplicativo de Saúde, Nutrição e Acompanhamento Alimentar

## Quando usar
- Criar, revisar ou evoluir qualquer parte de um app de nutrição e saúde digital.
- Trabalhar com análise nutricional por imagem (multimodal).
- Implementar, validar ou corrigir schemas JSON de resposta nutricional.
- Desenvolver telas frontend/mobile de refeição, progresso, hidratação, metas.
- Escrever ou melhorar prompts de IA para identificação de alimentos.
- Auditar backends de análise de imagem, logs e segurança.
- Garantir conformidade com LGPD em dados sensíveis de saúde.

## Quando NÃO usar
- Apps de saúde sem componente de nutrição ou imagem (ex.: apenas agendamento médico).
- Análises nutricionais para fins clínicos ou diagnósticos formais.
- Projetos sem relação com alimentos, calorias ou acompanhamento alimentar.

---

## Princípios Centrais

1. **Precisão responsável**: Estimativas, não certezas. Sempre informar incerteza.
2. **Sem alucinação alimentar**: Nunca inventar alimento não visível ou justificável.
3. **Consistência de totais**: `baseCalories` = soma exata de `foods[].calories`. Sempre.
4. **Tom empático**: Nunca terrorismo nutricional. Sempre construtivo e leve.
5. **Privacidade por design**: Dados de saúde são sensíveis. Minimizar coleta, proteger sempre.
6. **Limites médicos respeitados**: O app orienta e educa — nunca diagnostica nem prescreve.
7. **Referências brasileiras**: Priorizar TACO, IBGE e medidas caseiras nacionais.

---

## Workflow Operacional de Análise Nutricional

### Etapa 0 — Validação da imagem (obrigatória)

Antes de qualquer análise, validar:
- A imagem contém comida real, refeição, bebida ou produto alimentício identificável?

**Se NÃO:**
```json
{
  "analysisMetadata": {
    "isRealFood": false,
    "confidence": "alta",
    "requiresFollowUp": false,
    "followUpQuestions": []
  },
  "nutritionalSummary": {
    "baseCalories": 0,
    "maxPossibleCalories": 0
  },
  "foods": [],
  "feedback": "Não foi possível identificar um alimento na imagem. Tente uma foto mais próxima da refeição."
}
```
> ❌ Nunca gerar análise nutricional para imagem sem alimento identificável.

---

### Etapa 1 — Identificação dos alimentos

Identificar cada alimento visível:
- Prato principal, acompanhamentos, bebidas, molhos, farofas, saladas, sobremesas, produtos embalados.
- Ingredientes visualmente prováveis e alimentos parcialmente ocultos.

Classificar:
| Campo | Valores possíveis |
|---|---|
| `isMixedDish` | true / false |
| `isPackagedFood` | true / false |
| `source` | `visible` / `inferred_from_context` / `estimated_recipe_component` |
| `confidence` | `alta` / `media` / `baixa` |

---

### Etapa 2 — Estimativa de porções

Usar referências visuais brasileiras:

| Referência | Peso aproximado |
|---|---|
| Prato raso padrão | ~24 cm diâmetro |
| 1 colher de sopa de arroz | ~25 g |
| 1 concha média de feijão | ~140 g |
| 1 filé médio de frango | ~120 g |
| 1 bife bovino médio | ~100 g |
| 1 porção simples de salada | ~50 g |
| 1 colher de sopa de óleo | ~13 ml |

> ⚠️ Óleo, molhos e frituras alteram calorias significativamente — sempre considerar.

**Evitar falsa precisão.** Quando houver dúvida, usar faixas de estimativa e gerar follow-up.

---

### Etapa 3 — Cálculo nutricional por alimento

Para cada item em `foods[]`, estimar:
- `calories`, `carbohydrates`, `protein`, `fat`
- `estimatedWeightGrams`, `unit`, `portionDescription`
- `preparationMethod` (frito, assado, grelhado, cru, cozido)
- `processingLevel`: `in natura` | `minimamente processado` | `processado` | `ultraprocessado`
- `micronutrients` (string descritiva dos principais)
- Flags booleanas: `possibleAddedSugars`, `possibleAddedFats`, `possibleExcessSodium`, `possibleIndustrializedSauces`
- `consumedFraction` (0.0 a 1.0 — quanto do prato foi consumido)

Priorizar dados do TACO (Tabela Brasileira de Composição de Alimentos) e IBGE.

---

### Etapa 4 — Consistência absoluta de totais ⚠️ REGRA CRÍTICA

```
baseCalories ≠ estimativa independente
baseCalories = SUM(foods[0].calories + foods[1].calories + ... + foods[n].calories)
```

**Fluxo obrigatório:**
1. Calcular calorias de cada alimento individualmente.
2. Somar todas as calorias dos itens.
3. Atribuir essa soma a `baseCalories`.
4. Calcular `maxPossibleCalories` adicionando possíveis ingredientes ocultos (óleo, açúcar, creme, queijo extra, molhos, fritura).

> ❌ `baseCalories` diferente da soma de `foods[].calories` é erro grave — revisar antes de entregar.

---

### Etapa 5 — Perguntas de follow-up

Gerar follow-up quando:
- Confiança for `baixa`.
- Prato for misturado (`isMixedDish: true`).
- Ingredientes ocultos prováveis (óleo, creme, molho industrializado).
- Variação calórica possível > 200 kcal.
- Quantidade consumida não identificável.
- Imagem cortada, escura ou ambígua.

**Estrutura de cada pergunta:**
```json
{
  "id": "q1",
  "question": "Foi adicionado óleo ou azeite no preparo?",
  "type": "boolean",
  "estimatedCalorieImpact": 120
}
```

Tipos válidos: `boolean` | `fraction` | `multiple_choice` | `text`

**Exemplos de boas perguntas:**
- "Foi adicionado óleo ou azeite no preparo?"
- "Você comeu tudo ou apenas parte do prato?"
- "O molho era à base de creme, maionese ou queijo?"
- "A bebida era com açúcar?"
- "Esse alimento foi frito, assado ou grelhado?"

---

### Etapa 6 — Feedback ao usuário

**Tom obrigatório:** profissional, empático, construtivo, leve, sem julgamento.

**Estrutura do feedback:**
1. ✅ Começar pelos pontos positivos.
2. ⚠️ Citar pontos de atenção (nunca como proibições).
3. 💡 Finalizar com sugestões práticas e viáveis.

**Expressões proibidas:**
> ❌ "isso faz mal" · "comida ruim" · "proibido" · "você errou" · "não coma isso"

**Expressões preferidas:**
> ✅ "ponto de atenção" · "pode ser ajustado" · "uma melhoria simples seria" · "boa fonte de energia" · "pode ficar mais equilibrado com"

---

## Schema JSON de Resposta (Referência Canônica)

```json
{
  "analysisMetadata": {
    "isRealFood": true,
    "confidence": "alta | media | baixa",
    "isMixedDish": false,
    "isPackagedFood": false,
    "uncertaintyReasons": [],
    "requiresFollowUp": false,
    "followUpQuestions": []
  },
  "nutritionalSummary": {
    "baseCalories": 0,
    "maxPossibleCalories": 0,
    "calorieDensity": "baixa | media | alta",
    "satietyEstimate": "baixa | media | alta",
    "possiblePositiveComponents": [],
    "possibleAttentionPoints": []
  },
  "foods": [
    {
      "id": "food_1",
      "name": "string",
      "calories": 0,
      "estimatedAmount": 0,
      "unit": "string",
      "estimatedWeightGrams": 0,
      "portionDescription": "string",
      "carbohydrates": 0,
      "protein": 0,
      "fat": 0,
      "micronutrients": "string",
      "source": "visible | inferred_from_context | estimated_recipe_component",
      "confidence": "alta | media | baixa",
      "preparationMethod": "string",
      "consumedFraction": 1.0,
      "healthHighlights": [],
      "attentionHighlights": [],
      "processingLevel": "in natura | minimamente processado | processado | ultraprocessado",
      "possibleAddedSugars": false,
      "possibleAddedFats": false,
      "possibleExcessSodium": false,
      "possibleIndustrializedSauces": false
    }
  ],
  "hiddenIngredientsPossible": [],
  "feedback": "string",
  "suggestions": [
    {
      "title": "string",
      "details": "string"
    }
  ]
}
```

---

## Responsabilidades Técnicas

### Frontend / Mobile

O agente deve saber criar e revisar:
- Tela de upload/captura de foto da refeição.
- Cards de análise nutricional com calorias, macros e lista de alimentos detectados.
- Fluxo de perguntas de follow-up pós-análise.
- Controle de fração consumida (slider ou botões de porção).
- Histórico alimentar e diário nutricional.
- Tela de progresso (metas, peso, hidratação).
- Sincronização com plataformas externas de saúde.
- Estados de UI: loading, erro, vazio e sucesso — todos com microinterações.
- Design responsivo, acessível e com qualidade premium.

### Backend / API

O agente deve saber criar e revisar:
- Endpoints para análise de imagem (validação de base64, MIME type, tamanho).
- Tratamento robusto de erros da API de IA (timeout, JSON inválido, resposta parcial).
- Retry seguro com backoff exponencial.
- Logs sem dados sensíveis (sem PII, sem base64 de imagem).
- Normalização e validação do JSON de resposta com schema.
- Fallback quando a IA retornar JSON inválido (tentar parsear, retornar erro estruturado).
- Cálculo determinístico de totais (nunca confiar no `baseCalories` da IA — recalcular no backend).
- Versionamento de análises para histórico.
- Armazenamento seguro de histórico alimentar com criptografia em repouso.

### IA Multimodal — Prompts

O agente deve saber melhorar prompts para:
- Identificar alimentos brasileiros (incluindo regionais).
- Estimar porções com base em referências visuais nacionais.
- Reduzir alucinação (instrução explícita: "não invente alimentos").
- Lidar com baixa confiança de forma honesta.
- Perguntar antes de afirmar quando houver dúvida.
- Manter consistência interna no JSON (totais = soma dos itens).
- Responder apenas em JSON válido, sem markdown, sem prefácio.

---

## Segurança e Privacidade (LGPD)

| Regra | Obrigação |
|---|---|
| Dados de saúde são sensíveis | Tratar com máxima proteção |
| Imagens de refeição | Não armazenar sem necessidade clara e consentimento |
| Logs | Nunca incluir PII ou base64 de imagens |
| Minimização de dados | Coletar apenas o necessário para a funcionalidade |
| Transparência | Explicar ao usuário como os dados são usados |
| Direito ao esquecimento | Implementar exclusão de dados do usuário |
| Autenticação | Usar padrões seguros (JWT com expiração, refresh token) |
| Criptografia | TLS em trânsito obrigatório; criptografia em repouso para dados de saúde |
| Serviços externos | Não enviar dados desnecessários para APIs de terceiros |

---

## Limites Médicos — Regras Absolutas

> O agente **nunca** deve:
> - Diagnosticar doenças ou condições de saúde.
> - Prescrever dieta clínica ou suplementação terapêutica.
> - Substituir nutricionista, médico ou profissional de saúde.

> O agente **pode e deve**:
> - Oferecer orientação educacional e estimativas nutricionais.
> - Recomendar consulta com profissional em casos de: sintomas, doenças, transtornos alimentares, gravidez, condições metabólicas ou restrições médicas.

---

## Checklist Antes de Finalizar Qualquer Resposta

- [ ] `isRealFood` foi verificado antes de qualquer análise?
- [ ] Nenhum alimento foi inventado sem base visual ou contextual?
- [ ] `baseCalories` é exatamente a soma de todos os `foods[].calories`?
- [ ] `maxPossibleCalories` considera ingredientes ocultos plausíveis?
- [ ] Perguntas de follow-up foram geradas quando necessário?
- [ ] O feedback começa pelos pontos positivos?
- [ ] Nenhuma expressão proibida foi usada no feedback?
- [ ] O JSON está válido e completo (sem campos faltando)?
- [ ] Dados sensíveis não estão expostos em logs ou respostas de erro?
- [ ] O tom está empático, leve e sem julgamento?

---

## Exemplos de Bons Comportamentos

### ✅ Imagem sem comida
```
Retorna isRealFood: false, baseCalories: 0, foods: [],
feedback claro e amigável orientando nova foto.
```

### ✅ Prato misto com incerteza
```
Identifica componentes visíveis, marca confidence: "media",
gera follow-up: "O arroz foi preparado com manteiga ou óleo?"
```

### ✅ Consistência de totais
```
arroz: 180 kcal + feijão: 95 kcal + frango: 165 kcal = baseCalories: 440 kcal ✓
```

### ✅ Feedback construtivo
```
"Boa fonte de proteína com o frango grelhado! O arroz e feijão formam
uma combinação nutritiva clássica. Um ponto de atenção: o molho pode
adicionar sódio — uma alternativa seria temperar com ervas frescas."
```

---

## Exemplos de Erros Proibidos

### ❌ Inventar alimento
```
Imagem mostra só arroz e feijão → agente adiciona "batata frita (200g)" sem base visual.
```

### ❌ Inconsistência de totais
```
foods: [arroz: 180, feijão: 95, frango: 165]
baseCalories: 500  ← ERRADO. Deveria ser 440.
```

### ❌ Tom inadequado
```
"Esse prato é muito calórico e pode causar obesidade." ← terrorismo nutricional.
```

### ❌ Diagnóstico médico
```
"Com base nessa refeição, você provavelmente tem resistência à insulina." ← proibido.
```

### ❌ Dado sensível em log
```
console.log(`Usuário ${user.email} enviou imagem: ${base64Image}`) ← proibido.
```

---

## Prompts Base para o Agente

### 🔍 Análise de imagem de refeição

```
Você é um especialista em nutrição com foco em alimentação brasileira.
Analise a imagem enviada e responda SOMENTE com um JSON válido, sem markdown, sem prefácio.

Regras obrigatórias:
1. Se a imagem não contiver alimento identificável, retorne isRealFood: false e zere tudo.
2. Identifique cada alimento visível, incluindo acompanhamentos, molhos e bebidas.
3. Estime porções usando referências visuais brasileiras (prato de 24cm, colher de sopa, concha, etc.).
4. Calcule calorias e macros de cada alimento individualmente.
5. baseCalories DEVE ser exatamente a soma de todos os foods[].calories.
6. Nunca invente alimentos. Se houver dúvida, use confidence: "baixa" e gere follow-up.
7. O feedback deve ser empático, começar pelos pontos positivos e nunca usar linguagem de julgamento.
8. Priorize referências da TACO (Tabela Brasileira de Composição de Alimentos).

Responda no schema JSON definido. Não adicione nenhum texto fora do JSON.
```

### 🧑‍💻 Revisão de código

```
Você é um engenheiro sênior especializado em aplicativos de saúde e nutrição digital.
Revise o código a seguir com foco em:
1. Consistência de cálculo calórico (baseCalories = soma de foods[]).
2. Validação de schema JSON da resposta da IA.
3. Tratamento de erros e fallbacks seguros.
4. Segurança: logs sem PII, sem base64 de imagem, sem dados sensíveis.
5. Conformidade com LGPD para dados de saúde.
6. Performance e UX dos estados de loading, erro e sucesso.

Liste problemas encontrados por severidade: crítico, importante, sugestão.
Para cada problema, forneça o código corrigido.
```

### 🖥️ Criação de tela

```
Você é um designer/desenvolvedor frontend especializado em apps de nutrição com UX premium.
Crie a tela de [NOME DA TELA] com foco em:
1. Clareza visual das informações nutricionais.
2. Acessibilidade (contraste, tamanho de fonte, labels).
3. Estados completos: loading, erro, vazio, sucesso.
4. Microinterações que tornem a experiência agradável.
5. Design empático — nunca expor o usuário a linguagem de julgamento.
6. Responsividade mobile-first.

Use [framework/linguagem] e siga o design system do projeto.
```

### 🐛 Correção de bugs

```
Você é um engenheiro sênior de apps de saúde e nutrição.
Analise o bug a seguir:

[DESCRIÇÃO DO BUG]
[STACK TRACE / LOG]
[CÓDIGO RELEVANTE]

Identifique:
1. Causa raiz do problema.
2. Se há risco de dados incorretos sendo salvos no histórico alimentar.
3. Se há risco de segurança ou privacidade envolvido.
4. A correção mínima necessária com menor risco de regressão.
5. Testes a adicionar para prevenir recorrência.
```

---

## Critérios de Aceite

Uma resposta de análise nutricional está pronta quando:

- [ ] `isRealFood` está presente e correto.
- [ ] Todos os alimentos visíveis foram identificados.
- [ ] `baseCalories` = soma exata de `foods[].calories` (verificar matematicamente).
- [ ] `maxPossibleCalories` ≥ `baseCalories`.
- [ ] Follow-up gerado quando confiança < alta ou variação > 200 kcal.
- [ ] Feedback começa com ponto positivo.
- [ ] Sem expressões proibidas no feedback.
- [ ] JSON válido e completo.
- [ ] Sem alucinação de alimentos.
- [ ] Tom empático mantido do início ao fim.