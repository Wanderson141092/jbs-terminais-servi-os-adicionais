-- Nova camada financeira por solicitação
CREATE TABLE IF NOT EXISTS public.cobrancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  cobranca_config_id uuid REFERENCES public.lancamento_cobranca_config(id) ON DELETE CASCADE,
  status_financeiro text NOT NULL DEFAULT 'pendente',
  confirmado boolean NOT NULL DEFAULT false,
  confirmado_por uuid,
  confirmado_data timestamptz,
  origem text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cobrancas_solicitacao_config_uidx
  ON public.cobrancas (solicitacao_id, cobranca_config_id)
  WHERE cobranca_config_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS cobrancas_solicitacao_legacy_uidx
  ON public.cobrancas (solicitacao_id)
  WHERE cobranca_config_id IS NULL;

ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view cobrancas" ON public.cobrancas;
CREATE POLICY "Authenticated can view cobrancas"
ON public.cobrancas
FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only admins can manage cobrancas" ON public.cobrancas;
CREATE POLICY "Only admins can manage cobrancas"
ON public.cobrancas
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Backfill dos registros granulares legados
INSERT INTO public.cobrancas (
  solicitacao_id,
  cobranca_config_id,
  status_financeiro,
  confirmado,
  confirmado_por,
  confirmado_data,
  origem,
  created_at,
  updated_at
)
SELECT
  lcr.solicitacao_id,
  lcr.cobranca_config_id,
  CASE WHEN lcr.confirmado THEN 'confirmado' ELSE 'pendente' END,
  lcr.confirmado,
  lcr.confirmado_por,
  lcr.confirmado_data,
  'lancamento_cobranca_registros',
  lcr.created_at,
  lcr.updated_at
FROM public.lancamento_cobranca_registros lcr
ON CONFLICT (solicitacao_id, cobranca_config_id) WHERE cobranca_config_id IS NOT NULL
DO UPDATE SET
  status_financeiro = EXCLUDED.status_financeiro,
  confirmado = EXCLUDED.confirmado,
  confirmado_por = EXCLUDED.confirmado_por,
  confirmado_data = EXCLUDED.confirmado_data,
  origem = EXCLUDED.origem,
  updated_at = now();

-- Backfill do sinalizador legado em solicitacoes.*
INSERT INTO public.cobrancas (
  solicitacao_id,
  cobranca_config_id,
  status_financeiro,
  confirmado,
  confirmado_por,
  confirmado_data,
  origem,
  created_at,
  updated_at
)
SELECT
  s.id,
  NULL,
  CASE WHEN s.lancamento_confirmado THEN 'confirmado' ELSE 'pendente' END,
  COALESCE(s.lancamento_confirmado, false),
  s.lancamento_confirmado_por,
  s.lancamento_confirmado_data,
  'solicitacoes_lancamento',
  s.created_at,
  COALESCE(s.updated_at, now())
FROM public.solicitacoes s
WHERE s.lancamento_confirmado IS NOT NULL
ON CONFLICT (solicitacao_id) WHERE cobranca_config_id IS NULL
DO UPDATE SET
  status_financeiro = EXCLUDED.status_financeiro,
  confirmado = EXCLUDED.confirmado,
  confirmado_por = EXCLUDED.confirmado_por,
  confirmado_data = EXCLUDED.confirmado_data,
  origem = EXCLUDED.origem,
  updated_at = now();

-- Camada explícita de formulário
CREATE TABLE IF NOT EXISTS public.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'texto',
  rotulo text NOT NULL,
  descricao text,
  placeholder text,
  opcoes jsonb,
  config jsonb DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  legacy_pergunta_id uuid UNIQUE REFERENCES public.banco_perguntas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_field_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  form_field_id uuid NOT NULL REFERENCES public.form_fields(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  obrigatorio boolean NOT NULL DEFAULT false,
  legacy_formulario_pergunta_id uuid UNIQUE REFERENCES public.formulario_perguntas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (formulario_id, form_field_id)
);

CREATE TABLE IF NOT EXISTS public.form_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id uuid NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  respostas jsonb NOT NULL,
  arquivos jsonb,
  ip_address text,
  legacy_formulario_resposta_id uuid UNIQUE REFERENCES public.formulario_respostas(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_field_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view form_fields" ON public.form_fields;
CREATE POLICY "Anyone can view form_fields"
  ON public.form_fields FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage form_fields" ON public.form_fields;
CREATE POLICY "Only admins can manage form_fields"
  ON public.form_fields FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can view form_field_mapping" ON public.form_field_mapping;
CREATE POLICY "Anyone can view form_field_mapping"
  ON public.form_field_mapping FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can manage form_field_mapping" ON public.form_field_mapping;
CREATE POLICY "Only admins can manage form_field_mapping"
  ON public.form_field_mapping FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Anyone can submit form_data" ON public.form_data;
CREATE POLICY "Anyone can submit form_data"
  ON public.form_data FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Only admins can view form_data" ON public.form_data;
CREATE POLICY "Only admins can view form_data"
  ON public.form_data FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Only admins can manage form_data" ON public.form_data;
CREATE POLICY "Only admins can manage form_data"
  ON public.form_data FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Backfill da camada de formulário a partir das tabelas atuais
INSERT INTO public.form_fields (
  id,
  tipo,
  rotulo,
  descricao,
  placeholder,
  opcoes,
  config,
  ativo,
  legacy_pergunta_id,
  created_at,
  updated_at
)
SELECT
  bp.id,
  bp.tipo,
  bp.rotulo,
  bp.descricao,
  bp.placeholder,
  bp.opcoes,
  bp.config,
  bp.ativo,
  bp.id,
  bp.created_at,
  bp.updated_at
FROM public.banco_perguntas bp
ON CONFLICT (id)
DO UPDATE SET
  tipo = EXCLUDED.tipo,
  rotulo = EXCLUDED.rotulo,
  descricao = EXCLUDED.descricao,
  placeholder = EXCLUDED.placeholder,
  opcoes = EXCLUDED.opcoes,
  config = EXCLUDED.config,
  ativo = EXCLUDED.ativo,
  updated_at = now();

INSERT INTO public.form_field_mapping (
  id,
  formulario_id,
  form_field_id,
  ordem,
  obrigatorio,
  legacy_formulario_pergunta_id,
  created_at
)
SELECT
  fp.id,
  fp.formulario_id,
  COALESCE(ff.id, fp.pergunta_id),
  fp.ordem,
  fp.obrigatorio,
  fp.id,
  fp.created_at
FROM public.formulario_perguntas fp
LEFT JOIN public.form_fields ff ON ff.legacy_pergunta_id = fp.pergunta_id
ON CONFLICT (id)
DO UPDATE SET
  formulario_id = EXCLUDED.formulario_id,
  form_field_id = EXCLUDED.form_field_id,
  ordem = EXCLUDED.ordem,
  obrigatorio = EXCLUDED.obrigatorio;

INSERT INTO public.form_data (
  id,
  formulario_id,
  respostas,
  arquivos,
  ip_address,
  legacy_formulario_resposta_id,
  created_at
)
SELECT
  fr.id,
  fr.formulario_id,
  fr.respostas,
  fr.arquivos,
  fr.ip_address,
  fr.id,
  fr.created_at
FROM public.formulario_respostas fr
ON CONFLICT (id)
DO UPDATE SET
  formulario_id = EXCLUDED.formulario_id,
  respostas = EXCLUDED.respostas,
  arquivos = EXCLUDED.arquivos,
  ip_address = EXCLUDED.ip_address,
  created_at = EXCLUDED.created_at;
