-- Criar tabela ai_pending_questions para perguntas não respondidas
-- Esta tabela é usada para salvar perguntas que a IA não conseguiu responder

CREATE TABLE IF NOT EXISTS ai_pending_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_group_id UUID REFERENCES company_groups(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES powerbi_connections(id) ON DELETE SET NULL,
  dataset_id TEXT NOT NULL,
  
  -- Pergunta
  user_question TEXT NOT NULL,
  user_phone TEXT, -- telefone do usuário (WhatsApp)
  source TEXT DEFAULT 'whatsapp', -- 'whatsapp', 'chat_web'
  
  -- Contexto da falha
  ai_response TEXT, -- resposta genérica que a IA deu
  failure_reason TEXT, -- 'no_data', 'no_query_match', 'execution_error', 'evasive_response', 'unknown'
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'trained', 'ignored'
  trained_at TIMESTAMP,
  trained_by UUID REFERENCES auth.users(id),
  training_example_id UUID REFERENCES ai_training_examples(id), -- link para ai_training_examples após treinar
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pending_group ON ai_pending_questions(company_group_id);
CREATE INDEX IF NOT EXISTS idx_pending_dataset ON ai_pending_questions(dataset_id);
CREATE INDEX IF NOT EXISTS idx_pending_status ON ai_pending_questions(status);
CREATE INDEX IF NOT EXISTS idx_pending_created ON ai_pending_questions(created_at DESC);

-- Comentários
COMMENT ON TABLE ai_pending_questions IS 'Perguntas que a IA não conseguiu responder, aguardando treinamento';
COMMENT ON COLUMN ai_pending_questions.failure_reason IS 'Razão da falha: no_data, no_query_match, execution_error, evasive_response, unknown';
COMMENT ON COLUMN ai_pending_questions.source IS 'Origem da pergunta: whatsapp ou chat_web';
