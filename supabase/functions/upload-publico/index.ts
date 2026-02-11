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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const bucket = formData.get("bucket") as string | null;
    const solicitacaoId = formData.get("solicitacao_id") as string | null;
    const formularioId = formData.get("formulario_id") as string | null;
    const documentType = formData.get("document_type") as string || "deferimento";

    // Validate file
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

    // Validate bucket
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

    // For deferimento uploads, validate solicitacao exists
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

      // Upload file
      const fileName = `${solicitacao.protocolo}/${Date.now()}_${file.name}`;
      const fileBuffer = await file.arrayBuffer();
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(fileName, fileBuffer, {
          contentType: file.type,
        });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: "Erro ao fazer upload: " + uploadError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(fileName);

      // Insert deferimento document record
      const { error: dbError } = await supabaseAdmin
        .from("deferimento_documents")
        .insert({
          solicitacao_id: solicitacaoId,
          file_name: file.name,
          file_url: urlData.publicUrl,
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
        JSON.stringify({ success: true, file_url: urlData.publicUrl, file_name: file.name }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For form uploads
    if (bucket === "form-uploads") {
      const prefix = formularioId || "general";
      const fileName = `${prefix}/${Date.now()}_${file.name}`;
      const fileBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(fileName, fileBuffer, {
          contentType: file.type,
        });

      if (uploadError) {
        return new Response(
          JSON.stringify({ error: "Erro ao fazer upload: " + uploadError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return new Response(
        JSON.stringify({ success: true, file_url: urlData.publicUrl, file_name: file.name }),
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
