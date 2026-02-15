
-- Add servico_ids column
ALTER TABLE public.cancelamento_recusa_config ADD COLUMN servico_ids UUID[] NOT NULL DEFAULT '{}';

-- Migrate existing data
UPDATE public.cancelamento_recusa_config SET servico_ids = ARRAY[servico_id];

-- Drop old FK constraint and unique constraint
ALTER TABLE public.cancelamento_recusa_config DROP CONSTRAINT cancelamento_recusa_config_servico_id_fkey;
ALTER TABLE public.cancelamento_recusa_config DROP CONSTRAINT cancelamento_recusa_config_servico_id_tipo_key;

-- Drop old column
ALTER TABLE public.cancelamento_recusa_config DROP COLUMN servico_id;
