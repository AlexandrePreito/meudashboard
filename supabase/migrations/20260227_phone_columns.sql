-- Coluna phone no cadastro e nas entidades criadas após verificação de email

ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE developers ADD COLUMN IF NOT EXISTS phone TEXT;
