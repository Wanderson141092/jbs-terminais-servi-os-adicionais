
-- =====================================================
-- SECURITY HARDENING MIGRATION
-- =====================================================

-- 1. ADMIN_ACCOUNTS: Remove ALL client-side access
-- All admin management now goes through admin-manage edge function (service role)
DROP POLICY IF EXISTS "Admins can select admin_accounts" ON public.admin_accounts;
DROP POLICY IF EXISTS "Only admins can manage admin_accounts" ON public.admin_accounts;
-- No policies = no client-side access. Edge function uses service role key.

-- 2. STORAGE: Make buckets private, restrict access
UPDATE storage.buckets SET public = false WHERE id IN ('deferimento', 'form-uploads');

-- Drop old permissive storage policies
DROP POLICY IF EXISTS "Anyone can upload deferimento files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view deferimento files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload form files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view form files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload deferimento" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view deferimento" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload form-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can view form-uploads" ON storage.objects;

-- Only authenticated users can view/upload storage files
CREATE POLICY "Auth view deferimento" ON storage.objects FOR SELECT
  USING (bucket_id = 'deferimento' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth upload deferimento" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'deferimento' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth view form-uploads" ON storage.objects FOR SELECT
  USING (bucket_id = 'form-uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "Auth upload form-uploads" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'form-uploads' AND auth.uid() IS NOT NULL);

-- Admins can delete storage files
CREATE POLICY "Admin delete deferimento" ON storage.objects FOR DELETE
  USING (bucket_id = 'deferimento' AND (SELECT has_role(auth.uid(), 'admin')));

CREATE POLICY "Admin delete form-uploads" ON storage.objects FOR DELETE
  USING (bucket_id = 'form-uploads' AND (SELECT has_role(auth.uid(), 'admin')));

-- 3. INPUT VALIDATION: Add format constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS email_format;
ALTER TABLE public.profiles ADD CONSTRAINT email_format 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.solicitacoes DROP CONSTRAINT IF EXISTS cliente_email_format;
ALTER TABLE public.solicitacoes ADD CONSTRAINT cliente_email_format 
  CHECK (cliente_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.external_buttons DROP CONSTRAINT IF EXISTS url_scheme_check;
ALTER TABLE public.external_buttons ADD CONSTRAINT url_scheme_check 
  CHECK (url IS NULL OR url ~* '^https?://');

ALTER TABLE public.integracoes DROP CONSTRAINT IF EXISTS url_scheme_check;
ALTER TABLE public.integracoes ADD CONSTRAINT url_scheme_check 
  CHECK (url IS NULL OR url ~* '^https?://');

-- 4. SETOR_EMAILS: Ensure restricted to authenticated only
DROP POLICY IF EXISTS "Anyone can view setor_emails" ON public.setor_emails;
DROP POLICY IF EXISTS "Authenticated can view setor_emails" ON public.setor_emails;
CREATE POLICY "Authenticated can view setor_emails" ON public.setor_emails
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 5. OBSERVACAO_HISTORICO: Restrict to users involved or admins
DROP POLICY IF EXISTS "Authenticated can view observacao_historico" ON public.observacao_historico;
CREATE POLICY "Auth view own or admin observacao_historico" ON public.observacao_historico
  FOR SELECT USING (auth.uid() = autor_id OR has_role(auth.uid(), 'admin'));

-- 6. AUDIT_LOG: Make insert trigger-only by removing admin INSERT policy
-- Admins should only READ audit logs, not manipulate them
DROP POLICY IF EXISTS "Only admins can insert audit_log" ON public.audit_log;

-- Create a SECURITY DEFINER function for audit log insertion (bypasses RLS)
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_solicitacao_id uuid,
  p_usuario_id uuid,
  p_acao text,
  p_detalhes text DEFAULT NULL,
  p_entidade text DEFAULT NULL,
  p_entidade_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (solicitacao_id, usuario_id, acao, detalhes, entidade, entidade_id)
  VALUES (p_solicitacao_id, p_usuario_id, p_acao, p_detalhes, p_entidade, p_entidade_id);
END;
$$;
