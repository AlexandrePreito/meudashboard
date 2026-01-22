-- ============================================
-- Script para deletar o grupo "hospcom"
-- ============================================
-- ATENÇÃO: Esta operação é IRREVERSÍVEL!
-- Execute com cuidado e faça backup antes.
-- ============================================

-- 1. Verificar o grupo que será deletado (execute primeiro para revisar)
SELECT 
  id,
  name,
  slug,
  developer_id,
  status,
  created_at
FROM company_groups
WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%';

-- 2. Buscar o ID do grupo (substitua 'ID_DO_GRUPO' pelo ID real)
-- Exemplo: WHERE id = '123e4567-e89b-12d3-a456-426614174000'
-- Ou use: WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'

-- Variável para o ID do grupo (ajuste conforme necessário)
-- Para usar, substitua 'ID_DO_GRUPO' nos comandos abaixo pelo ID real do grupo

-- 3. Deletar relacionamentos de telas Power BI
DELETE FROM powerbi_screen_users
WHERE screen_id IN (
  SELECT id FROM powerbi_dashboard_screens 
  WHERE company_group_id IN (
    SELECT id FROM company_groups 
    WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
  )
);

-- 4. Deletar ordem de telas
DELETE FROM user_screen_order
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 5. Deletar telas Power BI
DELETE FROM powerbi_dashboard_screens
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 6. Deletar contextos de IA
DELETE FROM ai_model_contexts
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 7. Deletar logs de execução de alertas
DELETE FROM alert_execution_logs
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 8. Deletar alertas
DELETE FROM ai_alerts
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 9. Deletar datasets de números WhatsApp
DELETE FROM whatsapp_number_datasets
WHERE authorized_number_id IN (
  SELECT id FROM whatsapp_authorized_numbers
  WHERE company_group_id IN (
    SELECT id FROM company_groups 
    WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
  )
);

-- 10. Deletar números WhatsApp autorizados
DELETE FROM whatsapp_authorized_numbers
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 11. Deletar mensagens WhatsApp
DELETE FROM whatsapp_messages
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 12. Deletar vínculos de instâncias WhatsApp
DELETE FROM whatsapp_instance_groups
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 13. Deletar seleções de usuários WhatsApp
DELETE FROM whatsapp_user_selections
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 14. Deletar contexto de usuários WhatsApp
DELETE FROM whatsapp_user_context
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 15. Deletar membros do grupo
DELETE FROM user_group_membership
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 16. Deletar conexões Power BI
DELETE FROM powerbi_connections
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 17. Deletar módulos do grupo
DELETE FROM group_modules
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 18. Deletar ordem de atualização
DELETE FROM powerbi_refresh_order
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 19. Deletar uso diário
DELETE FROM daily_usage
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 20. Deletar resumo de uso
DELETE FROM user_usage_summary
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 21. Deletar logs de atividade
DELETE FROM activity_logs
WHERE company_group_id IN (
  SELECT id FROM company_groups 
  WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%'
);

-- 22. FINALMENTE: Deletar o grupo
-- ⚠️ IMPORTANTE: Execute os comandos acima primeiro!
DELETE FROM company_groups
WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%';

-- Verificar se o grupo ainda existe
SELECT COUNT(*) as grupos_restantes
FROM company_groups
WHERE name ILIKE '%hospcom%' OR slug ILIKE '%hospcom%';
