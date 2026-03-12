-- ============================================================
-- Chaves de API para acesso público ao RLS (Power BI)
-- ============================================================

CREATE TABLE IF NOT EXISTS rls_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  api_key UUID NOT NULL DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_group_id),
  UNIQUE(api_key)
);

CREATE INDEX IF NOT EXISTS idx_rls_api_keys_key
  ON rls_api_keys(api_key) WHERE is_active = true;

-- RLS
ALTER TABLE rls_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON rls_api_keys
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE rls_api_keys IS 'Chaves de API para Power BI acessar dados RLS. Uma chave por grupo.';
