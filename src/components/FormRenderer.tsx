import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FormRendererLoading from "@/components/form-renderer/FormRendererLoading";
import FormRendererNotFound from "@/components/form-renderer/FormRendererNotFound";
import FormRendererSuccess from "@/components/form-renderer/FormRendererSuccess";
import FormRendererBody from "@/components/form-renderer/FormRendererBody";
import FormRendererHeader from "@/components/form-renderer/FormRendererHeader";
import { getStyleClasses } from "@/components/form-renderer/formStyles";
import { invokeBackendEndpoint } from "@/lib/backendEndpoints";
import type { Formulario, PerguntaComCondicao, FormRendererProps } from "@/components/form-renderer/types";

type SubperguntaCondicional = {
  tipo?: string;
  condicao?: {
    pergunta_rotulo?: string;
    valor_gatilho?: string;
    operador?: string;
  };
};

const evaluateConditionalOperator = (valorAtual: any, valorGatilho: string, operador?: string) => {
  switch (operador) {
    case "igual":
      return String(valorAtual) === valorGatilho;
    case "diferente":
      return String(valorAtual) !== valorGatilho;
    case "contem":
      return String(valorAtual).toLowerCase().includes(valorGatilho.toLowerCase());
    default:
      return true;
  }
};

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
  const [showEmailField, setShowEmailField] = useState(true);
  const [mapeamentos, setMapeamentos] = useState<{ pergunta_id: string; campo_solicitacao: string; campo_analise_id?: string | null }[]>([]);

  const getActiveSubpergunta = (pergunta: PerguntaComCondicao, currentValues: Record<string, any>) => {
    if (pergunta.tipo !== "pergunta_condicional") return null;
    const config = pergunta.config as any;
    if (!config?.subperguntas) return null;

    return (config.subperguntas as SubperguntaCondicional[]).find((sp) => {
      if (!sp.condicao?.pergunta_rotulo || !sp.condicao.valor_gatilho) return false;
      const parentPergunta = perguntas.find((p) => p.rotulo === sp.condicao?.pergunta_rotulo);
      if (!parentPergunta) return false;
      const parentValue = currentValues[parentPergunta.id];
      if (parentValue === undefined || parentValue === null || parentValue === "") return false;
      return evaluateConditionalOperator(parentValue, sp.condicao.valor_gatilho, sp.condicao.operador);
    }) || null;
  };

  const getVisibilityState = (currentValues: Record<string, any>) => {
    const visibleQuestionIds = new Set<string>();
    const visibleResponseIds = new Set<string>();
    const visibleFileIds = new Set<string>();
    const activeSubperguntasById: Record<string, SubperguntaCondicional | null> = {};

    for (const pergunta of perguntas) {
      if (!isFieldVisible(pergunta, currentValues)) continue;

      visibleQuestionIds.add(pergunta.id);

      if (pergunta.tipo === "pergunta_condicional") {
        const activeSubpergunta = getActiveSubpergunta(pergunta, currentValues);
        activeSubperguntasById[pergunta.id] = activeSubpergunta;
        if (!activeSubpergunta) continue;

        visibleResponseIds.add(pergunta.id);
        if (activeSubpergunta.tipo === "arquivo" || activeSubpergunta.tipo === "anexo") {
          visibleFileIds.add(pergunta.id);
        }
        continue;
      }

      visibleResponseIds.add(pergunta.id);
      if (pergunta.tipo === "anexo" || pergunta.tipo === "arquivo") {
        visibleFileIds.add(pergunta.id);
      }
    }

    return { visibleQuestionIds, visibleResponseIds, visibleFileIds, activeSubperguntasById };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Fetch form, questions (from banco_perguntas via formulario_perguntas), and conditionals
      const [formRes, perguntasRes, condicionaisRes, mapeamentoRes, emailToggleRes] = await Promise.all([
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
        supabase.from("page_config")
          .select("is_active")
          .eq("config_key", "solicitar_email_acompanhamento")
          .maybeSingle(),
      ]);

      if (formRes.data) setFormulario(formRes.data);
      if (mapeamentoRes.data) setMapeamentos(mapeamentoRes.data);

      // Default seguro: exibir campo quando config não existir ou falhar leitura.
      const safeEmailToggleDefault = true;
      if (emailToggleRes.error) {
        console.error("[FormRenderer] Falha ao ler page_config.solicitar_email_acompanhamento:", emailToggleRes.error);
        setShowEmailField(safeEmailToggleDefault);
      } else if (!emailToggleRes.data) {
        console.warn("[FormRenderer] Config solicitar_email_acompanhamento ausente; aplicando fallback seguro (true).");
        setShowEmailField(safeEmailToggleDefault);
      } else {
        setShowEmailField(emailToggleRes.data.is_active !== false);
      }

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
              largura: (bp.config as any)?.largura || 100,
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

  const isFieldVisible = (pergunta: PerguntaComCondicao, currentValues = values): boolean => {
    if (!pergunta.condicao) return true;
    const { pergunta_pai_id, valor_gatilho, operador } = pergunta.condicao;
    const currentValue = currentValues[pergunta_pai_id];
    if (currentValue === undefined || currentValue === null || currentValue === "") return false;

    return evaluateConditionalOperator(currentValue, valor_gatilho, operador);
  };

  useEffect(() => {
    const { visibleResponseIds, visibleFileIds } = getVisibilityState(values);

    setValues((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of Object.keys(prev)) {
        if (!visibleResponseIds.has(key)) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });

    setFiles((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of Object.keys(prev)) {
        if (!visibleFileIds.has(key)) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [values, perguntas]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const visibilityState = getVisibilityState(values);
    const visiblePerguntas = perguntas.filter((p) => visibilityState.visibleQuestionIds.has(p.id));
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
          const activeSub = visibilityState.activeSubperguntasById[p.id];
          if (activeSub) {
            // For "arquivo" sub-questions, check files state instead of values
            const isFileType = activeSub.tipo === "arquivo" || activeSub.tipo === "anexo";
            const val = isFileType ? files[p.id] : values[p.id];
            if (!val || (Array.isArray(val) && val.length === 0)) {
              toast.error(`O campo "${(activeSub as any).rotulo || p.rotulo}" é obrigatório`);
              return;
            }
          }
          continue;
        }
        const val = (p.tipo === "anexo" || p.tipo === "arquivo") ? files[p.id] : values[p.id];
        if (!val || (Array.isArray(val) && (val.length === 0 || val.every((v: any) => !v)))) {
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
        if (!visibilityState.visibleFileIds.has(perguntaId)) continue;

        const formData = new FormData();
        formData.append("file", fileData.file);
        formData.append("bucket", "form-uploads");
        formData.append("formulario_id", formularioId);

        const { data: uploadResponse, error: uploadError } = await invokeBackendEndpoint("uploadPublico", {
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
      for (const [perguntaId, value] of Object.entries(values)) {
        if (visibilityState.visibleResponseIds.has(perguntaId)) {
          respostas[perguntaId] = value;
        }
      }

      const mapeamentosVisiveis = mapeamentos.filter((map) => visibilityState.visibleResponseIds.has(map.pergunta_id));

      // Submit via edge function (bypasses RLS for public users)
      const { data: submitResponse, error: submitError } = await invokeBackendEndpoint("enviarFormulario", {
        body: {
          formulario_id: formularioId,
          respostas,
          arquivos: uploadedFiles.length > 0 ? uploadedFiles : null,
          mapeamentos: mapeamentosVisiveis,
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

  // createSolicitacao removed — submission handled by edge function enviar-formulario

  const handleSaveEmail = async () => {
    if (!emailParaNotificacao || !emailParaNotificacao.includes("@")) {
      toast.error("Informe um e-mail válido");
      return;
    }
    try {
      const { data, error } = await invokeBackendEndpoint("enviarFormulario", {
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
        showEmailField={showEmailField}
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
