CREATE TABLE IF NOT EXISTS refresh_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_group_id UUID NOT NULL REFERENCES company_groups(id) ON DELETE CASCADE,
  refresh_order_item_id UUID,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('dataset', 'dataflow')),
  dataset_id TEXT,
  dataflow_id TEXT,
  connection_id UUID,
  is_enabled BOOLEAN DEFAULT true,
  alert_on_error BOOLEAN DEFAULT true,
  alert_on_delay BOOLEAN DEFAULT false,
  alert_daily_report BOOLEAN DEFAULT false,
  expected_refresh_time TEXT DEFAULT '08:00',
  daily_report_time TEXT DEFAULT '07:00',
  whatsapp_numbers TEXT,
  last_status TEXT,
  last_checked_at TIMESTAMPTZ,
  last_alerted_at TIMESTAMPTZ,
  last_daily_report_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_alerts_group ON refresh_alerts(company_group_id);
CREATE INDEX IF NOT EXISTS idx_refresh_alerts_enabled ON refresh_alerts(is_enabled) WHERE is_enabled = true;
