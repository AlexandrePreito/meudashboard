-- Tabela para armazenar mensagens pendentes do WhatsApp para retry assíncrono
CREATE TABLE IF NOT EXISTS whatsapp_message_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  message_content TEXT NOT NULL,
  conversation_history JSONB,
  system_prompt TEXT,
  connection_id UUID,
  dataset_id TEXT,
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,
  error_type TEXT, -- temporary, permanent
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_status ON whatsapp_message_queue(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_next_retry ON whatsapp_message_queue(next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_phone ON whatsapp_message_queue(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_company ON whatsapp_message_queue(company_group_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_created ON whatsapp_message_queue(created_at);

-- Índice composto para busca eficiente de mensagens pendentes para processar
CREATE INDEX IF NOT EXISTS idx_whatsapp_queue_pending_retry 
  ON whatsapp_message_queue(status, next_retry_at) 
  WHERE status = 'pending' AND next_retry_at IS NOT NULL;

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_whatsapp_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_whatsapp_queue_updated_at ON whatsapp_message_queue;
CREATE TRIGGER trigger_update_whatsapp_queue_updated_at
  BEFORE UPDATE ON whatsapp_message_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_whatsapp_queue_updated_at();

-- Limpeza automática de mensagens antigas (mais de 24h)
CREATE OR REPLACE FUNCTION cleanup_old_whatsapp_queue()
RETURNS void AS $$
BEGIN
  DELETE FROM whatsapp_message_queue
  WHERE created_at < NOW() - INTERVAL '24 hours'
    AND status IN ('completed', 'failed');
END;
$$ LANGUAGE plpgsql;
