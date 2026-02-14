import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth - only internal calls allowed
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

    const { to, subject, body, html }: EmailPayload = await req.json();

    if (!to || !subject || (!body && !html)) {
      return new Response(
        JSON.stringify({ error: "Campos 'to', 'subject' e 'body' são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: "E-mail destinatário inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch active email integration config
    const { data: integracoes } = await supabaseAdmin
      .from("integracoes")
      .select("*")
      .eq("tipo", "email")
      .eq("ativo", true)
      .limit(1);

    const integracao = integracoes?.[0];

    if (!integracao) {
      // Log that no email integration is configured but don't fail
      console.warn("Nenhuma integração de e-mail ativa configurada. E-mail não enviado.");
      
      // Record in integration history
      await supabaseAdmin.from("integration_history").insert({
        integracao_nome: "email",
        tipo: "envio_email",
        status: "ignorado",
        detalhes: "Nenhuma integração de e-mail ativa. Configure em Integrações → Sistemas Externos.",
        payload: { to, subject },
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          warning: "Nenhuma integração de e-mail configurada. O e-mail não foi enviado.",
          skipped: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = (integracao.config || {}) as Record<string, string>;
    const provider = config.provider || "smartnx";

    let sendResult: { success: boolean; error?: string };

    switch (provider) {
      case "smartnx": {
        sendResult = await sendViaSmartNX(integracao, config, { to, subject, body, html });
        break;
      }
      case "smtp": {
        // For future SMTP implementation
        sendResult = { success: false, error: "SMTP não implementado ainda. Use Smart NX ou webhook." };
        break;
      }
      case "webhook": {
        sendResult = await sendViaWebhook(integracao, config, { to, subject, body, html });
        break;
      }
      default:
        sendResult = { success: false, error: `Provider '${provider}' não suportado` };
    }

    // Record in integration history
    await supabaseAdmin.from("integration_history").insert({
      integracao_nome: integracao.nome,
      tipo: "envio_email",
      status: sendResult.success ? "sucesso" : "erro",
      detalhes: sendResult.error || "E-mail enviado com sucesso",
      payload: { to, subject, provider },
      response: sendResult,
    });

    if (!sendResult.success) {
      console.error("Erro ao enviar e-mail:", sendResult.error);
      return new Response(
        JSON.stringify({ success: false, error: sendResult.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
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

async function sendViaSmartNX(
  integracao: any,
  config: Record<string, string>,
  email: EmailPayload
): Promise<{ success: boolean; error?: string }> {
  const url = integracao.url;
  const apiKey = integracao.api_key;

  if (!url) {
    return { success: false, error: "URL da API Smart NX não configurada" };
  }

  try {
    const payload: Record<string, any> = {
      to: email.to,
      subject: email.subject,
      body: email.html || email.body,
    };

    // Add any extra fields from config
    if (config.from) payload.from = config.from;
    if (config.template_id) payload.template_id = config.template_id;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      // Support different auth methods based on config
      const authMethod = config.auth_method || "bearer";
      if (authMethod === "bearer") {
        headers["Authorization"] = `Bearer ${apiKey}`;
      } else if (authMethod === "x-api-key") {
        headers["x-api-key"] = apiKey;
      } else if (authMethod === "basic") {
        headers["Authorization"] = `Basic ${apiKey}`;
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `Smart NX retornou ${response.status}: ${errorBody.slice(0, 200)}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Erro de conexão com Smart NX: ${err.message}` };
  }
}

async function sendViaWebhook(
  integracao: any,
  config: Record<string, string>,
  email: EmailPayload
): Promise<{ success: boolean; error?: string }> {
  const url = integracao.url;

  if (!url) {
    return { success: false, error: "URL do webhook não configurada" };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (integracao.api_key) {
      headers["Authorization"] = `Bearer ${integracao.api_key}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        event: "send_email",
        data: {
          to: email.to,
          subject: email.subject,
          body: email.html || email.body,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `Webhook retornou ${response.status}: ${errorBody.slice(0, 200)}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Erro de conexão com webhook: ${err.message}` };
  }
}
