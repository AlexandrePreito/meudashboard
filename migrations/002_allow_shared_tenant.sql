-- Permitir que o master libere tenant compartilhado para um developer específico
ALTER TABLE developers
ADD COLUMN IF NOT EXISTS allow_shared_tenant BOOLEAN DEFAULT false;
