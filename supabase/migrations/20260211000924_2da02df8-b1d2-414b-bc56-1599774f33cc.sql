
-- Item 8: Tabela de regras de notificação
CREATE TABLE public.notification_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id uuid REFERENCES public.servicos(id) ON DELETE CASCADE NOT NULL,
  status_gatilho text NOT NULL,
  tipos_notificacao text[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(servico_id, status_gatilho)
);

ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notification_rules"
  ON public.notification_rules FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage notification_rules"
  ON public.notification_rules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Item 10: Tabela de histórico de observações
CREATE TABLE public.observacao_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid REFERENCES public.solicitacoes(id) ON DELETE CASCADE NOT NULL,
  observacao text NOT NULL,
  status_no_momento text NOT NULL,
  autor_id uuid NOT NULL,
  autor_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.observacao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view observacao_historico"
  ON public.observacao_historico FOR SELECT
  USING (true);

CREATE POLICY "Authenticated can insert observacao_historico"
  ON public.observacao_historico FOR INSERT
  WITH CHECK (auth.uid() = autor_id);

CREATE POLICY "Only admins can manage observacao_historico"
  ON public.observacao_historico FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
