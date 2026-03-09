import { useRef, useEffect, useState } from "react";
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

/** Wrapper that animates mount/unmount of conditional fields */
const AnimatedField = ({ visible, children }: { visible: boolean; children: React.ReactNode }) => {
  const [shouldRender, setShouldRender] = useState(visible);
  const [animClass, setAnimClass] = useState(visible ? "opacity-100 max-h-[2000px]" : "opacity-0 max-h-0");
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      // Delay to allow DOM mount before transition
      timeoutRef.current = setTimeout(() => setAnimClass("opacity-100 max-h-[2000px]"), 20);
    } else {
      setAnimClass("opacity-0 max-h-0");
      timeoutRef.current = setTimeout(() => setShouldRender(false), 250);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [visible]);

  if (!shouldRender) return null;

  return (
    <div className={`transition-all duration-200 ease-in-out overflow-hidden ${animClass}`}>
      {children}
    </div>
  );
};

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
    <div className="flex flex-wrap gap-x-4 gap-y-6">
      {perguntas.map((pergunta) => {
        const visible = isFieldVisible(pergunta);
        const widthPercent = pergunta.largura || 100;
        const widthStyle = widthPercent < 100
          ? { width: `calc(${widthPercent}% - ${widthPercent < 100 ? '0.5rem' : '0px'})` }
          : { width: '100%' };

        // Only render conditional fields with animation; always-visible fields render directly
        if (pergunta.condicao) {
          return (
            <div key={pergunta.id} style={widthStyle}>
              <AnimatedField visible={visible}>
                <div className={fieldClass}>
                  <FormFieldRenderer
                    pergunta={pergunta}
                    value={values[pergunta.id]}
                    fileData={files[pergunta.id]}
                    onValueChange={(val) => onValueChange(pergunta.id, val)}
                    onFileChange={(file) => onFileChange(pergunta.id, file)}
                    allValues={values}
                    allPerguntas={perguntas}
                    onSiblingValueChange={onValueChange}
                  />
                </div>
              </AnimatedField>
            </div>
          );
        }

        return (
          <div key={pergunta.id} className={fieldClass} style={widthStyle}>
            <FormFieldRenderer
              pergunta={pergunta}
              value={values[pergunta.id]}
              fileData={files[pergunta.id]}
              onValueChange={(val) => onValueChange(pergunta.id, val)}
              onFileChange={(file) => onFileChange(pergunta.id, file)}
              allValues={values}
              allPerguntas={perguntas}
              onSiblingValueChange={onValueChange}
            />
          </div>
        );
      })}
    </div>

    <Button type="submit" disabled={submitting} className={buttonClass}>
      <Send className="h-4 w-4 mr-2" />
      {submitting ? "Enviando..." : "Solicitar"}
    </Button>
  </form>
);

export default FormRendererBody;
