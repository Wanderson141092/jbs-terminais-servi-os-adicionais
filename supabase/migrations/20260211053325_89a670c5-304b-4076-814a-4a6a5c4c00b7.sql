
-- ============================================
-- FIX: Restrict profiles SELECT to authenticated users only
-- ============================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated can view profiles" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- FIX: Ensure admin_accounts has NO public SELECT (add explicit deny)
-- The existing RESTRICTIVE "Only admins can manage" ALL policy should block,
-- but let's add an explicit permissive SELECT for admins only
-- ============================================
CREATE POLICY "Admins can select admin_accounts" ON public.admin_accounts
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- FIX: Restrict observacao_historico SELECT to authenticated users
-- ============================================
DROP POLICY IF EXISTS "Authenticated can view observacao_historico" ON public.observacao_historico;
CREATE POLICY "Authenticated can view observacao_historico" ON public.observacao_historico
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- ============================================
-- FIX: Restrict setor_emails SELECT to authenticated users
-- (external portal doesn't need this table)
-- ============================================
DROP POLICY IF EXISTS "Anyone can view setor_emails" ON public.setor_emails;
CREATE POLICY "Authenticated can view setor_emails" ON public.setor_emails
  FOR SELECT USING (auth.uid() IS NOT NULL);
