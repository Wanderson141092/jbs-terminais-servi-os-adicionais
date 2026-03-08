-- Fase 1: novos artefatos sem desligar fluxo atual
CREATE TABLE IF NOT EXISTS public.migration_runtime_flags (
  entity_name text PRIMARY KEY,
  dual_write_enabled boolean NOT NULL DEFAULT false,
  read_from_new_enabled boolean NOT NULL DEFAULT false,
  legacy_write_disabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.migration_runtime_flags (entity_name)
VALUES ('cobrancas'), ('process_events'), ('process_snapshot')
ON CONFLICT (entity_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.migration_backfill_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  total_processed integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.migration_backfill_checkpoints (
  entity_name text PRIMARY KEY,
  last_cursor text,
  last_run_id uuid REFERENCES public.migration_backfill_runs(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  extra jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.migration_backfill_batches (
  id bigserial PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.migration_backfill_runs(id) ON DELETE CASCADE,
  entity_name text NOT NULL,
  cursor_before text,
  cursor_after text,
  processed_rows integer NOT NULL,
  checksum text,
  executed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cobrancas_v2 (
  id uuid PRIMARY KEY,
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  cobranca_config_id uuid NOT NULL REFERENCES public.lancamento_cobranca_config(id) ON DELETE CASCADE,
  confirmado boolean NOT NULL DEFAULT false,
  confirmado_por uuid,
  confirmado_data timestamptz,
  source text NOT NULL DEFAULT 'legacy',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (solicitacao_id, cobranca_config_id)
);

CREATE INDEX IF NOT EXISTS idx_cobrancas_v2_solicitacao_id ON public.cobrancas_v2(solicitacao_id);

CREATE TABLE IF NOT EXISTS public.process_events_v2 (
  id uuid PRIMARY KEY,
  process_id uuid NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  entity_name text,
  entity_id text,
  actor_id uuid,
  event_ts timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'legacy',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_process_events_v2_process_id ON public.process_events_v2(process_id);
CREATE INDEX IF NOT EXISTS idx_process_events_v2_event_ts ON public.process_events_v2(event_ts DESC);

CREATE TABLE IF NOT EXISTS public.process_snapshot_v2 (
  process_id uuid PRIMARY KEY REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  status text,
  status_vistoria text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'legacy',
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_cobrancas_v2 ON public.cobrancas_v2;
CREATE TRIGGER trg_touch_cobrancas_v2
BEFORE UPDATE ON public.cobrancas_v2
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_runtime_flags ON public.migration_runtime_flags;
CREATE TRIGGER trg_touch_runtime_flags
BEFORE UPDATE ON public.migration_runtime_flags
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();

-- Fase 2: dual-write e validações de consistência
CREATE OR REPLACE FUNCTION public.migration_start_backfill_run(p_entity_name text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_run_id uuid;
BEGIN
  INSERT INTO public.migration_backfill_runs(entity_name, metadata)
  VALUES (p_entity_name, coalesce(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_run_id;

  RETURN v_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.migration_finish_backfill_run(
  p_run_id uuid,
  p_status text,
  p_total_processed integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.migration_backfill_runs
  SET finished_at = now(),
      status = p_status,
      total_processed = p_total_processed
  WHERE id = p_run_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_cobrancas_batch(
  p_run_id uuid,
  p_batch_size integer DEFAULT 1000
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_cursor text;
  v_cursor_after text;
  v_processed integer := 0;
  v_checksum text;
BEGIN
  SELECT last_cursor INTO v_last_cursor
  FROM public.migration_backfill_checkpoints
  WHERE entity_name = 'cobrancas';

  WITH src AS (
    SELECT *
    FROM public.lancamento_cobranca_registros
    WHERE (v_last_cursor IS NULL OR id::text > v_last_cursor)
    ORDER BY id
    LIMIT p_batch_size
  ), upserted AS (
    INSERT INTO public.cobrancas_v2 (
      id, solicitacao_id, cobranca_config_id, confirmado,
      confirmado_por, confirmado_data, source, metadata,
      created_at, updated_at
    )
    SELECT
      s.id,
      s.solicitacao_id,
      s.cobranca_config_id,
      s.confirmado,
      NULLIF(s.confirmado_por, '')::uuid,
      s.confirmado_data,
      'legacy',
      jsonb_build_object('legacy_table', 'lancamento_cobranca_registros'),
      s.created_at,
      s.updated_at
    FROM src s
    ON CONFLICT (id) DO UPDATE
    SET confirmado = EXCLUDED.confirmado,
        confirmado_por = EXCLUDED.confirmado_por,
        confirmado_data = EXCLUDED.confirmado_data,
        updated_at = EXCLUDED.updated_at,
        metadata = EXCLUDED.metadata
    RETURNING id
  )
  SELECT count(*), max(id::text), md5(string_agg(id::text, ',' ORDER BY id::text))
  INTO v_processed, v_cursor_after, v_checksum
  FROM upserted;

  IF v_processed > 0 THEN
    INSERT INTO public.migration_backfill_checkpoints(entity_name, last_cursor, last_run_id)
    VALUES ('cobrancas', v_cursor_after, p_run_id)
    ON CONFLICT (entity_name) DO UPDATE
    SET last_cursor = EXCLUDED.last_cursor,
        last_run_id = EXCLUDED.last_run_id,
        updated_at = now();

    INSERT INTO public.migration_backfill_batches(run_id, entity_name, cursor_before, cursor_after, processed_rows, checksum)
    VALUES (p_run_id, 'cobrancas', v_last_cursor, v_cursor_after, v_processed, v_checksum);
  END IF;

  RETURN v_processed;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_process_events_batch(
  p_run_id uuid,
  p_batch_size integer DEFAULT 1000
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_cursor text;
  v_cursor_after text;
  v_processed integer := 0;
  v_checksum text;
BEGIN
  SELECT last_cursor INTO v_last_cursor
  FROM public.migration_backfill_checkpoints
  WHERE entity_name = 'process_events';

  WITH src AS (
    SELECT *
    FROM public.audit_log
    WHERE (v_last_cursor IS NULL OR id::text > v_last_cursor)
    ORDER BY id
    LIMIT p_batch_size
  ), upserted AS (
    INSERT INTO public.process_events_v2 (
      id, process_id, event_type, entity_name, entity_id,
      actor_id, event_ts, payload, source, created_at
    )
    SELECT
      s.id,
      s.solicitacao_id,
      s.acao,
      s.entidade,
      s.entidade_id,
      s.usuario_id,
      s.created_at,
      jsonb_build_object('detalhes', s.detalhes),
      'legacy',
      s.created_at
    FROM src s
    ON CONFLICT (id) DO UPDATE
    SET event_type = EXCLUDED.event_type,
        entity_name = EXCLUDED.entity_name,
        entity_id = EXCLUDED.entity_id,
        actor_id = EXCLUDED.actor_id,
        event_ts = EXCLUDED.event_ts,
        payload = EXCLUDED.payload
    RETURNING id
  )
  SELECT count(*), max(id::text), md5(string_agg(id::text, ',' ORDER BY id::text))
  INTO v_processed, v_cursor_after, v_checksum
  FROM upserted;

  IF v_processed > 0 THEN
    INSERT INTO public.migration_backfill_checkpoints(entity_name, last_cursor, last_run_id)
    VALUES ('process_events', v_cursor_after, p_run_id)
    ON CONFLICT (entity_name) DO UPDATE
    SET last_cursor = EXCLUDED.last_cursor,
        last_run_id = EXCLUDED.last_run_id,
        updated_at = now();

    INSERT INTO public.migration_backfill_batches(run_id, entity_name, cursor_before, cursor_after, processed_rows, checksum)
    VALUES (p_run_id, 'process_events', v_last_cursor, v_cursor_after, v_processed, v_checksum);
  END IF;

  RETURN v_processed;
END;
$$;

CREATE OR REPLACE FUNCTION public.backfill_process_snapshot_batch(
  p_run_id uuid,
  p_batch_size integer DEFAULT 1000
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_last_cursor text;
  v_cursor_after text;
  v_processed integer := 0;
  v_checksum text;
BEGIN
  SELECT last_cursor INTO v_last_cursor
  FROM public.migration_backfill_checkpoints
  WHERE entity_name = 'process_snapshot';

  WITH src AS (
    SELECT *
    FROM public.solicitacoes
    WHERE (v_last_cursor IS NULL OR id::text > v_last_cursor)
    ORDER BY id
    LIMIT p_batch_size
  ), upserted AS (
    INSERT INTO public.process_snapshot_v2 (
      process_id, status, status_vistoria, payload, source, version, updated_at
    )
    SELECT
      s.id,
      s.status::text,
      s.status_vistoria,
      to_jsonb(s) - 'id' - 'status' - 'status_vistoria',
      'legacy',
      1,
      s.updated_at
    FROM src s
    ON CONFLICT (process_id) DO UPDATE
    SET status = EXCLUDED.status,
        status_vistoria = EXCLUDED.status_vistoria,
        payload = EXCLUDED.payload,
        version = public.process_snapshot_v2.version + 1,
        updated_at = EXCLUDED.updated_at
    RETURNING process_id
  )
  SELECT count(*), max(process_id::text), md5(string_agg(process_id::text, ',' ORDER BY process_id::text))
  INTO v_processed, v_cursor_after, v_checksum
  FROM upserted;

  IF v_processed > 0 THEN
    INSERT INTO public.migration_backfill_checkpoints(entity_name, last_cursor, last_run_id)
    VALUES ('process_snapshot', v_cursor_after, p_run_id)
    ON CONFLICT (entity_name) DO UPDATE
    SET last_cursor = EXCLUDED.last_cursor,
        last_run_id = EXCLUDED.last_run_id,
        updated_at = now();

    INSERT INTO public.migration_backfill_batches(run_id, entity_name, cursor_before, cursor_after, processed_rows, checksum)
    VALUES (p_run_id, 'process_snapshot', v_last_cursor, v_cursor_after, v_processed, v_checksum);
  END IF;

  RETURN v_processed;
END;
$$;

CREATE OR REPLACE FUNCTION public.migration_validate_consistency()
RETURNS TABLE(entity_name text, legacy_count bigint, new_count bigint, missing_in_new bigint)
LANGUAGE sql
AS $$
  SELECT
    'cobrancas'::text,
    (SELECT count(*) FROM public.lancamento_cobranca_registros),
    (SELECT count(*) FROM public.cobrancas_v2),
    (SELECT count(*) FROM public.lancamento_cobranca_registros l WHERE NOT EXISTS (SELECT 1 FROM public.cobrancas_v2 c WHERE c.id = l.id))
  UNION ALL
  SELECT
    'process_events'::text,
    (SELECT count(*) FROM public.audit_log),
    (SELECT count(*) FROM public.process_events_v2),
    (SELECT count(*) FROM public.audit_log l WHERE NOT EXISTS (SELECT 1 FROM public.process_events_v2 c WHERE c.id = l.id))
  UNION ALL
  SELECT
    'process_snapshot'::text,
    (SELECT count(*) FROM public.solicitacoes),
    (SELECT count(*) FROM public.process_snapshot_v2),
    (SELECT count(*) FROM public.solicitacoes l WHERE NOT EXISTS (SELECT 1 FROM public.process_snapshot_v2 c WHERE c.process_id = l.id));
$$;

CREATE OR REPLACE FUNCTION public.is_dual_write_enabled(p_entity_name text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce((SELECT dual_write_enabled FROM public.migration_runtime_flags WHERE entity_name = p_entity_name), false);
$$;

CREATE OR REPLACE FUNCTION public.is_legacy_write_disabled(p_entity_name text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce((SELECT legacy_write_disabled FROM public.migration_runtime_flags WHERE entity_name = p_entity_name), false);
$$;

CREATE OR REPLACE FUNCTION public.dual_write_cobrancas_from_legacy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.is_legacy_write_disabled('cobrancas') THEN
    RAISE EXCEPTION 'Legacy writes are disabled for cobrancas';
  END IF;

  IF public.is_dual_write_enabled('cobrancas') THEN
    INSERT INTO public.cobrancas_v2 (
      id, solicitacao_id, cobranca_config_id, confirmado,
      confirmado_por, confirmado_data, source, metadata,
      created_at, updated_at
    )
    VALUES (
      NEW.id, NEW.solicitacao_id, NEW.cobranca_config_id, NEW.confirmado,
      NULLIF(NEW.confirmado_por, '')::uuid, NEW.confirmado_data,
      'dual_write', jsonb_build_object('origin', TG_TABLE_NAME),
      NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (id) DO UPDATE
    SET confirmado = EXCLUDED.confirmado,
        confirmado_por = EXCLUDED.confirmado_por,
        confirmado_data = EXCLUDED.confirmado_data,
        updated_at = EXCLUDED.updated_at,
        source = EXCLUDED.source;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.dual_write_process_events_from_legacy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.is_legacy_write_disabled('process_events') THEN
    RAISE EXCEPTION 'Legacy writes are disabled for process_events';
  END IF;

  IF public.is_dual_write_enabled('process_events') THEN
    INSERT INTO public.process_events_v2 (
      id, process_id, event_type, entity_name, entity_id,
      actor_id, event_ts, payload, source, created_at
    )
    VALUES (
      NEW.id,
      NEW.solicitacao_id,
      NEW.acao,
      NEW.entidade,
      NEW.entidade_id,
      NEW.usuario_id,
      NEW.created_at,
      jsonb_build_object('detalhes', NEW.detalhes),
      'dual_write',
      NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE
    SET event_type = EXCLUDED.event_type,
        entity_name = EXCLUDED.entity_name,
        entity_id = EXCLUDED.entity_id,
        actor_id = EXCLUDED.actor_id,
        event_ts = EXCLUDED.event_ts,
        payload = EXCLUDED.payload,
        source = EXCLUDED.source;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.dual_write_process_snapshot_from_legacy()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.is_legacy_write_disabled('process_snapshot') THEN
    RAISE EXCEPTION 'Legacy writes are disabled for process_snapshot';
  END IF;

  IF public.is_dual_write_enabled('process_snapshot') THEN
    INSERT INTO public.process_snapshot_v2 (
      process_id, status, status_vistoria, payload, source, version, updated_at
    )
    VALUES (
      NEW.id,
      NEW.status::text,
      NEW.status_vistoria,
      to_jsonb(NEW) - 'id' - 'status' - 'status_vistoria',
      'dual_write',
      1,
      NEW.updated_at
    )
    ON CONFLICT (process_id) DO UPDATE
    SET status = EXCLUDED.status,
        status_vistoria = EXCLUDED.status_vistoria,
        payload = EXCLUDED.payload,
        version = public.process_snapshot_v2.version + 1,
        updated_at = EXCLUDED.updated_at,
        source = EXCLUDED.source;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dual_write_cobrancas ON public.lancamento_cobranca_registros;
CREATE TRIGGER trg_dual_write_cobrancas
AFTER INSERT OR UPDATE ON public.lancamento_cobranca_registros
FOR EACH ROW
EXECUTE FUNCTION public.dual_write_cobrancas_from_legacy();

DROP TRIGGER IF EXISTS trg_dual_write_process_events ON public.audit_log;
CREATE TRIGGER trg_dual_write_process_events
AFTER INSERT ON public.audit_log
FOR EACH ROW
EXECUTE FUNCTION public.dual_write_process_events_from_legacy();

DROP TRIGGER IF EXISTS trg_dual_write_process_snapshot ON public.solicitacoes;
CREATE TRIGGER trg_dual_write_process_snapshot
AFTER INSERT OR UPDATE ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.dual_write_process_snapshot_from_legacy();

-- Fase 3: switch de leitura (por flag) e desativação gradual do legado
CREATE OR REPLACE FUNCTION public.read_from_new_enabled(p_entity_name text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce((SELECT read_from_new_enabled FROM public.migration_runtime_flags WHERE entity_name = p_entity_name), false);
$$;

CREATE OR REPLACE VIEW public.cobrancas_read_model AS
SELECT *
FROM public.cobrancas_v2
WHERE public.read_from_new_enabled('cobrancas')
UNION ALL
SELECT
  l.id,
  l.solicitacao_id,
  l.cobranca_config_id,
  l.confirmado,
  NULLIF(l.confirmado_por, '')::uuid AS confirmado_por,
  l.confirmado_data,
  'legacy'::text AS source,
  jsonb_build_object('legacy_table', 'lancamento_cobranca_registros') AS metadata,
  l.created_at,
  l.updated_at
FROM public.lancamento_cobranca_registros l
WHERE NOT public.read_from_new_enabled('cobrancas');

CREATE OR REPLACE VIEW public.process_events_read_model AS
SELECT *
FROM public.process_events_v2
WHERE public.read_from_new_enabled('process_events')
UNION ALL
SELECT
  l.id,
  l.solicitacao_id AS process_id,
  l.acao AS event_type,
  l.entidade AS entity_name,
  l.entidade_id AS entity_id,
  l.usuario_id AS actor_id,
  l.created_at AS event_ts,
  jsonb_build_object('detalhes', l.detalhes) AS payload,
  'legacy'::text AS source,
  l.created_at
FROM public.audit_log l
WHERE NOT public.read_from_new_enabled('process_events');

CREATE OR REPLACE VIEW public.process_snapshot_read_model AS
SELECT *
FROM public.process_snapshot_v2
WHERE public.read_from_new_enabled('process_snapshot')
UNION ALL
SELECT
  s.id AS process_id,
  s.status::text AS status,
  s.status_vistoria,
  to_jsonb(s) - 'id' - 'status' - 'status_vistoria' AS payload,
  'legacy'::text AS source,
  1 AS version,
  s.updated_at
FROM public.solicitacoes s
WHERE NOT public.read_from_new_enabled('process_snapshot');
