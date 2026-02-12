import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const { password, username } = await req.json();

    if (!password || typeof password !== "string" || password.length > 100) {
      return errorResponse("Credenciais inválidas.", 400);
    }

    if (!username || typeof username !== "string") {
      return errorResponse("Credenciais inválidas.", 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const adminUsername = Deno.env.get("ADMIN_DEFAULT_USERNAME");
    const adminPass = Deno.env.get("ADMIN_DEFAULT_PASSWORD");
    const adminAuthPassword = Deno.env.get("ADMIN_AUTH_PASSWORD");

    if (!adminUsername || !adminPass || !adminAuthPassword) {
      return errorResponse("Login ou senha incorretos.");
    }

    console.log("DEBUG pass detail:", JSON.stringify({ inputLen: password.length, expectedLen: adminPass.trim().length, inputChars: [...password].map(c => c.charCodeAt(0)), expectedChars: [...adminPass.trim()].map(c => c.charCodeAt(0)) }));
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
  } catch (err) {
    console.error("admin-login error:", err);
    return errorResponse("Erro interno do servidor.", 500);
  }
});

async function ensureAdminSession(supabaseAdmin: any, email: string, password: string) {
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInError && signInData?.session) {
    await setupAdminProfile(supabaseAdmin, signInData.user.id, email);
    return signInData.session;
  }

  try {
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
