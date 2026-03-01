
-- Drop check constraints that conflict with encryption
ALTER TABLE public.solicitacoes DROP CONSTRAINT IF EXISTS cliente_email_format;
ALTER TABLE public.solicitacoes DROP CONSTRAINT IF EXISTS cnpj_format;
ALTER TABLE public.solicitacoes DROP CONSTRAINT IF EXISTS cliente_nome_check;

-- ============================================================
-- PII ENCRYPTION INFRASTRUCTURE
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public._encryption_keys (
  id int PRIMARY KEY DEFAULT 1,
  key_value text NOT NULL,
  CONSTRAINT _encryption_keys_single_row CHECK (id = 1)
);
ALTER TABLE public._encryption_keys ENABLE ROW LEVEL SECURITY;

INSERT INTO public._encryption_keys (id, key_value)
VALUES (1, encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public._get_enc_key()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT key_value FROM public._encryption_keys WHERE id = 1; $$;

REVOKE EXECUTE ON FUNCTION public._get_enc_key() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._get_enc_key() FROM anon;
REVOKE EXECUTE ON FUNCTION public._get_enc_key() FROM authenticated;

CREATE OR REPLACE FUNCTION public.encrypt_pii(plain_text text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN RETURN plain_text; END IF;
  RETURN encode(pgp_sym_encrypt(plain_text, public._get_enc_key()), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_pii(encrypted_text text)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  IF encrypted_text IS NULL OR encrypted_text = '' THEN RETURN encrypted_text; END IF;
  RETURN pgp_sym_decrypt(decode(encrypted_text, 'base64'), public._get_enc_key());
EXCEPTION WHEN OTHERS THEN
  RETURN encrypted_text;
END;
$$;

CREATE OR REPLACE FUNCTION public.hash_pii(plain_text text)
RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public, extensions
AS $$ SELECT CASE WHEN plain_text IS NULL THEN NULL ELSE encode(digest(lower(trim(plain_text))::bytea, 'sha256'), 'hex') END; $$;

REVOKE EXECUTE ON FUNCTION public.encrypt_pii(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.encrypt_pii(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrypt_pii(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrypt_pii(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.hash_pii(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hash_pii(text) TO anon;

-- Hash columns
ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS cnpj_hash text,
  ADD COLUMN IF NOT EXISTS cliente_email_hash text,
  ADD COLUMN IF NOT EXISTS cliente_nome_hash text;

ALTER TABLE public.admin_accounts
  ADD COLUMN IF NOT EXISTS cpf_hash text;

-- Encrypt existing data
UPDATE public.solicitacoes SET
  cnpj_hash = public.hash_pii(cnpj),
  cliente_email_hash = public.hash_pii(cliente_email),
  cliente_nome_hash = public.hash_pii(cliente_nome),
  cnpj = public.encrypt_pii(cnpj),
  cliente_email = public.encrypt_pii(cliente_email),
  cliente_nome = public.encrypt_pii(cliente_nome);

UPDATE public.admin_accounts SET
  cpf_hash = public.hash_pii(cpf),
  cpf = public.encrypt_pii(cpf),
  nome = public.encrypt_pii(nome);

UPDATE public.profiles SET
  nome = public.encrypt_pii(nome)
WHERE nome IS NOT NULL AND nome != '';

-- Triggers
CREATE OR REPLACE FUNCTION public.trigger_encrypt_solicitacoes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.cnpj_hash = public.hash_pii(NEW.cnpj);
    NEW.cnpj = public.encrypt_pii(NEW.cnpj);
    NEW.cliente_email_hash = public.hash_pii(NEW.cliente_email);
    NEW.cliente_email = public.encrypt_pii(NEW.cliente_email);
    NEW.cliente_nome_hash = public.hash_pii(NEW.cliente_nome);
    NEW.cliente_nome = public.encrypt_pii(NEW.cliente_nome);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.cnpj IS DISTINCT FROM OLD.cnpj THEN
      NEW.cnpj_hash = public.hash_pii(NEW.cnpj);
      NEW.cnpj = public.encrypt_pii(NEW.cnpj);
    END IF;
    IF NEW.cliente_email IS DISTINCT FROM OLD.cliente_email THEN
      NEW.cliente_email_hash = public.hash_pii(NEW.cliente_email);
      NEW.cliente_email = public.encrypt_pii(NEW.cliente_email);
    END IF;
    IF NEW.cliente_nome IS DISTINCT FROM OLD.cliente_nome THEN
      NEW.cliente_nome_hash = public.hash_pii(NEW.cliente_nome);
      NEW.cliente_nome = public.encrypt_pii(NEW.cliente_nome);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aaa_encrypt_solicitacoes ON public.solicitacoes;
CREATE TRIGGER aaa_encrypt_solicitacoes
BEFORE INSERT OR UPDATE ON public.solicitacoes
FOR EACH ROW EXECUTE FUNCTION public.trigger_encrypt_solicitacoes();

CREATE OR REPLACE FUNCTION public.trigger_encrypt_admin_accounts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.cpf_hash = public.hash_pii(NEW.cpf);
    NEW.cpf = public.encrypt_pii(NEW.cpf);
    NEW.nome = public.encrypt_pii(NEW.nome);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.cpf IS DISTINCT FROM OLD.cpf THEN
      NEW.cpf_hash = public.hash_pii(NEW.cpf);
      NEW.cpf = public.encrypt_pii(NEW.cpf);
    END IF;
    IF NEW.nome IS DISTINCT FROM OLD.nome THEN
      NEW.nome = public.encrypt_pii(NEW.nome);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aaa_encrypt_admin_accounts ON public.admin_accounts;
CREATE TRIGGER aaa_encrypt_admin_accounts
BEFORE INSERT OR UPDATE ON public.admin_accounts
FOR EACH ROW EXECUTE FUNCTION public.trigger_encrypt_admin_accounts();

CREATE OR REPLACE FUNCTION public.trigger_encrypt_profiles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.nome IS NOT NULL AND NEW.nome != '' THEN
      NEW.nome = public.encrypt_pii(NEW.nome);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.nome IS DISTINCT FROM OLD.nome AND NEW.nome IS NOT NULL AND NEW.nome != '' THEN
      NEW.nome = public.encrypt_pii(NEW.nome);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aaa_encrypt_profiles ON public.profiles;
CREATE TRIGGER aaa_encrypt_profiles
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trigger_encrypt_profiles();

-- Decrypted views
CREATE OR REPLACE VIEW public.solicitacoes_v WITH (security_invoker = true) AS
SELECT
  id, protocolo, status,
  public.decrypt_pii(cliente_nome) as cliente_nome,
  public.decrypt_pii(cliente_email) as cliente_email,
  public.decrypt_pii(cnpj) as cnpj,
  cnpj_hash, cliente_email_hash, cliente_nome_hash,
  tipo_carga, tipo_operacao, observacoes, numero_conteiner, lpco,
  data_posicionamento, data_agendamento, created_at, updated_at,
  comex_aprovado, comex_usuario_id, comex_data, comex_justificativa,
  armazem_aprovado, armazem_usuario_id, armazem_data, armazem_justificativa,
  lancamento_confirmado, lancamento_confirmado_por, lancamento_confirmado_data,
  solicitar_deferimento, custo_posicionamento,
  solicitar_lacre_armador, lacre_armador_possui, lacre_armador_aceite_custo,
  cancelamento_solicitado, cancelamento_solicitado_em,
  status_vistoria, categoria, pendencias_selecionadas, chave_consulta
FROM public.solicitacoes;

CREATE OR REPLACE VIEW public.profiles_v WITH (security_invoker = true) AS
SELECT
  id, email,
  public.decrypt_pii(nome) as nome,
  setor, email_setor, bloqueado, created_at, updated_at
FROM public.profiles;

CREATE OR REPLACE VIEW public.admin_accounts_v WITH (security_invoker = true) AS
SELECT
  id,
  public.decrypt_pii(cpf) as cpf,
  public.decrypt_pii(nome) as nome,
  senha_hash, ativo, created_at, updated_at,
  cpf_hash
FROM public.admin_accounts;
