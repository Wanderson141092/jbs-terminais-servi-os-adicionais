
-- Table for billing/launch configuration management
CREATE TABLE public.lancamento_cobranca_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  rotulo_analise TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'servico',
  servico_ids UUID[] NOT NULL DEFAULT '{}',
  campo_referencia TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lancamento_cobranca_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lancamento_cobranca_config"
  ON public.lancamento_cobranca_config FOR SELECT USING (true);

CREATE POLICY "Only admins can manage lancamento_cobranca_config"
  ON public.lancamento_cobranca_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default billing config entries
INSERT INTO public.lancamento_cobranca_config (nome, rotulo_analise, tipo, servico_ids, campo_referencia) VALUES
  ('Lanç. Posicionamento', 'Lanç. Posicionamento', 'servico', '{}', NULL),
  ('Cobrança Posic. Lacre', 'Custo Posic. Lacre', 'pendencia', '{}', 'Lacre Armador Pendente');

-- Table for report model column mappings
CREATE TABLE public.modelo_relatorio_colunas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_id UUID NOT NULL REFERENCES modelos_relatorio(id) ON DELETE CASCADE,
  coluna_modelo TEXT NOT NULL,
  campo_sistema TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.modelo_relatorio_colunas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view modelo_relatorio_colunas"
  ON public.modelo_relatorio_colunas FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage modelo_relatorio_colunas"
  ON public.modelo_relatorio_colunas FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
