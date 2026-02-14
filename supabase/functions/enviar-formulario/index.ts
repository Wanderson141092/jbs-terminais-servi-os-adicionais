import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle save_email action
    if (body.action === "save_email") {
      const { protocolo, email } = body;
      if (!protocolo || !email) {
        return new Response(
          JSON.stringify({ error: "protocolo e email são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { error } = await supabase
        .from("solicitacoes")
        .update({ cliente_email: email })
        .eq("protocolo", protocolo);
      if (error) throw error;
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle form submission
    const { formulario_id, respostas, arquivos, mapeamentos } = body;

    if (!formulario_id || !respostas) {
      return new Response(
        JSON.stringify({ error: "formulario_id e respostas são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Save form response
    const { error: respError } = await supabase.from("formulario_respostas").insert({
      formulario_id,
      respostas,
      arquivos: arquivos && arquivos.length > 0 ? arquivos : null,
    });

    if (respError) throw respError;

    // 2. Build solicitacao data from mapeamentos
    const solicitacaoData: Record<string, any> = {};
    if (mapeamentos && Array.isArray(mapeamentos)) {
      for (const map of mapeamentos) {
        if (respostas[map.pergunta_id] !== undefined) {
          solicitacaoData[map.campo_solicitacao] = respostas[map.pergunta_id];
        }
      }
    }

    // 3. Generate protocol number
    const { data: configData } = await supabase
      .from("protocol_config")
      .select("*")
      .limit(1)
      .single();

    const prefixo = configData?.prefixo || "JBS";
    const nextNum = (configData?.ultimo_numero || 0) + 1;
    const codigoLetra = solicitacaoData.tipo_operacao?.[0]?.toUpperCase() || "S";
    const protocolo = `${prefixo}${codigoLetra}${String(nextNum).padStart(5, "0")}`;

    // 4. Update protocol counter
    if (configData) {
      await supabase
        .from("protocol_config")
        .update({ ultimo_numero: nextNum })
        .eq("id", configData.id);
    }

    // 5. Insert solicitacao
    const { error: solError } = await supabase.from("solicitacoes").insert({
      protocolo,
      cliente_nome: solicitacaoData.cliente_nome || "Cliente via formulário",
      cliente_email: solicitacaoData.cliente_email || "",
      tipo_operacao: solicitacaoData.tipo_operacao || null,
      numero_conteiner: solicitacaoData.numero_conteiner || null,
      cnpj: solicitacaoData.cnpj || null,
      lpco: solicitacaoData.lpco || null,
      observacoes: solicitacaoData.observacoes || null,
      data_posicionamento: solicitacaoData.data_posicionamento || null,
      data_agendamento: solicitacaoData.data_agendamento || null,
      tipo_carga: solicitacaoData.tipo_carga || null,
      categoria: solicitacaoData.categoria || null,
    });

    if (solError) throw solError;

    return new Response(
      JSON.stringify({ protocolo }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
