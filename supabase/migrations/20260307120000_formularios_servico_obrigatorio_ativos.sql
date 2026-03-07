-- Ensure active forms are always linked to a service
UPDATE public.formularios
SET ativo = false,
    updated_at = now()
WHERE ativo = true
  AND servico_id IS NULL;

ALTER TABLE public.formularios
  ADD CONSTRAINT formularios_ativo_requer_servico_check
  CHECK (NOT ativo OR servico_id IS NOT NULL);
