
-- Allow gestors to update profiles of users in their same sector
CREATE POLICY "Gestors can update same sector profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  is_gestor(auth.uid())
  AND email_setor IS NOT NULL
  AND email_setor = (SELECT p.email_setor FROM public.profiles p WHERE p.id = auth.uid())
);

-- Allow gestors to view profiles of users in their same sector
CREATE POLICY "Gestors can view same sector profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  is_gestor(auth.uid())
  AND email_setor IS NOT NULL
  AND email_setor = (SELECT p.email_setor FROM public.profiles p WHERE p.id = auth.uid())
);

-- Allow gestors to insert user_roles (only user/gestor, not admin)
CREATE POLICY "Gestors can insert user_roles for sector users"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  is_gestor(auth.uid())
  AND role IN ('user', 'gestor')
  AND EXISTS (
    SELECT 1 FROM public.profiles caller
    JOIN public.profiles target ON target.id = user_id
    WHERE caller.id = auth.uid()
      AND caller.email_setor IS NOT NULL
      AND caller.email_setor = target.email_setor
  )
);

-- Allow gestors to delete user_roles for sector users (only user/gestor roles)
CREATE POLICY "Gestors can delete user_roles for sector users"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  is_gestor(auth.uid())
  AND role IN ('user', 'gestor')
  AND EXISTS (
    SELECT 1 FROM public.profiles caller
    JOIN public.profiles target ON target.id = user_id
    WHERE caller.id = auth.uid()
      AND caller.email_setor IS NOT NULL
      AND caller.email_setor = target.email_setor
  )
);

-- Allow gestors to view user_roles
CREATE POLICY "Gestors can view user_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (is_gestor(auth.uid()));
