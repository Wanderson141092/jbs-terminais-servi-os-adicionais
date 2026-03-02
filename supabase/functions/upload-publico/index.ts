import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle JSON requests
    if (contentType.includes("application/json")) {
      const body = await req.json();

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Submit lacre armador form data
      if (body.action === "submit_lacre_form") {
        const {
          solicitacao_id,
          lacre_coletado,
          data_posicionamento_lacre,
          periodo_lacre,
          responsavel_nome,
          responsavel_telefone,
          responsavel_email,
        } = body;

        if (!solicitacao_id) {
          return new Response(
            JSON.stringify({ error: "Solicitação não informada." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Check if record already exists
        const { data: existing } = await supabaseAdmin
          .from("lacre_armador_dados")
          .select("id")
          .eq("solicitacao_id", solicitacao_id)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error } = await supabaseAdmin
            .from("lacre_armador_dados")
            .update({
              lacre_coletado: lacre_coletado ?? null,
              data_posicionamento_lacre: data_posicionamento_lacre || null,
              periodo_lacre: periodo_lacre || null,
              responsavel_nome: responsavel_nome || null,
              responsavel_telefone: responsavel_telefone || null,
              responsavel_email: responsavel_email || null,
              lacre_status: "aguardando_confirmacao",
              motivo_recusa: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) {
            console.error("Error updating lacre data:", error);
            return new Response(
              JSON.stringify({ error: "Erro ao atualizar dados do lacre." }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          // Insert new
          const { error } = await supabaseAdmin
            .from("lacre_armador_dados")
            .insert({
              solicitacao_id,
              lacre_coletado: lacre_coletado ?? null,
              data_posicionamento_lacre: data_posicionamento_lacre || null,
              periodo_lacre: periodo_lacre || null,
              responsavel_nome: responsavel_nome || null,
              responsavel_telefone: responsavel_telefone || null,
              responsavel_email: responsavel_email || null,
              lacre_status: "aguardando_confirmacao",
            });

          if (error) {
            console.error("Error inserting lacre data:", error);
            return new Response(
              JSON.stringify({ error: "Erro ao salvar dados do lacre." }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // External cancellation request
      if (body.action === "cancelar_solicitacao") {
        const { solicitacao_id } = body;
        if (!solicitacao_id) {
          return new Response(
            JSON.stringify({ error: "Solicitação não informada." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Fetch current solicitation
        const { data: sol, error: solErr } = await supabaseAdmin
          .from("solicitacoes")
          .select("id, status, tipo_operacao, protocolo, cancelamento_solicitado")
          .eq("id", solicitacao_id)
          .maybeSingle();

        if (solErr || !sol) {
          return new Response(
            JSON.stringify({ error: "Solicitação não encontrada." }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const cancellableStatuses = ["aguardando_confirmacao", "confirmado_aguardando_vistoria"];
        if (!cancellableStatuses.includes(sol.status)) {
          return new Response(
            JSON.stringify({ error: "Esta solicitação não pode ser cancelada no status atual." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Early cancellation (before confirmation) → cancel directly
        if (sol.status === "aguardando_confirmacao") {
          const { error: updateErr } = await supabaseAdmin
            .from("solicitacoes")
            .update({ status: "cancelado", updated_at: new Date().toISOString() })
            .eq("id", solicitacao_id);

          if (updateErr) {
            return new Response(
              JSON.stringify({ error: "Erro ao cancelar solicitação." }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Notify sectors
          try {
            await supabaseAdmin.functions.invoke("notificar-status", {
              body: { solicitacao_id, novo_status: "cancelado", origem: "cliente" },
            });
          } catch (_) { /* notification failure is non-blocking */ }

          return new Response(
            JSON.stringify({ success: true, message: "Solicitação cancelada com sucesso." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Late cancellation (post-confirmation) → set pending flag, internal team must confirm
        if (sol.status === "confirmado_aguardando_vistoria") {
          // Check if cancellation already requested
          if (sol.cancelamento_solicitado) {
            return new Response(
              JSON.stringify({ error: "Cancelamento já foi solicitado para esta solicitação. Aguarde a análise da equipe." }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          const { error: updateErr } = await supabaseAdmin
            .from("solicitacoes")
            .update({ 
              cancelamento_solicitado: true, 
              cancelamento_solicitado_em: new Date().toISOString(),
              updated_at: new Date().toISOString() 
            })
            .eq("id", solicitacao_id);

          if (updateErr) {
            return new Response(
              JSON.stringify({ error: "Erro ao solicitar cancelamento." }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          // Create internal notifications for all users linked to this service's sectors
          try {
            const servicoNome = sol.tipo_operacao || "Serviço";
            const { data: servicoData } = await supabaseAdmin
              .from("servicos")
              .select("id")
              .eq("nome", servicoNome)
              .eq("ativo", true)
              .maybeSingle();

            if (servicoData) {
              // Get sectors linked to this service
              const { data: setorServicos } = await supabaseAdmin
                .from("setor_servicos")
                .select("setor_email_id")
                .eq("servico_id", servicoData.id);

              if (setorServicos && setorServicos.length > 0) {
                const setorIds = setorServicos.map((ss: any) => ss.setor_email_id);
                const { data: setorEmails } = await supabaseAdmin
                  .from("setor_emails")
                  .select("email_setor")
                  .in("id", setorIds);

                if (setorEmails && setorEmails.length > 0) {
                  const emails = setorEmails.map((se: any) => se.email_setor);
                  const { data: profiles } = await supabaseAdmin
                    .from("profiles")
                    .select("id")
                    .in("email_setor", emails);

                  if (profiles && profiles.length > 0) {
                    const notifications = profiles.map((p: any) => ({
                      usuario_id: p.id,
                      solicitacao_id,
                      mensagem: `⚠️ Cancelamento solicitado pelo cliente para ${sol.protocolo} (${servicoNome}). Requer análise e confirmação.`,
                      tipo: "cancelamento_pendente",
                    }));

                    await supabaseAdmin.from("notifications").insert(notifications);
                  }
                }
              }
            }
          } catch (_) { /* notification failure is non-blocking */ }

          return new Response(
            JSON.stringify({ success: true, message: "Solicitação de cancelamento registrada. A equipe avaliará possíveis custos operacionais antes da efetivação." }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Upload lacre photo (JSON with base64 - NOT USED, photo goes via FormData)
      if (body.action === "update_lacre_info") {
        const { solicitacao_id, lacre_armador_possui, data_posicionamento } = body;
        if (!solicitacao_id) {
          return new Response(
            JSON.stringify({ error: "Solicitação não informada." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const updateData: Record<string, any> = {
          lacre_armador_possui: lacre_armador_possui ?? null,
          updated_at: new Date().toISOString(),
        };
        if (data_posicionamento) {
          updateData.data_posicionamento = data_posicionamento;
        }
        const { error } = await supabaseAdmin
          .from("solicitacoes")
          .update(updateData)
          .eq("id", solicitacao_id);
        if (error) {
          return new Response(
            JSON.stringify({ error: "Erro ao atualizar informações do lacre." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Aceite de custo do lacre armador
      if (body.action === "aceite_custo_lacre") {
        const { solicitacao_id } = body;
        if (!solicitacao_id) {
          return new Response(
            JSON.stringify({ error: "Solicitação não informada." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const { error } = await supabaseAdmin
          .from("solicitacoes")
          .update({ lacre_armador_aceite_custo: true, updated_at: new Date().toISOString() })
          .eq("id", solicitacao_id);
        if (error) {
          return new Response(
            JSON.stringify({ error: "Erro ao registrar aceite." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Ação não reconhecida." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = formData.get("bucket") as string | null;
    const solicitacaoId = formData.get("solicitacao_id") as string | null;
    const formularioId = formData.get("formulario_id") as string | null;
    const documentType = formData.get("document_type") as string || "deferimento";

    if (!file) {
      return new Response(
        JSON.stringify({ error: "Arquivo não enviado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Tipo de arquivo não permitido. Use PDF, JPG, PNG ou DOC." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: "Arquivo muito grande. Máximo 10MB." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedBuckets = ["deferimento", "form-uploads"];
    if (!bucket || !allowedBuckets.includes(bucket)) {
      return new Response(
        JSON.stringify({ error: "Bucket inválido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);

    // For deferimento uploads (including lacre photo)
    if (bucket === "deferimento" && solicitacaoId) {
      const { data: solicitacao } = await supabaseAdmin
        .from("solicitacoes")
        .select("id, protocolo")
        .eq("id", solicitacaoId)
        .maybeSingle();

      if (!solicitacao) {
        return new Response(
          JSON.stringify({ error: "Solicitação não encontrada." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const storagePath = `${solicitacao.protocolo}/${Date.now()}_${safeName}`;
      const fileBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(storagePath, fileBuffer, { contentType: file.type });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return new Response(
          JSON.stringify({ error: "Erro ao fazer upload. Tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: signedData, error: signError } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600);

      if (signError) {
        return new Response(
          JSON.stringify({ error: "Erro ao gerar URL do arquivo." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If this is a lacre photo, update lacre_armador_dados
      if (documentType === "lacre_foto") {
        const { data: lacreData } = await supabaseAdmin
          .from("lacre_armador_dados")
          .select("id")
          .eq("solicitacao_id", solicitacaoId)
          .maybeSingle();

        if (lacreData) {
          await supabaseAdmin
            .from("lacre_armador_dados")
            .update({
              foto_lacre_url: signedData.signedUrl,
              foto_lacre_path: storagePath,
              updated_at: new Date().toISOString(),
            })
            .eq("id", lacreData.id);
        }

        return new Response(
          JSON.stringify({ success: true, file_url: signedData.signedUrl, storage_path: storagePath }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Standard deferimento document
      const { error: dbError } = await supabaseAdmin
        .from("deferimento_documents")
        .insert({
          solicitacao_id: solicitacaoId,
          file_name: file.name,
          file_url: storagePath,
          document_type: documentType,
          status: "pendente",
        });

      if (dbError) {
        return new Response(
          JSON.stringify({ error: "Erro ao registrar documento." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, file_url: signedData.signedUrl, file_name: file.name }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For form uploads
    if (bucket === "form-uploads") {
      const prefix = formularioId || "general";
      const storagePath = `${prefix}/${Date.now()}_${safeName}`;
      const fileBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(storagePath, fileBuffer, { contentType: file.type });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        return new Response(
          JSON.stringify({ error: "Erro ao fazer upload. Tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: signedData, error: signError } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600);

      if (signError) {
        return new Response(
          JSON.stringify({ error: "Erro ao gerar URL do arquivo." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, file_url: signedData.signedUrl, file_name: file.name, storage_path: storagePath }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Operação inválida." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
