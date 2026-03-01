-- Tabela para armazenar solicitações de proposta da landing page
CREATE TABLE IF NOT EXISTS lead_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  usage_type TEXT NOT NULL CHECK (usage_type IN ('empresa_final', 'revenda')),
  groups_count INTEGER NOT NULL,
  reports_count INTEGER NOT NULL,
  users_count INTEGER NOT NULL,
  wants_subdomain BOOLEAN NOT NULL DEFAULT false,
  ia_messages_per_day TEXT NOT NULL CHECK (ia_messages_per_day IN ('30', '50', '80', '100+')),
  alerts_per_day TEXT NOT NULL CHECK (alerts_per_day IN ('10', '30', '50', '80', '100+')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para buscar por data
CREATE INDEX IF NOT EXISTS idx_lead_proposals_created_at ON lead_proposals(created_at DESC);

-- RLS: Insert via API (service role). Leitura apenas para autenticados.
ALTER TABLE lead_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas autenticados podem ler lead_proposals"
  ON lead_proposals FOR SELECT
  USING (auth.role() = 'authenticated');
