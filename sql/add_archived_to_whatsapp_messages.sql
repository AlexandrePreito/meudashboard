-- Adicionar campo para arquivar mensagens antigas
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_archived 
ON whatsapp_messages(archived);
