-- ============================================
-- REMOVER CONSTRAINT ÚNICA DE PHONE_NUMBER
-- ============================================
-- Este script remove a constraint que impede cadastrar números duplicados
-- Execute este script no Supabase SQL Editor

-- 1. Remover constraint composta UNIQUE(instance_id, phone_number)
ALTER TABLE whatsapp_authorized_numbers 
DROP CONSTRAINT IF EXISTS whatsapp_authorized_numbers_instance_id_phone_number_key;

-- 2. Remover constraint única de phone_number (se existir com nome diferente)
ALTER TABLE whatsapp_authorized_numbers 
DROP CONSTRAINT IF EXISTS idx_unique_phone_number;

-- 3. Remover TODAS as constraints únicas (para garantir que nenhuma fique)
DO $$ 
DECLARE
    constraint_record RECORD;
    constraints_removed INTEGER := 0;
BEGIN
    FOR constraint_record IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'whatsapp_authorized_numbers'::regclass
        AND contype = 'u'
    LOOP
        EXECUTE 'ALTER TABLE whatsapp_authorized_numbers DROP CONSTRAINT IF EXISTS ' || quote_ident(constraint_record.conname);
        RAISE NOTICE 'Constraint removida: %', constraint_record.conname;
        constraints_removed := constraints_removed + 1;
    END LOOP;
    
    IF constraints_removed = 0 THEN
        RAISE NOTICE 'Nenhuma constraint única encontrada para remover.';
    ELSE
        RAISE NOTICE 'Total de constraints removidas: %', constraints_removed;
    END IF;
END $$;

-- 4. Remover índices únicos relacionados (se existirem)
DROP INDEX IF EXISTS idx_unique_phone_number;
DROP INDEX IF EXISTS idx_whatsapp_authorized_numbers_phone_unique;

-- 5. Verificar se ainda existem constraints únicas (apenas para confirmação)
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'whatsapp_authorized_numbers'::regclass
AND contype = 'u'
ORDER BY conname;

-- Se a query acima retornar vazio, todas as constraints foram removidas!
-- ✅ Após executar este script, você poderá cadastrar números duplicados
