-- Campo para Master permitir ou não o developer usar subdomínio
ALTER TABLE developers ADD COLUMN IF NOT EXISTS subdomain_allowed BOOLEAN DEFAULT false;
