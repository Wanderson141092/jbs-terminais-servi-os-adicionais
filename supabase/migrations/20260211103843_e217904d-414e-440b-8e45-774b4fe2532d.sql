
-- 1. Add deferimento activation status and approval flag to servicos
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS deferimento_status_ativacao text[] DEFAULT '{}';
ALTER TABLE public.servicos ADD COLUMN IF NOT EXISTS aprovacao_ativada boolean DEFAULT false;

-- 2. Add solicitar_deferimento and pendencias to solicitacoes
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS solicitar_deferimento boolean DEFAULT false;
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS pendencias_selecionadas text[] DEFAULT '{}';

-- 3. Create pendencia_opcoes table for "Vistoriado com Pendência" checkboxes
CREATE TABLE IF NOT EXISTS public.pendencia_opcoes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  valor text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pendencia_opcoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pendencia_opcoes" ON public.pendencia_opcoes FOR SELECT USING (true);
CREATE POLICY "Only admins can manage pendencia_opcoes" ON public.pendencia_opcoes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Add setor_ids to notification_rules for targeting specific sectors
ALTER TABLE public.notification_rules ADD COLUMN IF NOT EXISTS setor_ids uuid[] DEFAULT '{}';

-- 5. Create deferimento_titulos table for custom deferimento titles per service
CREATE TABLE IF NOT EXISTS public.deferimento_titulos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  servico_ids uuid[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deferimento_titulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view deferimento_titulos" ON public.deferimento_titulos FOR SELECT USING (true);
CREATE POLICY "Only admins can manage deferimento_titulos" ON public.deferimento_titulos FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Set aprovacao_ativada = true for existing "Posicionamento" service
UPDATE public.servicos SET aprovacao_ativada = true WHERE nome ILIKE '%posicionamento%';

-- 7. Set deferimento_status_ativacao for Posicionamento
UPDATE public.servicos SET deferimento_status_ativacao = ARRAY['vistoria_finalizada'] WHERE nome ILIKE '%posicionamento%';
