
-- ============================================
-- BANCO DE PERGUNTAS COMPARTILHADAS
-- ============================================
CREATE TABLE public.banco_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'texto',
  rotulo TEXT NOT NULL,
  descricao TEXT,
  placeholder TEXT,
  opcoes JSONB,
  config JSONB DEFAULT '{}'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.banco_perguntas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banco_perguntas"
  ON public.banco_perguntas FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage banco_perguntas"
  ON public.banco_perguntas FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- VÍNCULO FORMULÁRIO <-> PERGUNTAS
-- ============================================
CREATE TABLE public.formulario_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  pergunta_id UUID NOT NULL REFERENCES public.banco_perguntas(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.formulario_perguntas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view formulario_perguntas"
  ON public.formulario_perguntas FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage formulario_perguntas"
  ON public.formulario_perguntas FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- CONDICIONAIS DE EXIBIÇÃO
-- ============================================
CREATE TABLE public.pergunta_condicionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  pergunta_id UUID NOT NULL REFERENCES public.banco_perguntas(id) ON DELETE CASCADE,
  pergunta_pai_id UUID NOT NULL REFERENCES public.banco_perguntas(id) ON DELETE CASCADE,
  valor_gatilho TEXT NOT NULL,
  operador TEXT NOT NULL DEFAULT 'igual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pergunta_condicionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pergunta_condicionais"
  ON public.pergunta_condicionais FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage pergunta_condicionais"
  ON public.pergunta_condicionais FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- MAPEAMENTO PERGUNTA -> CAMPO DA SOLICITAÇÃO
-- ============================================
CREATE TABLE public.pergunta_mapeamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  pergunta_id UUID NOT NULL REFERENCES public.banco_perguntas(id) ON DELETE CASCADE,
  campo_solicitacao TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pergunta_mapeamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pergunta_mapeamento"
  ON public.pergunta_mapeamento FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage pergunta_mapeamento"
  ON public.pergunta_mapeamento FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_formulario_perguntas_form ON public.formulario_perguntas(formulario_id);
CREATE INDEX idx_formulario_perguntas_perg ON public.formulario_perguntas(pergunta_id);
CREATE INDEX idx_pergunta_condicionais_form ON public.pergunta_condicionais(formulario_id);
CREATE INDEX idx_pergunta_condicionais_pai ON public.pergunta_condicionais(pergunta_pai_id);
CREATE INDEX idx_pergunta_mapeamento_form ON public.pergunta_mapeamento(formulario_id);
