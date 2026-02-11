import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, CheckCircle } from "lucide-react";

interface Campo {
  id: string;
  tipo: string;
  rotulo: string;
  placeholder: string | null;
  obrigatorio: boolean;
  opcoes: unknown;
  condicao: unknown;
  ordem: number;
}

interface Formulario {
  id: string;
  titulo: string;
  descricao: string | null;
  estilo?: string;
}

interface FormRendererProps {
  formularioId: string;
  onSuccess?: () => void;
}

const FormRenderer = ({ formularioId, onSuccess }: FormRendererProps) => {
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [files, setFiles] = useState<Record<string, { file: File; url: string }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [formRes, camposRes] = await Promise.all([
        supabase.from("formularios").select("id, titulo, descricao, estilo").eq("id", formularioId).single(),
        supabase.from("formulario_campos").select("*").eq("formulario_id", formularioId).order("ordem"),
      ]);

      if (formRes.data) setFormulario(formRes.data);
      if (camposRes.data) setCampos(camposRes.data);
      setLoading(false);
    };
    fetchData();
  }, [formularioId]);

  const isFieldVisible = (campo: Campo) => {
    if (!campo.condicao) return true;
    const condicao = campo.condicao as { campo_id: string; operador: string; valor: string } | null;
    if (!condicao) return true;
    const { campo_id, operador, valor } = condicao;
    const currentValue = values[campo_id];

    switch (operador) {
      case "igual":
        return currentValue === valor;
      case "diferente":
        return currentValue !== valor;
      case "contem":
        return String(currentValue || "").toLowerCase().includes(valor.toLowerCase());
      default:
        return true;
    }
  };

  const handleValueChange = (campoId: string, value: any) => {
    setValues((prev) => ({ ...prev, [campoId]: value }));
  };

  const handleFileChange = (campoId: string, file: File | null) => {
    if (file) {
      setFiles((prev) => ({
        ...prev,
        [campoId]: { file, url: URL.createObjectURL(file) },
      }));
    } else {
      setFiles((prev) => {
        const newFiles = { ...prev };
        delete newFiles[campoId];
        return newFiles;
      });
    }
  };

  const handleMultipleChoiceChange = (campoId: string, optValue: string, checked: boolean) => {
    setValues((prev) => {
      const current = prev[campoId] || [];
      if (checked) {
        return { ...prev, [campoId]: [...current, optValue] };
      } else {
        return { ...prev, [campoId]: current.filter((v: string) => v !== optValue) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const visibleCampos = campos.filter(isFieldVisible);
    for (const campo of visibleCampos) {
      if (campo.obrigatorio) {
        const val = campo.tipo === "arquivo" ? files[campo.id] : values[campo.id];
        if (!val || (Array.isArray(val) && val.length === 0)) {
          toast.error(`O campo "${campo.rotulo}" é obrigatório`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      // Upload files via edge function (secure, no direct storage access)
      const uploadedFiles: { campo_id: string; file_url: string; file_name: string }[] = [];
      for (const [campoId, fileData] of Object.entries(files)) {
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
          campo_id: campoId,
          file_url: uploadResponse.file_url,
          file_name: uploadResponse.file_name,
        });
      }

      // Build responses
      const respostas: Record<string, any> = {};
      for (const campo of visibleCampos) {
        if (campo.tipo !== "arquivo") {
          respostas[campo.id] = values[campo.id];
        }
      }

      // Save response (formulario_respostas has public INSERT policy)
      const { error } = await supabase.from("formulario_respostas").insert({
        formulario_id: formularioId,
        respostas,
        arquivos: uploadedFiles.length > 0 ? uploadedFiles : null,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Formulário enviado com sucesso!");
      onSuccess?.();
    } catch (err: any) {
      toast.error("Erro ao enviar formulário: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!formulario) {
    return (
      <div className="text-center py-12 text-muted-foreground">Formulário não encontrado</div>
    );
  }

  if (submitted) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Enviado com Sucesso!</h2>
        <p className="text-muted-foreground">Sua resposta foi registrada.</p>
      </div>
    );
  }

  const estilo = formulario.estilo || "jbs";
  
  const styleClasses: Record<string, { container: string; header: string; field: string; button: string }> = {
    jbs: {
      container: "bg-card rounded-lg p-6 md:p-8 max-w-2xl mx-auto",
      header: "text-center mb-8 pb-4 border-b-2 border-secondary",
      field: "space-y-2",
      button: "w-full jbs-btn-primary",
    },
    hashdata: {
      container: "bg-card rounded-xl p-6 md:p-10 max-w-3xl mx-auto shadow-lg border",
      header: "mb-8 pb-4 border-b border-muted",
      field: "space-y-2 bg-muted/30 rounded-lg p-4",
      button: "w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg",
    },
    google: {
      container: "bg-card rounded-lg max-w-2xl mx-auto border-t-4 border-t-primary shadow-md",
      header: "p-6 md:p-8 pb-4",
      field: "space-y-2 border rounded-lg p-4 bg-card",
      button: "bg-primary hover:bg-primary/90 text-primary-foreground px-8",
    },
    jotform: {
      container: "bg-gradient-to-b from-muted/20 to-card rounded-2xl p-6 md:p-10 max-w-2xl mx-auto shadow-xl",
      header: "text-center mb-10 pb-6 border-b border-muted/50",
      field: "space-y-2 bg-card rounded-xl p-5 shadow-sm border",
      button: "w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-3 text-lg",
    },
    formstack: {
      container: "bg-card max-w-2xl mx-auto p-6 md:p-8 border rounded-lg",
      header: "mb-6 pb-3 border-b-2 border-primary",
      field: "space-y-1",
      button: "w-full bg-primary hover:bg-primary/90 text-primary-foreground",
    },
  };
  
  const currentStyle = styleClasses[estilo] || styleClasses.jbs;

  return (
    <div className={currentStyle.container}>
      <div className={currentStyle.header}>
        <h1 className="text-2xl font-bold text-primary mb-2">{formulario.titulo}</h1>
        {formulario.descricao && (
          <p className="text-muted-foreground">{formulario.descricao}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {campos.filter(isFieldVisible).map((campo) => (
          <div key={campo.id} className={currentStyle.field}>
            <Label className="flex items-center gap-1">
              {campo.rotulo}
              {campo.obrigatorio && <span className="text-destructive">*</span>}
            </Label>

            {campo.tipo === "texto" && (
              <Input
                value={values[campo.id] || ""}
                onChange={(e) => handleValueChange(campo.id, e.target.value)}
                placeholder={campo.placeholder || ""}
              />
            )}

            {campo.tipo === "texto_longo" && (
              <Textarea
                value={values[campo.id] || ""}
                onChange={(e) => handleValueChange(campo.id, e.target.value)}
                placeholder={campo.placeholder || ""}
                rows={4}
              />
            )}

            {campo.tipo === "numero" && (
              <Input
                type="number"
                value={values[campo.id] || ""}
                onChange={(e) => handleValueChange(campo.id, e.target.value)}
                placeholder={campo.placeholder || ""}
              />
            )}

            {campo.tipo === "data" && (
              <Input
                type="date"
                value={values[campo.id] || ""}
                onChange={(e) => handleValueChange(campo.id, e.target.value)}
              />
            )}

            {campo.tipo === "select" && campo.opcoes && (
              <Select
                value={values[campo.id] || ""}
                onValueChange={(v) => handleValueChange(campo.id, v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={campo.placeholder || "Selecione..."} />
                </SelectTrigger>
                <SelectContent>
                  {(campo.opcoes as { value: string; label: string }[]).map((opt) => (
                    <SelectItem key={opt.value} value={opt.label}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {campo.tipo === "multipla_escolha" && campo.opcoes && (
              <div className="space-y-2">
                {(campo.opcoes as { value: string; label: string }[]).map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`${campo.id}_${opt.value}`}
                      checked={(values[campo.id] || []).includes(opt.label)}
                      onCheckedChange={(checked) =>
                        handleMultipleChoiceChange(campo.id, opt.label, !!checked)
                      }
                    />
                    <Label htmlFor={`${campo.id}_${opt.value}`} className="cursor-pointer font-normal">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {campo.tipo === "checkbox" && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id={campo.id}
                  checked={values[campo.id] === true}
                  onCheckedChange={(checked) => handleValueChange(campo.id, !!checked)}
                />
                <Label htmlFor={campo.id} className="cursor-pointer font-normal">
                  {campo.placeholder || "Sim"}
                </Label>
              </div>
            )}

            {campo.tipo === "arquivo" && (
              <div>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => handleFileChange(campo.id, e.target.files?.[0] || null)}
                />
                {files[campo.id] && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Arquivo selecionado: {files[campo.id].file.name}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        <Button type="submit" disabled={submitting} className={currentStyle.button}>
          <Send className="h-4 w-4 mr-2" />
          {submitting ? "Enviando..." : "Enviar"}
        </Button>
      </form>
    </div>
  );
};

export default FormRenderer;
