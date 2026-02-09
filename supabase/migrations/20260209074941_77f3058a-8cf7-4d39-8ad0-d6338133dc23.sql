-- Corrige trigger que estava sobrescrevendo status de vistoria
-- Regra: quando o processo entra na etapa de vistoria (vistoria_finalizada / vistoriado_com_pendencia / nao_vistoriado), o status não deve ser recalculado pela aprovação.

CREATE OR REPLACE FUNCTION public.update_solicitacao_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Sempre atualiza updated_at
  NEW.updated_at = now();

  -- Não sobrescrever status quando estiver em etapa de vistoria
  IF NEW.status IN ('vistoria_finalizada', 'vistoriado_com_pendencia', 'nao_vistoriado', 'cancelado') THEN
    RETURN NEW;
  END IF;

  -- Recalcula status apenas para a etapa de aprovação
  IF NEW.comex_aprovado = false OR NEW.armazem_aprovado = false THEN
    NEW.status = 'recusado';
  ELSIF NEW.comex_aprovado = true AND NEW.armazem_aprovado = true THEN
    NEW.status = 'confirmado_aguardando_vistoria';
  END IF;

  RETURN NEW;
END;
$$;