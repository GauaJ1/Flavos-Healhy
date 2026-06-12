<div align="center">
  <img width="1200" height="475" alt="Flavos Healthy Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
  
  # 🍃 Flavos Healthy — Saúde e Nutrição Inteligente
  
  *Um aplicativo híbrido moderno e empático de nutrição, focado em reconhecimento de alimentos por imagem via IA, rastreamento de bem-estar e sincronização nativa com Google Health Connect.*
  
  [![Vite](https://img.shields.io/badge/Vite-7.x-646CFF.svg?style=flat&logo=vite)](https://vitejs.dev/)
  [![React](https://img.shields.io/badge/React-19.0-61DAFB.svg?style=flat&logo=react)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org/)
  [![Capacitor](https://img.shields.io/badge/Capacitor-8.3-119EFF.svg?style=flat&logo=capacitor)](https://capacitorjs.com/)
  [![Gemini](https://img.shields.io/badge/Gemini-3.1_Flash-F6820D.svg?style=flat&logo=google)](https://ai.google.dev/)
</div>

---

## 📋 Visão Geral

O **Flavos Healthy** é um aplicativo mobile que revoluciona o diário alimentar. Em vez de preencher manualmente gramas e buscar tabelas enfadonhas, o usuário simplesmente fotografa o seu prato. Através da inteligência artificial do **Google Gemini (Gemini 3.1 Flash-lite)**, o app reconhece os alimentos, estima porções em gramas, calcula calorias e macronutrientes, avalia micronutrientes com base na tabela **TACO/IBGE** e sugere ajustes de forma empática e sem julgamentos nutricionais.

Para usuários nativos em Android, ele se conecta diretamente ao **Google Health Connect** (Samsung Health / Google Fit), permitindo manter todos os dados de saúde sincronizados e centralizados de forma segura no dispositivo.

---

## ✨ Funcionalidades por Fases de Implementação

O projeto foi estruturado seguindo um cronograma técnico rigoroso, detalhado na [Documentação Técnica](file:///c:/Users/Usuario/Pictures/Flavos-Healhy/Documentacao_Tecnica.md):

### 📸 Fase 0: Análise Visual & Diário Alimentar
*   **Análise Multimodal:** Processamento de imagens de pratos com identificação detalhada dos ingredientes.
*   **Perguntas de Follow-up Inteligentes:** Se a IA identificar incertezas (ex. molhos ou carnes), o app apresenta perguntas interativas para refinar a análise.
*   **Ajuste Fino de Consumo:** Ajuste do quanto foi efetivamente consumido do prato (frações de 0.0 a 1.0) com recálculo automático.
*   **Diário Histórico:** Histórico estruturado com paginação e filtros por data.

### 🧪 Fase 1: Profundidade Nutricional (TACO)
*   **Enriquecimento de Dados:** Integração com a tabela **TACO/IBGE** por fuzzy match (similaridade > 60%).
*   **Micronutrientes Completos:** Rastreamento detalhado de Ferro, Cálcio, Vitamina C, Vitamina D, Magnésio, Potássio, Zinco e Vitamina B12.
*   **Fibras & Índice Glicêmico:** Divisão de fibras solúveis/insolúveis, Índice Glicêmico (IG) e Carga Glicêmica (CG) por alimento.
*   **Gráfico Radar de Cobertura:** Visualização comparativa em tempo real contra as recomendações diárias da ANVISA (RDC 269/2005).

### 🎯 Fase 2: Metas, Progresso & Periodização
*   **Cálculo Físico Personalizado:** Fórmulas baseadas em Mifflin-St Jeor para estimativa de TMB (Taxa Metabólica Basal) e TDEE (Gasto Energético Total Diário).
*   **Distribuição g/kg de Macros:** Divisão de macros de acordo com o peso corporal e nível de atividade (recomendações ACSM/ISSN), preservando a saúde hormonal através de um piso de gorduras (0.8 g/kg).
*   **Periodização de Carboidratos:** Planejamento e distribuição de macros para refeições de treino (pré e pós-treino).
*   **Estratégias de Fracionamento (High Carb):** Dicas automáticas (`carbLoadStrategy`) de alimentos densos ou opções líquidas para volumes altos de carboidrato.
*   **Streaks & Achievements:** Sistema dinâmico de consistência diária e galeria de conquistas.

### 📊 Fase 3: Padrões & Hábitos Alimentares
*   **Score de Diversidade Alimentar:** Classificação por grupos alimentares (cereais, leguminosas, frutas, ultraprocessados, etc.) e penalização de ultraprocessados.
*   **Monitor de Janela Alimentar:** Rastreamento do horário e intervalo das refeições.
*   **Relatório Semanal de IA:** Compilação dos padrões da semana gerada por IA com feedbacks de pontos fortes e oportunidades de melhora prática.

### ⚡ Fase 4: Correlações de Bem-estar
*   **Check-in Pós-Refeição:** Notificação e registro (90 min após a refeição) de níveis de Energia, Humor e Sono.
*   **Motor de Correlação Estatística:** Consultas cruzadas que revelam o impacto de macros e alimentos no seu bem-estar físico e emocional.
*   **Insights de IA:** Insights baseados em dados históricos acumulados (mínimo de 20 amostras).

---

## 🛠️ Stack Tecnológica

*   **Frontend/PWA:** React 19.x (TypeScript), Vite 7.x, Framer Motion (animações fluidas e premium) e Recharts (gráficos responsivos).
*   **Engine Nativa:** Capacitor 8.x (CLI, Core e Android).
*   **IA & Integrações:** SDK Oficial do Google Gemini (`@google/genai`), Vercel Serverless Functions e Kotlin nativo no Android para o plugin de Health Connect.
*   **Estilização:** Vanilla CSS customizado com paleta dark-mode moderna, sombras suaves e design premium (glassmorphism).

---

## 📂 Estrutura de Pastas Principal

*   [`App.tsx`](file:///c:/Users/Usuario/Pictures/Flavos-Healhy/App.tsx): Arquivo central do aplicativo web/mobile.
*   [`capacitor.config.ts`](file:///c:/Users/Usuario/Pictures/Flavos-Healhy/capacitor.config.ts): Configuração de compilação Capacitor para o Android.
*   [`api/analyze.ts`](file:///c:/Users/Usuario/Pictures/Flavos-Healhy/api/analyze.ts): Função Serverless de proxy para proteger chaves e realizar validações robustas.
*   [`services/`](file:///c:/Users/Usuario/Pictures/Flavos-Healhy/services):
    *   [`geminiService.ts`](file:///c:/Users/Usuario/Pictures/Flavos-Healhy/services/geminiService.ts): Regras de negócio, prompts, schemas JSON e integração direta ou proxy com a API Gemini.
    *   [`healthSyncService.ts`](file:///c:/Users/Usuario/Pictures/Flavos-Healhy/services/healthSyncService.ts): Módulo de ponte entre a Web View e o plugin nativo Android.
*   [`components/`](file:///c:/Users/Usuario/Pictures/Flavos-Healhy/components): Componentes visuais do app (Onboarding, Dashboards, Streaks, Radars, Trackers de água e peso).
*   [`hooks/`](file:///c:/Users/Usuario/Pictures/Flavos-Healhy/hooks): Hooks personalizados para persistência e lógica de cada módulo (useMealHistory, useWellbeing, useStreaks, etc.).

---

## 🔒 Proteção e Regras de Segurança (LGPD)

O Flavos Healthy segue as diretrizes da **Política Global de Cibersegurança** do projeto:

1.  **Recálculo Mandatório no Backend:** O backend/proxy recalcula e valida `baseCalories` a partir da soma exata de `foods[].calories`. O cliente nunca dita valores arbitrários de calorias totais.
2.  **Validação de Schema:** Persistência de dados e respostas de IA passam por rigorosa validação Zod/JSON.
3.  **Minimização de Dados (Privacidade):** Fotos base64 são usadas sob demanda para análise e nunca são guardadas em disco ou logadas. Emails e dados antropométricos são removidos dos prompts enviados à API do Gemini.
4.  **Rate Limiting:** Limitação de chamadas no endpoint `/meals/analyze` para mitigar abusos ou custos excessivos com tokens de IA.
5.  **Local storage / Offline first:** Dados são guardados de forma segura localmente no aparelho do usuário por padrão, mantendo-os fora da nuvem e sob posse do usuário.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
*   **Node.js** (versão 18 ou superior recomendado)
*   **npm** (instalado com o Node)

### 1. Clonar e Instalar dependências
No terminal da raiz do projeto:
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env` baseado no [`.env.example`](file:///c:/Users/Usuario/Pictures/Flavos-Healhy/.env.example):
```bash
cp .env.example .env
```
Abra o `.env` e preencha a chave de desenvolvimento:
```env
API_KEY=AIzaSy...seu_token_do_gemini_aqui
```
> 💡 *Você pode criar sua chave de teste gratuitamente em: https://aistudio.google.com/*

### 3. Executar o Servidor de Desenvolvimento Web
```bash
npm run dev
```
O app abrirá no navegador em `http://localhost:5173`.

### 4. Executar os Testes
Para validar a consistência matemática e schemas Zod:
```bash
npm run test
```

---

## 📱 Executando no Android Nativo (Capacitor)

Para testar o fluxo nativo com o plugin de **Google Health Connect** no seu celular:

### Pré-requisitos
*   **Android Studio** instalado e configurado
*   Dispositivo Android conectado via USB (com Modo Depurador ativo) ou Emulador Android.

### Passo a Passo

1.  **Gere a build web de produção:**
    ```bash
    npm run build
    ```
2.  **Sincronize os arquivos gerados com o Capacitor:**
    ```bash
    npm run cap:sync
    ```
3.  **Abra o projeto no Android Studio:**
    ```bash
    npm run cap:open
    ```
    *No Android Studio, você poderá buildar o APK (`app-release.apk` gerado fica em `android/app/build/outputs/apk/release/`) e debugar o comportamento do plugin Kotlin.*
4.  **Ou execute diretamente via CLI:**
    ```bash
    npm run cap:run
    ```

---

## 📚 Referências Científicas Adotadas
*   **Thomas DT, Erdman KA, Burke LM (2016):** Posicionamento conjunto ACSM/Academy of Nutrition/Dietitians of Canada sobre Nutrição e Performance Atlética (base de g/kg de proteína e carboidratos).
*   **ISSN Position Stand (2017):** Platô e periodização proteica (20g-40g de proteína de alta qualidade a cada 3-4 horas).
*   **ANVISA RDC 269/2005:** Valores recomendados de IDR de fibras e minerais no Brasil.
*   **Mifflin-St Jeor (1990):** Fórmula preditiva de gasto calórico basal em indivíduos saudáveis.
