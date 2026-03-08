-- View consolidada para leitura dos campos de análise por solicitação
CREATE OR REPLACE VIEW public.process_campos_view AS
SELECT
  s.id AS solicitacao_id,
  s.formulario_id,
  s.created_at AS solicitacao_created_at,
  s.tipo_operacao,
  s.cliente_nome,
  s.cnpj,
  f.titulo AS formulario_titulo,
  cav.id AS campo_valor_id,
  cav.campo_id,
  cav.valor AS campo_valor,
  cav.created_at AS campo_valor_created_at,
  ca.nome AS campo_nome,
  ca.tipo AS campo_tipo,
  ca.ordem AS campo_ordem,
  ca.visivel_externo AS campo_visivel_externo,
  pm.pergunta_id,
  bp.rotulo AS pergunta_rotulo,
  bp.tipo AS pergunta_tipo
FROM public.solicitacoes s
LEFT JOIN public.formularios f
  ON f.id = s.formulario_id
LEFT JOIN public.campos_analise_valores cav
  ON cav.solicitacao_id = s.id
LEFT JOIN public.campos_analise ca
  ON ca.id = cav.campo_id
LEFT JOIN public.pergunta_mapeamento pm
  ON pm.formulario_id = s.formulario_id
 AND pm.campo_analise_id = cav.campo_id
LEFT JOIN public.banco_perguntas bp
  ON bp.id = pm.pergunta_id;

GRANT SELECT ON public.process_campos_view TO authenticated;
GRANT SELECT ON public.process_campos_view TO anon;

-- Índices para as chaves de junção críticas do fluxo de análise
CREATE INDEX IF NOT EXISTS idx_campos_analise_valores_solicitacao_id
  ON public.campos_analise_valores (solicitacao_id);

CREATE INDEX IF NOT EXISTS idx_campos_analise_valores_campo_id
  ON public.campos_analise_valores (campo_id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_formulario_id
  ON public.solicitacoes (formulario_id);

CREATE INDEX IF NOT EXISTS idx_pergunta_mapeamento_formulario_campo
  ON public.pergunta_mapeamento (formulario_id, campo_analise_id);

-- Medição sugerida de ganho (executar no ambiente com volume real):
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT cav.campo_id, cav.valor, ca.nome
-- FROM public.campos_analise_valores cav
-- JOIN public.campos_analise ca ON ca.id = cav.campo_id
-- WHERE cav.solicitacao_id = '<SOLICITACAO_ID>'::uuid;
--
-- EXPLAIN (ANALYZE, BUFFERS)
-- SELECT campo_id, campo_valor, campo_nome
-- FROM public.process_campos_view
-- WHERE solicitacao_id = '<SOLICITACAO_ID>'::uuid;
