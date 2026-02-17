import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FormRendererLoading from "@/components/form-renderer/FormRendererLoading";
import FormRendererNotFound from "@/components/form-renderer/FormRendererNotFound";
import FormRendererSuccess from "@/components/form-renderer/FormRendererSuccess";
import FormRendererBody from "@/components/form-renderer/FormRendererBody";
import FormRendererHeader from "@/components/form-renderer/FormRendererHeader";
import { getStyleClasses } from "@/components/form-renderer/formStyles";
import type { Formulario, PerguntaComCondicao, FormRendererProps } from "@/components/form-renderer/types";

const FormRenderer = ({ formularioId, onSuccess }: FormRendererProps) => {
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [perguntas, setPerguntas] = useState<PerguntaComCondicao[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, { file: File; url: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [protocolo, setProtocolo] = useState("");
  const [chaveConsulta, setChaveConsulta] = useState("");
  const [emailParaNotificacao, setEmailParaNotificacao] = useState("");
  const [emailSalvo, setEmailSalvo] = useState(false);
  const [mapeamentos, setMapeamentos] = useState<{ pergunta_id: string; campo_solicitacao: string; campo_analise_id?: string | null }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch form, questions (from banco_perguntas via formulario_perguntas), and conditionals
      const [formRes, perguntasRes, condicionaisRes, mapeamentoRes] = await Promise.all([
        supabase.from("formularios").select("id, titulo, descricao, estilo").eq("id", formularioId).single(),
        supabase.from("formulario_perguntas")
          .select("id, ordem, obrigatorio, pergunta_id, banco_perguntas(id, tipo, rotulo, placeholder, opcoes, config, descricao)")
          .eq("formulario_id", formularioId)
          .order("ordem"),
        supabase.from("pergunta_condicionais")
          .select("*")
          .eq("formulario_id", formularioId),
        supabase.from("pergunta_mapeamento")
          .select("pergunta_id, campo_solicitacao, campo_analise_id")
          .eq("formulario_id", formularioId),
      ]);

      if (formRes.data) setFormulario(formRes.data);
      if (mapeamentoRes.data) setMapeamentos(mapeamentoRes.data);

      // Build questions with conditional info
      if (perguntasRes.data) {
        const condicionais = condicionaisRes.data || [];
        const built: PerguntaComCondicao[] = perguntasRes.data
          .filter((fp: any) => fp.banco_perguntas)
          .map((fp: any) => {
            const bp = fp.banco_perguntas;
            // Find if this question has a parent condition
            const condicao = condicionais.find((c: any) => c.pergunta_id === bp.id);
            return {
              id: bp.id,
              tipo: bp.tipo,
              rotulo: bp.rotulo,
              placeholder: bp.placeholder,
              opcoes: bp.opcoes,
              config: bp.config,
              descricao: bp.descricao,
              obrigatorio: fp.obrigatorio,
              ordem: fp.ordem,
              condicao: condicao ? {
                pergunta_pai_id: condicao.pergunta_pai_id,
                valor_gatilho: condicao.valor_gatilho,
                operador: condicao.operador,
              } : null,
            };
          });
        setPerguntas(built);
      }

      setLoading(false);
    };
    fetchData();
  }, [formularioId]);

  const isFieldVisible = (pergunta: PerguntaComCondicao): boolean => {
    if (!pergunta.condicao) return true;
    const { pergunta_pai_id, valor_gatilho, operador } = pergunta.condicao;
    const currentValue = values[pergunta_pai_id];
    if (currentValue === undefined || currentValue === null || currentValue === "") return false;

    switch (operador) {
      case "igual":
        return String(currentValue) === valor_gatilho;
      case "diferente":
        return String(currentValue) !== valor_gatilho;
      case "contem":
        return String(currentValue).toLowerCase().includes(valor_gatilho.toLowerCase());
      default:
        return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const visiblePerguntas = perguntas.filter(isFieldVisible);
    for (const p of visiblePerguntas) {
      if (p.obrigatorio) {
        // Skip informativo type from validation (unless it has aceite)
        if (p.tipo === "informativo") {
          const cfg = p.config as any;
          if (cfg?.aceite && !values[p.id]) {
            toast.error(`Você precisa aceitar o campo "${p.rotulo}"`);
            return;
          }
          continue;
        }
        if (p.tipo === "resposta_conjunta") {
          const obj = values[p.id] as Record<string, any> | undefined;
          if (!obj || !obj.campo1 || !obj.campo2) {
            toast.error(`Preencha ambos os campos de "${p.rotulo}"`);
            return;
          }
          continue;
        }
        if (p.tipo === "pergunta_condicional") {
          const cfg = p.config as any;
          if (cfg?.subperguntas) {
            // Check if any sub-question is active
            const activeSub = (cfg.subperguntas as any[]).find((sp: any) => {
              if (!sp.condicao) return false;
              const parentPergunta = visiblePerguntas.find((pp) => pp.rotulo === sp.condicao.pergunta_rotulo);
              if (!parentPergunta) return false;
              const parentValue = values[parentPergunta.id];
              if (parentValue === undefined || parentValue === null || parentValue === "") return false;
              switch (sp.condicao.operador) {
                case "igual": return String(parentValue) === sp.condicao.valor_gatilho;
                case "diferente": return String(parentValue) !== sp.condicao.valor_gatilho;
                case "contem": return String(parentValue).toLowerCase().includes(sp.condicao.valor_gatilho.toLowerCase());
                default: return false;
              }
            });
            if (activeSub) {
              const val = values[p.id];
              if (!val || (Array.isArray(val) && val.length === 0)) {
                toast.error(`O campo "${activeSub.rotulo || p.rotulo}" é obrigatório`);
                return;
              }
            }
          }
          continue;
        }
        const val = p.tipo === "anexo" ? files[p.id] : values[p.id];
        if (!val || (Array.isArray(val) && val.length === 0)) {
          toast.error(`O campo "${p.rotulo}" é obrigatório`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      // Upload files
      const uploadedFiles: { pergunta_id: string; file_url: string; file_name: string }[] = [];
      for (const [perguntaId, fileData] of Object.entries(files)) {
        const formData = new FormData();
        formData.append("file", fileData.file);
        formData.append("bucket", "form-uploads");
        formData.append("formulario_id", formularioId);

        const { data: uploadResponse, error: uploadError } = await supabase.functions.invoke("upload-publico", {
          body: formData,
        });

        if (uploadError || uploadResponse?.error) {
          throw new Error(uploadResponse?.error || uploadError?.message || "Erro ao fazer upload");
        }

        uploadedFiles.push({
          pergunta_id: perguntaId,
          file_url: uploadResponse.file_url,
          file_name: uploadResponse.file_name,
        });
      }

      // Build respostas
      const respostas: Record<string, any> = {};
      for (const p of visiblePerguntas) {
        if (p.tipo !== "anexo") {
          respostas[p.id] = values[p.id];
        }
      }

      // Submit via edge function (bypasses RLS for public users)
      const { data: submitResponse, error: submitError } = await supabase.functions.invoke("enviar-formulario", {
        body: {
          formulario_id: formularioId,
          respostas,
          arquivos: uploadedFiles.length > 0 ? uploadedFiles : null,
          mapeamentos,
        },
      });

      if (submitError || submitResponse?.error) {
        throw new Error(submitResponse?.error || submitError?.message || "Erro ao enviar formulário");
      }

      const generatedProtocolo = submitResponse.protocolo;
      const generatedChave = submitResponse.chave_consulta;

      setProtocolo(generatedProtocolo);
      setChaveConsulta(generatedChave || "");
      setSubmitted(true);
      toast.success("Solicitação enviada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const createSolicitacao = async (
    respostas: Record<string, any>,
    _arquivos: any[]
  ): Promise<string> => {
    // Build solicitacao fields from mapeamentos
    const solicitacaoData: Record<string, any> = {};
    for (const map of mapeamentos) {
      if (respostas[map.pergunta_id] !== undefined) {
        solicitacaoData[map.campo_solicitacao] = respostas[map.pergunta_id];
      }
    }

    // Generate protocol number
    const { data: configData } = await supabase
      .from("protocol_config")
      .select("*")
      .limit(1)
      .single();

    const prefixo = configData?.prefixo || "JBS";
    const nextNum = (configData?.ultimo_numero || 0) + 1;
    const codigoLetra = solicitacaoData.tipo_operacao?.[0]?.toUpperCase() || "S";
    const protocolo = `${prefixo}${codigoLetra}${String(nextNum).padStart(5, "0")}`;

    // Update protocol counter
    if (configData) {
      await supabase.from("protocol_config")
        .update({ ultimo_numero: nextNum })
        .eq("id", configData.id);
    }

    // Insert solicitacao with mapped fields
    const { error } = await supabase.from("solicitacoes").insert({
      protocolo,
      cliente_nome: solicitacaoData.cliente_nome || "Cliente via formulário",
      cliente_email: solicitacaoData.cliente_email || "",
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

    if (error) throw error;

    return protocolo;
  };

  const handleSaveEmail = async () => {
    if (!emailParaNotificacao || !emailParaNotificacao.includes("@")) {
      toast.error("Informe um e-mail válido");
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("enviar-formulario", {
        body: {
          action: "save_email",
          protocolo,
          email: emailParaNotificacao,
        },
      });
      if (error || data?.error) {
        toast.error("Erro ao salvar e-mail");
        return;
      }
      setEmailSalvo(true);
      toast.success("E-mail registrado! Você receberá atualizações sobre sua solicitação.");
      onSuccess?.();
    } catch {
      toast.error("Erro ao salvar e-mail");
    }
  };

  if (loading) return <FormRendererLoading />;
  if (!formulario) return <FormRendererNotFound />;

  if (submitted) {
    return (
      <FormRendererSuccess
        protocolo={protocolo}
        chaveConsulta={chaveConsulta}
        emailParaNotificacao={emailParaNotificacao}
        emailSalvo={emailSalvo}
        onEmailChange={setEmailParaNotificacao}
        onSaveEmail={handleSaveEmail}
      />
    );
  }

  const estilo = formulario.estilo || "jbs";
  const currentStyle = getStyleClasses(estilo);

  return (
    <div className={currentStyle.container}>
      <FormRendererHeader
        titulo={formulario.titulo}
        descricao={formulario.descricao}
        estilo={estilo}
        headerClass={currentStyle.header}
      />
      <FormRendererBody
        perguntas={perguntas}
        values={values}
        files={files}
        submitting={submitting}
        isFieldVisible={isFieldVisible}
        onValueChange={(id, val) => setValues((prev) => ({ ...prev, [id]: val }))}
        onFileChange={(id, file) => {
          if (file) {
            setFiles((prev) => ({ ...prev, [id]: { file, url: URL.createObjectURL(file) } }));
          } else {
            setFiles((prev) => { const n = { ...prev }; delete n[id]; return n; });
          }
        }}
        onSubmit={handleSubmit}
        fieldClass={currentStyle.field}
        buttonClass={currentStyle.button}
      />
    </div>
  );
};

export default FormRenderer;
