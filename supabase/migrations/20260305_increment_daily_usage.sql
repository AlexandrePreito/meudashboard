-- RPC para incrementar contadores de daily_usage (upsert com soma).
-- Uso: webhook WhatsApp (whatsapp_messages_sent, ai_tokens), alertas (alert_executions), refresh Power BI (dataset_refreshes).

CREATE OR REPLACE FUNCTION increment_daily_usage(
  p_group_id UUID,
  p_date DATE DEFAULT CURRENT_DATE,
  p_whatsapp INT DEFAULT 0,
  p_alerts INT DEFAULT 0,
  p_ai_credits INT DEFAULT 0,
  p_tokens_in INT DEFAULT 0,
  p_tokens_out INT DEFAULT 0,
  p_refreshes INT DEFAULT 0
) RETURNS void AS $$
BEGIN
  INSERT INTO daily_usage (
    company_group_id,
    usage_date,
    whatsapp_messages_sent,
    alert_executions,
    ai_credits_used,
    ai_tokens_input,
    ai_tokens_output,
    dataset_refreshes
  )
  VALUES (
    p_group_id,
    p_date,
    p_whatsapp,
    p_alerts,
    p_ai_credits,
    p_tokens_in,
    p_tokens_out,
    p_refreshes
  )
  ON CONFLICT (company_group_id, usage_date) DO UPDATE SET
    whatsapp_messages_sent = daily_usage.whatsapp_messages_sent + EXCLUDED.whatsapp_messages_sent,
    alert_executions = daily_usage.alert_executions + EXCLUDED.alert_executions,
    ai_credits_used = daily_usage.ai_credits_used + EXCLUDED.ai_credits_used,
    ai_tokens_input = daily_usage.ai_tokens_input + EXCLUDED.ai_tokens_input,
    ai_tokens_output = daily_usage.ai_tokens_output + EXCLUDED.ai_tokens_output,
    dataset_refreshes = daily_usage.dataset_refreshes + EXCLUDED.dataset_refreshes,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;
