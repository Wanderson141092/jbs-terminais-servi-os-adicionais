import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import FormFieldRenderer from "./FormFieldRenderer";
import type { PerguntaComCondicao } from "./types";

interface FormRendererBodyProps {
  perguntas: PerguntaComCondicao[];
  values: Record<string, any>;
  files: Record<string, { file: File; url: string }>;
  submitting: boolean;
  isFieldVisible: (p: PerguntaComCondicao) => boolean;
  onValueChange: (id: string, value: any) => void;
  onFileChange: (id: string, file: File | null) => void;
  onSubmit: (e: React.FormEvent) => void;
  fieldClass: string;
  buttonClass: string;
}

const FormRendererBody = ({
  perguntas,
  values,
  files,
  submitting,
  isFieldVisible,
  onValueChange,
  onFileChange,
  onSubmit,
  fieldClass,
  buttonClass,
}: FormRendererBodyProps) => (
  <form onSubmit={onSubmit} className="space-y-6">
    {perguntas.filter(isFieldVisible).map((pergunta) => (
      <div key={pergunta.id} className={fieldClass}>
        <FormFieldRenderer
          pergunta={pergunta}
          value={values[pergunta.id]}
          fileData={files[pergunta.id]}
          onValueChange={(val) => onValueChange(pergunta.id, val)}
          onFileChange={(file) => onFileChange(pergunta.id, file)}
          allValues={values}
          allPerguntas={perguntas}
        />
      </div>
    ))}

    <Button type="submit" disabled={submitting} className={buttonClass}>
      <Send className="h-4 w-4 mr-2" />
      {submitting ? "Enviando..." : "Solicitar"}
    </Button>
  </form>
);

export default FormRendererBody;
