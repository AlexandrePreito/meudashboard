-- Criar tabela para armazenar ordem de atualização dos datasets e dataflows
CREATE TABLE IF NOT EXISTS powerbi_refresh_order (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_group_id)
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_powerbi_refresh_order_group ON powerbi_refresh_order(company_group_id);

-- Comentários
COMMENT ON TABLE powerbi_refresh_order IS 'Armazena a ordem de atualização de datasets e dataflows por grupo';
COMMENT ON COLUMN powerbi_refresh_order.company_group_id IS 'ID do grupo de empresa';
COMMENT ON COLUMN powerbi_refresh_order.items IS 'Array JSON com os itens na ordem de atualização';

-- Exemplo de estrutura do items:
-- [
--   {
--     "id": "uuid",
--     "name": "Nome do Dataset/Dataflow",
--     "type": "dataset" | "dataflow",
--     "dataset_id": "uuid-do-powerbi",
--     "order": 1
--   }
-- ]

