-- Create tipos_setor table for custom sector types
CREATE TABLE public.tipos_setor (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  pode_aprovar BOOLEAN NOT NULL DEFAULT false,
  pode_recusar BOOLEAN NOT NULL DEFAULT false,
  pode_visualizar_todos BOOLEAN NOT NULL DEFAULT false,
  pode_editar_processo BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default sector types
INSERT INTO public.tipos_setor (nome, descricao, pode_aprovar, pode_recusar, pode_visualizar_todos, pode_editar_processo) VALUES
  ('COMEX', 'Comércio Exterior', true, true, true, true),
  ('ARMAZEM', 'Armazém', true, true, true, true);

-- Create regras_servico table for business rules per service
CREATE TABLE public.regras_servico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  hora_corte TIME NOT NULL DEFAULT '17:00',
  limite_dia INTEGER DEFAULT NULL,
  dias_semana TEXT[] NOT NULL DEFAULT ARRAY['seg', 'ter', 'qua', 'qui', 'sex'],
  limite_seg INTEGER DEFAULT NULL,
  limite_ter INTEGER DEFAULT NULL,
  limite_qua INTEGER DEFAULT NULL,
  limite_qui INTEGER DEFAULT NULL,
  limite_sex INTEGER DEFAULT NULL,
  limite_sab INTEGER DEFAULT NULL,
  aplica_dia_anterior BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (servico_id)
);

-- Create field_mappings for Hashdata and SmartNX integrations
-- Already exists, but let's ensure it has the right structure
ALTER TABLE public.field_mappings ADD COLUMN IF NOT EXISTS sistema TEXT DEFAULT 'hashdata';

-- Create protocol_config table for protocol settings
CREATE TABLE public.protocol_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prefixo TEXT NOT NULL DEFAULT 'JBS',
  ultimo_numero INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO public.protocol_config (prefixo, ultimo_numero) VALUES ('JBS', 0);

-- Add blocked column to profiles for user blocking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN NOT NULL DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.tipos_setor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocol_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for tipos_setor
CREATE POLICY "Anyone can view tipos_setor"
ON public.tipos_setor FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage tipos_setor"
ON public.tipos_setor FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for regras_servico
CREATE POLICY "Anyone can view regras_servico"
ON public.regras_servico FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage regras_servico"
ON public.regras_servico FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for protocol_config
CREATE POLICY "Anyone can view protocol_config"
ON public.protocol_config FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage protocol_config"
ON public.protocol_config FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));