-- Corrige a view user_usage_summary: módulo correto é 'assistente-ia' (não apenas 'chat_ia').
-- Mantém 'chat_ia' no FILTER para compatibilidade com logs antigos.

CREATE OR REPLACE VIEW user_usage_summary AS
SELECT
  u.id AS user_id,
  u.full_name,
  u.email,
  m.company_group_id,
  g.name AS group_name,
  COUNT(DISTINCT date(al.created_at)) AS days_active,
  COUNT(al.id) AS total_actions,
  COUNT(al.id) FILTER (WHERE al.module IN ('assistente-ia', 'chat_ia')) AS chat_queries,
  COUNT(al.id) FILTER (WHERE al.module = 'powerbi') AS powerbi_views,
  COUNT(al.id) FILTER (WHERE al.action_type = 'login') AS login_count,
  COALESCE(SUM(us.duration_minutes), 0) AS total_minutes_online
FROM users u
  LEFT JOIN user_group_membership m ON m.user_id = u.id AND m.is_active = true
  LEFT JOIN company_groups g ON g.id = m.company_group_id
  LEFT JOIN activity_logs al ON al.user_id = u.id AND al.company_group_id = m.company_group_id
  LEFT JOIN user_sessions us ON us.user_id = u.id
GROUP BY u.id, u.full_name, u.email, m.company_group_id, g.name;
