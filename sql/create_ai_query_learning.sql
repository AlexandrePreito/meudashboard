-- Tabela para armazenar aprendizado de queries DAX
CREATE TABLE IF NOT EXISTS ai_query_learning (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  user_question TEXT NOT NULL,
  question_intent TEXT NOT NULL,
  dax_query TEXT NOT NULL,
  dax_query_hash TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  execution_time_ms INTEGER,
  result_rows INTEGER,
  times_reused INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ai_query_learning_dataset ON ai_query_learning(dataset_id);
CREATE INDEX IF NOT EXISTS idx_ai_query_learning_intent ON ai_query_learning(question_intent);
CREATE INDEX IF NOT EXISTS idx_ai_query_learning_success ON ai_query_learning(success);
CREATE INDEX IF NOT EXISTS idx_ai_query_learning_hash ON ai_query_learning(dax_query_hash);
CREATE INDEX IF NOT EXISTS idx_ai_query_learning_company ON ai_query_learning(company_group_id);
CREATE INDEX IF NOT EXISTS idx_ai_query_learning_reused ON ai_query_learning(times_reused DESC);

-- Índice composto para busca rápida de queries que funcionaram
CREATE INDEX IF NOT EXISTS idx_ai_query_learning_dataset_intent_success 
  ON ai_query_learning(dataset_id, question_intent, success) 
  WHERE success = true;
