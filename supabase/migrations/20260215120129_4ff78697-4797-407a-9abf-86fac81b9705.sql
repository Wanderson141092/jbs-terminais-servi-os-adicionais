
-- Add tipo_resultado column to parametros_campos
ALTER TABLE public.parametros_campos ADD COLUMN IF NOT EXISTS tipo_resultado text;

-- Set known classifications
UPDATE public.parametros_campos SET tipo_resultado = 'nao_conforme' WHERE grupo = 'status_processo' AND sigla IN ('cancelado', 'recusado');
UPDATE public.parametros_campos SET tipo_resultado = 'conforme' WHERE grupo = 'status_processo' AND sigla IN ('confirmado_aguardando_vistoria', 'vistoria_finalizada');
UPDATE public.parametros_campos SET tipo_resultado = 'nao_conforme' WHERE grupo = 'status_processo' AND sigla IN ('vistoriado_com_pendencia', 'nao_vistoriado');
UPDATE public.parametros_campos SET tipo_resultado = 'neutro' WHERE grupo = 'status_processo' AND sigla = 'aguardando_confirmacao';
