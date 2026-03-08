
-- Fix existing checkbox values stored as "true"/"false" in campos_analise_valores
UPDATE public.campos_analise_valores
SET valor = 'Sim', updated_at = now()
WHERE lower(valor) = 'true';

UPDATE public.campos_analise_valores
SET valor = 'Não', updated_at = now()
WHERE lower(valor) = 'false';
