-- Fix trigger to respect manual status changes
CREATE OR REPLACE FUNCTION public.update_solicitacao_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Sempre atualiza updated_at
  NEW.updated_at = now();

  -- Se o status está sendo alterado manualmente (OLD.status != NEW.status), respeitar a mudança
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Permite qualquer mudança manual de status
    RETURN NEW;
  END IF;

  -- Recalcula status apenas quando approval flags mudam (não o status diretamente)
  IF (OLD.comex_aprovado IS DISTINCT FROM NEW.comex_aprovado) OR 
     (OLD.armazem_aprovado IS DISTINCT FROM NEW.armazem_aprovado) THEN
    -- Não sobrescrever status quando já está em etapa de vistoria ou cancelado
    IF NEW.status IN ('vistoria_finalizada', 'vistoriado_com_pendencia', 'nao_vistoriado', 'cancelado') THEN
      RETURN NEW;
    END IF;
    
    -- Recalcula status baseado nas aprovações
    IF NEW.comex_aprovado = false OR NEW.armazem_aprovado = false THEN
      NEW.status = 'recusado';
    ELSIF NEW.comex_aprovado = true AND NEW.armazem_aprovado = true THEN
      NEW.status = 'confirmado_aguardando_vistoria';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create external_buttons table for managing buttons on external page
CREATE TABLE IF NOT EXISTS public.external_buttons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  icone TEXT DEFAULT 'FileText',
  tipo TEXT NOT NULL DEFAULT 'iframe', -- 'iframe', 'link', 'formulario'
  url TEXT, -- For iframe or external link
  formulario_id UUID, -- For internal form
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  abrir_nova_aba BOOLEAN DEFAULT false, -- For link type
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on external_buttons
ALTER TABLE public.external_buttons ENABLE ROW LEVEL SECURITY;

-- RLS policies for external_buttons
CREATE POLICY "Anyone can view active buttons" ON public.external_buttons
FOR SELECT USING (true);

CREATE POLICY "Only admins can manage buttons" ON public.external_buttons
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create forms table
CREATE TABLE IF NOT EXISTS public.formularios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on formularios
ALTER TABLE public.formularios ENABLE ROW LEVEL SECURITY;

-- RLS policies for formularios
CREATE POLICY "Anyone can view active forms" ON public.formularios
FOR SELECT USING (true);

CREATE POLICY "Only admins can manage forms" ON public.formularios
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create form fields table
CREATE TABLE IF NOT EXISTS public.formulario_campos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  formulario_id UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'texto', 'texto_longo', 'numero', 'data', 'select', 'multipla_escolha', 'checkbox', 'arquivo'
  rotulo TEXT NOT NULL,
  placeholder TEXT,
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  opcoes JSONB, -- For select/multipla_escolha: [{value, label}]
  condicao JSONB, -- For conditional logic: {campo_id, operador, valor}
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on formulario_campos
ALTER TABLE public.formulario_campos ENABLE ROW LEVEL SECURITY;

-- RLS policies for formulario_campos
CREATE POLICY "Anyone can view form fields" ON public.formulario_campos
FOR SELECT USING (true);

CREATE POLICY "Only admins can manage form fields" ON public.formulario_campos
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create form responses table
CREATE TABLE IF NOT EXISTS public.formulario_respostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  formulario_id UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  respostas JSONB NOT NULL, -- {campo_id: valor, ...}
  arquivos JSONB, -- [{campo_id, file_url, file_name}, ...]
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on formulario_respostas
ALTER TABLE public.formulario_respostas ENABLE ROW LEVEL SECURITY;

-- RLS policies for formulario_respostas
CREATE POLICY "Anyone can submit responses" ON public.formulario_respostas
FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can view responses" ON public.formulario_respostas
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage responses" ON public.formulario_respostas
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add foreign key from external_buttons to formularios
ALTER TABLE public.external_buttons 
ADD CONSTRAINT external_buttons_formulario_id_fkey 
FOREIGN KEY (formulario_id) REFERENCES public.formularios(id) ON DELETE SET NULL;

-- Create storage bucket for form uploads if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('form-uploads', 'form-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for form uploads
CREATE POLICY "Anyone can upload form files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'form-uploads');

CREATE POLICY "Anyone can view form files" ON storage.objects
FOR SELECT USING (bucket_id = 'form-uploads');