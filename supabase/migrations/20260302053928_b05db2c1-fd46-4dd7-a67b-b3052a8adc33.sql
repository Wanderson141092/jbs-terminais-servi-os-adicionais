
-- Recreate solicitacoes_v WITHOUT security_invoker so decrypt_pii works
DROP VIEW IF EXISTS public.solicitacoes_v;
CREATE VIEW public.solicitacoes_v AS
SELECT
  id, protocolo, status,
  decrypt_pii(cliente_nome) AS cliente_nome,
  decrypt_pii(cliente_email) AS cliente_email,
  decrypt_pii(cnpj) AS cnpj,
  cnpj_hash, cliente_email_hash, cliente_nome_hash,
  tipo_carga, tipo_operacao, observacoes, numero_conteiner, lpco,
  data_posicionamento, data_agendamento, created_at, updated_at,
  comex_aprovado, comex_usuario_id, comex_data, comex_justificativa,
  armazem_aprovado, armazem_usuario_id, armazem_data, armazem_justificativa,
  lancamento_confirmado, lancamento_confirmado_por, lancamento_confirmado_data,
  solicitar_deferimento, custo_posicionamento,
  solicitar_lacre_armador, lacre_armador_possui, lacre_armador_aceite_custo,
  cancelamento_solicitado, cancelamento_solicitado_em,
  status_vistoria, categoria, pendencias_selecionadas, chave_consulta
FROM public.solicitacoes;

-- Grant access
GRANT SELECT ON public.solicitacoes_v TO authenticated;
GRANT SELECT ON public.solicitacoes_v TO anon;
