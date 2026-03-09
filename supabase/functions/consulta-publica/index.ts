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

    // Select ALL fields needed for the external consultation
    const selectFields = `
      id, protocolo, tipo_operacao, numero_conteiner, lpco, 
      chave_consulta, formulario_id, categoria, 
      data_posicionamento, data_agendamento, status, created_at, updated_at,
      status_vistoria, comex_aprovado, armazem_aprovado,
      solicitar_deferimento, solicitar_lacre_armador,
      lacre_armador_possui, lacre_armador_aceite_custo,
      pendencias_selecionadas, cancelamento_solicitado, cancelamento_solicitado_em
    `;

    let solicitacao = null;

    // Search by protocolo
    const { data: byProtocolo } = await supabaseAdmin
      .from("solicitacoes")
      .select(selectFields)
      .eq("protocolo", valorUpper)
      .eq("chave_consulta", chaveUpper)
      .maybeSingle();
    solicitacao = byProtocolo;

    // Search by container
    if (!solicitacao) {
      const { data: byContainer } = await supabaseAdmin
        .from("solicitacoes")
        .select(selectFields)
        .eq("numero_conteiner", valorUpper)
        .eq("chave_consulta", chaveUpper)
        .maybeSingle();
      solicitacao = byContainer;
    }

    // Search by LPCO
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

    // Resolve servico from tipo_operacao
    const { data: servicoData } = await supabaseAdmin
      .from("servicos")
      .select("id, nome, tipo_agendamento, deferimento_status_ativacao, lacre_armador_status_ativacao, aprovacao_administrativo, aprovacao_operacional")
      .eq("nome", solicitacao.tipo_operacao)
      .eq("ativo", true)
      .maybeSingle();

    const servicoId = servicoData?.id || null;

    // Fetch all parallel data
    const [
      deferimentoRes,
      observacoesRes,
      statusLabelsRes,
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

    // Filter status labels by service
    const statusLabels = (statusLabelsRes.data || [])
      .filter((s: any) => !servicoId || s.servico_ids.length === 0 || s.servico_ids.includes(servicoId))
      .map((s: any) => ({
        sigla: s.sigla,
        valor: s.valor,
        ordem: s.ordem,
        tipo_resultado: s.tipo_resultado || null,
      }));

    // Sign deferimento document URLs
    const docsWithSignedUrls = [];
    for (const doc of (deferimentoRes.data || [])) {
      let signedUrl = doc.file_url;
      if (doc.file_url && !doc.file_url.startsWith("http")) {
        const { data: signedData } = await supabaseAdmin.storage
          .from("deferimento")
          .createSignedUrl(doc.file_url, 3600);
        if (signedData) signedUrl = signedData.signedUrl;
      } else if (doc.file_url?.includes("/storage/v1/object/public/deferimento/")) {
        const pathMatch = doc.file_url.split("/storage/v1/object/public/deferimento/");
        if (pathMatch.length === 2) {
          const storagePath = decodeURIComponent(pathMatch[1]);
          const { data: signedData } = await supabaseAdmin.storage
            .from("deferimento")
            .createSignedUrl(storagePath, 3600);
          if (signedData) signedUrl = signedData.signedUrl;
        }
      }
      docsWithSignedUrls.push({ ...doc, file_url: signedUrl });
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

    // Build lacre config
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

    // Sign lacre photo
    let lacreArmadorDados = lacreArmadorDadosRes.data || null;
    if (lacreArmadorDados?.foto_lacre_path) {
      const { data: signedData } = await supabaseAdmin.storage
        .from("deferimento")
        .createSignedUrl(lacreArmadorDados.foto_lacre_path, 3600);
      if (signedData) {
        lacreArmadorDados = { ...lacreArmadorDados, foto_lacre_url: signedData.signedUrl };
      }
    }

    // Resolve deferimento title
    const deferimentoTitulos = (deferimentoTitulosRes.data || []) as any[];
    const tituloForService = deferimentoTitulos.find((t) => !servicoId || !t.servico_ids?.length || t.servico_ids.includes(servicoId));

    // Build sanitized solicitacao - ONLY summary fields for external view
    // Remove sensitive/internal data
    const sanitizedSolicitacao = {
      id: solicitacao.id,
      protocolo: solicitacao.protocolo,
      status: solicitacao.status,
      categoria: solicitacao.categoria,
      numero_conteiner: solicitacao.numero_conteiner,
      data_posicionamento: solicitacao.data_posicionamento,
      data_agendamento: solicitacao.data_agendamento,
      created_at: solicitacao.created_at,
      updated_at: solicitacao.updated_at,
      tipo_operacao: solicitacao.tipo_operacao,
      status_vistoria: solicitacao.status_vistoria,
      lpco: solicitacao.lpco,
      comex_aprovado: solicitacao.comex_aprovado,
      armazem_aprovado: solicitacao.armazem_aprovado,
      solicitar_deferimento: solicitacao.solicitar_deferimento,
      solicitar_lacre_armador: solicitacao.solicitar_lacre_armador,
      lacre_armador_possui: solicitacao.lacre_armador_possui,
      lacre_armador_aceite_custo: solicitacao.lacre_armador_aceite_custo,
      pendencias_selecionadas: solicitacao.pendencias_selecionadas || [],
      cancelamento_solicitado: solicitacao.cancelamento_solicitado,
    };

    return new Response(
      JSON.stringify({
        solicitacao: sanitizedSolicitacao,
        deferimento_titulo: tituloForService?.titulo || null,
        deferimento_docs: docsWithSignedUrls,
        observacoes: (observacoesRes.data || []).filter((o: any) => o.tipo_observacao === "externa"),
        status_labels: statusLabels,
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
        // NEVER send form responses or attachments to external page
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
