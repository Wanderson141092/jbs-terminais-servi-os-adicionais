import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Failure = { code: string; message: string; details?: unknown };

const fail = (status: number, error: Failure) =>
  new Response(JSON.stringify({ ok: false, error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return fail(401, { code: "UNAUTHORIZED", message: "Token não informado." });

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(url, serviceRole);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return fail(401, { code: "UNAUTHORIZED", message: "Usuário inválido." });
    const userId = authData.user.id;

    const body = await req.json();
    const {
      solicitacao_id,
      target_status,
      current_status,
      actor_setor,
      approval_decision,
      approval_justificativa,
      justification,
      selected_pendencias,
      solicitar_deferimento,
      solicitar_lacre_armador,
      lacre_armador_aceite_custo,
      custo_posicionamento,
      lancamento_confirmado,
      cliente_nome,
      cnpj,
      force_correction,
    } = body || {};

    if (!solicitacao_id) return fail(400, { code: "INVALID_REQUEST", message: "solicitacao_id é obrigatório." });

    const { data: solicitacao, error: solError } = await admin
      .from("solicitacoes")
      .select("*")
      .eq("id", solicitacao_id)
      .single();

    if (solError || !solicitacao) return fail(404, { code: "NOT_FOUND", message: "Solicitação não encontrada." });

    if (current_status && current_status !== solicitacao.status) {
      return fail(409, { code: "STATUS_CHANGED", message: "A solicitação foi alterada por outro usuário." });
    }

    const { data: servico } = await admin
      .from("servicos")
      .select("id,nome,ativo,status_confirmacao_lancamento")
      .eq("nome", solicitacao.tipo_operacao || "Posicionamento")
      .maybeSingle();

    if (!servico?.ativo) {
      return fail(403, { code: "SERVICE_DISABLED", message: "Serviço não habilitado para esta operação." });
    }

    const [{ data: profile }, { data: roles }] = await Promise.all([
      admin.from("profiles").select("id,setor,email_setor").eq("id", userId).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const roleSet = new Set((roles || []).map((r: any) => r.role));
    const isAdmin = roleSet.has("admin");
    const selectedSetor = isAdmin ? actor_setor : profile?.setor;

    if (!isAdmin && !selectedSetor) {
      return fail(403, { code: "FORBIDDEN", message: "Usuário sem setor vinculado." });
    }

    if (!isAdmin && profile?.email_setor) {
      const { data: setorRow } = await admin
        .from("setor_emails")
        .select("id,perfis,ativo")
        .eq("email_setor", profile.email_setor)
        .maybeSingle();

      if (!setorRow?.ativo) return fail(403, { code: "FORBIDDEN", message: "Setor inativo." });
      if (!setorRow.perfis || setorRow.perfis.length === 0) {
        return fail(403, { code: "FORBIDDEN", message: "Usuário sem perfil habilitado no setor." });
      }

      const { data: setorServico } = await admin
        .from("setor_servicos")
        .select("id")
        .eq("setor_email_id", setorRow.id)
        .eq("servico_id", servico.id)
        .maybeSingle();

      if (!setorServico && !roleSet.has("gestor")) {
        return fail(403, { code: "FORBIDDEN", message: "Setor sem permissão para este serviço." });
      }
    }

    if (typeof approval_decision === "boolean") {
      if (!["aguardando_confirmacao", "recusado"].includes(solicitacao.status)) {
        return fail(409, { code: "INVALID_STATUS", message: "Status atual não permite aprovação/recusa." });
      }
      if (!selectedSetor || !["COMEX", "ARMAZEM"].includes(selectedSetor)) {
        return fail(400, { code: "INVALID_SECTOR", message: "Setor de atuação é obrigatório." });
      }

      const now = new Date().toISOString();
      const updateData: Record<string, unknown> = {};
      if (selectedSetor === "COMEX") {
        updateData.comex_aprovado = approval_decision;
        updateData.comex_usuario_id = userId;
        updateData.comex_data = now;
        updateData.comex_justificativa = approval_justificativa || null;
      } else {
        updateData.armazem_aprovado = approval_decision;
        updateData.armazem_usuario_id = userId;
        updateData.armazem_data = now;
        updateData.armazem_justificativa = approval_justificativa || null;
      }

      const { error } = await admin.from("solicitacoes").update(updateData).eq("id", solicitacao_id);
      if (error) return fail(500, { code: "DB_ERROR", message: "Erro ao registrar aprovação.", details: error.message });

      return new Response(JSON.stringify({ ok: true, data: { action: "approval", solicitacao_id } }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!target_status) return fail(400, { code: "INVALID_REQUEST", message: "target_status é obrigatório." });

    const { data: statusRows } = await admin
      .from("parametros_campos")
      .select("sigla,ordem")
      .eq("grupo", "status_processo")
      .eq("ativo", true);

    const map = new Map((statusRows || []).map((r: any) => [r.sigla, r.ordem ?? 0]));
    const currentOrder = map.get(solicitacao.status) ?? 0;
    const targetOrder = map.get(target_status);
    if (typeof targetOrder !== "number") {
      return fail(400, { code: "INVALID_STATUS", message: "Status alvo não configurado." });
    }

    const isTerminalTransition = ["cancelado", "recusado"].includes(target_status);
    const isForcedCorrection = force_correction === true && isAdmin;
    const higherOrders = Array.from(map.values()).filter((v) => v > currentOrder);
    const nextOrder = higherOrders.length > 0 ? Math.min(...higherOrders) : null;
    if (!isForcedCorrection && !isTerminalTransition && nextOrder !== null && targetOrder !== nextOrder && target_status !== solicitacao.status) {
      return fail(409, { code: "TRANSITION_NOT_ALLOWED", message: "Transição de status não permitida." });
    }

    const pendingStatuses = ["aguardando", "enviado", "pendente"];
    if ((solicitar_deferimento ?? solicitacao.solicitar_deferimento) && target_status === "vistoria_finalizada") {
      const { data: docs } = await admin
        .from("deferimento_documents")
        .select("status")
        .eq("solicitacao_id", solicitacao_id)
        .eq("document_type", "deferimento");
      const hasPendencia = (docs || []).some((d: any) => pendingStatuses.includes((d.status || "").toLowerCase()));
      if (hasPendencia) {
        return fail(409, { code: "OPEN_PENDENCIAS", message: "Há pendências abertas de deferimento." });
      }
    }

    if (target_status === "vistoriado_com_pendencia" && (!selected_pendencias || selected_pendencias.length === 0)) {
      return fail(400, { code: "PENDENCIA_REQUIRED", message: "Selecione pelo menos uma pendência." });
    }

    if (solicitar_lacre_armador && typeof lacre_armador_aceite_custo !== "boolean") {
      return fail(400, { code: "COST_ACCEPT_REQUIRED", message: "Aceite de custo do lacre é obrigatório." });
    }

    if (target_status === "cancelado" && solicitacao.status === "confirmado_aguardando_vistoria" && typeof custo_posicionamento !== "boolean") {
      return fail(400, { code: "COST_ACCEPT_REQUIRED", message: "Aceite de custo de posicionamento é obrigatório." });
    }

    const payload: Record<string, unknown> = {
      status: target_status,
      solicitar_deferimento: Boolean(solicitar_deferimento),
      solicitar_lacre_armador: Boolean(solicitar_lacre_armador),
      lacre_armador_aceite_custo: solicitar_lacre_armador ? lacre_armador_aceite_custo : null,
      pendencias_selecionadas: selected_pendencias || [],
      cliente_nome: cliente_nome || solicitacao.cliente_nome,
      cnpj: cnpj || null,
      updated_at: new Date().toISOString(),
    };

    if (typeof custo_posicionamento === "boolean") payload.custo_posicionamento = custo_posicionamento;
    if (typeof lancamento_confirmado === "boolean") payload.lancamento_confirmado = lancamento_confirmado;

    const { error: updateError } = await admin.from("solicitacoes").update(payload).eq("id", solicitacao_id);
    if (updateError) return fail(500, { code: "DB_ERROR", message: "Erro ao atualizar solicitação.", details: updateError.message });

    if (justification) {
      await admin.from("observacao_historico").insert({
        solicitacao_id,
        observacao: justification,
        status_no_momento: target_status,
        autor_id: userId,
        tipo_observacao: "externa",
      });
      await admin.from("solicitacoes").update({ observacoes: justification }).eq("id", solicitacao_id);
    }

    // Fire-and-forget: trigger notifications to linked sectors via notification_rules
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    fetch(`${supabaseUrl}/functions/v1/notificar-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRole}`,
      },
      body: JSON.stringify({
        payload_version: "2026-03-07",
        action: "notificar_status",
        solicitacao_id,
        novo_status: target_status,
        usuario_id: userId,
        timestamp: new Date().toISOString(),
      }),
    }).catch((err) => console.error("Error triggering notification:", err));

    return new Response(JSON.stringify({ ok: true, data: { action: "transition", solicitacao_id, target_status } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return fail(500, { code: "UNEXPECTED", message: "Erro inesperado.", details: (err as Error).message });
  }
});
