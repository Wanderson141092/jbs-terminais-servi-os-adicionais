
-- Table for dynamic analysis field definitions
CREATE TABLE public.campos_analise (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto', -- texto, numero, data, selecao, checkbox, etc.
  opcoes JSONB DEFAULT NULL,
  servico_ids UUID[] NOT NULL DEFAULT '{}', -- empty = global
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campos_analise ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active campos_analise"
ON public.campos_analise FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage campos_analise"
ON public.campos_analise FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Table for storing dynamic field values per solicitacao
CREATE TABLE public.campos_analise_valores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  campo_id UUID NOT NULL REFERENCES public.campos_analise(id) ON DELETE CASCADE,
  valor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(solicitacao_id, campo_id)
);

ALTER TABLE public.campos_analise_valores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view campos_analise_valores"
ON public.campos_analise_valores FOR SELECT
USING (true);

CREATE POLICY "Admins can manage campos_analise_valores"
ON public.campos_analise_valores FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow public inserts (via edge function with service role)
CREATE POLICY "Service role can insert campos_analise_valores"
ON public.campos_analise_valores FOR INSERT
WITH CHECK (true);

-- Add campo_analise_id to pergunta_mapeamento for dynamic field mapping
ALTER TABLE public.pergunta_mapeamento 
ADD COLUMN campo_analise_id UUID REFERENCES public.campos_analise(id) ON DELETE SET NULL;
