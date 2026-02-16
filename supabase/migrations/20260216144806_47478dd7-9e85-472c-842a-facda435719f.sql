
-- Add pendência activation arrays to servicos table
ALTER TABLE public.servicos
ADD COLUMN IF NOT EXISTS deferimento_pendencias_ativacao text[] DEFAULT '{}'::text[];

ALTER TABLE public.servicos
ADD COLUMN IF NOT EXISTS lacre_armador_pendencias_ativacao text[] DEFAULT '{}'::text[];
