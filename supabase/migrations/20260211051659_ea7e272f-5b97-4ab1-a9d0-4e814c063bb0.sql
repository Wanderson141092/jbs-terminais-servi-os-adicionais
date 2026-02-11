
-- ============================================
-- FIX 1: Remove anonymous UPDATE on solicitacoes (critical - anon should never update)
-- ============================================
DROP POLICY IF EXISTS "Anon can update solicitacoes" ON public.solicitacoes;

-- ============================================
-- FIX 2: Remove public SELECT on admin_accounts (exposes senha_hash)
-- Authentication will be handled server-side via edge function
-- ============================================
DROP POLICY IF EXISTS "Anyone can select for login" ON public.admin_accounts;

-- ============================================
-- FIX 3: Restrict audit_log to admins only
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view audit_log" ON public.audit_log;
CREATE POLICY "Only admins can view audit_log" ON public.audit_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- FIX 4: Restrict deferimento_documents insert to authenticated users
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert deferimento docs" ON public.deferimento_documents;
CREATE POLICY "Authenticated can insert deferimento docs" ON public.deferimento_documents
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- FIX 5: Restrict integration_history view to authenticated users
-- ============================================
DROP POLICY IF EXISTS "Anyone can view integration_history" ON public.integration_history;
CREATE POLICY "Authenticated can view integration_history" ON public.integration_history
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- FIX 6: Restrict integracoes view to authenticated (contains api_key column)
-- ============================================
DROP POLICY IF EXISTS "Anyone can view integrations" ON public.integracoes;
CREATE POLICY "Authenticated can view integrations" ON public.integracoes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- FIX 7: Restrict setor_emails insert to admins only (was WITH CHECK true)
-- ============================================
DROP POLICY IF EXISTS "Only admin can insert setor_emails" ON public.setor_emails;
CREATE POLICY "Only admin can insert setor_emails" ON public.setor_emails
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- FIX 8: Add length constraints on critical text fields
-- ============================================
ALTER TABLE public.solicitacoes
  ADD CONSTRAINT observacoes_length CHECK (length(observacoes) <= 10000),
  ADD CONSTRAINT protocolo_length CHECK (length(protocolo) <= 50),
  ADD CONSTRAINT cliente_nome_length CHECK (length(cliente_nome) <= 255),
  ADD CONSTRAINT cliente_email_length CHECK (length(cliente_email) <= 255);

ALTER TABLE public.admin_accounts
  ADD CONSTRAINT nome_length CHECK (length(nome) <= 255),
  ADD CONSTRAINT cpf_length CHECK (length(cpf) <= 11);

ALTER TABLE public.observacao_historico
  ADD CONSTRAINT observacao_length CHECK (length(observacao) <= 10000);

ALTER TABLE public.audit_log
  ADD CONSTRAINT detalhes_length CHECK (length(detalhes) <= 10000);
