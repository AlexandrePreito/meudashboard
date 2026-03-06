-- ============================================
-- Migration: Adicionar campos extras em company_groups
-- Campos de responsável e endereço para os grupos
-- ============================================

ALTER TABLE company_groups ADD COLUMN IF NOT EXISTS responsible_name TEXT;
ALTER TABLE company_groups ADD COLUMN IF NOT EXISTS responsible_email TEXT;
ALTER TABLE company_groups ADD COLUMN IF NOT EXISTS responsible_phone TEXT;

ALTER TABLE company_groups ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE company_groups ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE company_groups ADD COLUMN IF NOT EXISTS address_complement TEXT;
ALTER TABLE company_groups ADD COLUMN IF NOT EXISTS address_neighborhood TEXT;
ALTER TABLE company_groups ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE company_groups ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE company_groups ADD COLUMN IF NOT EXISTS address_zip TEXT;
