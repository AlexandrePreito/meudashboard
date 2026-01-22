-- ============================================
-- Script para deletar usuários @hospcom.net
-- ============================================
-- ATENÇÃO: Esta operação é IRREVERSÍVEL!
-- Execute com cuidado e faça backup antes.
-- ============================================

-- 1. Verificar quais usuários serão deletados (execute primeiro para revisar)
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

-- 2. Deletar memberships dos usuários @hospcom.net
DELETE FROM user_group_membership
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 3. Deletar relacionamentos de telas Power BI
DELETE FROM powerbi_screen_users
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 4. Deletar ordem de telas por usuário
DELETE FROM user_screen_order
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 5. Deletar logs de atividade dos usuários
DELETE FROM activity_logs
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 6. Deletar uso diário dos usuários
DELETE FROM daily_usage
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 7. Deletar resumo de uso dos usuários
DELETE FROM user_usage_summary
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 8. Deletar seleções de usuários WhatsApp
DELETE FROM whatsapp_user_selections
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 9. Deletar contexto de usuários WhatsApp
DELETE FROM whatsapp_user_context
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 10. Deletar queries de aprendizado de IA (se existir)
DELETE FROM ai_query_learning
WHERE user_id IN (
  SELECT id FROM users WHERE email ILIKE '%@hospcom.net'
);

-- 11. FINALMENTE: Deletar os usuários da tabela users
-- ⚠️ IMPORTANTE: Execute os comandos acima primeiro!
DELETE FROM users
WHERE email ILIKE '%@hospcom.net';

-- ============================================
-- NOTA: Os usuários também precisam ser deletados
-- do Supabase Auth via API ou Dashboard.
-- 
-- Para deletar do Auth, use o Dashboard do Supabase:
-- Authentication > Users > Buscar por @hospcom.net > Deletar
-- 
-- Ou use a API:
-- DELETE /auth/v1/admin/users/{user_id}
-- ============================================

-- Verificar se ainda existem usuários @hospcom.net
SELECT COUNT(*) as usuarios_restantes
FROM users
WHERE email ILIKE '%@hospcom.net';
