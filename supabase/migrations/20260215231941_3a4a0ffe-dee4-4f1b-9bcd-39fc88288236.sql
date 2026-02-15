
-- Table to store lacre armador sub-step form data
CREATE TABLE public.lacre_armador_dados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id),
  lacre_coletado BOOLEAN DEFAULT NULL,
  foto_lacre_url TEXT DEFAULT NULL,
  foto_lacre_path TEXT DEFAULT NULL,
  data_posicionamento_lacre DATE DEFAULT NULL,
  periodo_lacre TEXT DEFAULT NULL, -- 'manha' or 'tarde'
  responsavel_nome TEXT DEFAULT NULL,
  responsavel_telefone TEXT DEFAULT NULL,
  responsavel_email TEXT DEFAULT NULL,
  lacre_status TEXT NOT NULL DEFAULT 'aguardando_preenchimento',
  motivo_recusa TEXT DEFAULT NULL,
  confirmado_por UUID DEFAULT NULL,
  confirmado_data TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lacre_armador_dados ENABLE ROW LEVEL SECURITY;

-- Anyone can view (for public consultation via edge function with service_role)
CREATE POLICY "Anyone can view lacre_armador_dados"
  ON public.lacre_armador_dados FOR SELECT
  USING (true);

-- Admins can manage
CREATE POLICY "Only admins can manage lacre_armador_dados"
  ON public.lacre_armador_dados FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow insert from anyone (edge function uses service_role anyway)
CREATE POLICY "Anyone can insert lacre_armador_dados"
  ON public.lacre_armador_dados FOR INSERT
  WITH CHECK (true);
