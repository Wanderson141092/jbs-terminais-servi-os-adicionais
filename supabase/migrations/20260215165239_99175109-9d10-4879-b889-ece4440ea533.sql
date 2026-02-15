
-- Tabela para configurar regras de cancelamento e recusa por serviço
CREATE TABLE public.cancelamento_recusa_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('cancelamento_direto', 'cancelamento_confirmacao', 'recusa')),
  status_habilitados TEXT[] NOT NULL DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(servico_id, tipo)
);

-- Enable RLS
ALTER TABLE public.cancelamento_recusa_config ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view cancelamento_recusa_config"
ON public.cancelamento_recusa_config
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage cancelamento_recusa_config"
ON public.cancelamento_recusa_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
