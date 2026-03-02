
-- Fix trigger to detect already-encrypted values (base64 PGP pattern)
CREATE OR REPLACE FUNCTION public.trigger_encrypt_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.nome IS NOT NULL AND NEW.nome != '' THEN
      -- Skip if already encrypted (base64 PGP signature starts with 'ww0E')
      IF NEW.nome NOT LIKE 'ww0E%' THEN
        NEW.nome = public.encrypt_pii(NEW.nome);
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.nome IS DISTINCT FROM OLD.nome AND NEW.nome IS NOT NULL AND NEW.nome != '' THEN
      IF NEW.nome NOT LIKE 'ww0E%' THEN
        NEW.nome = public.encrypt_pii(NEW.nome);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix trigger for solicitacoes too
CREATE OR REPLACE FUNCTION public.trigger_encrypt_solicitacoes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.cnpj IS NOT NULL AND NEW.cnpj NOT LIKE 'ww0E%' THEN
      NEW.cnpj_hash = public.hash_pii(NEW.cnpj);
      NEW.cnpj = public.encrypt_pii(NEW.cnpj);
    END IF;
    IF NEW.cliente_email IS NOT NULL AND NEW.cliente_email NOT LIKE 'ww0E%' THEN
      NEW.cliente_email_hash = public.hash_pii(NEW.cliente_email);
      NEW.cliente_email = public.encrypt_pii(NEW.cliente_email);
    END IF;
    IF NEW.cliente_nome IS NOT NULL AND NEW.cliente_nome NOT LIKE 'ww0E%' THEN
      NEW.cliente_nome_hash = public.hash_pii(NEW.cliente_nome);
      NEW.cliente_nome = public.encrypt_pii(NEW.cliente_nome);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.cnpj IS DISTINCT FROM OLD.cnpj AND NEW.cnpj IS NOT NULL AND NEW.cnpj NOT LIKE 'ww0E%' THEN
      NEW.cnpj_hash = public.hash_pii(NEW.cnpj);
      NEW.cnpj = public.encrypt_pii(NEW.cnpj);
    END IF;
    IF NEW.cliente_email IS DISTINCT FROM OLD.cliente_email AND NEW.cliente_email IS NOT NULL AND NEW.cliente_email NOT LIKE 'ww0E%' THEN
      NEW.cliente_email_hash = public.hash_pii(NEW.cliente_email);
      NEW.cliente_email = public.encrypt_pii(NEW.cliente_email);
    END IF;
    IF NEW.cliente_nome IS DISTINCT FROM OLD.cliente_nome AND NEW.cliente_nome IS NOT NULL AND NEW.cliente_nome NOT LIKE 'ww0E%' THEN
      NEW.cliente_nome_hash = public.hash_pii(NEW.cliente_nome);
      NEW.cliente_nome = public.encrypt_pii(NEW.cliente_nome);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix trigger for admin_accounts too
CREATE OR REPLACE FUNCTION public.trigger_encrypt_admin_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.cpf IS NOT NULL AND NEW.cpf NOT LIKE 'ww0E%' THEN
      NEW.cpf_hash = public.hash_pii(NEW.cpf);
      NEW.cpf = public.encrypt_pii(NEW.cpf);
    END IF;
    IF NEW.nome IS NOT NULL AND NEW.nome NOT LIKE 'ww0E%' THEN
      NEW.nome = public.encrypt_pii(NEW.nome);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.cpf IS DISTINCT FROM OLD.cpf AND NEW.cpf IS NOT NULL AND NEW.cpf NOT LIKE 'ww0E%' THEN
      NEW.cpf_hash = public.hash_pii(NEW.cpf);
      NEW.cpf = public.encrypt_pii(NEW.cpf);
    END IF;
    IF NEW.nome IS DISTINCT FROM OLD.nome AND NEW.nome IS NOT NULL AND NEW.nome NOT LIKE 'ww0E%' THEN
      NEW.nome = public.encrypt_pii(NEW.nome);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Grant EXECUTE on decrypt_pii and _get_enc_key to authenticated role
GRANT EXECUTE ON FUNCTION public.decrypt_pii(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public._get_enc_key() TO authenticated;

-- Now fix double-encrypted data in profiles
-- Temporarily disable the trigger
ALTER TABLE profiles DISABLE TRIGGER aaa_encrypt_profiles;

-- Fix profiles: decrypt once to get single-encrypted, then store the properly encrypted value
-- We need to find rows where nome decrypts to another encrypted string
DO $$
DECLARE
  r RECORD;
  decrypted_once TEXT;
  decrypted_twice TEXT;
BEGIN
  FOR r IN SELECT id, nome FROM profiles WHERE nome IS NOT NULL AND nome != '' LOOP
    BEGIN
      -- Try to decrypt once
      decrypted_once := public.decrypt_pii(r.nome);
      -- If the result still looks encrypted (starts with ww0E), decrypt again
      IF decrypted_once LIKE 'ww0E%' THEN
        BEGIN
          decrypted_twice := public.decrypt_pii(decrypted_once);
          -- Store the single-encrypted version: encrypt the final plaintext
          UPDATE profiles SET nome = public.encrypt_pii(decrypted_twice) WHERE id = r.id;
          RAISE NOTICE 'Fixed double-encrypted profile: %', r.id;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Could not double-decrypt profile %: %', r.id, SQLERRM;
        END;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not decrypt profile %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Re-enable the trigger
ALTER TABLE profiles ENABLE TRIGGER aaa_encrypt_profiles;

-- Fix double-encrypted data in solicitacoes
ALTER TABLE solicitacoes DISABLE TRIGGER aaa_encrypt_solicitacoes;

DO $$
DECLARE
  r RECORD;
  val TEXT;
  val2 TEXT;
BEGIN
  FOR r IN SELECT id, cliente_nome, cliente_email, cnpj FROM solicitacoes LOOP
    -- Fix cliente_nome
    IF r.cliente_nome IS NOT NULL AND r.cliente_nome != '' THEN
      BEGIN
        val := public.decrypt_pii(r.cliente_nome);
        IF val LIKE 'ww0E%' THEN
          val2 := public.decrypt_pii(val);
          UPDATE solicitacoes SET cliente_nome = public.encrypt_pii(val2) WHERE id = r.id;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
    -- Fix cliente_email
    IF r.cliente_email IS NOT NULL AND r.cliente_email != '' THEN
      BEGIN
        val := public.decrypt_pii(r.cliente_email);
        IF val LIKE 'ww0E%' THEN
          val2 := public.decrypt_pii(val);
          UPDATE solicitacoes SET cliente_email = public.encrypt_pii(val2) WHERE id = r.id;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
    -- Fix cnpj
    IF r.cnpj IS NOT NULL AND r.cnpj != '' THEN
      BEGIN
        val := public.decrypt_pii(r.cnpj);
        IF val LIKE 'ww0E%' THEN
          val2 := public.decrypt_pii(val);
          UPDATE solicitacoes SET cnpj = public.encrypt_pii(val2) WHERE id = r.id;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE solicitacoes ENABLE TRIGGER aaa_encrypt_solicitacoes;

-- Fix admin_accounts
ALTER TABLE admin_accounts DISABLE TRIGGER ALL;

DO $$
DECLARE
  r RECORD;
  val TEXT;
  val2 TEXT;
BEGIN
  FOR r IN SELECT id, nome, cpf FROM admin_accounts LOOP
    IF r.nome IS NOT NULL AND r.nome != '' THEN
      BEGIN
        val := public.decrypt_pii(r.nome);
        IF val LIKE 'ww0E%' THEN
          val2 := public.decrypt_pii(val);
          UPDATE admin_accounts SET nome = public.encrypt_pii(val2) WHERE id = r.id;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
    IF r.cpf IS NOT NULL AND r.cpf != '' THEN
      BEGIN
        val := public.decrypt_pii(r.cpf);
        IF val LIKE 'ww0E%' THEN
          val2 := public.decrypt_pii(val);
          UPDATE admin_accounts SET cpf = public.encrypt_pii(val2) WHERE id = r.id;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE admin_accounts ENABLE TRIGGER ALL;
