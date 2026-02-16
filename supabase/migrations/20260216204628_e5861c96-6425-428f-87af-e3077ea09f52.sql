
-- Create table for report templates metadata
CREATE TABLE public.modelos_relatorio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  tipo TEXT NOT NULL DEFAULT 'excel',
  criado_por UUID,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.modelos_relatorio ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view active templates
CREATE POLICY "Authenticated can view modelos_relatorio"
  ON public.modelos_relatorio
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can manage (insert, update, delete)
CREATE POLICY "Only admins can manage modelos_relatorio"
  ON public.modelos_relatorio
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for report templates
INSERT INTO storage.buckets (id, name, public) VALUES ('modelos-relatorio', 'modelos-relatorio', false);

-- Storage policies: authenticated can download, admins can upload/delete
CREATE POLICY "Authenticated can download report templates"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'modelos-relatorio' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can upload report templates"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'modelos-relatorio' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete report templates"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'modelos-relatorio' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update report templates"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'modelos-relatorio' AND has_role(auth.uid(), 'admin'::app_role));
