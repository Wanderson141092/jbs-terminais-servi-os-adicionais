
-- Add categoria column to solicitacoes
ALTER TABLE public.solicitacoes ADD COLUMN IF NOT EXISTS categoria text DEFAULT NULL;

-- Create parametros_campos table for dynamic field options
CREATE TABLE public.parametros_campos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo text NOT NULL, -- tipo_carga, categoria, status_processo, status_deferimento
  valor text NOT NULL,
  sigla text, -- for tipo_carga: Dry, Reefer, IMO, OOG, Breakbulk
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(grupo, valor)
);

ALTER TABLE public.parametros_campos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view parametros_campos"
  ON public.parametros_campos FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage parametros_campos"
  ON public.parametros_campos FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
