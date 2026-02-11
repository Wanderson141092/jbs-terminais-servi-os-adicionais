
-- ===== COMPREHENSIVE SECURITY HARDENING =====

-- 1. INTEGRACOES: Restrict SELECT to admins only (contains api_key)
DROP POLICY IF EXISTS "Authenticated can view integrations" ON public.integracoes;
CREATE POLICY "Only admins can view integrations" ON public.integracoes
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. SOLICITACOES: Remove anonymous access, require authentication
DROP POLICY IF EXISTS "Anon can read solicitacoes" ON public.solicitacoes;
DROP POLICY IF EXISTS "Authenticated users can view solicitacoes" ON public.solicitacoes;
CREATE POLICY "Authenticated can view solicitacoes" ON public.solicitacoes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. SOLICITACOES: Restrict UPDATE to admins only
DROP POLICY IF EXISTS "Authenticated users can update solicitacoes" ON public.solicitacoes;
CREATE POLICY "Only admins can update solicitacoes" ON public.solicitacoes
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. SOLICITACOES: Restrict INSERT to authenticated
DROP POLICY IF EXISTS "Authenticated users can insert solicitacoes" ON public.solicitacoes;
CREATE POLICY "Authenticated can insert solicitacoes" ON public.solicitacoes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 5. DEFERIMENTO_DOCUMENTS: Restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view deferimento docs" ON public.deferimento_documents;
CREATE POLICY "Authenticated can view deferimento docs" ON public.deferimento_documents
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 6. AUDIT_LOG: Restrict INSERT to admins only (prevent log tampering)
DROP POLICY IF EXISTS "Authenticated users can insert audit_log" ON public.audit_log;
CREATE POLICY "Only admins can insert audit_log" ON public.audit_log
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7. FIELD_MAPPINGS: Restrict SELECT to authenticated
DROP POLICY IF EXISTS "Anyone can view mappings" ON public.field_mappings;
CREATE POLICY "Authenticated can view mappings" ON public.field_mappings
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 8. INTEGRATION_HISTORY: Restrict SELECT to admins (contains API payloads)
DROP POLICY IF EXISTS "Authenticated can view integration_history" ON public.integration_history;
CREATE POLICY "Only admins can view integration_history" ON public.integration_history
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. INTEGRATION_HISTORY: Restrict INSERT to admins
DROP POLICY IF EXISTS "Authenticated can insert integration_history" ON public.integration_history;
CREATE POLICY "Only admins can insert integration_history" ON public.integration_history
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 10. NOTIFICATIONS: Restrict INSERT to admins (prevent fake notifications)
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
CREATE POLICY "Only admins can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 11. NOTIFICATIONS: Fix NULL usuario_id leakage
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = usuario_id OR has_role(auth.uid(), 'admin'::app_role));

-- 12. SETOR_EMAILS: Ensure restricted to authenticated
DROP POLICY IF EXISTS "Anyone can view setor_emails" ON public.setor_emails;
DROP POLICY IF EXISTS "Authenticated can view setor_emails" ON public.setor_emails;
CREATE POLICY "Authenticated can view setor_emails" ON public.setor_emails
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 13. STORAGE: Restrict upload policies (public uploads via edge function)
DROP POLICY IF EXISTS "Anyone can upload deferimento files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload form files" ON storage.objects;
CREATE POLICY "Authenticated can upload deferimento" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'deferimento' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated can upload form files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'form-uploads' AND auth.role() = 'authenticated');

-- 14. STORAGE: Restrict listing to authenticated
DROP POLICY IF EXISTS "Anyone can view deferimento files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view form files" ON storage.objects;
CREATE POLICY "Authenticated can list deferimento" ON storage.objects
  FOR SELECT USING (bucket_id = 'deferimento' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated can list form files" ON storage.objects
  FOR SELECT USING (bucket_id = 'form-uploads' AND auth.role() = 'authenticated');
