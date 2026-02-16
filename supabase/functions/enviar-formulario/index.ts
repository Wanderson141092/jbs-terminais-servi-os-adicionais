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

    // (supabase client already created above)

    // 1. Save form response
    const { error: respError } = await supabase.from("formulario_respostas").insert({
      formulario_id,
      respostas,
      arquivos: arquivos && arquivos.length > 0 ? arquivos : null,
    });

    if (respError) throw respError;

    // 2. Build solicitacao data from mapeamentos + collect dynamic field mappings
    const solicitacaoData: Record<string, any> = {};
    const dynamicFieldValues: { campo_id: string; valor: string }[] = [];

    if (mapeamentos && Array.isArray(mapeamentos)) {
      for (const map of mapeamentos) {
        if (respostas[map.pergunta_id] !== undefined) {
          if (map.campo_analise_id) {
            // Dynamic field mapping
            dynamicFieldValues.push({
              campo_id: map.campo_analise_id,
              valor: String(respostas[map.pergunta_id]),
            });
          } else if (map.campo_solicitacao && map.campo_solicitacao !== "__dinamico__") {
            // Fixed field mapping
            solicitacaoData[map.campo_solicitacao] = respostas[map.pergunta_id];
          }
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

    // 5. Generate unique validation key (6 chars alphanumeric = 2.17B combinations)
    const generateChaveConsulta = (): string => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let key = "";
      const array = new Uint8Array(6);
      crypto.getRandomValues(array);
      for (let i = 0; i < 6; i++) {
        key += chars[array[i] % chars.length];
      }
      return key;
    };
    const chaveConsulta = generateChaveConsulta();

    // 6. Insert solicitacao
    const { error: solError } = await supabase.from("solicitacoes").insert({
      protocolo,
      chave_consulta: chaveConsulta,
      cliente_nome: solicitacaoData.cliente_nome || "Cliente via formulário",
      cliente_email: solicitacaoData.cliente_email || "nao-informado@formulario.local",
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

    // Get the created solicitation id for dynamic fields and notifications
    const { data: solData } = await supabase
      .from("solicitacoes")
      .select("id")
      .eq("protocolo", protocolo)
      .single();

    // 6. Save dynamic field values
    if (dynamicFieldValues.length > 0 && solData) {
      const inserts = dynamicFieldValues.map((dv) => ({
        solicitacao_id: solData.id,
        campo_id: dv.campo_id,
        valor: dv.valor,
      }));
      await supabase.from("campos_analise_valores").insert(inserts);
    }

    // 7. Trigger notifications for the new solicitation (aguardando_confirmacao)
    if (solData) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      fetch(`${supabaseUrl}/functions/v1/notificar-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          solicitacao_id: solData.id,
          novo_status: "aguardando_confirmacao",
          usuario_id: "00000000-0000-0000-0000-000000000000", // system user
        }),
      }).catch((err) => console.error("Error triggering notification:", err));
    }

    return new Response(
      JSON.stringify({ protocolo, chave_consulta: chaveConsulta }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
