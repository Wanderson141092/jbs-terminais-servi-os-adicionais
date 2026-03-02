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

    const selectFields = "id, protocolo, status, tipo_operacao, tipo_carga, data_agendamento, data_posicionamento, created_at, updated_at, comex_aprovado, armazem_aprovado, status_vistoria, numero_conteiner, categoria, lpco, solicitar_deferimento, solicitar_lacre_armador, lacre_armador_possui, lacre_armador_aceite_custo, pendencias_selecionadas";

    let solicitacao = null;

    // By protocolo
    const { data: byProtocolo } = await supabaseAdmin
      .from("solicitacoes")
      .select(selectFields)
      .eq("protocolo", valorUpper)
      .eq("chave_consulta", chaveUpper)
      .maybeSingle();

    solicitacao = byProtocolo;

    // By container
    if (!solicitacao) {
      const { data: byContainer } = await supabaseAdmin
        .from("solicitacoes")
        .select(selectFields)
        .eq("numero_conteiner", valorUpper)
        .eq("chave_consulta", chaveUpper)
        .maybeSingle();
      solicitacao = byContainer;
    }

    // By LPCO
    if (!solicitacao) {
      const { data: byLpco } = await supabaseAdmin
        .from("solicitacoes")
        .select(selectFields)
        .eq("lpco", valorUpper)
        .eq("chave_consulta", chaveUpper)
        .maybeSingle();
      solicitacao = byLpco;
    }

    if (!solicitacao) {
      return new Response(
        JSON.stringify({ solicitacao: null, deferimento_docs: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve servico from tipo_operacao to get config
    const { data: servicoData } = await supabaseAdmin
      .from("servicos")
      .select("id, nome, tipo_agendamento, deferimento_status_ativacao, lacre_armador_status_ativacao, aprovacao_administrativo, aprovacao_operacional")
      .eq("nome", solicitacao.tipo_operacao)
      .eq("ativo", true)
      .maybeSingle();

    const servicoId = servicoData?.id || null;

    // Fetch deferimento documents, observations, status labels, field config, dynamic fields, lacre data and external titles in parallel
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
    
    // Build visible dynamic field values
    const dynamicFieldsForExternal = (camposValoresRes.data || [])
      .filter((cv: any) => cv.campos_analise?.visivel_externo === true && cv.valor)
      .map((cv: any) => ({
        campo_nome: cv.campos_analise?.nome || "Campo",
        valor: cv.valor,
      }));

    // Sanitize: remove client name for privacy, and filter fields based on config
    const sanitizedSolicitacao: Record<string, any> = {};
    const allFields = { ...solicitacao };
    delete allFields.cliente_nome; // Always hidden externally
    
    for (const [key, value] of Object.entries(allFields)) {
      if (key === "id" || key === "status" || key === "created_at" || key === "updated_at" || 
          key === "comex_aprovado" || key === "armazem_aprovado" || key === "solicitar_deferimento" ||
          key === "solicitar_lacre_armador" || key === "lacre_armador_possui" || key === "lacre_armador_aceite_custo" ||
          key === "pendencias_selecionadas" || key === "status_vistoria" || key === "categoria" ||
          key === "tipo_operacao" ||
          visibleFixedFields.includes(key)) {
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
