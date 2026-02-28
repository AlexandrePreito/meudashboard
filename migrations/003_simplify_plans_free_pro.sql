-- ============================================
-- Migration: Simplificar Planos (Free + Pro)
-- Remove planos antigos, cria Pro, migra devs pagos
-- ============================================

-- PASSO 1: Criar o plano "Pro" (se não existe)
-- Usa colunas existentes na tabela developer_plans
INSERT INTO developer_plans (
  name,
  description,
  max_companies,
  max_users,
  max_powerbi_screens,
  max_daily_refreshes,
  max_ai_questions_per_day,
  max_ai_alerts_per_month,
  max_whatsapp_messages_per_month,
  ai_enabled,
  is_active,
  display_order
)
SELECT
  'Pro',
  'Plano profissional com todos os recursos liberados',
  999,
  9999,
  999,
  999,
  9999,
  9999,
  9999,
  true,
  true,
  1
FROM (SELECT 1) AS dummy
WHERE NOT EXISTS (SELECT 1 FROM developer_plans WHERE name = 'Pro');

-- PASSO 2: Mover TODOS os developers pagos para o plano Pro
UPDATE developers
SET plan_id = (SELECT id FROM developer_plans WHERE name = 'Pro' AND is_active = true LIMIT 1)
WHERE plan_id IN (
  SELECT id FROM developer_plans
  WHERE name IN ('Starter', 'Dev Starter', 'Dev Pro', 'Dev Business', 'Dev Enterprise')
);

-- PASSO 3: Desativar planos antigos (não deletar, para segurança)
UPDATE developer_plans
SET is_active = false
WHERE name IN ('Starter', 'Dev Starter', 'Dev Pro', 'Dev Business', 'Dev Enterprise');

-- PASSO 4: Verificar resultado (rodar manualmente para conferir)
-- SELECT d.name as developer, dp.name as plano
-- FROM developers d
-- LEFT JOIN developer_plans dp ON d.plan_id = dp.id;
