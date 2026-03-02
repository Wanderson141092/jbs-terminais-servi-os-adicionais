
-- Fix 1: Recreate profiles_v without security_invoker so decrypt_pii works properly
DROP VIEW IF EXISTS profiles_v;
CREATE VIEW profiles_v AS
SELECT 
  id,
  email,
  decrypt_pii(nome) AS nome,
  setor,
  email_setor,
  bloqueado,
  created_at,
  updated_at
FROM profiles;

-- Grant select to authenticated
GRANT SELECT ON profiles_v TO authenticated;

-- Fix 2: Also fix solicitacoes_v if it has security_invoker
-- (keeping it as-is since it already works)
