import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PBKDF2 password verification
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const storedDerivedBits = combined.slice(16);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  const newHash = new Uint8Array(derivedBits);
  if (newHash.length !== storedDerivedBits.length) return false;

  let result = 0;
  for (let i = 0; i < newHash.length; i++) {
    result |= newHash[i] ^ storedDerivedBits[i];
  }
  return result === 0;
}

// Hash password with PBKDF2
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(derivedBits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  return "$pbkdf2$" + btoa(String.fromCharCode(...combined));
}

const errorResponse = (message: string, status = 401) =>
  new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cpf, password, username } = await req.json();

    // Input validation
    if (!password || typeof password !== "string" || password.length > 100) {
      return errorResponse("Credenciais inválidas.", 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // CPF-based admin login
    if (cpf && typeof cpf === "string") {
      const cpfNumeros = cpf.replace(/\D/g, "");
      if (cpfNumeros.length !== 11) {
        return errorResponse("CPF inválido.", 400);
      }

      const { data: adminAccount, error: lookupError } = await supabaseAdmin
        .from("admin_accounts")
        .select("id, nome, senha_hash, ativo, cpf")
        .eq("cpf", cpfNumeros)
        .eq("ativo", true)
        .maybeSingle();

      if (lookupError || !adminAccount) {
        return errorResponse("CPF ou senha incorretos.");
      }

      // Verify password
      let passwordValid = false;
      const storedHash = adminAccount.senha_hash;

      if (storedHash.startsWith("$pbkdf2$")) {
        const hashPart = storedHash.substring(8);
        passwordValid = await verifyPassword(password, hashPart);
      } else {
        passwordValid = storedHash === password;
        if (passwordValid) {
          const newHash = await hashPassword(password);
          await supabaseAdmin
            .from("admin_accounts")
            .update({ senha_hash: newHash, updated_at: new Date().toISOString() })
            .eq("id", adminAccount.id);
        }
      }

      if (!passwordValid) {
        return errorResponse("CPF ou senha incorretos.");
      }

      // Sign in with admin auth account
      const adminEmail = "admin@jbsterminais.com.br";
      const adminAuthPassword = Deno.env.get("ADMIN_AUTH_PASSWORD");
      if (!adminAuthPassword) {
        // Config missing - return generic auth error, not 500
        return errorResponse("Login ou senha incorretos.");
      }

      const session = await ensureAdminSession(supabaseAdmin, adminEmail, adminAuthPassword);
      if (!session) {
        return errorResponse("Login ou senha incorretos.");
      }

      return new Response(
        JSON.stringify({ session, adminNome: adminAccount.nome }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default admin login (username-based)
    if (username && typeof username === "string") {
      const adminUsername = Deno.env.get("ADMIN_DEFAULT_USERNAME");
      const adminPass = Deno.env.get("ADMIN_DEFAULT_PASSWORD");
      const adminAuthPassword = Deno.env.get("ADMIN_AUTH_PASSWORD");

      // If any config is missing, return auth error (not 500)
      if (!adminUsername || !adminPass || !adminAuthPassword) {
        return errorResponse("Login ou senha incorretos.");
      }

      if (username.toLowerCase().trim() !== adminUsername.toLowerCase().trim() || password !== adminPass.trim()) {
        return errorResponse("Login ou senha incorretos.");
      }

      const adminEmail = "admin@jbsterminais.com.br";

      const session = await ensureAdminSession(supabaseAdmin, adminEmail, adminAuthPassword);
      if (!session) {
        return errorResponse("Erro ao autenticar. Tente novamente.");
      }

      return new Response(
        JSON.stringify({ session, adminNome: "Administrador" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return errorResponse("Credenciais inválidas.");
  } catch (err) {
    console.error("admin-login error:", err);
    return errorResponse("Erro interno do servidor.", 500);
  }
});

// Helper: ensure admin user exists, password matches, and return session
async function ensureAdminSession(supabaseAdmin: any, email: string, password: string) {
  // Try sign in first
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInError && signInData?.session) {
    // Ensure profile and role exist
    await setupAdminProfile(supabaseAdmin, signInData.user.id, email);
    return signInData.session;
  }

  // Sign in failed - try to create or fix the user
  try {
    // Try create
    const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (!signUpError && signUpData?.user) {
      await setupAdminProfile(supabaseAdmin, signUpData.user.id, email);
      const { data: newSignIn } = await supabaseAdmin.auth.signInWithPassword({ email, password });
      return newSignIn?.session || null;
    }

    // User exists but password mismatch - update password
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users?.find((u: any) => u.email === email);

    if (!existingUser) return null;

    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password });
    await setupAdminProfile(supabaseAdmin, existingUser.id, email);

    const { data: retrySignIn } = await supabaseAdmin.auth.signInWithPassword({ email, password });
    return retrySignIn?.session || null;
  } catch {
    return null;
  }
}

async function setupAdminProfile(supabaseAdmin: any, userId: string, email: string) {
  await supabaseAdmin.from("profiles").upsert({
    id: userId,
    email,
    nome: "Administrador",
    setor: null,
  });

  const { data: existingRole } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!existingRole) {
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "admin" });
  }
}
