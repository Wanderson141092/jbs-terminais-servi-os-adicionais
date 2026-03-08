
-- Fix campos_analise_valores: convert JSON arrays like ["A","B"] to newline-separated
UPDATE public.campos_analise_valores
SET valor = (
  SELECT string_agg(elem::text, E'\n')
  FROM jsonb_array_elements_text(valor::jsonb) AS elem
),
    updated_at = now()
WHERE valor IS NOT NULL
  AND valor LIKE '["%'
  AND valor LIKE '%"]'
  AND jsonb_typeof(valor::jsonb) = 'array';

-- Fix solicitacoes.numero_conteiner: convert JSON arrays to newline-separated
UPDATE public.solicitacoes
SET numero_conteiner = (
  SELECT string_agg(elem::text, E'\n')
  FROM jsonb_array_elements_text(numero_conteiner::jsonb) AS elem
),
    updated_at = now()
WHERE numero_conteiner IS NOT NULL
  AND numero_conteiner LIKE '["%'
  AND numero_conteiner LIKE '%"]'
  AND jsonb_typeof(numero_conteiner::jsonb) = 'array';

-- Fix solicitacoes.observacoes: convert JSON arrays to newline-separated
UPDATE public.solicitacoes
SET observacoes = (
  SELECT string_agg(elem::text, E'\n')
  FROM jsonb_array_elements_text(observacoes::jsonb) AS elem
),
    updated_at = now()
WHERE observacoes IS NOT NULL
  AND observacoes LIKE '["%'
  AND observacoes LIKE '%"]'
  AND jsonb_typeof(observacoes::jsonb) = 'array';
