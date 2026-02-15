
-- Add lacre armador fields to solicitacoes
ALTER TABLE public.solicitacoes
ADD COLUMN IF NOT EXISTS solicitar_lacre_armador boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS lacre_armador_possui boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS lacre_armador_aceite_custo boolean DEFAULT NULL;

-- Add lacre armador config to servicos
ALTER TABLE public.servicos
ADD COLUMN IF NOT EXISTS lacre_armador_status_ativacao text[] DEFAULT '{}'::text[];

-- Insert lacre armador config entries in system_config
INSERT INTO public.system_config (config_key, config_type, config_value, description, is_active)
VALUES 
  ('lacre_armador_mensagem_custo', 'text', 'Caso a unidade esteja na praça de pré-stacking, a colocação do lacre estará sujeita a custo adicional de reposicionamento.', 'Mensagem de aviso de custo para regularização de lacre armador', true),
  ('lacre_armador_tipo_aceite', 'text', 'aceite', 'Tipo de aceite para custo de lacre: "informativo" ou "aceite"', true),
  ('lacre_armador_titulo_externo', 'text', 'Regularização de Lacre Armador', 'Título exibido na consulta externa para o fluxo de lacre armador', true)
ON CONFLICT DO NOTHING;
