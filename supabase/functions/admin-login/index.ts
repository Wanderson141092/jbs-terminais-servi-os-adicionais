import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

      // Lookup admin by CPF using service role (bypasses RLS)
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

      // Server-side password comparison (no exposure to client)
      if (adminAccount.senha_hash !== password) {
        return new Response(
          JSON.stringify({ error: "CPF ou senha incorretos." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Sign in with the admin Supabase auth account
      const adminEmail = "admin@jbsterminais.com.br";
      // Get admin auth password from secrets
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

      if (username.toLowerCase().trim() !== adminUsername.toLowerCase() || password !== adminPass) {
        return new Response(
          JSON.stringify({ error: "Credenciais inválidas." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const adminEmail = "admin@jbsterminais.com.br";

      // Try to sign in
      const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: adminEmail,
        password: adminAuthPassword,
      });

      if (signInError) {
        // Try to create admin account if it doesn't exist
        const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminAuthPassword,
          email_confirm: true,
        });

        if (signUpError) {
          return new Response(
            JSON.stringify({ error: "Conta admin não configurada. Contate o suporte." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (signUpData.user) {
          await supabaseAdmin.from("profiles").upsert({
            id: signUpData.user.id,
            email: adminEmail,
            nome: "Administrador",
            setor: null,
          });

          // Setup admin role
          await supabaseAdmin.from("user_roles").insert({
            user_id: signUpData.user.id,
            role: "admin",
          });

          // Sign in after creation
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
        // Ensure profile and role exist
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
