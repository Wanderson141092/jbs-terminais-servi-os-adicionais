-- Create table for sector-service permissions
CREATE TABLE public.setor_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setor_email_id UUID NOT NULL REFERENCES public.setor_emails(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (setor_email_id, servico_id)
);

-- Enable RLS
ALTER TABLE public.setor_servicos ENABLE ROW LEVEL SECURITY;

-- Anyone can view permissions
CREATE POLICY "Anyone can view setor_servicos"
ON public.setor_servicos
FOR SELECT
USING (true);

-- Only admins can manage permissions
CREATE POLICY "Only admins can manage setor_servicos"
ON public.setor_servicos
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));