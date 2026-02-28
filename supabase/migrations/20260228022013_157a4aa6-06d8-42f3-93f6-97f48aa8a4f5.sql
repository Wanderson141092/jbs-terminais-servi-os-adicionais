
-- Security definer function to get user's email_setor without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_email_setor(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email_setor FROM public.profiles WHERE id = _user_id;
$$;

-- Drop the recursive policies on profiles
DROP POLICY IF EXISTS "Gestors can view same sector profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gestors can update same sector profiles" ON public.profiles;

-- Recreate with security definer function (no recursion)
CREATE POLICY "Gestors can view same sector profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  is_gestor(auth.uid())
  AND email_setor IS NOT NULL
  AND email_setor = get_user_email_setor(auth.uid())
);

CREATE POLICY "Gestors can update same sector profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (
  is_gestor(auth.uid())
  AND email_setor IS NOT NULL
  AND email_setor = get_user_email_setor(auth.uid())
);

-- Drop the recursive policies on user_roles
DROP POLICY IF EXISTS "Gestors can insert user_roles for sector users" ON public.user_roles;
DROP POLICY IF EXISTS "Gestors can delete user_roles for sector users" ON public.user_roles;

-- Recreate with security definer function (no recursion)
CREATE POLICY "Gestors can insert user_roles for sector users"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  is_gestor(auth.uid())
  AND role IN ('user'::app_role, 'gestor'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles target
    WHERE target.id = user_roles.user_id
      AND target.email_setor = get_user_email_setor(auth.uid())
      AND get_user_email_setor(auth.uid()) IS NOT NULL
  )
);

CREATE POLICY "Gestors can delete user_roles for sector users"
ON public.user_roles FOR DELETE TO authenticated
USING (
  is_gestor(auth.uid())
  AND role IN ('user'::app_role, 'gestor'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.profiles target
    WHERE target.id = user_roles.user_id
      AND target.email_setor = get_user_email_setor(auth.uid())
      AND get_user_email_setor(auth.uid()) IS NOT NULL
  )
);
