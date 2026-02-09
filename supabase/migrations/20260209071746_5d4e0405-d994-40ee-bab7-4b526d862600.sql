-- Add separate visualization config for Deferimento
ALTER TABLE public.servicos
ADD COLUMN IF NOT EXISTS deferimento_embutidos boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.servicos.anexos_embutidos IS 'Define se os anexos (tela de Análise) são exibidos embutidos (true) ou apenas via botão (false).';
COMMENT ON COLUMN public.servicos.deferimento_embutidos IS 'Define se o deferimento (tela de Deferimento) é exibido embutido (true) ou apenas via botão (false).';

-- Allow deferimento_documents to store multiple document categories
ALTER TABLE public.deferimento_documents
ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'deferimento';

COMMENT ON COLUMN public.deferimento_documents.document_type IS 'Categoria do documento: deferimento (fluxo de deferimento externo/interno) ou anexo (anexos gerais do processo).';

-- Backfill for existing rows
UPDATE public.deferimento_documents
SET document_type = 'deferimento'
WHERE document_type IS NULL OR document_type = '';

-- Optional: speed up queries by type
CREATE INDEX IF NOT EXISTS idx_deferimento_documents_solicitacao_type
ON public.deferimento_documents (solicitacao_id, document_type, created_at DESC);