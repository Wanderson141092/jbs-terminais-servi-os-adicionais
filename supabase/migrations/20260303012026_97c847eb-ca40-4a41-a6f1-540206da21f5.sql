
-- Add servico_id to formularios to link form to a service
ALTER TABLE public.formularios ADD COLUMN servico_id uuid REFERENCES public.servicos(id) ON DELETE SET NULL;

-- Add formulario_id to solicitacoes to trace which form generated it
ALTER TABLE public.solicitacoes ADD COLUMN formulario_id uuid REFERENCES public.formularios(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX idx_solicitacoes_formulario_id ON public.solicitacoes(formulario_id);
