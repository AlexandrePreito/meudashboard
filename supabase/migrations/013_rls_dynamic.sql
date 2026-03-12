-- ============================================================
-- RLS dinâmico por tela
-- ============================================================

-- 1. Colunas na tela (powerbi_dashboard_screens)
ALTER TABLE powerbi_dashboard_screens
  ADD COLUMN IF NOT EXISTS rls_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rls_role_name TEXT DEFAULT NULL;

COMMENT ON COLUMN powerbi_dashboard_screens.rls_enabled IS 'Se true, o embed token inclui EffectiveIdentity com RLS';
COMMENT ON COLUMN powerbi_dashboard_screens.rls_role_name IS 'Nome da role RLS configurada no Power BI Desktop (ex: RLS_Email)';

-- 2. Garantir dataset_id no relatório (obrigatório para RLS no GenerateToken)
ALTER TABLE powerbi_reports ADD COLUMN IF NOT EXISTS dataset_id TEXT;

-- 3. Tabela para email customizado por usuário por tela
-- Se não houver registro, usa o email de login do usuário (padrão)
CREATE TABLE IF NOT EXISTS user_rls_identity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  screen_id UUID NOT NULL REFERENCES powerbi_dashboard_screens(id) ON DELETE CASCADE,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  rls_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, screen_id)
);

CREATE INDEX IF NOT EXISTS idx_user_rls_identity_user_screen
  ON user_rls_identity(user_id, screen_id);

-- RLS
ALTER TABLE user_rls_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON user_rls_identity
  FOR ALL USING (true) WITH CHECK (true);
