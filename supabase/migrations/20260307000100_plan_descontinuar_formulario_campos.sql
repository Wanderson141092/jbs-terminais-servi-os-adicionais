-- Planejamento de descontinuação da tabela legado `formulario_campos`.
--
-- Contexto:
-- - O fluxo atual de renderização/gestão utiliza `formulario_perguntas` + `banco_perguntas`.
-- - Esta migration NÃO remove objetos ainda; apenas registra o plano operacional.
--
-- Checklist recomendado antes do DROP:
-- 1) Validar ausência de consumidores no frontend/backend (busca por `formulario_campos`).
-- 2) Validar integrações externas (RPC, jobs, BI, scripts) que possam depender da tabela.
-- 3) Confirmar que exportações e telas administrativas usam IDs de `pergunta_id`.
-- 4) Executar monitoramento em produção por pelo menos 1 ciclo completo de uso.
--
-- Após validação completa, aplicar migration futura com:
-- - DROP POLICY / revogação de grants de `formulario_campos`.
-- - DROP TABLE public.formulario_campos.
-- - Remoção dos tipos gerados no client (regenerar types).

DO $$
BEGIN
  RAISE NOTICE 'Plano registrado: descontinuação de formulario_campos pendente de validação de consumidores.';
END
$$;
