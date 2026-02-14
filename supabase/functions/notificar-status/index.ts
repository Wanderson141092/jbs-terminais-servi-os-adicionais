import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Notificar Status - Dispara notificações internas e e-mail para o cliente
 * quando o status de uma solicitação muda.
 * 
 * Body: { solicitacao_id, novo_status, usuario_id (quem alterou) }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { solicitacao_id, novo_status, usuario_id } = await req.json();

    if (!solicitacao_id || !novo_status || !usuario_id) {
      return new Response(
        JSON.stringify({ error: "solicitacao_id, novo_status e usuario_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch solicitação
    const { data: solicitacao } = await supabaseAdmin
      .from("solicitacoes")
      .select("*")
      .eq("id", solicitacao_id)
      .single();

    if (!solicitacao) {
      return new Response(
        JSON.stringify({ error: "Solicitação não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch status label
    const { data: statusParam } = await supabaseAdmin
      .from("parametros_campos")
      .select("valor")
      .eq("grupo", "status_processo")
      .eq("sigla", novo_status)
      .eq("ativo", true)
      .maybeSingle();

    const statusLabel = statusParam?.valor || novo_status;

    // Fetch notification rules for this status
    const { data: rules } = await supabaseAdmin
      .from("notification_rules")
      .select("*")
      .eq("status_gatilho", novo_status)
      .eq("ativo", true);

    const results: { internal: number; email: boolean } = { internal: 0, email: false };

    // Check if the solicitação has a servico that matches the rules
    for (const rule of (rules || [])) {
      const tiposNotificacao = rule.tipos_notificacao || [];
      const setorIds = rule.setor_ids || [];

      // Internal notifications - send to users in the specified setores
      if (tiposNotificacao.includes("interna") && setorIds.length > 0) {
        // Get setor emails for the rule
        const { data: setorEmails } = await supabaseAdmin
          .from("setor_emails")
          .select("email_setor")
          .in("id", setorIds);

        if (setorEmails && setorEmails.length > 0) {
          const emails = setorEmails.map((s: any) => s.email_setor);
          
          // Get profiles with these setor emails (excluding the user who made the change)
          const { data: profiles } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .in("email_setor", emails)
            .neq("id", usuario_id);

          if (profiles && profiles.length > 0) {
            const notifications = profiles.map((p: any) => ({
              usuario_id: p.id,
              solicitacao_id,
              mensagem: `Solicitação ${solicitacao.protocolo} atualizada para: ${statusLabel}`,
              tipo: "status_update",
            }));

            const { error: notifError } = await supabaseAdmin
              .from("notifications")
              .insert(notifications);

            if (!notifError) {
              results.internal = notifications.length;
            }
          }
        }
      }

      // Email notification to client
      if (tiposNotificacao.includes("email") && solicitacao.cliente_email) {
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/enviar-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_sent: results.internal,
        email_sent: results.email,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro interno:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
