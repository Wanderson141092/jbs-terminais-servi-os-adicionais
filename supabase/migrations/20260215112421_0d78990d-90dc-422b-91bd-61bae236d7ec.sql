
-- Configuration table for external consultation stages (timeline + checklist)
CREATE TABLE public.consulta_etapas_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chave text NOT NULL,
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'timeline', -- 'timeline' or 'checklist'
  grupo text NOT NULL DEFAULT 'geral', -- 'geral', 'posicionamento_vistoria', 'posicionamento_servico', 'outros_servicos', 'deferimento', 'terminal', 'checklist_posicionamento', 'checklist_outros'
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  servico_ids uuid[] NOT NULL DEFAULT '{}',
  etapa_equivalente text, -- chave of stage this one substitutes/replaces
  status_gatilho text[], -- which status values trigger this stage to show/activate
  descricao text, -- admin-facing description
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.consulta_etapas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view consulta_etapas_config"
ON public.consulta_etapas_config FOR SELECT USING (true);

CREATE POLICY "Only admins can manage consulta_etapas_config"
ON public.consulta_etapas_config FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed: Timeline stages
-- Geral (all services)
INSERT INTO public.consulta_etapas_config (chave, titulo, tipo, grupo, ordem, status_gatilho, descricao) VALUES
('recebida', 'Solicitação Recebida', 'timeline', 'geral', 1, '{}', 'Primeira etapa - sempre completa quando existe'),
('aguardando_confirmacao', 'Aguardando Confirmação', 'timeline', 'geral', 2, '{aguardando_confirmacao}', 'Aguardando aprovação interna');

-- Posicionamento com vistoria
INSERT INTO public.consulta_etapas_config (chave, titulo, tipo, grupo, ordem, status_gatilho, descricao) VALUES
('aguardando_vistoria', 'Confirmado - Aguardando Vistoria', 'timeline', 'posicionamento_vistoria', 3, '{confirmado_aguardando_vistoria}', 'Após confirmação, aguardando fiscal'),
('vistoria_finalizada', 'Vistoria Finalizada', 'timeline', 'posicionamento_vistoria', 4, '{vistoria_finalizada}', 'Vistoria concluída sem pendência'),
('vistoriado_com_pendencia', 'Vistoriado com Pendência', 'timeline', 'posicionamento_vistoria', 4, '{vistoriado_com_pendencia}', 'Vistoria com pendências identificadas'),
('nao_vistoriado', 'Não Vistoriado', 'timeline', 'posicionamento_vistoria', 4, '{nao_vistoriado}', 'Fiscal não realizou a vistoria');

-- Posicionamento com serviço (motivos especiais)
INSERT INTO public.consulta_etapas_config (chave, titulo, tipo, grupo, ordem, status_gatilho, etapa_equivalente, descricao) VALUES
('aguardando_servico', 'Confirmado - Aguardando Serviço', 'timeline', 'posicionamento_servico', 3, '{confirmado_aguardando_vistoria}', 'aguardando_vistoria', 'Substitui "Aguardando Vistoria" para motivos de serviço'),
('servico_finalizado', 'Serviço Finalizado', 'timeline', 'posicionamento_servico', 4, '{vistoria_finalizada,vistoriado_com_pendencia,nao_vistoriado}', 'vistoria_finalizada', 'Substitui resultados de vistoria para motivos de serviço');

-- Outros serviços
INSERT INTO public.consulta_etapas_config (chave, titulo, tipo, grupo, ordem, status_gatilho, descricao) VALUES
('servico_concluido', 'Serviço Concluído', 'timeline', 'outros_servicos', 3, '{confirmado_aguardando_vistoria,vistoria_finalizada,vistoriado_com_pendencia,nao_vistoriado}', 'Etapa final para serviços não-Posicionamento');

-- Deferimento sub-timeline
INSERT INTO public.consulta_etapas_config (chave, titulo, tipo, grupo, ordem, status_gatilho, descricao) VALUES
('aguardando_envio', 'Aguardando Envio do Arquivo', 'timeline', 'deferimento', 1, '{}', 'Sub-etapa: aguardando upload do deferimento'),
('documento_recebido', 'Documento Recebido', 'timeline', 'deferimento', 2, '{}', 'Sub-etapa: deferimento aceito'),
('documento_recusado', 'Documento Recusado', 'timeline', 'deferimento', 2, '{}', 'Sub-etapa: deferimento recusado'),
('aguardando_analise', 'Aguardando Análise', 'timeline', 'deferimento', 2, '{}', 'Sub-etapa: documento enviado, em análise');

-- Terminal states
INSERT INTO public.consulta_etapas_config (chave, titulo, tipo, grupo, ordem, status_gatilho, descricao) VALUES
('cancelado', 'Cancelado', 'timeline', 'terminal', 99, '{cancelado}', 'Solicitação cancelada'),
('recusado', 'Recusado', 'timeline', 'terminal', 99, '{recusado}', 'Solicitação recusada');

-- Checklist items - Posicionamento
INSERT INTO public.consulta_etapas_config (chave, titulo, tipo, grupo, ordem, status_gatilho, descricao) VALUES
('check_registrada', 'Solicitação registrada', 'checklist', 'checklist_geral', 1, '{}', 'Checklist: registro inicial'),
('check_vistoria_ok', 'Vistoria finalizada sem pendência', 'checklist', 'checklist_posicionamento', 2, '{vistoria_finalizada}', 'Checklist: vistoria OK'),
('check_vistoria_pend', 'Vistoriado com pendência', 'checklist', 'checklist_posicionamento', 2, '{vistoriado_com_pendencia}', 'Checklist: vistoria com pendência'),
('check_nao_vistoriado', 'Não vistoriado', 'checklist', 'checklist_posicionamento', 2, '{nao_vistoriado}', 'Checklist: não vistoriado'),
('check_aguardando_vistoria', 'Aguardando vistoria', 'checklist', 'checklist_posicionamento', 2, '{confirmado_aguardando_vistoria}', 'Checklist: em espera de vistoria');

-- Checklist items - Outros serviços
INSERT INTO public.consulta_etapas_config (chave, titulo, tipo, grupo, ordem, status_gatilho, descricao) VALUES
('check_servico_concluido', 'Serviço "{nome}" executado e finalizado.', 'checklist', 'checklist_outros', 2, '{confirmado_aguardando_vistoria,vistoria_finalizada,vistoriado_com_pendencia,nao_vistoriado}', 'Checklist: conclusão de serviço genérico. Use {nome} para inserir o nome do serviço.');

-- Checklist - Deferimento
INSERT INTO public.consulta_etapas_config (chave, titulo, tipo, grupo, ordem, status_gatilho, descricao) VALUES
('check_deferimento', 'Deferimento enviado', 'checklist', 'checklist_deferimento', 3, '{}', 'Checklist: status do deferimento');
