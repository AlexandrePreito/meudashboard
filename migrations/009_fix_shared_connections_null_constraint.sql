-- =============================================
-- FIX: Permitir company_group_id NULL em powerbi_connections
-- para suportar conexões compartilhadas no nível do developer.
-- A migration 006 adicionou developer_id mas esqueceu de
-- remover o NOT NULL de company_group_id.
-- =============================================

-- Permitir NULL em company_group_id (necessário para conexões compartilhadas)
ALTER TABLE powerbi_connections
  ALTER COLUMN company_group_id DROP NOT NULL;

-- Garantir que toda conexão tenha pelo menos company_group_id OU developer_id
ALTER TABLE powerbi_connections
  DROP CONSTRAINT IF EXISTS chk_connection_owner;

ALTER TABLE powerbi_connections
  ADD CONSTRAINT chk_connection_owner
  CHECK (company_group_id IS NOT NULL OR developer_id IS NOT NULL);
