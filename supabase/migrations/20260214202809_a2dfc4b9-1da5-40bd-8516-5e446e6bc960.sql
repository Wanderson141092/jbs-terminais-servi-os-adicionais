
-- Remove the overly permissive INSERT policy (service role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role can insert campos_analise_valores" ON public.campos_analise_valores;
