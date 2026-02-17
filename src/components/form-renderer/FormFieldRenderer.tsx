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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Info, Image as ImageIcon, ChevronDown } from "lucide-react";
import type { PerguntaComCondicao } from "./types";

interface FormFieldRendererProps {
  pergunta: PerguntaComCondicao;
  value: any;
  fileData?: { file: File; url: string };
  onValueChange: (value: any) => void;
  onFileChange: (file: File | null) => void;
}

const FormFieldRenderer = ({
  pergunta,
  value,
  fileData,
  onValueChange,
  onFileChange,
}: FormFieldRendererProps) => {
  const opcoes = pergunta.opcoes as { value: string; label: string }[] | null;
  const config = pergunta.config as Record<string, any> | null;

  // Informativo (text/image block with optional accept)
  if (pergunta.tipo === "informativo") {
    return (
      <div className="space-y-3">
        <div className="bg-muted/40 rounded-lg p-4 border border-muted">
          {config?.tipo_conteudo === "imagem" && config.imagem_url ? (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              <img
                src={config.imagem_url}
                alt={pergunta.rotulo}
                className="max-w-full rounded-lg max-h-64 object-contain"
              />
            </div>
          ) : (
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">{pergunta.rotulo}</p>
                {config?.conteudo && (
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{config.conteudo}</p>
                )}
              </div>
            </div>
          )}
        </div>
        {config?.aceite && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`aceite_${pergunta.id}`}
              checked={value === true}
              onCheckedChange={(checked) => onValueChange(!!checked)}
            />
            <Label htmlFor={`aceite_${pergunta.id}`} className="cursor-pointer font-normal text-sm">
              {config.texto_aceite || "Li e aceito as informações acima"}
              {pergunta.obrigatorio && <span className="text-destructive ml-1">*</span>}
            </Label>
          </div>
        )}
      </div>
    );
  }

  const renderNumeroField = () => {
    const prefixo = config?.prefixo;
    const sufixo = config?.sufixo;
    const permitirNeg = config?.permitir_negativo ?? true;
    const minVal = config?.min != null ? config.min : (permitirNeg ? undefined : 0);
    const maxVal = config?.max != null ? config.max : undefined;

    const input = (
      <Input
        type="number"
        value={value || ""}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={pergunta.placeholder || ""}
        min={minVal}
        max={maxVal}
        className={prefixo || sufixo ? "flex-1" : ""}
      />
    );

    if (prefixo || sufixo) {
      return (
        <div className="flex items-center gap-2">
          {prefixo && <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{prefixo}</span>}
          {input}
          {sufixo && <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{sufixo}</span>}
        </div>
      );
    }
    return input;
  };

  const renderSelectField = () => {
    if (!opcoes) return null;
    const modo = config?.modo_exibicao || "menu";

    if (modo === "botoes") {
      return (
        <ToggleGroup type="single" value={value || ""} onValueChange={(v) => { if (v) onValueChange(v); }} className="flex flex-wrap gap-2 justify-start">
          {opcoes.map((opt) => (
            <ToggleGroupItem key={opt.value} value={opt.label} className="border px-3 py-1.5 rounded-md text-sm">
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      );
    }

    if (modo === "radio") {
      return (
        <RadioGroup value={value || ""} onValueChange={onValueChange} className="space-y-2">
          {opcoes.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <RadioGroupItem value={opt.label} id={`${pergunta.id}_${opt.value}`} />
              <Label htmlFor={`${pergunta.id}_${opt.value}`} className="cursor-pointer font-normal">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    }

    // default: menu (dropdown)
    return (
      <Select value={value || ""} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={pergunta.placeholder || "Selecione..."} />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((opt) => (
            <SelectItem key={opt.value} value={opt.label}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  const renderMultiplaEscolhaField = () => {
    if (!opcoes) return null;
    const modo = config?.modo_exibicao || "check";
    const currentValue: string[] = value || [];

    if (modo === "botoes") {
      return (
        <ToggleGroup type="multiple" value={currentValue} onValueChange={onValueChange} className="flex flex-wrap gap-2 justify-start">
          {opcoes.map((opt) => (
            <ToggleGroupItem key={opt.value} value={opt.label} className="border px-3 py-1.5 rounded-md text-sm">
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      );
    }

    if (modo === "menu") {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal">
              {currentValue.length > 0 ? `${currentValue.length} selecionado(s)` : (pergunta.placeholder || "Selecione...")}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-2" align="start">
            <div className="space-y-1 max-h-48 overflow-auto">
              {opcoes.map((opt) => (
                <div key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                  <Checkbox
                    id={`pop_${pergunta.id}_${opt.value}`}
                    checked={currentValue.includes(opt.label)}
                    onCheckedChange={(checked) => {
                      if (checked) onValueChange([...currentValue, opt.label]);
                      else onValueChange(currentValue.filter((v: string) => v !== opt.label));
                    }}
                  />
                  <Label htmlFor={`pop_${pergunta.id}_${opt.value}`} className="cursor-pointer font-normal text-sm flex-1">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    // default: check (checkbox list)
    return (
      <div className="space-y-2">
        {opcoes.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <Checkbox
              id={`${pergunta.id}_${opt.value}`}
              checked={currentValue.includes(opt.label)}
              onCheckedChange={(checked) => {
                if (checked) onValueChange([...currentValue, opt.label]);
                else onValueChange(currentValue.filter((v: string) => v !== opt.label));
              }}
            />
            <Label htmlFor={`${pergunta.id}_${opt.value}`} className="cursor-pointer font-normal">
              {opt.label}
            </Label>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {pergunta.rotulo}
        {pergunta.obrigatorio && <span className="text-destructive">*</span>}
      </Label>
      {pergunta.descricao && (
        <p className="text-xs text-muted-foreground">{pergunta.descricao}</p>
      )}

      {pergunta.tipo === "texto" && (
        <Input
          value={value || ""}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={pergunta.placeholder || ""}
        />
      )}

      {pergunta.tipo === "texto_longo" && (
        <Textarea
          value={value || ""}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={pergunta.placeholder || ""}
          rows={4}
        />
      )}

      {pergunta.tipo === "numero" && renderNumeroField()}

      {pergunta.tipo === "email" && (
        <Input
          type="email"
          value={value || ""}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={pergunta.placeholder || "seu@email.com"}
        />
      )}

      {pergunta.tipo === "data" && (
        <Input
          type="date"
          value={value || ""}
          onChange={(e) => onValueChange(e.target.value)}
        />
      )}

      {pergunta.tipo === "data_hora" && (
        <Input
          type="datetime-local"
          value={value || ""}
          onChange={(e) => onValueChange(e.target.value)}
        />
      )}

      {pergunta.tipo === "select" && renderSelectField()}

      {pergunta.tipo === "selecao_unica" && opcoes && (
        <RadioGroup value={value || ""} onValueChange={onValueChange} className="space-y-2">
          {opcoes.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <RadioGroupItem value={opt.label} id={`${pergunta.id}_${opt.value}`} />
              <Label htmlFor={`${pergunta.id}_${opt.value}`} className="cursor-pointer font-normal">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      )}

      {pergunta.tipo === "multipla_escolha" && renderMultiplaEscolhaField()}

      {pergunta.tipo === "checkbox" && (
        <div className="flex items-center gap-2">
          <Checkbox
            id={pergunta.id}
            checked={value === true}
            onCheckedChange={(checked) => onValueChange(!!checked)}
          />
          <Label htmlFor={pergunta.id} className="cursor-pointer font-normal">
            {pergunta.placeholder || "Sim"}
          </Label>
        </div>
      )}

      {pergunta.tipo === "anexo" && (
        <div>
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          />
          {fileData && (
            <p className="text-xs text-muted-foreground mt-1">
              Arquivo selecionado: {fileData.file.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default FormFieldRenderer;
