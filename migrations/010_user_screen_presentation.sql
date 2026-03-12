-- Configuração de apresentação (modo TV) por usuário e grupo
-- Cada linha: usuário + tela + grupo, com is_enabled, ordem e duração em segundos

CREATE TABLE IF NOT EXISTS user_screen_presentation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  screen_id UUID NOT NULL REFERENCES powerbi_dashboard_screens(id) ON DELETE CASCADE,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 10 CHECK (duration_seconds >= 5 AND duration_seconds <= 120),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, screen_id, company_group_id)
);

CREATE INDEX IF NOT EXISTS idx_user_screen_presentation_user_group
  ON user_screen_presentation(user_id, company_group_id);

CREATE INDEX IF NOT EXISTS idx_user_screen_presentation_screen
  ON user_screen_presentation(screen_id);

COMMENT ON TABLE user_screen_presentation IS 'Configuração do modo apresentação (TV) por usuário: quais telas, ordem e tempo em segundos';
