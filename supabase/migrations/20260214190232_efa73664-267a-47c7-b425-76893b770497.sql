
-- Drop the restrictive ALL policy and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Only admins can manage buttons" ON public.external_buttons;

CREATE POLICY "Only admins can manage buttons"
ON public.external_buttons
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
