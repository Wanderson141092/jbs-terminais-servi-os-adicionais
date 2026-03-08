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

    // 1. Fetch formulario to get linked servico_id
    const { data: formularioData, error: formularioError } = await supabase
      .from("formularios")
      .select("id, servico_id")
      .eq("id", formulario_id)
      .maybeSingle();

    if (formularioError) throw formularioError;
    if (!formularioData) {
      return new Response(
        JSON.stringify({ error: "Formulário não encontrado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!formularioData.servico_id) {
      return new Response(
        JSON.stringify({ error: "Este formulário não possui serviço vinculado e não pode receber envios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formularioServicoId = formularioData.servico_id;

    // 2. Save form response
    const { error: respError } = await supabase.from("formulario_respostas").insert({
      formulario_id,
      respostas: normalizedRespostas,
      arquivos: arquivos && arquivos.length > 0 ? arquivos : null,
    });

    if (respError) throw respError;

    // 3. Build solicitacao data from mapeamentos + collect dynamic field mappings
    const solicitacaoData: Record<string, any> = {};
    const dynamicFieldValues: { campo_id: string; valor: string }[] = [];

    const { data: camposFixosRows } = await supabase
      .from("campos_fixos_config")
      .select("id, campo_chave");

    const campoChaveById = new Map<string, string>(
      (camposFixosRows || []).map((campo: any) => [campo.id, campo.campo_chave])
    );

    // Helper: normalize a single response value
    const normalizeVal = (rawVal: unknown): string => {
      if (rawVal === true || String(rawVal).toLowerCase() === "true") return "Sim";
      if (rawVal === false || String(rawVal).toLowerCase() === "false") return "Não";
      if (Array.isArray(rawVal)) return rawVal.filter((v: any) => v !== "" && v != null).join("\n");
      const s = String(rawVal);
      // Detect stringified JSON arrays
      if (s.startsWith("[") && s.endsWith("]")) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) return parsed.filter((v: any) => v !== "" && v != null).join("\n");
        } catch { /* noop */ }
      }
      return s;
    };

    // Pre-normalize all respostas before persisting
    const normalizedRespostas: Record<string, any> = {};
    for (const [key, val] of Object.entries(respostas)) {
      if (val === null || val === undefined) { normalizedRespostas[key] = val; continue; }
      if (typeof val === "object" && !Array.isArray(val)) { normalizedRespostas[key] = val; continue; }
      normalizedRespostas[key] = normalizeVal(val);
    }

    if (mapeamentos && Array.isArray(mapeamentos)) {
      for (const map of mapeamentos) {
        if (normalizedRespostas[map.pergunta_id] !== undefined && normalizedRespostas[map.pergunta_id] !== null) {
          const formattedVal = typeof normalizedRespostas[map.pergunta_id] === "object"
            ? JSON.stringify(normalizedRespostas[map.pergunta_id])
            : String(normalizedRespostas[map.pergunta_id]);

          if (map.campo_analise_id) {
            dynamicFieldValues.push({
              campo_id: map.campo_analise_id,
              valor: formattedVal,
            });
          } else if (map.campo_solicitacao && map.campo_solicitacao !== "__dinamico__") {
            let campoDestino = map.campo_solicitacao;
            if (campoDestino.startsWith("fixo:")) {
              const [, campoFixoId, campoChaveFallback] = campoDestino.split(":");
              campoDestino = campoChaveById.get(campoFixoId) || campoChaveFallback || campoDestino;
            }
            solicitacaoData[campoDestino] = formattedVal;
          }
        }
      }
    }

    // 4. Resolve service from formulário
    const servicoId: string = formularioServicoId;
    let codigoLetra = "S";
    let servicoNome: string | null = null;

    // Fetch service details from linked servico_id
    const { data: svc } = await supabase
      .from("servicos")
      .select("id, nome, codigo_prefixo, ativo")
      .eq("id", servicoId)
      .maybeSingle();

    if (!svc || !svc.ativo) {
      return new Response(
        JSON.stringify({ error: "O serviço vinculado a este formulário é inválido ou está inativo." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    codigoLetra = (svc.codigo_prefixo || "S")[0].toUpperCase();
    servicoNome = svc.nome;
    // Auto-set tipo_operacao if not mapped
    if (!solicitacaoData.tipo_operacao) {
      solicitacaoData.tipo_operacao = svc.nome;
    }

    // 5. Generate protocol number — per-service, with annual reset (YY prefix)
    const now = new Date();
    const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentYear = brTime.getFullYear();
    const yearPrefix = String(currentYear).slice(-2);

    const configQuery = supabase.from("protocol_config").select("*").eq("servico_id", servicoId);

    const { data: configRows } = await configQuery;
    let configData = (configRows || []).find((c: any) => c.ano_referencia === currentYear);
    let nextNum: number;

    if (configData) {
      nextNum = (configData.ultimo_numero || 0) + 1;
      await supabase
        .from("protocol_config")
        .update({ ultimo_numero: nextNum, updated_at: new Date().toISOString() })
        .eq("id", configData.id);
    } else {
      nextNum = 1;
      const { error: insertErr } = await supabase.from("protocol_config").insert({
        prefixo: codigoLetra,
        ultimo_numero: nextNum,
        servico_id: servicoId,
        ano_referencia: currentYear,
      });
      if (insertErr) {
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

    const protocolo = `JBS${codigoLetra}${yearPrefix}${String(nextNum).padStart(6, "0")}`;

    // 6. Check cutoff time (hora_corte) - auto-reject if past cutoff
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
            if (currentMinutes >= cutoffMinutes) {
              autoRecusado = regraData.recusar_apos_corte === true;
            }
          }
        }
      }
    }

    // 7. Determine initial status based on service type
    const tipoOperacao = solicitacaoData.tipo_operacao || servicoNome || null;
    const isPosicionamento = tipoOperacao && tipoOperacao.toLowerCase().includes("posicionamento");

    let initialStatus: string;
    if (autoRecusado) {
      initialStatus = "recusado";
    } else if (isPosicionamento) {
      initialStatus = "aguardando_confirmacao";
    } else {
      initialStatus = "confirmado_aguardando_servico";
    }

    const observacoesLimpas = solicitacaoData.observacoes?.trim() || null;

    // 8. Insert solicitacao (with formulario_id link)
    const { error: solError } = await supabase.from("solicitacoes").insert({
      protocolo,
      formulario_id: formulario_id,
      cliente_nome: solicitacaoData.cliente_nome || "Cliente via formulário",
      cliente_email: solicitacaoData.cliente_email || "nao-informado@formulario.local",
      tipo_operacao: tipoOperacao,
      numero_conteiner: solicitacaoData.numero_conteiner || null,
      cnpj: solicitacaoData.cnpj || null,
      lpco: solicitacaoData.lpco || null,
      observacoes: observacoesLimpas,
      data_posicionamento: solicitacaoData.data_posicionamento || null,
      data_agendamento: solicitacaoData.data_agendamento || null,
      tipo_carga: solicitacaoData.tipo_carga || null,
      categoria: solicitacaoData.categoria || null,
      status: initialStatus,
    });

    if (solError) throw solError;

    // Get the created solicitation id
    const { data: solData } = await supabase
      .from("solicitacoes")
      .select("id, chave_consulta")
      .eq("protocolo", protocolo)
      .single();

    // 9. Save dynamic field values
    if (dynamicFieldValues.length > 0 && solData) {
      const inserts = dynamicFieldValues.map((dv) => ({
        solicitacao_id: solData.id,
        campo_id: dv.campo_id,
        valor: dv.valor,
      }));
      await supabase.from("campos_analise_valores").insert(inserts);
    }

    if (autoRecusado && solData) {
      await supabase.from("observacao_historico").insert({
        solicitacao_id: solData.id,
        observacao: "Pedido recusado automaticamente por envio após o horário de corte.",
        status_no_momento: initialStatus,
        autor_id: "00000000-0000-0000-0000-000000000000",
        autor_nome: "Sistema",
        tipo_observacao: "sistema_auto_recusa_corte",
      });
    }

    // 10. Trigger notifications
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
          novo_status: initialStatus,
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
