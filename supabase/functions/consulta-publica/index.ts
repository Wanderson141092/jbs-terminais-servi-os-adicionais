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

    // Input validation
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

    // Get service name
    const { data: servicoData, error: servicoError } = await supabaseAdmin
      .from("servicos")
      .select("nome")
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

    // Search by protocolo, then container, then lpco
    let solicitacao = null;

    // By protocolo
    const { data: byProtocolo } = await supabaseAdmin
      .from("solicitacoes")
      .select("id, protocolo, status, tipo_operacao, tipo_carga, data_agendamento, data_posicionamento, created_at, updated_at, comex_aprovado, armazem_aprovado, status_vistoria, numero_conteiner, categoria, lancamento_confirmado, lpco, cliente_nome")
      .eq("protocolo", valorUpper)
      .eq("tipo_operacao", tipoOperacao)
      .maybeSingle();

    solicitacao = byProtocolo;

    // By container
    if (!solicitacao) {
      const { data: byContainer } = await supabaseAdmin
        .from("solicitacoes")
        .select("id, protocolo, status, tipo_operacao, tipo_carga, data_agendamento, data_posicionamento, created_at, updated_at, comex_aprovado, armazem_aprovado, status_vistoria, numero_conteiner, categoria, lancamento_confirmado, lpco, cliente_nome")
        .eq("numero_conteiner", valorUpper)
        .eq("tipo_operacao", tipoOperacao)
        .maybeSingle();
      solicitacao = byContainer;
    }

    // By LPCO
    if (!solicitacao) {
      const { data: byLpco } = await supabaseAdmin
        .from("solicitacoes")
        .select("id, protocolo, status, tipo_operacao, tipo_carga, data_agendamento, data_posicionamento, created_at, updated_at, comex_aprovado, armazem_aprovado, status_vistoria, numero_conteiner, categoria, lancamento_confirmado, lpco, cliente_nome")
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

    // Fetch deferimento documents for this solicitacao
    const { data: deferimentoDocs } = await supabaseAdmin
      .from("deferimento_documents")
      .select("id, file_name, file_url, status, motivo_recusa, created_at, document_type")
      .eq("solicitacao_id", solicitacao.id)
      .order("created_at", { ascending: false });

    // Return safe data (excludes: cliente_email, observacoes, justificativas)
    return new Response(
      JSON.stringify({
        solicitacao: solicitacao,
        deferimento_docs: deferimentoDocs || [],
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
