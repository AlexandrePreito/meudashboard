-- ============================================================
-- Tabela de filiais/empresas por usuário para RLS no Power BI
-- O Power BI importa esta tabela via conector PostgreSQL
-- ============================================================

CREATE TABLE IF NOT EXISTS rls_user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  company_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_group_id, company_code)
);

-- Índices para consulta do Power BI (filtra por email)
CREATE INDEX IF NOT EXISTS idx_rls_user_companies_email
  ON rls_user_companies(user_email);

CREATE INDEX IF NOT EXISTS idx_rls_user_companies_user
  ON rls_user_companies(user_id, company_group_id);

-- RLS
ALTER TABLE rls_user_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON rls_user_companies
  FOR ALL USING (true) WITH CHECK (true);

-- Comentários
COMMENT ON TABLE rls_user_companies IS 'Tabela de acesso RLS por filial. Power BI importa via PostgreSQL e filtra por USERPRINCIPALNAME()';
COMMENT ON COLUMN rls_user_companies.user_email IS 'Email de login do usuário (duplicado para facilitar consulta do Power BI sem JOIN)';
COMMENT ON COLUMN rls_user_companies.company_code IS 'Código da filial/empresa (ex: 01, 02, Filial Centro)';
