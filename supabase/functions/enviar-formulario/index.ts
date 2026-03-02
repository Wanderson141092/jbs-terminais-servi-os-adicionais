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
            dynamicFieldValues.push({
              campo_id: map.campo_analise_id,
              valor: String(respostas[map.pergunta_id]),
            });
          } else if (map.campo_solicitacao && map.campo_solicitacao !== "__dinamico__") {
            solicitacaoData[map.campo_solicitacao] = respostas[map.pergunta_id];
          }
        }
      }
    }

    // 3. Resolve service to get prefixo and generate protocol per-service
    const tipoOp = solicitacaoData.tipo_operacao || null;
    let servicoData: any = null;
    let servicoId: string | null = null;
    let codigoLetra = "S";

    if (tipoOp) {
      const { data: svc } = await supabase
        .from("servicos")
        .select("id, codigo_prefixo")
        .eq("nome", tipoOp)
        .eq("ativo", true)
        .maybeSingle();
      servicoData = svc;
      if (svc) {
        servicoId = svc.id;
        // Use first character (letter) of codigo_prefixo
        codigoLetra = (svc.codigo_prefixo || "S")[0].toUpperCase();
      }
    }

    // 4. Generate protocol number — per-service, with annual reset (YY prefix)
    const now = new Date();
    const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentYear = brTime.getFullYear();
    const yearPrefix = String(currentYear).slice(-2); // "25", "26", etc.

    // Try to find existing config for this service+year
    let configQuery = supabase
      .from("protocol_config")
      .select("*");

    if (servicoId) {
      configQuery = configQuery.eq("servico_id", servicoId);
    } else {
      configQuery = configQuery.is("servico_id", null);
    }

    const { data: configRows } = await configQuery;

    let configData = (configRows || []).find((c: any) => c.ano_referencia === currentYear);
    let nextNum: number;

    if (configData) {
      // Existing config for this service+year
      nextNum = (configData.ultimo_numero || 0) + 1;
      await supabase
        .from("protocol_config")
        .update({ ultimo_numero: nextNum, updated_at: new Date().toISOString() })
        .eq("id", configData.id);
    } else {
      // Create new config row for this service+year (or reset annual)
      nextNum = 1;
      const { error: insertErr } = await supabase.from("protocol_config").insert({
        prefixo: codigoLetra,
        ultimo_numero: nextNum,
        servico_id: servicoId,
        ano_referencia: currentYear,
      });
      if (insertErr) {
        // Fallback: maybe another request created it concurrently, try to fetch again
        const { data: retryRows } = await configQuery;
        configData = (retryRows || []).find((c: any) => c.ano_referencia === currentYear);
        if (configData) {
          nextNum = (configData.ultimo_numero || 0) + 1;
          await supabase
            .from("protocol_config")
            .update({ ultimo_numero: nextNum })
            .eq("id", configData.id);
        }
      }
    }

    // Format: YY + Letter + 6-digit sequence (e.g., 25S000001)
    const protocolo = `${yearPrefix}${codigoLetra}${String(nextNum).padStart(6, "0")}`;

    // 5. Check cutoff time (hora_corte) - auto-reject if past cutoff
    let autoRecusado = false;
    if (servicoId) {
      const { data: regraData } = await supabase
        .from("regras_servico")
        .select("hora_corte, dias_semana, aplica_dia_anterior, recusar_apos_corte, usar_horario_por_dia, horarios_por_dia")
        .eq("servico_id", servicoId)
        .eq("ativo", true)
        .maybeSingle();

      if (regraData) {
        const currentHour = brTime.getHours();
        const currentMinute = brTime.getMinutes();
        const currentMinutes = currentHour * 60 + currentMinute;

        // Determine which cutoff time to use
        let cutoffTime = regraData.hora_corte;

        if (regraData.usar_horario_por_dia && regraData.horarios_por_dia) {
          const dayMap: Record<number, string> = { 0: "dom", 1: "seg", 2: "ter", 3: "qua", 4: "qui", 5: "sex", 6: "sab" };
          const currentDayKey = dayMap[brTime.getDay()];
          const horariosDia = regraData.horarios_por_dia as Record<string, string>;
          if (horariosDia[currentDayKey]) {
            cutoffTime = horariosDia[currentDayKey];
          }
        }

        if (cutoffTime) {
          const [cutHour, cutMinute] = cutoffTime.split(":").map(Number);
          const cutoffMinutes = cutHour * 60 + cutMinute;

          if (regraData.aplica_dia_anterior) {
            // When aplica_dia_anterior is true: check if the scheduled date is tomorrow or earlier
            // AND the current time is past the cutoff
            const dataPosStr = solicitacaoData.data_posicionamento || solicitacaoData.data_agendamento;
            if (dataPosStr && currentMinutes >= cutoffMinutes) {
              const dataPos = new Date(dataPosStr + "T00:00:00");
              const tomorrow = new Date(brTime);
              tomorrow.setDate(tomorrow.getDate() + 1);
              tomorrow.setHours(0, 0, 0, 0);
              if (dataPos <= tomorrow) {
                autoRecusado = regraData.recusar_apos_corte === true;
              }
            }
          } else {
            // When aplica_dia_anterior is false: simply check if current time >= cutoff
            if (currentMinutes >= cutoffMinutes) {
              autoRecusado = regraData.recusar_apos_corte === true;
            }
          }
        }
      }
    }

    // 6. Insert solicitacao
    const { error: solError } = await supabase.from("solicitacoes").insert({
      protocolo,
      cliente_nome: solicitacaoData.cliente_nome || "Cliente via formulário",
      cliente_email: solicitacaoData.cliente_email || "nao-informado@formulario.local",
      tipo_operacao: solicitacaoData.tipo_operacao || null,
      numero_conteiner: solicitacaoData.numero_conteiner || null,
      cnpj: solicitacaoData.cnpj || null,
      lpco: solicitacaoData.lpco || null,
      observacoes: autoRecusado
        ? `${solicitacaoData.observacoes || ""}\n[RECUSADO AUTOMATICAMENTE - Pedido realizado após o horário de corte]`.trim()
        : (solicitacaoData.observacoes || null),
      data_posicionamento: solicitacaoData.data_posicionamento || null,
      data_agendamento: solicitacaoData.data_agendamento || null,
      tipo_carga: solicitacaoData.tipo_carga || null,
      categoria: solicitacaoData.categoria || null,
      status: autoRecusado ? "recusado" : "aguardando_confirmacao",
    });

    if (solError) throw solError;

    // Get the created solicitation id
    const { data: solData } = await supabase
      .from("solicitacoes")
      .select("id, chave_consulta")
      .eq("protocolo", protocolo)
      .single();

    // 7. Save dynamic field values
    if (dynamicFieldValues.length > 0 && solData) {
      const inserts = dynamicFieldValues.map((dv) => ({
        solicitacao_id: solData.id,
        campo_id: dv.campo_id,
        valor: dv.valor,
      }));
      await supabase.from("campos_analise_valores").insert(inserts);
    }

    // 8. Trigger notifications
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
          novo_status: autoRecusado ? "recusado" : "aguardando_confirmacao",
          usuario_id: "00000000-0000-0000-0000-000000000000",
        }),
      }).catch((err) => console.error("Error triggering notification:", err));
    }

    return new Response(
      JSON.stringify({
        protocolo,
        chave_consulta: solData?.chave_consulta || "",
        auto_recusado: autoRecusado,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
