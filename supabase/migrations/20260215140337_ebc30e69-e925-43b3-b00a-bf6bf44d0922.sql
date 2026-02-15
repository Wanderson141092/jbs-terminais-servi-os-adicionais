ALTER TABLE public.solicitacoes 
ADD COLUMN IF NOT EXISTS custo_posicionamento boolean DEFAULT NULL;