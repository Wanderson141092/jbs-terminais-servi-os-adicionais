CREATE TABLE IF NOT EXISTS public.process_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS process_events_solicitacao_created_at_idx
  ON public.process_events (solicitacao_id, created_at DESC);

ALTER TABLE public.process_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and service role can read process events" ON public.process_events;
CREATE POLICY "Admins and service role can read process events"
  ON public.process_events
  FOR SELECT
  USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.log_solicitacao_process_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resolved_pendencias text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.process_events (solicitacao_id, event_type, event_payload, created_by)
    VALUES (
      NEW.id,
      'form_submitted',
      jsonb_build_object(
        'status', NEW.status,
        'protocolo', NEW.protocolo,
        'tipo_operacao', NEW.tipo_operacao
      ),
      auth.uid()
    );

    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.process_events (solicitacao_id, event_type, event_payload, created_by)
    VALUES (
      NEW.id,
      'status_change',
      jsonb_build_object(
        'from_status', OLD.status,
        'to_status', NEW.status
      ),
      auth.uid()
    );
  END IF;

  IF NEW.lancamento_confirmado IS DISTINCT FROM OLD.lancamento_confirmado
     AND NEW.lancamento_confirmado = true THEN
    INSERT INTO public.process_events (solicitacao_id, event_type, event_payload, created_by)
    VALUES (
      NEW.id,
      'billing_confirmed',
      jsonb_build_object(
        'lancamento_confirmado', NEW.lancamento_confirmado,
        'confirmed_at', NEW.lancamento_confirmado_data
      ),
      COALESCE(NEW.lancamento_confirmado_por, auth.uid())
    );
  END IF;

  IF NEW.pendencias_selecionadas IS DISTINCT FROM OLD.pendencias_selecionadas
     AND cardinality(COALESCE(NEW.pendencias_selecionadas, '{}'::text[])) < cardinality(COALESCE(OLD.pendencias_selecionadas, '{}'::text[])) THEN
    SELECT COALESCE(array_agg(old_item), '{}'::text[])
      INTO v_resolved_pendencias
    FROM unnest(COALESCE(OLD.pendencias_selecionadas, '{}'::text[])) AS old_item
    WHERE NOT (old_item = ANY(COALESCE(NEW.pendencias_selecionadas, '{}'::text[])));

    INSERT INTO public.process_events (solicitacao_id, event_type, event_payload, created_by)
    VALUES (
      NEW.id,
      'pendencia_resolved',
      jsonb_build_object(
        'resolved_pendencias', v_resolved_pendencias,
        'remaining_pendencias', COALESCE(NEW.pendencias_selecionadas, '{}'::text[])
      ),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_solicitacao_process_events ON public.solicitacoes;
CREATE TRIGGER trg_log_solicitacao_process_events
AFTER INSERT OR UPDATE OF status, lancamento_confirmado, pendencias_selecionadas
ON public.solicitacoes
FOR EACH ROW
EXECUTE FUNCTION public.log_solicitacao_process_events();
