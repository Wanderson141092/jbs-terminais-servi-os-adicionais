
-- Fix setor_emails SELECT policy - recreate as PERMISSIVE
DROP POLICY IF EXISTS "Authenticated can view setor_emails" ON public.setor_emails;
CREATE POLICY "Anyone can view setor_emails"
  ON public.setor_emails
  FOR SELECT
  USING (true);
