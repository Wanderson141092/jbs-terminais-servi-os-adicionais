-- Update is_gestor function to check user_roles
CREATE OR REPLACE FUNCTION public.is_gestor(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'gestor'
  )
$function$;

-- Update is_gestor_for_service to check user_roles
CREATE OR REPLACE FUNCTION public.is_gestor_for_service(_user_id uuid, _servico_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    JOIN public.setor_emails se ON se.email_setor = p.email_setor
    JOIN public.setor_servicos ss ON ss.setor_email_id = se.id
    WHERE ur.user_id = _user_id
      AND ur.role = 'gestor'
      AND ss.servico_id = _servico_id
      AND se.ativo = true
  )
$function$;