-- Tabela para controle de limite diário de disparos por grupo (10/dia)
CREATE TABLE IF NOT EXISTS refresh_alert_daily_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES refresh_alerts(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('error', 'delay', 'daily_report')),
  item_name TEXT,
  date_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_alert_daily_log_group_date ON refresh_alert_daily_log(company_group_id, date_key);
