
-- Function to check if a user is a gestor for a specific service
CREATE OR REPLACE FUNCTION public.is_gestor_for_service(_user_id uuid, _servico_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.setor_emails se ON se.email_setor = p.email_setor
    JOIN public.setor_servicos ss ON ss.setor_email_id = se.id
    WHERE p.id = _user_id
      AND ss.servico_id = _servico_id
      AND 'GESTOR' = ANY(se.perfis)
      AND se.ativo = true
  )
$$;

-- Function to check if user has GESTOR profile at all
CREATE OR REPLACE FUNCTION public.is_gestor(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.setor_emails se ON se.email_setor = p.email_setor
    WHERE p.id = _user_id
      AND 'GESTOR' = ANY(se.perfis)
      AND se.ativo = true
  )
$$;

-- Allow gestors to view regras_servico for their sector's services
CREATE POLICY "Gestors can view own service rules"
ON public.regras_servico
FOR SELECT
USING (
  is_gestor_for_service(auth.uid(), servico_id)
);

-- Allow gestors to insert regras_servico for their sector's services
CREATE POLICY "Gestors can insert own service rules"
ON public.regras_servico
FOR INSERT
WITH CHECK (
  is_gestor_for_service(auth.uid(), servico_id)
);

-- Allow gestors to update regras_servico for their sector's services
CREATE POLICY "Gestors can update own service rules"
ON public.regras_servico
FOR UPDATE
USING (
  is_gestor_for_service(auth.uid(), servico_id)
);

-- Allow gestors to delete regras_servico for their sector's services
CREATE POLICY "Gestors can delete own service rules"
ON public.regras_servico
FOR DELETE
USING (
  is_gestor_for_service(auth.uid(), servico_id)
);

-- Allow gestors to view services (needed for the rules page)
CREATE POLICY "Gestors can view services"
ON public.servicos
FOR SELECT
USING (
  is_gestor(auth.uid())
);

-- Allow gestors to view setor_servicos to know their linked services
CREATE POLICY "Gestors can view setor_servicos"
ON public.setor_servicos
FOR SELECT
USING (
  is_gestor(auth.uid())
);
