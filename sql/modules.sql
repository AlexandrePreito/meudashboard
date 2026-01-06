-- Tabela de módulos do sistema
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'BarChart3',
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_modules_name ON modules(name);
CREATE INDEX IF NOT EXISTS idx_modules_sort_order ON modules(sort_order);
CREATE INDEX IF NOT EXISTS idx_modules_is_enabled ON modules(is_enabled);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE FUNCTION update_modules_updated_at();

-- Tabela de associação módulo-grupo
CREATE TABLE IF NOT EXISTS module_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module_id, company_group_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_module_groups_module_id ON module_groups(module_id);
CREATE INDEX IF NOT EXISTS idx_module_groups_company_group_id ON module_groups(company_group_id);

-- Inserir módulos padrão
INSERT INTO modules (name, display_name, description, icon, is_enabled, sort_order)
VALUES 
  ('powerbi', 'Power BI', 'Dashboards e relatórios interativos do Power BI', 'BarChart3', true, 1),
  ('whatsapp', 'WhatsApp', 'Integração com WhatsApp e gestão de mensagens', 'MessageCircle', true, 2),
  ('alertas', 'Alertas', 'Sistema de alertas automáticos baseados em dados', 'Bell', true, 3),
  ('ia', 'Inteligência Artificial', 'Assistente de IA para análise de dados', 'Bot', true, 4)
ON CONFLICT (name) DO NOTHING;

-- Ativar Power BI para todos os grupos existentes
INSERT INTO module_groups (module_id, company_group_id)
SELECT m.id, g.id
FROM modules m
CROSS JOIN company_groups g
WHERE m.name = 'powerbi'
ON CONFLICT (module_id, company_group_id) DO NOTHING;

