import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PBKDF2-based password hashing using Web Crypto API
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
  // Prefix with $pbkdf2$ to identify hashed passwords
  return "$pbkdf2$" + btoa(String.fromCharCode(...combined));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user is an admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, data } = await req.json();

    switch (action) {
      case "list": {
        const { data: admins, error } = await supabaseAdmin
          .from("admin_accounts")
          .select("id, cpf, nome, ativo, created_at")
          .order("nome");

        if (error) {
          return new Response(
            JSON.stringify({ error: "Erro ao listar administradores." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ admins }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "create": {
        if (!data?.cpf || !data?.nome || !data?.senha) {
          return new Response(
            JSON.stringify({ error: "CPF, nome e senha são obrigatórios." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const cpfNums = data.cpf.replace(/\D/g, "");
        if (cpfNums.length !== 11) {
          return new Response(
            JSON.stringify({ error: "CPF inválido." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (typeof data.nome !== "string" || data.nome.trim().length === 0 || data.nome.length > 255) {
          return new Response(
            JSON.stringify({ error: "Nome inválido." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (typeof data.senha !== "string" || data.senha.length < 6 || data.senha.length > 100) {
          return new Response(
            JSON.stringify({ error: "Senha deve ter entre 6 e 100 caracteres." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const hashedPassword = await hashPassword(data.senha);

        const { error } = await supabaseAdmin
          .from("admin_accounts")
          .insert({
            cpf: cpfNums,
            nome: data.nome.trim(),
            senha_hash: hashedPassword,
          });

        if (error) {
          if (error.code === "23505") {
            return new Response(
              JSON.stringify({ error: "CPF já cadastrado." }),
              { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          return new Response(
            JSON.stringify({ error: "Erro ao criar administrador." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        if (!data?.id) {
          return new Response(
            JSON.stringify({ error: "ID é obrigatório." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (data.cpf) {
          const cpfNums = data.cpf.replace(/\D/g, "");
          if (cpfNums.length !== 11) {
            return new Response(
              JSON.stringify({ error: "CPF inválido." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          updateData.cpf = cpfNums;
        }

        if (data.nome !== undefined) {
          if (typeof data.nome !== "string" || data.nome.trim().length === 0 || data.nome.length > 255) {
            return new Response(
              JSON.stringify({ error: "Nome inválido." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          updateData.nome = data.nome.trim();
        }

        if (data.ativo !== undefined) {
          updateData.ativo = Boolean(data.ativo);
        }

        const { error } = await supabaseAdmin
          .from("admin_accounts")
          .update(updateData)
          .eq("id", data.id);

        if (error) {
          return new Response(
            JSON.stringify({ error: "Erro ao atualizar administrador." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "change-password": {
        if (!data?.id || !data?.senha) {
          return new Response(
            JSON.stringify({ error: "ID e senha são obrigatórios." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (typeof data.senha !== "string" || data.senha.length < 6 || data.senha.length > 100) {
          return new Response(
            JSON.stringify({ error: "Senha deve ter entre 6 e 100 caracteres." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const hashedPwd = await hashPassword(data.senha);

        const { error } = await supabaseAdmin
          .from("admin_accounts")
          .update({
            senha_hash: hashedPwd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.id);

        if (error) {
          return new Response(
            JSON.stringify({ error: "Erro ao alterar senha." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        if (!data?.id) {
          return new Response(
            JSON.stringify({ error: "ID é obrigatório." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabaseAdmin
          .from("admin_accounts")
          .delete()
          .eq("id", data.id);

        if (error) {
          return new Response(
            JSON.stringify({ error: "Erro ao excluir administrador." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação inválida." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
