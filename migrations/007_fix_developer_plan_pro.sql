-- ============================================
-- Migration: Atribuir plano Pro ao desenvolvedor ces@ces.com.br
-- Execute este script no Supabase SQL Editor se o usuário ces@ces.com.br
-- estiver aparecendo como Free quando deveria ser Pro
-- ============================================

-- Atualiza o developer vinculado ao usuário ces@ces.com.br para o plano Pro
UPDATE developers d
SET plan_id = (SELECT id FROM developer_plans WHERE name = 'Pro' AND is_active = true LIMIT 1)
FROM users u
WHERE u.developer_id = d.id
  AND u.email = 'ces@ces.com.br'
  AND (d.plan_id IS NULL OR d.plan_id IN (SELECT id FROM developer_plans WHERE name = 'Free'));

-- Verificar resultado (opcional - descomente para conferir):
-- SELECT u.email, d.name as developer_name, dp.name as plan_name
-- FROM users u
-- JOIN developers d ON d.id = u.developer_id
-- LEFT JOIN developer_plans dp ON dp.id = d.plan_id
-- WHERE u.email = 'ces@ces.com.br';
