-- Migration: add_context_type_to_ai_model_contexts
-- Adiciona coluna context_type para diferenciar documentação Chat de Base de DAX
-- Data: 2025-01-24

-- Adicionar coluna context_type se não existir
ALTER TABLE ai_model_contexts 
ADD COLUMN IF NOT EXISTS context_type VARCHAR(20) DEFAULT 'chat';

-- Atualizar contextos existentes para 'chat' (padrão)
UPDATE ai_model_contexts 
SET context_type = 'chat' 
WHERE context_type IS NULL;

-- Criar índice para busca por dataset e tipo
CREATE INDEX IF NOT EXISTS idx_ai_model_contexts_dataset_type 
ON ai_model_contexts(dataset_id, context_type);

-- Comentário na coluna
COMMENT ON COLUMN ai_model_contexts.context_type IS 'Tipo de contexto: chat (documentação para chat) ou dax (base completa de DAX)';

-- Nota: Esta migration deve ser executada manualmente no Supabase SQL Editor
