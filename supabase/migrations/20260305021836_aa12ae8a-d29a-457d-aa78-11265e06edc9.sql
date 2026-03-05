
-- Drop the restrictive admin-only SELECT policy that blocks authenticated users from viewing form responses
DROP POLICY IF EXISTS "Only admins can view responses" ON public.formulario_respostas;

-- The "Authenticated can view form responses" SELECT policy already allows authenticated users
-- The "Only admins can manage responses" ALL policy handles INSERT/UPDATE/DELETE for admins
-- The "Anyone can submit responses" INSERT policy handles public submissions
