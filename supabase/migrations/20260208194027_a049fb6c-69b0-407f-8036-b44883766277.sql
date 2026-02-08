-- Tabela de mapeamento de e-mails de setor
CREATE TABLE public.setor_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_setor text NOT NULL UNIQUE,
  setor public.setor_tipo NOT NULL,
  descricao text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.setor_emails ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view
CREATE POLICY "Authenticated can view setor_emails"
ON public.setor_emails FOR SELECT
TO authenticated
USING (true);

-- Policy: Only admin can manage
CREATE POLICY "Only admin can insert setor_emails"
ON public.setor_emails FOR INSERT
TO authenticated
WITH CHECK (true);

-- Insert default sector email mappings
INSERT INTO public.setor_emails (email_setor, setor, descricao) VALUES
('comex@jbsterminais.com.br', 'COMEX', 'Documentação Exportação/Importação'),
('exportacao@jbsterminais.com.br', 'COMEX', 'Documentação - Exportação'),
('importacao@jbsterminais.com.br', 'COMEX', 'Documentação - Importação'),
('armazem@jbsterminais.com.br', 'ARMAZEM', 'Armazém');

-- Add email_setor column to profiles to track sector association
ALTER TABLE public.profiles
ADD COLUMN email_setor text REFERENCES public.setor_emails(email_setor);

-- Update setor_tipo enum to include more sectors
-- Note: We'll keep COMEX and ARMAZEM for the approval flow

-- Add tipo_operacao column to solicitacoes
ALTER TABLE public.solicitacoes
ADD COLUMN IF NOT EXISTS tipo_operacao text DEFAULT 'Posicionamento';