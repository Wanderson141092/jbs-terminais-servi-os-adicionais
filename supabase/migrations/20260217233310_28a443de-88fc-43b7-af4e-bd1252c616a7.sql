-- Allow gestors to update solicitacoes (same as regular authenticated users who are gestors)
CREATE POLICY "Gestors can update solicitacoes"
ON public.solicitacoes
FOR UPDATE
TO authenticated
USING (is_gestor(auth.uid()));
