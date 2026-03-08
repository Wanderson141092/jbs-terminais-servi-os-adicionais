-- Reativar campos de análise que têm dados mas estão desativados
UPDATE public.campos_analise
SET ativo = true, updated_at = now()
WHERE id IN (
  'a201fcc8-c26a-4dd2-ba9b-c222553a74d8',
  '60d53aa8-07ec-49ee-a5b4-fa32dcc70dff',
  '204a4b07-bf0f-4c58-802b-a33936c2d9f9',
  '60c57540-4d2c-4ea6-9826-994e36c856eb',
  '0dc6ce63-0ea2-4119-a829-fbfe2ae459d9'
);