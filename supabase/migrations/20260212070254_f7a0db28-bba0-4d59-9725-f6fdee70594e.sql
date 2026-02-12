
-- Add separate approval toggles for Administrativo and Operacional
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS aprovacao_administrativo boolean DEFAULT false;
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS aprovacao_operacional boolean DEFAULT false;

-- Migrate existing data: if aprovacao_ativada was true, enable both
UPDATE public.servicos SET aprovacao_administrativo = true, aprovacao_operacional = true WHERE aprovacao_ativada = true;
