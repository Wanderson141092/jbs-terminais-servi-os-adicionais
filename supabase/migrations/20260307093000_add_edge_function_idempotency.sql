CREATE TABLE IF NOT EXISTS public.edge_function_idempotency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  solicitacao_id uuid NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  action text NOT NULL,
  request_timestamp timestamptz NOT NULL,
  status_code integer NOT NULL DEFAULT 202,
  response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(function_name, solicitacao_id, action, request_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_edge_function_idempotency_lookup
  ON public.edge_function_idempotency(function_name, solicitacao_id, action, request_timestamp);

ALTER TABLE public.edge_function_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage edge idempotency"
  ON public.edge_function_idempotency
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.set_edge_function_idempotency_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_edge_function_idempotency_updated_at
  BEFORE UPDATE ON public.edge_function_idempotency
  FOR EACH ROW
  EXECUTE FUNCTION public.set_edge_function_idempotency_updated_at();
