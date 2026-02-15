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
    const { servico_id, valor } = await req.json();

    if (!servico_id || typeof servico_id !== "string") {
      return new Response(
        JSON.stringify({ error: "Serviço inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!valor || typeof valor !== "string" || valor.trim().length < 3 || valor.trim().length > 50) {
      return new Response(
        JSON.stringify({ error: "Valor de busca inválido. Mínimo 3 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: servicoData, error: servicoError } = await supabaseAdmin
      .from("servicos")
      .select("id, nome, tipo_agendamento, deferimento_status_ativacao, aprovacao_administrativo, aprovacao_operacional")
      .eq("id", servico_id)
      .eq("ativo", true)
      .maybeSingle();

    if (servicoError || !servicoData) {
      return new Response(
        JSON.stringify({ error: "Serviço não encontrado." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tipoOperacao = servicoData.nome;
    const valorUpper = valor.toUpperCase().trim();

    const selectFields = "id, protocolo, status, tipo_operacao, tipo_carga, data_agendamento, data_posicionamento, created_at, updated_at, comex_aprovado, armazem_aprovado, status_vistoria, numero_conteiner, categoria, lpco, solicitar_deferimento, pendencias_selecionadas, observacoes";

    let solicitacao = null;

    // By protocolo
    const { data: byProtocolo } = await supabaseAdmin
      .from("solicitacoes")
      .select(selectFields)
      .eq("protocolo", valorUpper)
      .eq("tipo_operacao", tipoOperacao)
      .maybeSingle();

    solicitacao = byProtocolo;

    // By container
    if (!solicitacao) {
      const { data: byContainer } = await supabaseAdmin
        .from("solicitacoes")
        .select(selectFields)
        .eq("numero_conteiner", valorUpper)
        .eq("tipo_operacao", tipoOperacao)
        .maybeSingle();
      solicitacao = byContainer;
    }

    // By LPCO
    if (!solicitacao) {
      const { data: byLpco } = await supabaseAdmin
        .from("solicitacoes")
        .select(selectFields)
        .eq("lpco", valorUpper)
        .eq("tipo_operacao", tipoOperacao)
        .maybeSingle();
      solicitacao = byLpco;
    }

    if (!solicitacao) {
      return new Response(
        JSON.stringify({ solicitacao: null, deferimento_docs: [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch deferimento documents, observations, status labels, field config, and dynamic fields in parallel
    const [deferimentoRes, observacoesRes, statusLabelsRes, camposFixosRes, camposDinamicosRes, camposValoresRes] = await Promise.all([
      supabaseAdmin
        .from("deferimento_documents")
        .select("id, file_name, file_url, status, motivo_recusa, created_at, document_type")
        .eq("solicitacao_id", solicitacao.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("observacao_historico")
        .select("observacao, status_no_momento, created_at")
        .eq("solicitacao_id", solicitacao.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabaseAdmin
        .from("parametros_campos")
        .select("valor, sigla, ordem, servico_ids")
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
    ]);

    const deferimentoDocs = deferimentoRes.data;
    const observacoes = observacoesRes.data || [];

    // Filter status labels by service
    const statusLabels = (statusLabelsRes.data || [])
      .filter((s: any) => s.servico_ids.length === 0 || s.servico_ids.includes(servicoData.id))
      .map((s: any) => ({
        sigla: s.sigla,
        valor: s.valor,
        ordem: s.ordem,
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
          key === "pendencias_selecionadas" || key === "status_vistoria" || key === "categoria" ||
          key === "tipo_operacao" || key === "observacoes" ||
          visibleFixedFields.includes(key)) {
        sanitizedSolicitacao[key] = value;
      }
    }

    return new Response(
      JSON.stringify({
        solicitacao: sanitizedSolicitacao,
        deferimento_docs: docsWithSignedUrls,
        observacoes,
        status_labels: statusLabels,
        campos_dinamicos_externos: dynamicFieldsForExternal,
        campos_visiveis: visibleFixedFields,
        servico_config: {
          tipo_agendamento: servicoData.tipo_agendamento,
          deferimento_status_ativacao: servicoData.deferimento_status_ativacao || [],
          aprovacao_administrativo: servicoData.aprovacao_administrativo ?? false,
          aprovacao_operacional: servicoData.aprovacao_operacional ?? false,
        },
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
