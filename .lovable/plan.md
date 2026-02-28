

## Root Cause

The network requests reveal **"infinite recursion detected in policy for relation 'profiles'"** (HTTP 500). The Gestor RLS policies added to `profiles` contain a subquery that references the `profiles` table itself:

```sql
email_setor = (SELECT p.email_setor FROM profiles p WHERE p.id = auth.uid())
```

This triggers the same RLS policies recursively, breaking ALL profile reads for ALL users. Since `profile` is null, `isAdmin`/`isGestor` hooks also fail (they depend on profile data indirectly via `useGestorCheck`), and the sector display is blank. The eye button is disabled because `canAccessProcess` can't determine the user's role.

## Fix Plan

### 1. Database migration: Create security definer function + fix RLS policies

Create a `get_user_email_setor` security definer function (bypasses RLS) and replace the recursive policies:

```sql
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

-- Drop the recursive policies
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
```

Similarly fix `user_roles` gestor policies that also reference `profiles` with a subquery:

```sql
DROP POLICY IF EXISTS "Gestors can insert user_roles for sector users" ON public.user_roles;
DROP POLICY IF EXISTS "Gestors can delete user_roles for sector users" ON public.user_roles;

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
```

### 2. Update sector display in InternoDashboard (line 467-469)

Show meaningful sector info for all roles, pulling from `setor_emails.descricao` when available:

```typescript
{profile?.nome} · {isAdmin ? "Administrador" : isGestor ? `Gestor${profile?.setor_emails?.descricao ? ` · ${profile.setor_emails.descricao}` : ""}` : (profile?.setor_emails?.descricao || getSetorLabel(profile?.setor) || "—")}
```

### No other file changes needed

Once the RLS recursion is fixed, the existing `canAccessProcess` logic (which already returns `true` for admin/gestor) will work correctly because `isAdmin` and `isGestor` hooks will successfully query `user_roles`, and `fetchProfile` will return profile data.

