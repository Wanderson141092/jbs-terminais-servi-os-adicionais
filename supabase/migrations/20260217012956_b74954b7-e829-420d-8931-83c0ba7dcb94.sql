
-- Create table for individual billing confirmation records
CREATE TABLE public.lancamento_cobranca_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  cobranca_config_id uuid NOT NULL REFERENCES public.lancamento_cobranca_config(id) ON DELETE CASCADE,
  confirmado boolean NOT NULL DEFAULT false,
  confirmado_por uuid,
  confirmado_data timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(solicitacao_id, cobranca_config_id)
);

-- Enable RLS
ALTER TABLE public.lancamento_cobranca_registros ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read
CREATE POLICY "Authenticated can view lancamento_cobranca_registros"
ON public.lancamento_cobranca_registros
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can manage (insert/update/delete)
CREATE POLICY "Only admins can manage lancamento_cobranca_registros"
ON public.lancamento_cobranca_registros
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
