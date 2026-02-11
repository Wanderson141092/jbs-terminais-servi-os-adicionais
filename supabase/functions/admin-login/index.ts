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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cpf, password, username } = await req.json();

    // Input validation
    if (!password || typeof password !== "string" || password.length > 100) {
      return new Response(
        JSON.stringify({ error: "Credenciais inválidas." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // CPF-based admin login
    if (cpf && typeof cpf === "string") {
      const cpfNumeros = cpf.replace(/\D/g, "");
      if (cpfNumeros.length !== 11) {
        return new Response(
          JSON.stringify({ error: "CPF inválido." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: adminAccount, error: lookupError } = await supabaseAdmin
        .from("admin_accounts")
        .select("id, nome, senha_hash, ativo, cpf")
        .eq("cpf", cpfNumeros)
        .eq("ativo", true)
        .maybeSingle();

      if (lookupError || !adminAccount) {
        return new Response(
          JSON.stringify({ error: "CPF ou senha incorretos." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify password - supports both PBKDF2 hashed and legacy plaintext
      let passwordValid = false;
      const storedHash = adminAccount.senha_hash;

      if (storedHash.startsWith("$pbkdf2$")) {
        // PBKDF2 hashed password
        const hashPart = storedHash.substring(8); // Remove "$pbkdf2$" prefix
        passwordValid = await verifyPassword(password, hashPart);
      } else {
        // Legacy plaintext password - compare directly
        passwordValid = storedHash === password;

        // Auto-migrate to PBKDF2 hash if plaintext matches
        if (passwordValid) {
          const newHash = await hashPassword(password);
          await supabaseAdmin
            .from("admin_accounts")
            .update({ senha_hash: newHash, updated_at: new Date().toISOString() })
            .eq("id", adminAccount.id);
        }
      }

      if (!passwordValid) {
        return new Response(
          JSON.stringify({ error: "CPF ou senha incorretos." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sign in with the admin Supabase auth account
      const adminEmail = "admin@jbsterminais.com.br";
      const adminAuthPassword = Deno.env.get("ADMIN_AUTH_PASSWORD");
      if (!adminAuthPassword) {
        return new Response(
          JSON.stringify({ error: "Configuração de admin não encontrada. Contate o suporte." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: adminEmail,
        password: adminAuthPassword,
      });

      if (signInError) {
        return new Response(
          JSON.stringify({ error: "Erro ao autenticar. Contate o suporte." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          session: signInData.session,
          adminNome: adminAccount.nome,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default admin login (username-based)
    if (username && typeof username === "string") {
      const adminUsername = Deno.env.get("ADMIN_DEFAULT_USERNAME");
      const adminPass = Deno.env.get("ADMIN_DEFAULT_PASSWORD");
      const adminAuthPassword = Deno.env.get("ADMIN_AUTH_PASSWORD");

      if (!adminUsername || !adminPass || !adminAuthPassword) {
        return new Response(
          JSON.stringify({ error: "Configuração de admin não encontrada. Contate o suporte." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (username.toLowerCase().trim() !== adminUsername.toLowerCase().trim() || password !== adminPass.trim()) {
        return new Response(
          JSON.stringify({ error: "Login ou senha incorretos." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const adminEmail = "admin@jbsterminais.com.br";

      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: adminEmail,
        password: adminAuthPassword,
      });

      if (signInError) {
        // Try to create user first
        const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminAuthPassword,
          email_confirm: true,
        });

        if (signUpError) {
          // User exists but password doesn't match - update password
          try {
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = users?.find((u: any) => u.email === adminEmail);

            if (!existingUser) {
              return new Response(
                JSON.stringify({ error: "Login ou senha incorretos." }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            // Reset password to match current ADMIN_AUTH_PASSWORD
            await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
              password: adminAuthPassword,
            });

            // Setup profile and role
            await supabaseAdmin.from("profiles").upsert({
              id: existingUser.id,
              email: adminEmail,
              nome: "Administrador",
              setor: null,
            });

            const { data: existingRole } = await supabaseAdmin
              .from("user_roles")
              .select("id")
              .eq("user_id", existingUser.id)
              .eq("role", "admin")
              .maybeSingle();

            if (!existingRole) {
              await supabaseAdmin.from("user_roles").insert({
                user_id: existingUser.id,
                role: "admin",
              });
            }

            const { data: retrySignIn, error: retryError } = await supabaseAdmin.auth.signInWithPassword({
              email: adminEmail,
              password: adminAuthPassword,
            });

            if (retryError) {
              return new Response(
                JSON.stringify({ error: "Login ou senha incorretos." }),
                { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }

            return new Response(
              JSON.stringify({ session: retrySignIn.session, adminNome: "Administrador" }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } catch (e) {
            return new Response(
              JSON.stringify({ error: "Login ou senha incorretos." }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        if (signUpData.user) {
          await supabaseAdmin.from("profiles").upsert({
            id: signUpData.user.id,
            email: adminEmail,
            nome: "Administrador",
            setor: null,
          });

          await supabaseAdmin.from("user_roles").insert({
            user_id: signUpData.user.id,
            role: "admin",
          });

          const { data: newSignIn, error: newSignInError } = await supabaseAdmin.auth.signInWithPassword({
            email: adminEmail,
            password: adminAuthPassword,
          });

          if (newSignInError) {
            return new Response(
              JSON.stringify({ error: "Erro ao autenticar após configuração." }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          return new Response(
            JSON.stringify({ session: newSignIn.session, adminNome: "Administrador", setup: true }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      if (signInData?.user) {
        await supabaseAdmin.from("profiles").upsert({
          id: signInData.user.id,
          email: adminEmail,
          nome: "Administrador",
          setor: null,
        });

        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", signInData.user.id)
          .eq("role", "admin")
          .maybeSingle();

        if (!existingRole) {
          await supabaseAdmin.from("user_roles").insert({
            user_id: signInData.user.id,
            role: "admin",
          });
        }

        return new Response(
          JSON.stringify({ session: signInData.session, adminNome: "Administrador" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Credenciais inválidas." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
