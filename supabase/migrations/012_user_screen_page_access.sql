-- Controle de acesso por página do Power BI por usuário
-- Se não houver registros para um user_id+screen_id, o usuário vê TODAS as páginas (padrão)
-- Se houver registros, o usuário só vê as páginas com is_allowed = true

CREATE TABLE IF NOT EXISTS user_screen_page_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  screen_id UUID NOT NULL REFERENCES powerbi_dashboard_screens(id) ON DELETE CASCADE,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  page_name TEXT NOT NULL,
  display_name TEXT,
  is_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, screen_id, page_name)
);

-- Index para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_user_screen_page_access_user_screen
  ON user_screen_page_access(user_id, screen_id);

-- RLS
ALTER TABLE user_screen_page_access ENABLE ROW LEVEL SECURITY;

-- Policy: service_role pode tudo (admin client)
CREATE POLICY "service_role_all" ON user_screen_page_access
  FOR ALL USING (true) WITH CHECK (true);
