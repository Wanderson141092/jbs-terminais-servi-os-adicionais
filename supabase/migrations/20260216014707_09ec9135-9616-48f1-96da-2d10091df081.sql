
-- Create campos_analise for N4 report fields (linked to Posicionamento service)
INSERT INTO public.campos_analise (nome, tipo, opcoes, servico_ids, ordem, ativo, visivel_externo) VALUES
('Motivo Posicionamento', 'select', '["MAPA", "ANVISA", "IBAMA", "Exército", "INMETRO", "Polícia Federal", "Outro"]'::jsonb, ARRAY['d22990f3-3f04-483c-80e7-f0858a255b02']::uuid[], 100, true, false),
('Tipo de Inspeção', 'select', '["Animal", "Vegetal", "Outro"]'::jsonb, ARRAY['d22990f3-3f04-483c-80e7-f0858a255b02']::uuid[], 101, true, false),
('Nível de Inspeção', 'select', '["Nível I", "Nível II", "Nível III", "Outro"]'::jsonb, ARRAY['d22990f3-3f04-483c-80e7-f0858a255b02']::uuid[], 102, true, false),
('Doca Refrigerada', 'select', '["Sim", "Não"]'::jsonb, ARRAY['d22990f3-3f04-483c-80e7-f0858a255b02']::uuid[], 103, true, false),
('Temperatura Doca', 'texto', NULL, ARRAY['d22990f3-3f04-483c-80e7-f0858a255b02']::uuid[], 104, true, false),
('Informações Adicionais N4', 'textarea', NULL, ARRAY['d22990f3-3f04-483c-80e7-f0858a255b02']::uuid[], 105, true, false);
