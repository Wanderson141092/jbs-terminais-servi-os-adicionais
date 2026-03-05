
-- Drop the ALL restrictive policy (it blocks non-admin SELECT too)
DROP POLICY IF EXISTS "Only admins can manage responses" ON public.formulario_respostas;

-- Re-create as specific INSERT, UPDATE, DELETE policies for admins
CREATE POLICY "Only admins can insert responses admin"
  ON public.formulario_respostas FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update responses"
  ON public.formulario_respostas FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete responses"
  ON public.formulario_respostas FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
