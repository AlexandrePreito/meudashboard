-- ============================================
-- REMOVER TODAS AS CONSTRAINTS ÚNICAS
-- ============================================
-- Este script remove TODAS as constraints únicas da tabela whatsapp_authorized_numbers
-- Execute este script no Supabase SQL Editor

-- 1. Primeiro, vamos ver quais constraints únicas existem
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'whatsapp_authorized_numbers'::regclass
AND contype = 'u'
ORDER BY conname;

-- 2. Remover TODAS as constraints únicas (independente do nome)
DO $$ 
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'whatsapp_authorized_numbers'::regclass
        AND contype = 'u'
    LOOP
        EXECUTE 'ALTER TABLE whatsapp_authorized_numbers DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_record.conname);
        RAISE NOTICE 'Constraint removida: %', constraint_record.conname;
    END LOOP;
END $$;

-- 3. Verificar novamente se ainda existem constraints únicas
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'whatsapp_authorized_numbers'::regclass
AND contype = 'u'
ORDER BY conname;

-- Se a query acima retornar vazio, todas as constraints foram removidas com sucesso!
-- ✅ Agora você poderá cadastrar números duplicados
