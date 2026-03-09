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
    const { valor, chave } = await req.json();

    if (!valor || typeof valor !== "string" || valor.trim().length < 3 || valor.trim().length > 50) {
      return new Response(
        JSON.stringify({ error: "Valor de busca inválido. Mínimo 3 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!chave || typeof chave !== "string" || chave.trim().length !== 6) {
      return new Response(
        JSON.stringify({ error: "Chave de validação obrigatória (6 caracteres)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chaveUpper = chave.toUpperCase().trim();
    const valorUpper = valor.toUpperCase().trim();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const selectFields = "id, protocolo, tipo_operacao, numero_conteiner, lpco, chave_consulta, formulario_id, categoria, data_posicionamento, data_agendamento, status, created_at";

    let solicitacaoRef = null;

    // By protocolo
    const { data: byProtocolo } = await supabaseAdmin
      .from("solicitacoes")
      .select(selectFields)
      .eq("protocolo", valorUpper)
      .eq("chave_consulta", chaveUpper)
      .maybeSingle();

    solicitacaoRef = byProtocolo;

    // By container
    if (!solicitacaoRef) {
      const { data: byContainer } = await supabaseAdmin
        .from("solicitacoes")
        .select(selectFields)
        .eq("numero_conteiner", valorUpper)
        .eq("chave_consulta", chaveUpper)
        .maybeSingle();
      solicitacaoRef = byContainer;
    }

    // By LPCO
    if (!solicitacaoRef) {
      const { data: byLpco } = await supabaseAdmin
        .from("solicitacoes")
        .select(selectFields)
        .eq("lpco", valorUpper)
        .eq("chave_consulta", chaveUpper)
        .maybeSingle();
      solicitacaoRef = byLpco;
    }

    if (!solicitacaoRef) {
      return new Response(
        JSON.stringify({ solicitacao: null, deferimento_docs: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: snapshotData } = await supabaseAdmin.rpc("get_process_snapshot_safe", {
      p_solicitacao_id: solicitacaoRef.id,
    });

    const snapshot = (snapshotData || {}) as Record<string, any>;
    const snapshotSolicitacao = (snapshot.solicitacao || {}) as Record<string, any>;
    const solicitacao = {
      ...solicitacaoRef,
      ...snapshotSolicitacao,
      pendencias_selecionadas: Array.isArray(snapshotSolicitacao.pendencias_selecionadas)
        ? snapshotSolicitacao.pendencias_selecionadas
        : [],
    };

    // Resolve servico from tipo_operacao to get config
    const { data: servicoData } = await supabaseAdmin
      .from("servicos")
      .select("id, nome, tipo_agendamento, deferimento_status_ativacao, lacre_armador_status_ativacao, aprovacao_administrativo, aprovacao_operacional")
      .eq("nome", solicitacao.tipo_operacao)
      .eq("ativo", true)
      .maybeSingle();

    const servicoId = servicoData?.id || null;

    // Fetch deferimento documents, observations, status labels, field config, dynamic fields, lacre data, external titles, and form responses in parallel
    const formularioId = (solicitacao as any).formulario_id || null;
    const [
      deferimentoRes,
      observacoesRes,
      statusLabelsRes,
      camposFixosRes,
      camposDinamicosRes,
      camposValoresRes,
      etapasConfigRes,
      lacreConfigRes,
      lacreArmadorDadosRes,
      deferimentoTitulosRes,
      formRespostasRes,
      formPerguntasRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("deferimento_documents")
        .select("id, file_name, file_url, status, motivo_recusa, created_at, document_type")
        .eq("solicitacao_id", solicitacao.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("observacao_historico")
        .select("observacao, status_no_momento, created_at, tipo_observacao")
        .eq("solicitacao_id", solicitacao.id)
        .eq("tipo_observacao", "externa")
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("parametros_campos")
        .select("valor, sigla, ordem, servico_ids, tipo_resultado")
        .eq("grupo", "status_processo")
        .eq("ativo", true)
        .order("ordem"),
      supabaseAdmin
        .from("campos_fixos_config")
        .select("campo_chave, campo_label, visivel_externo")
        .eq("ativo", true)
        .eq("visivel_externo", true)
        .order("ordem"),
      supabaseAdmin
        .from("campos_analise")
        .select("id, nome")
        .eq("ativo", true)
        .eq("visivel_externo", true)
        .order("ordem"),
      supabaseAdmin
        .from("campos_analise_valores")
        .select("campo_id, valor, campos_analise(nome, visivel_externo)")
        .eq("solicitacao_id", solicitacao.id),
      supabaseAdmin
        .from("consulta_etapas_config")
        .select("chave, titulo, tipo, grupo, ordem, etapa_equivalente, status_gatilho")
        .eq("ativo", true)
        .order("ordem"),
      supabaseAdmin
        .from("system_config")
        .select("config_key, config_value, is_active")
        .in("config_key", [
          "lacre_armador_mensagem_custo",
          "lacre_armador_tipo_aceite",
          "lacre_armador_titulo_externo",
          "lacre_armador_anexo_ativo",
          "lacre_armador_periodo_manha",
          "lacre_armador_periodo_tarde",
        ]),
      supabaseAdmin
        .from("lacre_armador_dados")
        .select("*")
        .eq("solicitacao_id", solicitacao.id)
        .maybeSingle(),
      supabaseAdmin
        .from("deferimento_titulos")
        .select("titulo, servico_ids, created_at")
        .eq("ativo", true)
        .order("created_at", { ascending: false }),
      formularioId
        ? supabaseAdmin.from("formulario_respostas").select("respostas, arquivos").eq("formulario_id", formularioId).order("created_at", { ascending: false }).limit(5)
        : Promise.resolve({ data: null }),
      formularioId
        ? supabaseAdmin.from("formulario_perguntas").select("pergunta_id, banco_perguntas(id, rotulo, tipo)").eq("formulario_id", formularioId).order("ordem")
        : Promise.resolve({ data: null }),
    ]);

    const deferimentoDocs = deferimentoRes.data;
    // Filter: only show external observations (tipo_observacao = 'externa')
    const observacoes = (observacoesRes.data || []).filter(
      (o: any) => o.tipo_observacao === "externa"
    );

    // Filter status labels by service
    const statusLabels = (statusLabelsRes.data || [])
      .filter((s: any) => !servicoId || s.servico_ids.length === 0 || s.servico_ids.includes(servicoId))
      .map((s: any) => ({
        sigla: s.sigla,
        valor: s.valor,
        ordem: s.ordem,
        tipo_resultado: s.tipo_resultado || null,
      }));

    // Generate signed URLs for each document (private buckets)
    const docsWithSignedUrls = [];
    if (deferimentoDocs) {
      for (const doc of deferimentoDocs) {
        let signedUrl = doc.file_url;
        
        if (doc.file_url && !doc.file_url.startsWith("http")) {
          const { data: signedData } = await supabaseAdmin.storage
            .from("deferimento")
            .createSignedUrl(doc.file_url, 3600);
          if (signedData) {
            signedUrl = signedData.signedUrl;
          }
        } else if (doc.file_url && doc.file_url.includes("/storage/v1/object/public/deferimento/")) {
          const pathMatch = doc.file_url.split("/storage/v1/object/public/deferimento/");
          if (pathMatch.length === 2) {
            const storagePath = decodeURIComponent(pathMatch[1]);
            const { data: signedData } = await supabaseAdmin.storage
              .from("deferimento")
              .createSignedUrl(storagePath, 3600);
            if (signedData) {
              signedUrl = signedData.signedUrl;
            }
          }
        }

        docsWithSignedUrls.push({
          ...doc,
          file_url: signedUrl,
        });
      }
    }

    // Build visible fields config
    const visibleFixedFields = (camposFixosRes.data || []).map((c: any) => c.campo_chave);

    // Fetch affix mappings for dynamic fields
    const { data: mappingsForAffixes } = await supabaseAdmin
      .from("pergunta_mapeamento")
      .select("campo_analise_id, banco_perguntas(config)")
      .not("campo_analise_id", "is", null);

    const affixMap = new Map<string, { prefixo: string; sufixo: string }>();
    for (const m of (mappingsForAffixes || []) as any[]) {
      if (m.campo_analise_id && !affixMap.has(m.campo_analise_id)) {
        const cfg = m.banco_perguntas?.config;
        if (cfg) {
          const pre = String(cfg.prefixo || cfg.mascara?.prefixo || cfg.mask?.prefix || "").trim();
          const suf = String(cfg.sufixo || cfg.mascara?.sufixo || cfg.mask?.suffix || "").trim();
          if (pre || suf) affixMap.set(m.campo_analise_id, { prefixo: pre, sufixo: suf });
        }
      }
    }
    
    const snapshotCamposDinamicos = Array.isArray(snapshot.campos_dinamicos)
      ? snapshot.campos_dinamicos
      : [];
    const dynamicFieldsSource = snapshotCamposDinamicos.length > 0
      ? snapshotCamposDinamicos
      : (camposValoresRes.data || []);

    // Build visible dynamic field values with affixes applied
    const dynamicFieldsForExternal = dynamicFieldsSource
      .filter((cv: any) => (cv.campos_analise?.visivel_externo === true || cv.visivel_externo === true) && cv.valor)
      .map((cv: any) => {
        let valor = cv.valor;
        const aff = affixMap.get(cv.campo_id);
        if (aff && valor) {
          if (aff.prefixo && !valor.startsWith(aff.prefixo)) valor = aff.prefixo + valor;
          if (aff.sufixo && !valor.trimEnd().endsWith(aff.sufixo)) valor = (valor + " " + aff.sufixo).trim();
        }
        return {
          campo_nome: cv.campos_analise?.nome || cv.nome || "Campo",
          valor,
        };
      });

    // Essential fields that MUST always be visible externally
    const essentialFields = new Set([
      "id", "protocolo", "status", "created_at", "updated_at",
      "categoria", "numero_conteiner", "data_posicionamento", "data_agendamento",
      "tipo_operacao", "status_vistoria",
      "comex_aprovado", "armazem_aprovado",
      "solicitar_deferimento", "solicitar_lacre_armador",
      "lacre_armador_possui", "lacre_armador_aceite_custo",
      "pendencias_selecionadas", "cancelamento_solicitado",
    ]);

    const sanitizedSolicitacao: Record<string, any> = {};
    const allFields = { ...solicitacao };
    delete allFields.cliente_nome; // Always hidden externally
    delete allFields.cliente_email;
    delete allFields.cnpj;
    
    for (const [key, value] of Object.entries(allFields)) {
      if (essentialFields.has(key) || visibleFixedFields.includes(key)) {
        sanitizedSolicitacao[key] = value;
      }
    }

    const etapasConfig = (etapasConfigRes.data || []).map((e: any) => ({
      chave: e.chave,
      titulo: e.titulo,
      tipo: e.tipo,
      grupo: e.grupo,
      ordem: e.ordem,
      etapa_equivalente: e.etapa_equivalente,
      status_gatilho: e.status_gatilho || [],
    }));

    // Build lacre config map - respect is_active flag
    const booleanConfigKeys = ["lacre_armador_anexo_ativo", "lacre_armador_periodo_manha", "lacre_armador_periodo_tarde"];
    const lacreConfigMap: Record<string, string> = {};
    (lacreConfigRes.data || []).forEach((c: any) => {
      if (c.is_active === false && booleanConfigKeys.includes(c.config_key)) {
        lacreConfigMap[c.config_key] = "false";
        return;
      }
      if (c.is_active === false) return;
      lacreConfigMap[c.config_key] = c.config_value;
    });

    // Process lacre armador dados - generate signed URL for photo if exists
    let lacreArmadorDados = lacreArmadorDadosRes.data || null;
    if (lacreArmadorDados?.foto_lacre_path) {
      const { data: signedData } = await supabaseAdmin.storage
        .from("deferimento")
        .createSignedUrl(lacreArmadorDados.foto_lacre_path, 3600);
      if (signedData) {
        lacreArmadorDados = { ...lacreArmadorDados, foto_lacre_url: signedData.signedUrl };
      }
    }

    // Resolve deferimento title for this service (fallback: first "global" title)
    const deferimentoTitulos = (deferimentoTitulosRes.data || []) as any[];
    const tituloForService = deferimentoTitulos.find((t) => !servicoId || !t.servico_ids?.length || t.servico_ids.includes(servicoId));
    const deferimentoTitulo = tituloForService?.titulo || null;

    // Build form responses for external display
    const snapshotFormResponses = Array.isArray(snapshot.formulario_respostas)
      ? snapshot.formulario_respostas
      : [];
    const formResponsesSource = snapshotFormResponses.length > 0
      ? snapshotFormResponses
      : (formRespostasRes.data || []);

    let formResponsesExternal: { rotulo: string; valor: any }[] = [];
    if (formResponsesSource.length > 0 && formPerguntasRes.data) {
      const respostasObj = (formResponsesSource[0].respostas || {}) as Record<string, any>;
      for (const fp of formPerguntasRes.data) {
        const bp = (fp as any).banco_perguntas;
        if (!bp) continue;
        if (bp.tipo === "informativo" || bp.tipo === "subtitulo") continue;
        const val = respostasObj[bp.id];
        if (val !== undefined && val !== null && val !== "") {
          formResponsesExternal.push({ rotulo: bp.rotulo, valor: val });
        }
      }
    }

    // Generate signed URLs for form attachments
    let formAttachmentsExternal: { file_name: string; file_url: string }[] = [];
    if (formResponsesSource.length > 0) {
      const arquivos = formResponsesSource[0].arquivos as any[] | null;
      if (arquivos && arquivos.length > 0) {
        for (const arq of arquivos) {
          let signedUrl = arq.file_url;
          let storagePath: string | null = null;

          if (arq.file_url && !arq.file_url.startsWith("http")) {
            storagePath = arq.file_url;
          } else if (arq.file_url) {
            const signMatch = arq.file_url.match(/\/storage\/v1\/object\/(?:sign|public)\/form-uploads\/([^?]+)/);
            if (signMatch) {
              storagePath = decodeURIComponent(signMatch[1]);
            }
          }

          if (storagePath) {
            const { data: signedData } = await supabaseAdmin.storage
              .from("form-uploads")
              .createSignedUrl(storagePath, 3600);
            if (signedData) signedUrl = signedData.signedUrl;
          }
          formAttachmentsExternal.push({ file_name: arq.file_name, file_url: signedUrl });
        }
      }
    }

    return new Response(
      JSON.stringify({
        solicitacao: sanitizedSolicitacao,
        deferimento_titulo: deferimentoTitulo,
        deferimento_docs: docsWithSignedUrls,
        observacoes,
        status_labels: statusLabels,
        campos_dinamicos_externos: dynamicFieldsForExternal,
        campos_visiveis: visibleFixedFields,
        etapas_config: etapasConfig,
        servico_config: servicoData
          ? {
              nome: servicoData.nome,
              tipo_agendamento: servicoData.tipo_agendamento,
              deferimento_status_ativacao: servicoData.deferimento_status_ativacao || [],
              lacre_armador_status_ativacao: (servicoData as any).lacre_armador_status_ativacao || [],
              aprovacao_administrativo: servicoData.aprovacao_administrativo ?? false,
              aprovacao_operacional: servicoData.aprovacao_operacional ?? false,
            }
          : null,
        lacre_armador_config: {
          mensagem_custo: lacreConfigMap["lacre_armador_mensagem_custo"] || "",
          tipo_aceite: lacreConfigMap["lacre_armador_tipo_aceite"] || "informativo",
          titulo_externo: lacreConfigMap["lacre_armador_titulo_externo"] || "Regularização de Lacre Armador",
          anexo_ativo: lacreConfigMap["lacre_armador_anexo_ativo"] !== "false",
          periodo_manha_ativo: lacreConfigMap["lacre_armador_periodo_manha"] !== "false",
          periodo_tarde_ativo: lacreConfigMap["lacre_armador_periodo_tarde"] !== "false",
        },
        lacre_armador_dados: lacreArmadorDados,
        form_respostas: [],
        form_arquivos: [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
