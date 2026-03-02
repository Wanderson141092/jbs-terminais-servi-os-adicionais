
-- Fase 1.1: Adicionar grupo_status em parametros_campos
ALTER TABLE public.parametros_campos
  ADD COLUMN IF NOT EXISTS grupo_status text NOT NULL DEFAULT 'outros_servicos';

-- Fase 1.2: Adicionar tipo_observacao em observacao_historico
ALTER TABLE public.observacao_historico
  ADD COLUMN IF NOT EXISTS tipo_observacao text NOT NULL DEFAULT 'interna';

-- Fase 1.3: Protocolo por serviço - adicionar servico_id e ano_referencia
ALTER TABLE public.protocol_config
  ADD COLUMN IF NOT EXISTS servico_id uuid REFERENCES public.servicos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ano_referencia integer;

-- Fase 1.4: Horário de corte por dia da semana
ALTER TABLE public.regras_servico
  ADD COLUMN IF NOT EXISTS usar_horario_por_dia boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS horarios_por_dia jsonb;
