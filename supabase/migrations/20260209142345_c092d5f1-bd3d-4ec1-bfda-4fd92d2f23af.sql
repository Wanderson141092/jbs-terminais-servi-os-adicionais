
-- Add direction to field_mappings
ALTER TABLE public.field_mappings ADD COLUMN IF NOT EXISTS direcao text NOT NULL DEFAULT 'ambos';

-- Add service associations to parametros_campos
ALTER TABLE public.parametros_campos ADD COLUMN IF NOT EXISTS servico_ids uuid[] NOT NULL DEFAULT '{}';

-- Add style persistence to formularios
ALTER TABLE public.formularios ADD COLUMN IF NOT EXISTS estilo text NOT NULL DEFAULT 'jbs';
