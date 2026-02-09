-- Adicionar campo para perfis múltiplos nos setores (array de tipos)
ALTER TABLE public.setor_emails 
ADD COLUMN IF NOT EXISTS perfis text[] DEFAULT '{}';

-- Adicionar status para documentos de deferimento (aceito, recusado, pendente)
ALTER TABLE public.deferimento_documents 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS motivo_recusa text;

-- Adicionar campo para status de confirmação de lançamento
ALTER TABLE public.solicitacoes 
ADD COLUMN IF NOT EXISTS lancamento_confirmado boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lancamento_confirmado_por uuid,
ADD COLUMN IF NOT EXISTS lancamento_confirmado_data timestamptz;

-- Adicionar status de gatilho para confirmação de lançamento no cadastro de serviços
ALTER TABLE public.servicos 
ADD COLUMN IF NOT EXISTS status_confirmacao_lancamento text[] DEFAULT '{}';

-- Criar tabela para configurações de página externa (parâmetros)
CREATE TABLE IF NOT EXISTS public.page_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_value text,
  config_type text DEFAULT 'text',
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS para page_config
ALTER TABLE public.page_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view page_config" ON public.page_config FOR SELECT USING (true);
CREATE POLICY "Only admins can manage page_config" ON public.page_config FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Criar tabela para regras de roteamento de serviços (subcritérios de visualização)
CREATE TABLE IF NOT EXISTS public.service_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servico_id uuid REFERENCES public.servicos(id) ON DELETE CASCADE,
  campo_criterio text NOT NULL,
  valor_criterio text NOT NULL,
  setor_ids uuid[] NOT NULL DEFAULT '{}',
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.service_routing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view routing rules" ON public.service_routing_rules FOR SELECT USING (true);
CREATE POLICY "Only admins can manage routing rules" ON public.service_routing_rules FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Criar tabela para histórico de integrações
CREATE TABLE IF NOT EXISTS public.integration_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  integracao_nome text NOT NULL,
  tipo text NOT NULL, -- 'hashdata', 'smartnx', etc
  status text NOT NULL, -- 'sucesso', 'erro'
  detalhes text,
  payload jsonb,
  response jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.integration_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view integration_history" ON public.integration_history FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert integration_history" ON public.integration_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Only admins can manage integration_history" ON public.integration_history FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Criar tabela para admins por CPF
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf text NOT NULL UNIQUE,
  nome text NOT NULL,
  senha_hash text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage admin_accounts" ON public.admin_accounts FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can select for login" ON public.admin_accounts FOR SELECT USING (true);

-- Inserir configurações padrão de página
INSERT INTO public.page_config (config_key, config_value, config_type, description) VALUES
  ('hashdata_iframe_url', '', 'url', 'URL do iframe do formulário Hashdata'),
  ('botao_servico_adicional_label', 'Serviço Adicional - Solicitação ou Cancelamento', 'text', 'Texto do botão principal'),
  ('botao_servico_adicional_abre_modal', 'true', 'boolean', 'Se o botão abre modal ou nova janela'),
  ('visualizacao_anexos_embutida', 'true', 'boolean', 'Se anexos aparecem embutidos na análise ou com botão visualizar')
ON CONFLICT (config_key) DO NOTHING;