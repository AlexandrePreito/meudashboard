-- =============================================
-- SISTEMA DE TREINAMENTO DO ASSISTENTE IA
-- =============================================

-- Tabela: Exemplos de Treinamento Validados
CREATE TABLE IF NOT EXISTS ai_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES powerbi_connections(id) ON DELETE CASCADE,
  dataset_id TEXT,
  
  -- Pergunta e Resposta
  user_question TEXT NOT NULL,
  dax_query TEXT NOT NULL,
  formatted_response TEXT NOT NULL,
  
  -- Metadados
  category TEXT, -- ex: "faturamento", "vendas", "estoque"
  tags TEXT[], -- ex: ["mensal", "por filial", "comparativo"]
  
  -- Validação
  is_validated BOOLEAN DEFAULT TRUE,
  validation_count INTEGER DEFAULT 1, -- quantas vezes foi confirmado como correto
  last_used_at TIMESTAMPTZ,
  
  -- Auditoria
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_training_company_group ON ai_training_examples(company_group_id);
CREATE INDEX idx_training_connection ON ai_training_examples(connection_id);
CREATE INDEX idx_training_dataset ON ai_training_examples(dataset_id);
CREATE INDEX idx_training_validated ON ai_training_examples(is_validated);
CREATE INDEX idx_training_question_search ON ai_training_examples USING gin(to_tsvector('portuguese', user_question));

-- =============================================

-- Tabela: Perguntas Sem Resposta (Fila de Treinamento)
CREATE TABLE IF NOT EXISTS ai_unanswered_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES powerbi_connections(id) ON DELETE CASCADE,
  dataset_id TEXT,
  
  -- Pergunta
  user_question TEXT NOT NULL,
  phone_number TEXT NOT NULL, -- quem perguntou
  
  -- Tentativas de resposta
  attempted_dax TEXT, -- query DAX que foi tentada
  error_message TEXT, -- erro retornado
  attempt_count INTEGER DEFAULT 1,
  
  -- Priorização
  priority_score DECIMAL DEFAULT 0, -- calculado automaticamente
  user_count INTEGER DEFAULT 1, -- quantos usuários diferentes tentaram
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'ignored')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  training_example_id UUID REFERENCES ai_training_examples(id), -- quando resolver
  
  -- Auditoria
  first_asked_at TIMESTAMPTZ DEFAULT NOW(),
  last_asked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_unanswered_company_group ON ai_unanswered_questions(company_group_id);
CREATE INDEX idx_unanswered_status ON ai_unanswered_questions(status);
CREATE INDEX idx_unanswered_priority ON ai_unanswered_questions(priority_score DESC);
CREATE INDEX idx_unanswered_phone ON ai_unanswered_questions(phone_number);

-- =============================================

-- Função: Calcular prioridade automaticamente
CREATE OR REPLACE FUNCTION calculate_question_priority()
RETURNS TRIGGER AS $$
BEGIN
  NEW.priority_score := 
    (NEW.user_count * 3) + 
    (NEW.attempt_count * 2) + 
    (EXTRACT(EPOCH FROM (NOW() - NEW.last_asked_at)) / 86400); -- dias desde última tentativa
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Atualizar prioridade ao modificar
CREATE TRIGGER update_question_priority
BEFORE INSERT OR UPDATE ON ai_unanswered_questions
FOR EACH ROW
EXECUTE FUNCTION calculate_question_priority();

-- =============================================

-- Função: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_training_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Atualizar timestamp
CREATE TRIGGER update_training_examples_timestamp
BEFORE UPDATE ON ai_training_examples
FOR EACH ROW
EXECUTE FUNCTION update_training_timestamp();

-- =============================================

-- Tabela: Estatísticas de Uso do Assistente (nova)
CREATE TABLE IF NOT EXISTS ai_assistant_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Métricas
  questions_asked INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  questions_failed INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  
  -- Taxas
  success_rate DECIMAL, -- calculado: answered / asked
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_group_id, stat_date)
);

CREATE INDEX idx_assistant_stats_group_date ON ai_assistant_stats(company_group_id, stat_date DESC);

-- =============================================

-- RLS (Row Level Security)
ALTER TABLE ai_training_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_unanswered_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_assistant_stats ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para ai_training_examples
CREATE POLICY training_examples_isolation ON ai_training_examples
  FOR ALL
  USING (
    company_group_id IN (
      SELECT company_group_id FROM user_group_memberships 
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Políticas RLS para ai_unanswered_questions
CREATE POLICY unanswered_questions_isolation ON ai_unanswered_questions
  FOR ALL
  USING (
    company_group_id IN (
      SELECT company_group_id FROM user_group_memberships 
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- Políticas RLS para ai_assistant_stats
CREATE POLICY assistant_stats_isolation ON ai_assistant_stats
  FOR ALL
  USING (
    company_group_id IN (
      SELECT company_group_id FROM user_group_memberships 
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- =============================================
-- FIM DA MIGRATION
-- =============================================
