-- Suporte a configuração de apresentação por PÁGINAS do relatório Power BI (dentro de uma tela)
-- screen_id_ref = tela do sistema (powerbi_dashboard_screens)
-- page_name = nome da página no Power BI (ex: ReportSection1, vDiaria)

ALTER TABLE user_screen_presentation ADD COLUMN IF NOT EXISTS page_name TEXT;
ALTER TABLE user_screen_presentation ADD COLUMN IF NOT EXISTS screen_id_ref UUID REFERENCES powerbi_dashboard_screens(id) ON DELETE CASCADE;

-- Permitir screen_id nulo quando for config por páginas (screen_id_ref + page_name)
ALTER TABLE user_screen_presentation ALTER COLUMN screen_id DROP NOT NULL;

-- Índice para buscar config de páginas por tela
CREATE INDEX IF NOT EXISTS idx_user_screen_presentation_screen_ref
  ON user_screen_presentation(user_id, company_group_id, screen_id_ref) WHERE screen_id_ref IS NOT NULL;

-- Unicidade por usuário/grupo/tela/página (para config de páginas)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_screen_presentation_page_unique
  ON user_screen_presentation(user_id, company_group_id, screen_id_ref, page_name)
  WHERE screen_id_ref IS NOT NULL AND page_name IS NOT NULL;

COMMENT ON COLUMN user_screen_presentation.page_name IS 'Nome da página do relatório Power BI (modo apresentação por páginas)';
COMMENT ON COLUMN user_screen_presentation.screen_id_ref IS 'Tela do sistema à qual a página pertence (modo apresentação por páginas)';
