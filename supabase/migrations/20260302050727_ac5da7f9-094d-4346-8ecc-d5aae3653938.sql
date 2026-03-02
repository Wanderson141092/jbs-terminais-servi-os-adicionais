
-- First, temporarily disable the encryption trigger to avoid re-encrypting
-- Then fix double-encrypted names by decrypting once and storing the result
-- The trigger will re-encrypt on the UPDATE

-- Create a temp function to fix double-encrypted profiles
CREATE OR REPLACE FUNCTION fix_double_encrypted_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  r RECORD;
  decrypted_once TEXT;
  decrypted_twice TEXT;
BEGIN
  FOR r IN SELECT id, nome FROM profiles WHERE nome IS NOT NULL AND nome != '' LOOP
    BEGIN
      -- Try to decrypt once
      decrypted_once := pgp_sym_decrypt(decode(r.nome, 'base64'), _get_enc_key());
      -- Try to decrypt the result again (if double-encrypted)
      BEGIN
        decrypted_twice := pgp_sym_decrypt(decode(decrypted_once, 'base64'), _get_enc_key());
        -- If we get here, it was double-encrypted. Store the plain text
        -- The trigger will re-encrypt it
        UPDATE profiles SET nome = decrypted_twice WHERE id = r.id;
        RAISE NOTICE 'Fixed double-encrypted profile: %', r.id;
      EXCEPTION WHEN OTHERS THEN
        -- Single encryption is correct, no fix needed
        NULL;
      END;
    EXCEPTION WHEN OTHERS THEN
      -- Not encrypted at all or corrupt, skip
      NULL;
    END;
  END LOOP;
END;
$$;

-- Execute the fix
SELECT fix_double_encrypted_profiles();

-- Drop the temp function
DROP FUNCTION fix_double_encrypted_profiles();
