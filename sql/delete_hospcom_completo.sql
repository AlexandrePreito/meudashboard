-- ============================================
-- Script COMPLETO para deletar grupo "hospcom" e usuários @hospcom.net
-- ============================================
-- ATENÇÃO: Esta operação é IRREVERSÍVEL!
-- Execute com cuidado e faça backup antes.
-- ============================================

-- ============================================
-- PARTE 1: VERIFICAÇÃO (Execute primeiro para revisar)
-- ============================================

-- Verificar grupo hospcom
SELECT 
  id,
  name,
  slug,
  developer_id,
  status,
  created_at
FROM company_groups
WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%';

-- Verificar usuários @hospcom.net
SELECT 
  id,
  email,
  full_name,
  is_master,
  is_developer,
  status,
  created_at
FROM users
WHERE email ILIKE '%@hospcom.net'
ORDER BY created_at;

-- ============================================
-- PARTE 2: DELETAR DADOS DO GRUPO HOSPCOM
-- ============================================

-- 1. Deletar relacionamentos de telas Power BI
DELETE FROM powerbi_screen_users
WHERE screen_id IN (
  SELECT id FROM powerbi_dashboard_screens 
  WHERE company_group_id IN (
    SELECT id FROM company_groups 
    WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
  )
);

-- 2. Deletar ordem de telas
DELETE FROM user_screen_order
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 3. Deletar telas Power BI
DELETE FROM powerbi_dashboard_screens
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 4. Deletar contextos de IA
DELETE FROM ai_model_contexts
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 5. Deletar logs de execução de alertas
DELETE FROM alert_execution_logs
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 6. Deletar alertas
DELETE FROM ai_alerts
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 7. Deletar datasets de números WhatsApp
DELETE FROM whatsapp_number_datasets
WHERE authorized_number_id IN (
  SELECT id FROM whatsapp_authorized_numbers
  WHERE company_group_id IN (
    SELECT id FROM company_groups 
    WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
  )
);

-- 8. Deletar números WhatsApp autorizados
DELETE FROM whatsapp_authorized_numbers
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 9. Deletar mensagens WhatsApp
DELETE FROM whatsapp_messages
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 10. Deletar vínculos de instâncias WhatsApp
DELETE FROM whatsapp_instance_groups
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 11. Deletar seleções de usuários WhatsApp
DELETE FROM whatsapp_user_selections
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 12. Deletar contexto de usuários WhatsApp
DELETE FROM whatsapp_user_context
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 13. Deletar membros do grupo
DELETE FROM user_group_membership
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 14. Deletar conexões Power BI
DELETE FROM powerbi_connections
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 15. Deletar módulos do grupo
DELETE FROM group_modules
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 16. Deletar ordem de atualização
DELETE FROM powerbi_refresh_order
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 17. Deletar uso diário
DELETE FROM daily_usage
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 18. Deletar resumo de uso
DELETE FROM user_usage_summary
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 19. Deletar logs de atividade do grupo
DELETE FROM activity_logs
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 20. FINALMENTE: Deletar o grupo hospcom
DELETE FROM company_groups
WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%';

-- ============================================
-- PARTE 3: DELETAR USUÁRIOS @hospcom.net
-- ============================================

-- 1. Deletar memberships dos usuários
DELETE FROM user_group_membership
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 2. Deletar relacionamentos de telas Power BI
DELETE FROM powerbi_screen_users
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 3. Deletar ordem de telas por usuário
DELETE FROM user_screen_order
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 4. Deletar logs de atividade dos usuários
DELETE FROM activity_logs
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 5. Deletar uso diário dos usuários
DELETE FROM daily_usage
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 6. Deletar resumo de uso dos usuários
DELETE FROM user_usage_summary
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 7. Deletar seleções de usuários WhatsApp
DELETE FROM whatsapp_user_selections
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 8. Deletar contexto de usuários WhatsApp
DELETE FROM whatsapp_user_context
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 9. Deletar queries de aprendizado de IA (se existir)
DELETE FROM ai_query_learning
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 10. FINALMENTE: Deletar os usuários da tabela users
DELETE FROM users
WHERE email ILIKE '%@hospcom.net';

-- ============================================
-- PARTE 4: VERIFICAÇÃO FINAL
-- ============================================

-- Verificar se o grupo ainda existe
SELECT COUNT(*) as grupos_restantes
FROM company_groups
WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%';

-- Verificar se ainda existem usuários @hospcom.net
SELECT COUNT(*) as usuarios_restantes
FROM users
WHERE email ILIKE '%@hospcom.net';

-- ============================================
-- NOTA IMPORTANTE:
-- ============================================
-- Os usuários também precisam ser deletados
-- do Supabase Auth via Dashboard ou API.
-- 
-- Para deletar do Auth:
-- 1. Acesse o Dashboard do Supabase
-- 2. Vá em Authentication > Users
-- 3. Busque por "@hospcom.net"
-- 4. Selecione e delete cada usuário
-- 
-- Ou use a API do Supabase:
-- DELETE /auth/v1/admin/users/{user_id}
-- ============================================
