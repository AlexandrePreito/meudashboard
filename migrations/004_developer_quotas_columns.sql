-- Migration: Adicionar colunas de cotas para o sistema Master/Developer
-- Master define cotas totais no developer; Developer distribui entre grupos

-- company_groups: quota de créditos IA por dia por grupo
ALTER TABLE company_groups ADD COLUMN IF NOT EXISTS quota_ai_credits_per_day INTEGER DEFAULT 0;

-- developers: cotas totais definidas pelo Master
ALTER TABLE developers ADD COLUMN IF NOT EXISTS max_ai_credits_per_day INTEGER DEFAULT 0;
ALTER TABLE developers ADD COLUMN IF NOT EXISTS max_whatsapp_messages_per_day INTEGER DEFAULT 0;
ALTER TABLE developers ADD COLUMN IF NOT EXISTS max_alerts INTEGER DEFAULT 0;
ALTER TABLE developers ADD COLUMN IF NOT EXISTS max_chat_messages_per_day INTEGER DEFAULT 0;
