import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return respond(401, { ok: false, error: { code: "UNAUTHORIZED", message: "Token ausente." } });

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, serviceRole);

    const { data: authData } = await userClient.auth.getUser();
    if (!authData.user) return respond(401, { ok: false, error: { code: "UNAUTHORIZED", message: "Usuário inválido." } });

    const { solicitacao_id, cobranca_config_id, confirm } = await req.json();
    if (!solicitacao_id || !cobranca_config_id || typeof confirm !== "boolean") {
      return respond(400, { ok: false, error: { code: "INVALID_REQUEST", message: "solicitacao_id, cobranca_config_id e confirm são obrigatórios." } });
    }

    const [{ data: solicitacao }, { data: config }, { data: roles }] = await Promise.all([
      admin.from("solicitacoes").select("id,status,tipo_operacao,lacre_armador_aceite_custo").eq("id", solicitacao_id).maybeSingle(),
      admin.from("lancamento_cobranca_config").select("*").eq("id", cobranca_config_id).eq("ativo", true).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", authData.user.id),
    ]);

    if (!solicitacao) return respond(404, { ok: false, error: { code: "NOT_FOUND", message: "Solicitação não encontrada." } });
    if (!config) return respond(404, { ok: false, error: { code: "NOT_FOUND", message: "Configuração de cobrança não encontrada." } });

    const { data: servico } = await admin.from("servicos").select("id,ativo").eq("nome", solicitacao.tipo_operacao || "Posicionamento").maybeSingle();
    if (!servico?.ativo) return respond(403, { ok: false, error: { code: "SERVICE_DISABLED", message: "Serviço não habilitado." } });

    const roleSet = new Set((roles || []).map((r: any) => r.role));
    if (!roleSet.has("admin") && !roleSet.has("gestor")) {
      return respond(403, { ok: false, error: { code: "FORBIDDEN", message: "Sem permissão para confirmar cobrança." } });
    }

    const statusAtivacao = config.status_ativacao || [];
    if (statusAtivacao.length > 0 && !statusAtivacao.includes(solicitacao.status)) {
      return respond(409, { ok: false, error: { code: "TRANSITION_NOT_ALLOWED", message: "Cobrança não habilitada para o status atual." } });
    }

    if (config.tipo === "pendencia" && solicitacao.lacre_armador_aceite_custo !== true) {
      return respond(409, { ok: false, error: { code: "COST_ACCEPT_REQUIRED", message: "Aceite de custo pendente para cobrança de pendência." } });
    }

    await admin.from("lancamento_cobranca_registros").upsert({
      solicitacao_id,
      cobranca_config_id,
      confirmado: confirm,
      confirmado_por: confirm ? authData.user.id : null,
      confirmado_data: confirm ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "solicitacao_id,cobranca_config_id" });

    const { data: allRegs } = await admin
      .from("lancamento_cobranca_registros")
      .select("cobranca_config_id,confirmado")
      .eq("solicitacao_id", solicitacao_id);

    const { data: allConfigs } = await admin
      .from("lancamento_cobranca_config")
      .select("id,tipo,status_ativacao")
      .eq("ativo", true);

    const applicable = (allConfigs || []).filter((cfg: any) => {
      const statuses = cfg.status_ativacao || [];
      if (statuses.length > 0 && !statuses.includes(solicitacao.status)) return false;
      if (cfg.tipo === "pendencia") return solicitacao.lacre_armador_aceite_custo === true;
      return true;
    });

    const allConfirmed = applicable.every((cfg: any) => (allRegs || []).find((r: any) => r.cobranca_config_id === cfg.id)?.confirmado === true);

    await admin.from("solicitacoes").update({
      lancamento_confirmado: allConfirmed,
      lancamento_confirmado_por: allConfirmed ? authData.user.id : null,
      lancamento_confirmado_data: allConfirmed ? new Date().toISOString() : null,
    }).eq("id", solicitacao_id);

    return respond(200, { ok: true, data: { solicitacao_id, cobranca_config_id, confirmado: confirm, all_confirmed: allConfirmed } });
  } catch (error) {
    return respond(500, { ok: false, error: { code: "UNEXPECTED", message: "Erro inesperado", details: (error as Error).message } });
  }
});
