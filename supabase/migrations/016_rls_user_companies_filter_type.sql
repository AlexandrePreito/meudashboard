-- ============================================================
-- RLS: coluna filter_type para filtros dinâmicos (Filial, Região, Vendedor, etc.)
-- ============================================================

ALTER TABLE rls_user_companies
  ADD COLUMN IF NOT EXISTS filter_type TEXT NOT NULL DEFAULT 'default';

COMMENT ON COLUMN rls_user_companies.filter_type IS 'Tipo de filtro RLS (ex: Filial, Regiao, Vendedor). default = compatibilidade com dados antigos.';

-- Atualizar registros existentes sem filter_type (caso a coluna já exista sem default)
UPDATE rls_user_companies SET filter_type = 'default' WHERE filter_type IS NULL;

-- Unique passa a incluir filter_type (permite mesmo company_code em tipos diferentes)
ALTER TABLE rls_user_companies DROP CONSTRAINT IF EXISTS rls_user_companies_user_id_company_group_id_company_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_rls_user_companies_user_group_type_code
  ON rls_user_companies(user_id, company_group_id, filter_type, company_code);
