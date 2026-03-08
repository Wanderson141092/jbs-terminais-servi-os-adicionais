import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json(401, { ok: false, error: { code: "UNAUTHORIZED", message: "Token ausente." } });

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, serviceRole);

    const { data: authData } = await userClient.auth.getUser();
    if (!authData.user) return json(401, { ok: false, error: { code: "UNAUTHORIZED", message: "Usuário inválido." } });

    const { solicitacao_id, deferimento_document_id, accept, motivo_recusa } = await req.json();
    if (!solicitacao_id || !deferimento_document_id || typeof accept !== "boolean") {
      return json(400, { ok: false, error: { code: "INVALID_REQUEST", message: "solicitacao_id, deferimento_document_id e accept são obrigatórios." } });
    }

    if (!accept && (!motivo_recusa || String(motivo_recusa).trim().length < 5)) {
      return json(400, { ok: false, error: { code: "INVALID_REASON", message: "Motivo da recusa é obrigatório." } });
    }

    const [{ data: solicitacao }, { data: roles }, { data: documento }] = await Promise.all([
      admin.from("solicitacoes").select("id,tipo_operacao").eq("id", solicitacao_id).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", authData.user.id),
      admin.from("deferimento_documents").select("id,status,document_type,solicitacao_id").eq("id", deferimento_document_id).maybeSingle(),
    ]);

    if (!solicitacao) return json(404, { ok: false, error: { code: "NOT_FOUND", message: "Solicitação não encontrada." } });
    if (!documento || documento.solicitacao_id !== solicitacao_id) {
      return json(404, { ok: false, error: { code: "NOT_FOUND", message: "Documento de pendência não encontrado." } });
    }

    const roleSet = new Set((roles || []).map((r: any) => r.role));
    if (!roleSet.has("admin") && !roleSet.has("gestor")) {
      return json(403, { ok: false, error: { code: "FORBIDDEN", message: "Sem permissão para resolver pendência." } });
    }

    const { data: servico } = await admin.from("servicos").select("id,ativo").eq("nome", solicitacao.tipo_operacao || "Posicionamento").maybeSingle();
    if (!servico?.ativo) return json(403, { ok: false, error: { code: "SERVICE_DISABLED", message: "Serviço não habilitado." } });

    const { error } = await admin
      .from("deferimento_documents")
      .update({
        status: accept ? "aceito" : "recusado",
        motivo_recusa: accept ? null : String(motivo_recusa).trim(),
      })
      .eq("id", deferimento_document_id)
      .eq("solicitacao_id", solicitacao_id);

    if (error) return json(500, { ok: false, error: { code: "DB_ERROR", message: "Erro ao atualizar pendência.", details: error.message } });

    return json(200, {
      ok: true,
      data: {
        solicitacao_id,
        deferimento_document_id,
        status: accept ? "aceito" : "recusado",
      },
    });
  } catch (error) {
    return json(500, { ok: false, error: { code: "UNEXPECTED", message: "Erro inesperado", details: (error as Error).message } });
  }
});
