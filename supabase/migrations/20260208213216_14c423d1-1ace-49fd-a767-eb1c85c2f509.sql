-- Allow first admin to be created without existing admin
-- This policy allows inserting admin role if no admins exist yet
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles or first admin setup"
ON public.user_roles
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
);

-- Create function to setup initial admin
CREATE OR REPLACE FUNCTION public.setup_admin_role()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only works if no admin exists yet
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role)
    SELECT auth.uid(), 'admin'
    WHERE auth.uid() IS NOT NULL;
  END IF;
END;
$$;