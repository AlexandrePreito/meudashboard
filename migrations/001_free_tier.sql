-- ============================================
-- Migration: Free Tier + Auto-Cadastro
-- SEGURO: V1 não é afetada (apenas adições)
-- ============================================

-- 1. Criar plano "Free" na tabela developer_plans (que já existe)
-- Este plano será atribuído automaticamente a novos cadastros
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
) VALUES (
  'Free',
  'Plano gratuito para novos cadastros',
  5,      -- até 5 grupos
  15,     -- até 15 usuários total
  15,     -- até 15 telas total
  3,      -- 3 refreshes por dia
  0,      -- sem IA
  0,      -- sem alertas
  0,      -- sem WhatsApp
  false,  -- IA desabilitada
  true,
  0       -- primeiro na lista
)
ON CONFLICT DO NOTHING;
-- ANOTAR O ID RETORNADO! Vai ser usado na API.
-- Alternativa: buscar com SELECT id FROM developer_plans WHERE name = 'Free';

-- 2. Novas colunas em users (V1 ignora, todas com DEFAULT)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS self_registered BOOLEAN DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- 3. Novas colunas em developers (V1 ignora)
ALTER TABLE developers
ADD COLUMN IF NOT EXISTS self_registered BOOLEAN DEFAULT false;

ALTER TABLE developers
ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ DEFAULT NOW();
