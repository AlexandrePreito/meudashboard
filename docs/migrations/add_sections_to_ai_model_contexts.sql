-- Migration: add_sections_to_ai_model_contexts
-- Data: 2025-01-24
-- Descrição: Adiciona colunas para armazenar seções parseadas da documentação

ALTER TABLE ai_model_contexts 
ADD COLUMN IF NOT EXISTS section_base TEXT,
ADD COLUMN IF NOT EXISTS section_medidas JSONB,
ADD COLUMN IF NOT EXISTS section_tabelas JSONB,
ADD COLUMN IF NOT EXISTS section_queries JSONB,
ADD COLUMN IF NOT EXISTS section_exemplos JSONB,
ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN ai_model_contexts.section_base IS 'Visão geral do modelo (texto markdown)';
COMMENT ON COLUMN ai_model_contexts.section_medidas IS 'Array de medidas em JSON';
COMMENT ON COLUMN ai_model_contexts.section_tabelas IS 'Array de tabelas/colunas em JSON';
COMMENT ON COLUMN ai_model_contexts.section_queries IS 'Array de queries pré-configuradas em JSON';
COMMENT ON COLUMN ai_model_contexts.section_exemplos IS 'Array de exemplos pergunta/resposta em JSON';
COMMENT ON COLUMN ai_model_contexts.parsed_at IS 'Data/hora em que a documentação foi parseada';

-- Nota: Esta migration deve ser executada manualmente no Supabase SQL Editor
