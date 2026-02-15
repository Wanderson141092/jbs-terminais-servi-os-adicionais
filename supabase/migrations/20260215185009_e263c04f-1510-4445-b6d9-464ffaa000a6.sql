
-- Add validation key column
ALTER TABLE public.solicitacoes ADD COLUMN chave_consulta text;

-- Generate random 6-char alphanumeric keys for existing records
UPDATE public.solicitacoes
SET chave_consulta = upper(substr(md5(random()::text || id::text), 1, 6))
WHERE chave_consulta IS NULL;

-- Make it NOT NULL with a default for future records
ALTER TABLE public.solicitacoes ALTER COLUMN chave_consulta SET NOT NULL;
ALTER TABLE public.solicitacoes ALTER COLUMN chave_consulta SET DEFAULT upper(substr(md5(random()::text), 1, 6));

-- Add unique constraint to prevent collisions
CREATE UNIQUE INDEX idx_solicitacoes_chave_consulta ON public.solicitacoes(chave_consulta);
