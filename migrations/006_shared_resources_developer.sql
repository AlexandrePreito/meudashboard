-- =============================================
-- RECURSOS COMPARTILHADOS NO NÍVEL DO DEVELOPER
-- Fase 1: Conexão Power BI, WhatsApp e Treinamento IA
-- =============================================

-- 1. Conexões Power BI podem pertencer ao developer (compartilhada)
ALTER TABLE powerbi_connections 
  ADD COLUMN IF NOT EXISTS developer_id UUID REFERENCES developers(id);

COMMENT ON COLUMN powerbi_connections.developer_id IS 
  'Se preenchido E company_group_id NULL = conexão compartilhada do developer, herdada por todos os grupos';

CREATE INDEX IF NOT EXISTS idx_powerbi_connections_developer 
  ON powerbi_connections(developer_id) WHERE developer_id IS NOT NULL;

-- 2. Instâncias WhatsApp podem pertencer ao developer (compartilhada)
ALTER TABLE whatsapp_instances 
  ADD COLUMN IF NOT EXISTS developer_id UUID REFERENCES developers(id);

COMMENT ON COLUMN whatsapp_instances.developer_id IS 
  'Se preenchido E company_group_id NULL = instância compartilhada do developer';

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_developer 
  ON whatsapp_instances(developer_id) WHERE developer_id IS NOT NULL;

-- 3. Exemplos de treinamento IA podem pertencer ao developer (compartilhado)
-- Permitir company_group_id NULL quando developer_id estiver preenchido
ALTER TABLE ai_training_examples 
  ADD COLUMN IF NOT EXISTS developer_id UUID REFERENCES developers(id);

ALTER TABLE ai_training_examples 
  ALTER COLUMN company_group_id DROP NOT NULL;

COMMENT ON COLUMN ai_training_examples.developer_id IS 
  'Se preenchido E company_group_id NULL = exemplos compartilhados do developer (herdados por todos os grupos)';

CREATE INDEX IF NOT EXISTS idx_ai_training_developer 
  ON ai_training_examples(developer_id) WHERE developer_id IS NOT NULL;

-- 4. Contextos de IA (ai_model_contexts) podem pertencer ao developer
ALTER TABLE ai_model_contexts 
  ADD COLUMN IF NOT EXISTS developer_id UUID REFERENCES developers(id);

CREATE INDEX IF NOT EXISTS idx_ai_model_contexts_developer 
  ON ai_model_contexts(developer_id) WHERE developer_id IS NOT NULL;

-- 5. Subdomínios (preparando Fase 2)
ALTER TABLE developers 
  ADD COLUMN IF NOT EXISTS subdomain VARCHAR(63) UNIQUE,
  ADD COLUMN IF NOT EXISTS subdomain_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS subdomain_approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS landing_title TEXT,
  ADD COLUMN IF NOT EXISTS landing_description TEXT,
  ADD COLUMN IF NOT EXISTS landing_background_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_developers_subdomain 
  ON developers(subdomain) WHERE subdomain IS NOT NULL;

-- Palavras reservadas para subdomínio (validar no backend):
-- www, app, api, admin, dev, login, cadastro, mail, smtp, ftp, blog, docs, help, support, status
