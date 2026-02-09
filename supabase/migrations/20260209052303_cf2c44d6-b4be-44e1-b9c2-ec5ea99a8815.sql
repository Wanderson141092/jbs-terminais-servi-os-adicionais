-- Adicionar campos para serviços de agendamento e configuração de anexos por serviço
ALTER TABLE public.servicos 
ADD COLUMN IF NOT EXISTS tipo_agendamento TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS anexos_embutidos BOOLEAN DEFAULT true;

-- Comentário: tipo_agendamento pode ser NULL, 'data', ou 'data_horario'
-- Comentário: anexos_embutidos controla se anexos são mostrados embutidos ou com botão

-- Adicionar campo data_agendamento nas solicitações
ALTER TABLE public.solicitacoes 
ADD COLUMN IF NOT EXISTS data_agendamento TIMESTAMP WITH TIME ZONE DEFAULT NULL;