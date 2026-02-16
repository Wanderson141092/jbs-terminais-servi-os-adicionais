
ALTER TABLE public.regras_servico 
ADD COLUMN IF NOT EXISTS recusar_apos_corte boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS agendar_proximo_dia boolean NOT NULL DEFAULT false;
