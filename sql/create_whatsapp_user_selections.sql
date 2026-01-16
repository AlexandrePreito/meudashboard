-- Tabela para armazenar seleções temporárias de dataset por usuário
CREATE TABLE IF NOT EXISTS whatsapp_user_selections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  selected_connection_id UUID NOT NULL,
  selected_dataset_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_whatsapp_user_selections_phone ON whatsapp_user_selections(phone_number);
CREATE INDEX idx_whatsapp_user_selections_company ON whatsapp_user_selections(company_group_id);
CREATE INDEX idx_whatsapp_user_selections_created ON whatsapp_user_selections(created_at);

-- Limpeza automática de seleções antigas (mais de 24h)
CREATE OR REPLACE FUNCTION cleanup_old_user_selections()
RETURNS void AS $$
BEGIN
  DELETE FROM whatsapp_user_selections
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;
