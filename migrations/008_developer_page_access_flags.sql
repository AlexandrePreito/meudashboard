-- ============================================
-- Migration: Flags de acesso a páginas por developer
-- allow_powerbi_connections: /powerbi/conexoes
-- allow_whatsapp_instances: /whatsapp/instancias
-- ============================================

ALTER TABLE developers 
ADD COLUMN IF NOT EXISTS allow_powerbi_connections BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_whatsapp_instances BOOLEAN DEFAULT true;
