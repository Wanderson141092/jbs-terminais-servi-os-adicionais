-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for proper authorization
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create system_config table for admin parameters
CREATE TABLE public.system_config (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key text NOT NULL UNIQUE,
    config_value text,
    config_type text NOT NULL DEFAULT 'text',
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view config"
ON public.system_config FOR SELECT USING (true);

CREATE POLICY "Only admins can modify config"
ON public.system_config FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default configurations
INSERT INTO public.system_config (config_key, config_value, config_type, description) VALUES
('limite_pedidos_dia', '50', 'number', 'Limite máximo de pedidos por dia para Posicionamento'),
('horario_corte', '15:00', 'time', 'Horário de corte para solicitações (do dia anterior)'),
('hashdata_form_url', '', 'url', 'URL do formulário Hashdata'),
('smartnx_api_url', '', 'url', 'URL da API SmartNX'),
('sistema_nome', 'Serviços Adicionais', 'text', 'Nome do sistema exibido');

-- Create services table (tipos de serviço)
CREATE TABLE public.servicos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL UNIQUE,
    codigo_prefixo character(1) NOT NULL,
    descricao text,
    ativo boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active services"
ON public.servicos FOR SELECT USING (true);

CREATE POLICY "Only admins can manage services"
ON public.servicos FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default services
INSERT INTO public.servicos (nome, codigo_prefixo, descricao) VALUES
('Posicionamento', 'P', 'Serviço de posicionamento de contêiner'),
('Mudança de Quadra', 'M', 'Mudança de quadra do contêiner'),
('Rolagem de navio', 'R', 'Rolagem de navio'),
('Agendamento Expresso', 'A', 'Agendamento expresso'),
('Reprogramação', 'E', 'Reprogramação de serviço'),
('Pesagem interna', 'I', 'Pesagem interna de contêiner');

-- Add ativo field to setor_emails
ALTER TABLE public.setor_emails ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- Create integrations table
CREATE TABLE public.integracoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    tipo text NOT NULL,
    url text,
    api_key text,
    config jsonb DEFAULT '{}',
    ativo boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.integracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view integrations"
ON public.integracoes FOR SELECT USING (true);

CREATE POLICY "Only admins can manage integrations"
ON public.integracoes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default integrations
INSERT INTO public.integracoes (nome, tipo, config) VALUES
('Hashdata', 'formulario', '{"campo_data_solicitacao": "DATA_SOLICITACAO", "campo_protocolo": "PROTOCOLO"}'),
('SmartNX', 'api', '{"campo_data_posicionamento": "Data Posicionamento"}');

-- Create field_mappings table for field relationships
CREATE TABLE public.field_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    campo_interno text NOT NULL,
    integracao_id uuid REFERENCES public.integracoes(id) ON DELETE CASCADE,
    campo_externo text NOT NULL,
    descricao text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mappings"
ON public.field_mappings FOR SELECT USING (true);

CREATE POLICY "Only admins can manage mappings"
ON public.field_mappings FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update audit_log to be more comprehensive
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS entidade text;
ALTER TABLE public.audit_log ADD COLUMN IF NOT EXISTS entidade_id uuid;

-- Update profiles to allow admin to manage all
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile or admin can update any"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));