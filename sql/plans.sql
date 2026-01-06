-- Tabela de planos
CREATE TABLE IF NOT EXISTS powerbi_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  max_daily_refreshes INTEGER NOT NULL DEFAULT 1,
  max_powerbi_screens INTEGER NOT NULL DEFAULT 3,
  max_users INTEGER NOT NULL DEFAULT 10,
  max_companies INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna plan_id na tabela company_groups se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'company_groups' AND column_name = 'plan_id') THEN
    ALTER TABLE company_groups ADD COLUMN plan_id UUID REFERENCES powerbi_plans(id);
  END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_powerbi_plans_display_order ON powerbi_plans(display_order);
CREATE INDEX IF NOT EXISTS idx_powerbi_plans_is_active ON powerbi_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_company_groups_plan_id ON company_groups(plan_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_powerbi_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_powerbi_plans_updated_at
  BEFORE UPDATE ON powerbi_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_powerbi_plans_updated_at();

-- Inserir planos padrão
INSERT INTO powerbi_plans (name, description, max_daily_refreshes, max_powerbi_screens, max_users, max_companies, display_order, is_active)
VALUES 
  ('Plano Básico', 'Ideal para pequenas empresas', 5, 3, 5, 1, 1, true),
  ('Plano Profissional', 'Para empresas em crescimento', 20, 10, 20, 5, 2, true),
  ('Plano Enterprise', 'Recursos ilimitados', 999, 999, 999, 999, 3, true)
ON CONFLICT DO NOTHING;

