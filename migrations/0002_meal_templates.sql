-- ============================================================
-- Migration: 0002_meal_templates
-- Descrição : Tabela de refeições fixas ("Minhas refeições")
--             Fase 2 — Refeição Fixa do Sistema de Macros
-- ============================================================

-- Habilitar extensão uuid-ossp caso ainda não esteja ativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Tabela: meal_templates
-- ============================================================
CREATE TABLE IF NOT EXISTS meal_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL
                             CHECK (char_length(name) BETWEEN 1 AND 120),
  meal_type    TEXT
                             CHECK (
                               meal_type IS NULL OR meal_type IN (
                                 'cafe', 'almoco', 'lanche_manha',
                                 'lanche_tarde', 'jantar', 'ceia',
                                 'pre_treino', 'pos_treino', 'outro'
                               )
                             ),
  -- analysis_json: snapshot validado da análise (pipeline Fase 0).
  -- Formato esperado: { foods: FoodItem[], nutritionalSummary: { baseCalories, ... } }
  -- Campos críticos de segurança:
  --   • Nunca confiar no valor de resumo (baseCalories) — sempre recalcular
  --     a partir da soma de foods[].calories ao redistribuir.
  --   • Limite de 1 MB por snapshot para evitar payload DoS.
  analysis_json  JSONB     NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Índices ──────────────────────────────────────────────────
-- Listagem de templates por usuário (operação mais comum)
CREATE INDEX IF NOT EXISTS idx_meal_templates_user_id
  ON meal_templates (user_id, created_at DESC);

-- Filtro opcional por tipo de refeição
CREATE INDEX IF NOT EXISTS idx_meal_templates_meal_type
  ON meal_templates (user_id, meal_type)
  WHERE meal_type IS NOT NULL;

-- ── Row-Level Security (RLS) ─────────────────────────────────
-- Habilitar RLS na tabela para garantir isolamento por usuário.
-- O backend deve conectar com um usuário Postgres com privilégio
-- SET LOCAL ROLE = 'authenticado' e setar o claim do usuário.
ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;

-- Política: usuário só acessa seus próprios templates
CREATE POLICY meal_templates_owner_policy
  ON meal_templates
  USING (user_id = current_setting('app.current_user_id', true)::UUID)
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::UUID);

-- ── Rollback ─────────────────────────────────────────────────
-- Para desfazer esta migration:
--
-- DROP TABLE IF EXISTS meal_templates;
