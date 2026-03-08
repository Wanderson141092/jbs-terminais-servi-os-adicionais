-- Snapshot table for process state (analysis/external consultation source of truth)
CREATE TABLE IF NOT EXISTS public.process_snapshot (
  solicitacao_id uuid PRIMARY KEY REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.process_snapshot ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'process_snapshot' AND policyname = 'Authenticated can view process_snapshot'
  ) THEN
    CREATE POLICY "Authenticated can view process_snapshot"
    ON public.process_snapshot
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_process_snapshot_updated_at ON public.process_snapshot(updated_at DESC);

CREATE OR REPLACE FUNCTION public.rebuild_process_snapshot(p_solicitacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sol public.solicitacoes%ROWTYPE;
  v_cobranca jsonb;
  v_campos jsonb;
  v_formulario jsonb;
  v_related_updated_at timestamptz;
  v_snapshot jsonb;
BEGIN
  SELECT * INTO v_sol
  FROM public.solicitacoes
  WHERE id = p_solicitacao_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', lcr.id,
        'cobranca_config_id', lcr.cobranca_config_id,
        'confirmado', lcr.confirmado,
        'confirmado_por', lcr.confirmado_por,
        'confirmado_em', lcr.confirmado_em,
        'created_at', lcr.created_at,
        'updated_at', lcr.updated_at
      ) ORDER BY lcr.created_at
    ),
    '[]'::jsonb
  )
  INTO v_cobranca
  FROM public.lancamento_cobranca_registros lcr
  WHERE lcr.solicitacao_id = p_solicitacao_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'campo_id', cav.campo_id,
        'valor', cav.valor,
        'nome', ca.nome,
        'visivel_externo', ca.visivel_externo,
        'updated_at', cav.updated_at
      ) ORDER BY ca.ordem NULLS LAST, ca.nome
    ),
    '[]'::jsonb
  )
  INTO v_campos
  FROM public.campos_analise_valores cav
  LEFT JOIN public.campos_analise ca ON ca.id = cav.campo_id
  WHERE cav.solicitacao_id = p_solicitacao_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', fr.id,
        'formulario_id', fr.formulario_id,
        'respostas', fr.respostas,
        'arquivos', fr.arquivos,
        'created_at', fr.created_at
      ) ORDER BY fr.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_formulario
  FROM (
    SELECT fr.*
    FROM public.formulario_respostas fr
    WHERE v_sol.formulario_id IS NOT NULL
      AND fr.formulario_id = v_sol.formulario_id
    ORDER BY fr.created_at DESC
    LIMIT 5
  ) fr;


  SELECT GREATEST(
    v_sol.updated_at,
    COALESCE((SELECT MAX(lcr.updated_at) FROM public.lancamento_cobranca_registros lcr WHERE lcr.solicitacao_id = p_solicitacao_id), '-infinity'::timestamptz),
    COALESCE((SELECT MAX(cav.updated_at) FROM public.campos_analise_valores cav WHERE cav.solicitacao_id = p_solicitacao_id), '-infinity'::timestamptz),
    COALESCE((SELECT MAX(fr.created_at) FROM public.formulario_respostas fr WHERE v_sol.formulario_id IS NOT NULL AND fr.formulario_id = v_sol.formulario_id), '-infinity'::timestamptz)
  )
  INTO v_related_updated_at;

  v_snapshot := jsonb_build_object(
    'solicitacao', jsonb_build_object(
      'id', v_sol.id,
      'protocolo', v_sol.protocolo,
      'status', v_sol.status,
      'tipo_operacao', v_sol.tipo_operacao,
      'tipo_carga', v_sol.tipo_carga,
      'data_agendamento', v_sol.data_agendamento,
      'data_posicionamento', v_sol.data_posicionamento,
      'created_at', v_sol.created_at,
      'updated_at', v_sol.updated_at,
      'comex_aprovado', v_sol.comex_aprovado,
      'armazem_aprovado', v_sol.armazem_aprovado,
      'status_vistoria', v_sol.status_vistoria,
      'numero_conteiner', v_sol.numero_conteiner,
      'categoria', v_sol.categoria,
      'lpco', v_sol.lpco,
      'solicitar_deferimento', v_sol.solicitar_deferimento,
      'solicitar_lacre_armador', v_sol.solicitar_lacre_armador,
      'lacre_armador_possui', v_sol.lacre_armador_possui,
      'lacre_armador_aceite_custo', v_sol.lacre_armador_aceite_custo,
      'pendencias_selecionadas', COALESCE(to_jsonb(v_sol.pendencias_selecionadas), '[]'::jsonb),
      'formulario_id', v_sol.formulario_id
    ),
    'cobranca', v_cobranca,
    'campos_dinamicos', v_campos,
    'formulario_respostas', v_formulario,
    'snapshot_updated_at', now(),
    'related_updated_at', v_related_updated_at
  );

  INSERT INTO public.process_snapshot (solicitacao_id, snapshot_json, updated_at)
  VALUES (p_solicitacao_id, v_snapshot, now())
  ON CONFLICT (solicitacao_id)
  DO UPDATE SET
    snapshot_json = EXCLUDED.snapshot_json,
    updated_at = EXCLUDED.updated_at;

  RETURN v_snapshot;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_process_snapshot_safe(p_solicitacao_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot public.process_snapshot%ROWTYPE;
  v_related_updated_at timestamptz;
BEGIN
  SELECT GREATEST(
    s.updated_at,
    COALESCE((SELECT MAX(lcr.updated_at) FROM public.lancamento_cobranca_registros lcr WHERE lcr.solicitacao_id = p_solicitacao_id), '-infinity'::timestamptz),
    COALESCE((SELECT MAX(cav.updated_at) FROM public.campos_analise_valores cav WHERE cav.solicitacao_id = p_solicitacao_id), '-infinity'::timestamptz),
    COALESCE((SELECT MAX(fr.created_at) FROM public.formulario_respostas fr WHERE s.formulario_id IS NOT NULL AND fr.formulario_id = s.formulario_id), '-infinity'::timestamptz)
  )
  INTO v_related_updated_at
  FROM public.solicitacoes s
  WHERE s.id = p_solicitacao_id;

  IF v_related_updated_at IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_snapshot
  FROM public.process_snapshot
  WHERE solicitacao_id = p_solicitacao_id;

  IF v_snapshot.solicitacao_id IS NULL OR v_snapshot.updated_at < v_related_updated_at THEN
    RETURN public.rebuild_process_snapshot(p_solicitacao_id);
  END IF;

  RETURN v_snapshot.snapshot_json;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rebuild_process_snapshot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_process_snapshot_safe(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_process_snapshot_safe(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.refresh_process_snapshot_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_solicitacao_id uuid;
  v_formulario_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'formulario_respostas' THEN
    v_formulario_id := COALESCE(NEW.formulario_id, OLD.formulario_id);

    IF v_formulario_id IS NOT NULL THEN
      PERFORM public.rebuild_process_snapshot(s.id)
      FROM public.solicitacoes s
      WHERE s.formulario_id = v_formulario_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
  END IF;

  v_solicitacao_id := COALESCE(NEW.solicitacao_id, OLD.solicitacao_id, NEW.id, OLD.id);

  IF v_solicitacao_id IS NOT NULL THEN
    PERFORM public.rebuild_process_snapshot(v_solicitacao_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_process_snapshot_solicitacoes ON public.solicitacoes;
CREATE TRIGGER trg_refresh_process_snapshot_solicitacoes
AFTER INSERT OR UPDATE OF status, pendencias_selecionadas, status_vistoria, categoria, updated_at ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.refresh_process_snapshot_trigger();

DROP TRIGGER IF EXISTS trg_refresh_process_snapshot_cobranca ON public.lancamento_cobranca_registros;
CREATE TRIGGER trg_refresh_process_snapshot_cobranca
AFTER INSERT OR UPDATE OR DELETE ON public.lancamento_cobranca_registros
FOR EACH ROW
EXECUTE FUNCTION public.refresh_process_snapshot_trigger();

DROP TRIGGER IF EXISTS trg_refresh_process_snapshot_formulario_respostas ON public.formulario_respostas;
CREATE TRIGGER trg_refresh_process_snapshot_formulario_respostas
AFTER INSERT OR UPDATE OR DELETE ON public.formulario_respostas
FOR EACH ROW
EXECUTE FUNCTION public.refresh_process_snapshot_trigger();

DROP TRIGGER IF EXISTS trg_refresh_process_snapshot_campos_valores ON public.campos_analise_valores;
CREATE TRIGGER trg_refresh_process_snapshot_campos_valores
AFTER INSERT OR UPDATE OR DELETE ON public.campos_analise_valores
FOR EACH ROW
EXECUTE FUNCTION public.refresh_process_snapshot_trigger();

-- Keep solicitacoes_v as main source for analysis screens, prioritizing snapshot values.
DROP VIEW IF EXISTS public.solicitacoes_v;
CREATE VIEW public.solicitacoes_v AS
SELECT
  s.id,
  s.protocolo,
  COALESCE(ps.snapshot_json #>> '{solicitacao,status}', s.status) AS status,
  decrypt_pii(s.cliente_nome) AS cliente_nome,
  decrypt_pii(s.cliente_email) AS cliente_email,
  decrypt_pii(s.cnpj) AS cnpj,
  s.cnpj_hash,
  s.cliente_email_hash,
  s.cliente_nome_hash,
  s.tipo_carga,
  s.tipo_operacao,
  s.observacoes,
  s.numero_conteiner,
  s.lpco,
  s.data_posicionamento,
  s.data_agendamento,
  s.created_at,
  s.updated_at,
  s.comex_aprovado,
  s.comex_usuario_id,
  s.comex_data,
  s.comex_justificativa,
  s.armazem_aprovado,
  s.armazem_usuario_id,
  s.armazem_data,
  s.armazem_justificativa,
  s.lancamento_confirmado,
  s.lancamento_confirmado_por,
  s.lancamento_confirmado_data,
  s.solicitar_deferimento,
  s.custo_posicionamento,
  s.solicitar_lacre_armador,
  s.lacre_armador_possui,
  s.lacre_armador_aceite_custo,
  s.cancelamento_solicitado,
  s.cancelamento_solicitado_em,
  COALESCE(ps.snapshot_json #>> '{solicitacao,status_vistoria}', s.status_vistoria) AS status_vistoria,
  COALESCE(ps.snapshot_json #>> '{solicitacao,categoria}', s.categoria) AS categoria,
  COALESCE(
    CASE
      WHEN jsonb_typeof(ps.snapshot_json #> '{solicitacao,pendencias_selecionadas}') = 'array'
      THEN ARRAY(SELECT jsonb_array_elements_text(ps.snapshot_json #> '{solicitacao,pendencias_selecionadas}'))
      ELSE NULL
    END,
    s.pendencias_selecionadas
  ) AS pendencias_selecionadas,
  s.chave_consulta,
  ps.updated_at AS snapshot_updated_at
FROM public.solicitacoes s
LEFT JOIN public.process_snapshot ps ON ps.solicitacao_id = s.id;

GRANT SELECT ON public.solicitacoes_v TO authenticated;
GRANT SELECT ON public.solicitacoes_v TO anon;

-- Backfill snapshot for existing processes
INSERT INTO public.process_snapshot (solicitacao_id, snapshot_json, updated_at)
SELECT s.id, public.rebuild_process_snapshot(s.id), now()
FROM public.solicitacoes s
ON CONFLICT (solicitacao_id) DO NOTHING;
