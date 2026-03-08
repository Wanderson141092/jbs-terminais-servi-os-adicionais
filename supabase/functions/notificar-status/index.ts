import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYLOAD_VERSION = "2026-03-07";
const FUNCTION_NAME = "notificar-status";

type ActionType = "notificar_status" | "reenviar_chave";

type StandardResponse = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

type ActionPayload = {
  payload_version: string;
  action: ActionType;
  solicitacao_id: string;
  timestamp: string;
  usuario_id?: string;
  novo_status?: string;
};

const jsonResponse = (status: number, body: StandardResponse) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const isValidTimestamp = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
};

const parseAndValidatePayload = (body: unknown): { payload?: ActionPayload; error?: StandardResponse } => {
  if (!body || typeof body !== "object") {
    return {
      error: {
        code: "VALIDATION_ERROR",
        message: "Payload inválido.",
        details: { reason: "body deve ser um objeto JSON" },
      },
    };
  }

  const payload = body as Record<string, unknown>;

  if (payload.payload_version !== PAYLOAD_VERSION) {
    return {
      error: {
        code: "VERSION_NOT_SUPPORTED",
        message: "Versão de payload não suportada.",
        details: { expected: PAYLOAD_VERSION, received: payload.payload_version },
      },
    };
  }

  if (payload.action !== "notificar_status" && payload.action !== "reenviar_chave") {
    return {
      error: {
        code: "VALIDATION_ERROR",
        message: "Ação inválida.",
        details: { allowed_actions: ["notificar_status", "reenviar_chave"] },
      },
    };
  }

  if (!isUuid(payload.solicitacao_id)) {
    return {
      error: {
        code: "VALIDATION_ERROR",
        message: "solicitacao_id inválido.",
      },
    };
  }

  if (!isValidTimestamp(payload.timestamp)) {
    return {
      error: {
        code: "VALIDATION_ERROR",
        message: "timestamp inválido.",
        details: { expected_format: "ISO-8601" },
      },
    };
  }

  if (payload.action === "notificar_status") {
    if (typeof payload.novo_status !== "string" || payload.novo_status.trim().length === 0) {
      return {
        error: {
          code: "VALIDATION_ERROR",
          message: "novo_status é obrigatório para a action notificar_status.",
        },
      };
    }

    if (!isUuid(payload.usuario_id)) {
      return {
        error: {
          code: "VALIDATION_ERROR",
          message: "usuario_id inválido para a action notificar_status.",
        },
      };
    }
  }

  return {
    payload: {
      payload_version: payload.payload_version,
      action: payload.action,
      solicitacao_id: payload.solicitacao_id,
      timestamp: payload.timestamp,
      usuario_id: payload.usuario_id as string | undefined,
      novo_status: payload.novo_status as string | undefined,
    },
  };
};

/**
 * Notificar Status - Endpoint consolidado com action + payload versionado.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return jsonResponse(401, {
        code: "UNAUTHORIZED",
        message: "Não autorizado.",
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const { payload, error } = parseAndValidatePayload(body);

    if (error || !payload) {
      return jsonResponse(400, error!);
    }

    const idempotencyInsert = {
      function_name: FUNCTION_NAME,
      solicitacao_id: payload.solicitacao_id,
      action: payload.action,
      request_timestamp: payload.timestamp,
      status_code: 202,
      response: { code: "PROCESSING", message: "Requisição em processamento." },
    };

    const { error: lockError } = await supabaseAdmin
      .from("edge_function_idempotency")
      .insert(idempotencyInsert);

    if (lockError) {
      const { data: existing } = await supabaseAdmin
        .from("edge_function_idempotency")
        .select("status_code, response")
        .eq("function_name", FUNCTION_NAME)
        .eq("solicitacao_id", payload.solicitacao_id)
        .eq("action", payload.action)
        .eq("request_timestamp", payload.timestamp)
        .maybeSingle();

      if (existing) {
        return jsonResponse(existing.status_code, existing.response as StandardResponse);
      }

      return jsonResponse(500, {
        code: "IDEMPOTENCY_ERROR",
        message: "Não foi possível validar idempotência.",
        details: { error: lockError.message },
      });
    }

    if (payload.action === "reenviar_chave") {
      const { data: sol } = await supabaseAdmin
        .from("solicitacoes_v")
        .select("protocolo, cliente_email, chave_consulta")
        .eq("id", payload.solicitacao_id)
        .single();

      if (!sol || !sol.cliente_email || !sol.chave_consulta) {
        const responseBody: StandardResponse = {
          code: "NOT_FOUND",
          message: "Solicitação não encontrada ou sem e-mail/chave.",
        };

        await supabaseAdmin
          .from("edge_function_idempotency")
          .update({ status_code: 404, response: responseBody })
          .eq("function_name", FUNCTION_NAME)
          .eq("solicitacao_id", payload.solicitacao_id)
          .eq("action", payload.action)
          .eq("request_timestamp", payload.timestamp);

        return jsonResponse(404, responseBody);
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      await fetch(`${supabaseUrl}/functions/v1/enviar-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          to: sol.cliente_email,
          subject: `Chave de Consulta — ${sol.protocolo}`,
          body: `Sua chave de consulta para o protocolo ${sol.protocolo} é: ${sol.chave_consulta}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #0B1B4D; padding: 20px; text-align: center;">
                <h2 style="color: #FFFFFF; margin: 0;">JBS Terminais</h2>
              </div>
              <div style="padding: 30px; background-color: #F4F6F8;">
                <h3 style="color: #333333;">Chave de Consulta</h3>
                <p style="color: #666666;">Utilize a chave abaixo para consultar o status da sua solicitação no portal:</p>
                <div style="background: white; border-left: 4px solid #7AC143; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0;"><strong>Protocolo:</strong> ${sol.protocolo}</p>
                  <p style="margin: 8px 0 0;"><strong>Chave:</strong> <span style="font-size: 20px; font-family: monospace; letter-spacing: 4px; color: #0B1B4D; font-weight: bold;">${sol.chave_consulta}</span></p>
                </div>
                <p style="color: #999; font-size: 12px;">Não compartilhe esta chave com terceiros.</p>
              </div>
              <div style="padding: 15px; text-align: center; background-color: #0B1B4D;">
                <p style="color: #FFFFFF; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} JBS Terminais — Serviços Adicionais</p>
              </div>
            </div>
          `,
        }),
      });

      if (payload.usuario_id) {
        await supabaseAdmin.rpc("insert_audit_log", {
          p_solicitacao_id: payload.solicitacao_id,
          p_usuario_id: payload.usuario_id,
          p_acao: "reenvio_chave_consulta",
          p_detalhes: `Chave de consulta reenviada para ${sol.cliente_email}`,
        });
      }

      const responseBody: StandardResponse = {
        code: "SUCCESS",
        message: "Chave reenviada com sucesso.",
        details: { solicitacao_id: payload.solicitacao_id, action: payload.action },
      };

      await supabaseAdmin
        .from("edge_function_idempotency")
        .update({ status_code: 200, response: responseBody })
        .eq("function_name", FUNCTION_NAME)
        .eq("solicitacao_id", payload.solicitacao_id)
        .eq("action", payload.action)
        .eq("request_timestamp", payload.timestamp);

      return jsonResponse(200, responseBody);
    }

    const { data: solicitacao } = await supabaseAdmin
      .from("solicitacoes_v")
      .select("*")
      .eq("id", payload.solicitacao_id)
      .single();

    if (!solicitacao) {
      const responseBody: StandardResponse = {
        code: "NOT_FOUND",
        message: "Solicitação não encontrada.",
      };

      await supabaseAdmin
        .from("edge_function_idempotency")
        .update({ status_code: 404, response: responseBody })
        .eq("function_name", FUNCTION_NAME)
        .eq("solicitacao_id", payload.solicitacao_id)
        .eq("action", payload.action)
        .eq("request_timestamp", payload.timestamp);

      return jsonResponse(404, responseBody);
    }

    const { data: statusParam } = await supabaseAdmin
      .from("parametros_campos")
      .select("valor")
      .eq("grupo", "status_processo")
      .eq("sigla", payload.novo_status)
      .eq("ativo", true)
      .maybeSingle();

    const statusLabel = statusParam?.valor || payload.novo_status;

    const servicoNome = solicitacao.tipo_operacao || "Serviço";
    const { data: servicoDataRow } = await supabaseAdmin
      .from("servicos")
      .select("id")
      .eq("nome", servicoNome)
      .eq("ativo", true)
      .maybeSingle();

    const servicoId = servicoDataRow?.id;

    const { data: allRules } = await supabaseAdmin
      .from("notification_rules")
      .select("*")
      .eq("status_gatilho", payload.novo_status)
      .eq("ativo", true);

    const rules = (allRules || []).filter((r: any) => !servicoId || r.servico_id === servicoId);

    const results: { internal: number; email: boolean } = { internal: 0, email: false };

    const buildNotificationMessage = () => {
      if (payload.novo_status === "aguardando_confirmacao") {
        return `Uma nova solicitação de ${servicoNome} foi recebida. Protocolo: ${solicitacao.protocolo}`;
      }
      if (payload.novo_status === "cancelado") {
        return `A solicitação ${solicitacao.protocolo} (${servicoNome}) foi cancelada.`;
      }
      if (payload.novo_status === "recusado") {
        return `A solicitação ${solicitacao.protocolo} (${servicoNome}) foi recusada.`;
      }
      return `Solicitação ${solicitacao.protocolo} atualizada para: ${statusLabel}`;
    };

    const notificationMessage = buildNotificationMessage();

    for (const rule of rules) {
      const tiposNotificacao = rule.tipos_notificacao || [];
      const setorIds = rule.setor_ids || [];

      if (tiposNotificacao.includes("interna") && setorIds.length > 0) {
        const hasAdminTarget = setorIds.includes("admin");
        const regularSetorIds = setorIds.filter((id: string) => id !== "admin");

        const profileIds: string[] = [];

        if (regularSetorIds.length > 0) {
          const { data: setorEmails } = await supabaseAdmin
            .from("setor_emails")
            .select("email_setor")
            .in("id", regularSetorIds);

          if (setorEmails && setorEmails.length > 0) {
            const emails = setorEmails.map((s: any) => s.email_setor);
            const { data: profiles } = await supabaseAdmin
              .from("profiles")
              .select("id")
              .in("email_setor", emails)
              .neq("id", payload.usuario_id);

            if (profiles) {
              profileIds.push(...profiles.map((p: any) => p.id));
            }
          }
        }

        if (hasAdminTarget) {
          const { data: adminRoles } = await supabaseAdmin
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin");

          if (adminRoles) {
            for (const ar of adminRoles) {
              if (ar.user_id !== payload.usuario_id && !profileIds.includes(ar.user_id)) {
                profileIds.push(ar.user_id);
              }
            }
          }
        }

        if (profileIds.length > 0) {
          const notifications = profileIds.map((uid: string) => ({
            usuario_id: uid,
            solicitacao_id: payload.solicitacao_id,
            mensagem: notificationMessage,
            tipo: "status_update",
          }));

          const { error: notifError } = await supabaseAdmin
            .from("notifications")
            .insert(notifications);

          if (!notifError) {
            results.internal += notifications.length;
          }
        }
      }

      if (tiposNotificacao.includes("email") && solicitacao.cliente_email) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/enviar-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              to: solicitacao.cliente_email,
              subject: `Atualização da Solicitação ${solicitacao.protocolo}`,
              body: `Sua solicitação ${solicitacao.protocolo} foi atualizada para o status: ${statusLabel}.`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background-color: #0B1B4D; padding: 20px; text-align: center;">
                    <h2 style="color: #FFFFFF; margin: 0;">JBS Terminais</h2>
                  </div>
                  <div style="padding: 30px; background-color: #F4F6F8;">
                    <h3 style="color: #333333;">Atualização de Solicitação</h3>
                    <p style="color: #666666;">Sua solicitação foi atualizada:</p>
                    <div style="background: white; border-left: 4px solid #7AC143; padding: 15px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0;"><strong>Protocolo:</strong> ${solicitacao.protocolo}</p>
                      <p style="margin: 8px 0 0;"><strong>Novo Status:</strong> ${statusLabel}</p>
                    </div>
                    <p style="color: #666666; font-size: 14px;">
                      Para consultar o status completo, acesse o portal de consulta externa.
                    </p>
                  </div>
                  <div style="padding: 15px; text-align: center; background-color: #0B1B4D;">
                    <p style="color: #FFFFFF; font-size: 12px; margin: 0;">
                      © ${new Date().getFullYear()} JBS Terminais — Serviços Adicionais
                    </p>
                  </div>
                </div>
              `,
            }),
          });

          const emailResult = await emailResponse.json();
          results.email = emailResult.success || false;
        } catch (emailErr) {
          console.error("Erro ao enviar e-mail:", emailErr);
        }
      }
    }

    const responseBody: StandardResponse = {
      code: "SUCCESS",
      message: "Notificações processadas com sucesso.",
      details: {
        solicitacao_id: payload.solicitacao_id,
        action: payload.action,
        notifications_sent: results.internal,
        email_sent: results.email,
      },
    };

    await supabaseAdmin
      .from("edge_function_idempotency")
      .update({ status_code: 200, response: responseBody })
      .eq("function_name", FUNCTION_NAME)
      .eq("solicitacao_id", payload.solicitacao_id)
      .eq("action", payload.action)
      .eq("request_timestamp", payload.timestamp);

    return jsonResponse(200, responseBody);
  } catch (err) {
    console.error("Erro interno:", err);
    return jsonResponse(500, {
      code: "INTERNAL_ERROR",
      message: "Erro interno do servidor.",
      details: { error: String(err) },
    });
  }
});
