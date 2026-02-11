
-- Create SECURITY DEFINER function for notifications (bypasses RLS on profiles and notifications)
CREATE OR REPLACE FUNCTION public.create_notifications_for_others(
  p_solicitacao_id UUID,
  p_mensagem TEXT,
  p_tipo TEXT,
  p_exclude_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (usuario_id, solicitacao_id, mensagem, tipo)
  SELECT id, p_solicitacao_id, p_mensagem, p_tipo
  FROM public.profiles
  WHERE id != p_exclude_user_id;
END;
$$;
