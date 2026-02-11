
-- Fix remaining overly permissive UPDATE policies

-- solicitacoes: restrict UPDATE to authenticated users only (was USING true for both anon and authenticated)
DROP POLICY IF EXISTS "Authenticated users can update solicitacoes" ON public.solicitacoes;
CREATE POLICY "Authenticated users can update solicitacoes" ON public.solicitacoes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- notifications: INSERT already has WITH CHECK (true) but that's acceptable for system notifications
-- No change needed for notifications INSERT

-- formulario_respostas: INSERT WITH CHECK (true) is needed for public form submissions
-- No change needed
