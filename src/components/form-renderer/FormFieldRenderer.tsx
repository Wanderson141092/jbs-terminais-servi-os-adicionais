import { useState, useCallback } from "react";
import { toast } from "sonner";
import { fetchCnpjData, stripCnpjMask, isValidCnpj } from "@/lib/cnpjLookup";
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
import { Info, Image as ImageIcon, ChevronDown, Search, Check, Plus, Trash2 } from "lucide-react";
import type { PerguntaComCondicao } from "./types";

/** Aplica máscara caractere a caractere: A=letra, 9=número, X=ambos, outro=literal fixo */
const applyMask = (rawValue: string, mascara: string): string => {
  const upper = rawValue.toUpperCase().replace(/[^A-Z0-9]/g, "");
  let result = "";
  let rawIdx = 0;

  for (let maskIdx = 0; maskIdx < mascara.length && rawIdx < upper.length; maskIdx++) {
    const m = mascara[maskIdx];
    const ch = upper[rawIdx];

    if (m === "A") {
      if (/[A-Z]/.test(ch)) { result += ch; rawIdx++; }
      else { rawIdx++; maskIdx--; } // skip invalid char
    } else if (m === "9") {
      if (/[0-9]/.test(ch)) { result += ch; rawIdx++; }
      else { rawIdx++; maskIdx--; }
    } else if (m === "X") {
      if (/[A-Z0-9]/.test(ch)) { result += ch; rawIdx++; }
      else { rawIdx++; maskIdx--; }
    } else {
      // literal fixo — insere automaticamente
      result += m;
    }
  }

  return result;
};

interface FormFieldRendererProps {
  pergunta: PerguntaComCondicao;
  value: any;
  fileData?: { file: File; url: string };
  onValueChange: (value: any) => void;
  onFileChange: (file: File | null) => void;
  allValues?: Record<string, any>;
  allPerguntas?: PerguntaComCondicao[];
  onSiblingValueChange?: (id: string, value: any) => void;
}

const SearchableSelect = ({ options, value, onValueChange, placeholder }: {
  options: { value: string; label: string }[];
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );
  const selectedLabel = options.find((opt) => opt.label === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {selectedLabel || placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-48 overflow-auto p-1">
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma opção encontrada</p>
          )}
          {filtered.map((opt) => (
            <div
              key={opt.value}
              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => { onValueChange(opt.label); setOpen(false); setSearch(""); }}
            >
              <Check className={`mr-2 h-4 w-4 ${value === opt.label ? "opacity-100" : "opacity-0"}`} />
              {opt.label}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const SearchableMultiSelect = ({ options, value, onValueChange, placeholder, perguntaId }: {
  options: { value: string; label: string }[];
  value: string[];
  onValueChange: (v: string[]) => void;
  placeholder: string;
  perguntaId: string;
}) => {
  const [search, setSearch] = useState("");
  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          {value.length > 0 ? `${value.length} selecionado(s)` : placeholder}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-1 max-h-48 overflow-auto p-2">
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma opção encontrada</p>
          )}
          {filtered.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
              <Checkbox
                id={`pop_${perguntaId}_${opt.value}`}
                checked={value.includes(opt.label)}
                onCheckedChange={(checked) => {
                  if (checked) onValueChange([...value, opt.label]);
                  else onValueChange(value.filter((v: string) => v !== opt.label));
                }}
              />
              <Label htmlFor={`pop_${perguntaId}_${opt.value}`} className="cursor-pointer font-normal text-sm flex-1">
                {opt.label}
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const FormFieldRenderer = ({
  pergunta,
  value,
  fileData,
  onValueChange,
  onFileChange,
  allValues,
  allPerguntas,
  onSiblingValueChange,
}: FormFieldRendererProps) => {
  const opcoes = pergunta.opcoes as { value: string; label: string }[] | null;
  const config = pergunta.config as Record<string, any> | null;
  const permitirMultiplos = config?.permitir_multiplos === true;
  const [cnpjLoading, setCnpjLoading] = useState(false);

  // Detect if this field is a CNPJ field (has CNPJ mask or label contains CNPJ)
  const isCnpjField = (() => {
    const mascara = config?.mascara as string | undefined;
    const isCnpjMask = mascara === "99.999.999/9999-99";
    const isCnpjLabel = pergunta.rotulo?.toUpperCase().includes("CNPJ");
    return (pergunta.tipo === "texto_formatado" && (isCnpjMask || isCnpjLabel));
  })();

  // Find sibling "Razão Social" field to auto-fill
  const razaoSocialField = isCnpjField && allPerguntas
    ? allPerguntas.find((p) => {
        const label = p.rotulo?.toLowerCase() || "";
        return label.includes("razão social") || label.includes("razao social");
      })
    : null;

  const handleCnpjBlur = useCallback(async (rawValue: string) => {
    if (!isCnpjField || !razaoSocialField || !onSiblingValueChange) return;
    const stripped = stripCnpjMask(rawValue);
    if (!isValidCnpj(stripped)) return;

    setCnpjLoading(true);
    try {
      const data = await fetchCnpjData(stripped);
      if (data?.razao_social) {
        onSiblingValueChange(razaoSocialField.id, data.razao_social);
        toast.success("Razão Social preenchida automaticamente.");
      } else {
        toast.error("CNPJ não encontrado na Receita Federal.");
      }
    } catch {
      toast.error("Erro ao consultar CNPJ.");
    } finally {
      setCnpjLoading(false);
    }
  }, [isCnpjField, razaoSocialField, onSiblingValueChange]);

  // Check if this is the "Razão Social" field linked to a CNPJ field
  const isRazaoSocialField = (() => {
    if (!allPerguntas) return false;
    const label = pergunta.rotulo?.toLowerCase() || "";
    if (!label.includes("razão social") && !label.includes("razao social")) return false;
    // Check if there's a CNPJ sibling
    return allPerguntas.some((p) => {
      const pConfig = p.config as Record<string, any> | null;
      const pMascara = pConfig?.mascara as string | undefined;
      return (p.tipo === "texto_formatado" && (pMascara === "99.999.999/9999-99" || p.rotulo?.toUpperCase().includes("CNPJ")));
    });
  })();
  const multiplosMax = config?.multiplos_max as number | undefined;

  // Informativo (text/image block with optional accept)
  if (pergunta.tipo === "informativo") {
    return (
      <div className="space-y-3">
        <div className="bg-muted/40 rounded-lg p-4 border border-muted">
          {pergunta.descricao && (
            <p className="text-xs text-muted-foreground italic mb-2">{pergunta.descricao}</p>
          )}
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
                  /<[a-z][\s\S]*>/i.test(config.conteudo)
                    ? <div className="prose-content text-sm text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: config.conteudo }} />
                    : <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{config.conteudo}</p>
                )}
                {pergunta.descricao && <p className="text-xs text-muted-foreground italic mt-1">{pergunta.descricao}</p>}
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

  // numero rendering is handled inline in renderSingleField

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

    // default: menu (dropdown) with search
    return (
      <SearchableSelect
        options={opcoes}
        value={value || ""}
        onValueChange={onValueChange}
        placeholder={pergunta.placeholder || "Selecione..."}
      />
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
        <SearchableMultiSelect
          options={opcoes}
          value={currentValue}
          onValueChange={onValueChange}
          placeholder={pergunta.placeholder || "Selecione..."}
          perguntaId={pergunta.id}
        />
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

  const renderSingleField = (fieldValue: any, onFieldChange: (v: any) => void, idx?: number) => {
    const idSuffix = idx !== undefined ? `_${idx}` : "";

    return (
      <>
        {pergunta.tipo === "texto" && (
          <Input
            value={fieldValue || ""}
            onChange={isRazaoSocialField ? undefined : (e) => onFieldChange(e.target.value)}
            placeholder={pergunta.placeholder || ""}
            readOnly={isRazaoSocialField}
            className={isRazaoSocialField ? "bg-muted/50 cursor-default" : ""}
          />
        )}

        {pergunta.tipo === "texto_longo" && (
          <Textarea
            value={fieldValue || ""}
            onChange={(e) => onFieldChange(e.target.value)}
            placeholder={pergunta.placeholder || ""}
            rows={4}
          />
        )}

        {pergunta.tipo === "numero" && (() => {
          const prefixo = config?.prefixo;
          const sufixo = config?.sufixo;
          const permitirNeg = config?.permitir_negativo ?? true;
          const minVal = config?.min != null ? config.min : (permitirNeg ? undefined : 0);
          const maxVal = config?.max != null ? config.max : undefined;
          const input = (
            <Input
              type="number"
              value={fieldValue || ""}
              onChange={(e) => onFieldChange(e.target.value)}
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
        })()}

        {pergunta.tipo === "email" && (
          <Input
            type="email"
            value={fieldValue || ""}
            onChange={(e) => onFieldChange(e.target.value)}
            onBlur={(e) => {
              const emailVal = e.target.value;
              if (emailVal && config?.bloquear_dominio && config?.dominio_bloqueado) {
                if (emailVal.toLowerCase().endsWith(config.dominio_bloqueado.toLowerCase())) {
                  onFieldChange("");
                  toast.error("Domínio de e-mail não permitido para envio.");
                }
              }
            }}
            placeholder={pergunta.placeholder || "seu@email.com"}
          />
        )}

        {pergunta.tipo === "data" && (
          <Input
            type="date"
            value={fieldValue || ""}
            onChange={(e) => onFieldChange(e.target.value)}
          />
        )}

        {pergunta.tipo === "texto_formatado" && (() => {
          const mascara = config?.mascara as string | undefined;
          const maxChars = config?.max_chars as number | undefined;
          return (
            <div className="relative">
              <Input
                value={fieldValue || ""}
                onChange={(e) => {
                  if (mascara) {
                    onFieldChange(applyMask(e.target.value, mascara));
                  } else {
                    let val = e.target.value.toUpperCase();
                    if (maxChars) val = val.slice(0, maxChars);
                    onFieldChange(val);
                  }
                }}
                onBlur={isCnpjField ? (e) => handleCnpjBlur(e.target.value) : undefined}
                placeholder={pergunta.placeholder || ""}
                maxLength={mascara ? mascara.length : (maxChars || undefined)}
                className="font-mono"
                readOnly={isRazaoSocialField}
                disabled={isRazaoSocialField && cnpjLoading}
              />
              {isCnpjField && cnpjLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
                  Consultando...
                </span>
              )}
            </div>
          );
        })()}

        {pergunta.tipo === "data_hora" && (
          <Input
            type="datetime-local"
            value={fieldValue || ""}
            onChange={(e) => onFieldChange(e.target.value)}
          />
        )}

        {pergunta.tipo === "select" && renderSelectField()}

        {pergunta.tipo === "selecao_unica" && opcoes && (
          <RadioGroup value={fieldValue || ""} onValueChange={onFieldChange} className="space-y-2">
            {opcoes.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.label} id={`${pergunta.id}${idSuffix}_${opt.value}`} />
                <Label htmlFor={`${pergunta.id}${idSuffix}_${opt.value}`} className="cursor-pointer font-normal">
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
              id={`${pergunta.id}${idSuffix}`}
              checked={fieldValue === true}
              onCheckedChange={(checked) => onFieldChange(!!checked)}
            />
            <Label htmlFor={`${pergunta.id}${idSuffix}`} className="cursor-pointer font-normal">
              {pergunta.placeholder || "Sim"}
            </Label>
          </div>
        )}

        {(pergunta.tipo === "anexo" || pergunta.tipo === "arquivo") && (
          <div>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file) {
                  const maxSize = 10 * 1024 * 1024; // 10MB
                  const allowedTypes = [
                    "application/pdf",
                    "image/jpeg",
                    "image/png",
                    "image/jpg",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  ];
                  if (file.size === 0) {
                    toast.error("O arquivo está vazio (0 bytes). Selecione outro arquivo.");
                    e.target.value = "";
                    return;
                  }
                  if (file.size > maxSize) {
                    toast.error(`O arquivo excede o limite de 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB).`);
                    e.target.value = "";
                    return;
                  }
                  if (!allowedTypes.includes(file.type)) {
                    toast.error("Tipo de arquivo não permitido. Formatos aceitos: PDF, JPG, PNG, DOC, DOCX.");
                    e.target.value = "";
                    return;
                  }
                }
                onFileChange(file);
              }}
            />
            {fileData && (
              <p className="text-xs text-muted-foreground mt-1">
                Arquivo selecionado: {fileData.file.name} ({(fileData.file.size / 1024).toFixed(0)}KB)
              </p>
            )}
          </div>
        )}
      </>
    );
  };

  // Types that support multi-value
  const multiCapableTypes = ["texto", "texto_longo", "texto_formatado", "numero", "email", "data", "data_hora", "select"];

  if (permitirMultiplos && multiCapableTypes.includes(pergunta.tipo)) {
    const entries: any[] = Array.isArray(value) ? value : (value ? [value] : [""]);

    const handleEntryChange = (idx: number, val: any) => {
      const updated = [...entries];
      updated[idx] = val;
      onValueChange(updated);
    };

    const addEntry = () => {
      onValueChange([...entries, ""]);
    };

    const removeEntry = (idx: number) => {
      const updated = entries.filter((_, i) => i !== idx);
      onValueChange(updated.length > 0 ? updated : [""]);
    };

    const canAdd = !multiplosMax || entries.length < multiplosMax;

    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          {pergunta.rotulo}
          {pergunta.obrigatorio && <span className="text-destructive">*</span>}
        </Label>
        {pergunta.descricao && (
          <p className="text-xs text-muted-foreground italic">{pergunta.descricao}</p>
        )}
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="flex-1">
                {renderSingleField(entry, (val) => handleEntryChange(idx, val), idx)}
              </div>
              {entries.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => removeEntry(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
        {canAdd && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={addEntry}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar outro
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1">
        {pergunta.rotulo}
        {pergunta.obrigatorio && <span className="text-destructive">*</span>}
      </Label>
      {pergunta.descricao && (
        <p className="text-xs text-muted-foreground italic">{pergunta.descricao}</p>
      )}

      {renderSingleField(value, onValueChange)}

      {pergunta.tipo === "resposta_conjunta" && config?.campos && (
        <div className="grid grid-cols-2 gap-4">
          {(config.campos as any[]).map((campo: any, idx: number) => {
            const campoKey = idx === 0 ? "campo1" : "campo2";
            const currentObj = (value as Record<string, any>) || {};
            const campoValue = currentObj[campoKey] || "";
            const campoPermitirMultiplos = campo.permitir_multiplos === true;
            const campoMultiplosMax = campo.multiplos_max as number | undefined;

            const handleCampoChange = (v: any) => {
              onValueChange({ ...currentObj, [campoKey]: v });
            };

            const renderCampoField = (fieldVal: any, onFieldValChange: (v: any) => void) => (
              <>
                {campo.tipo === "texto" && (
                  <Input value={fieldVal || ""} onChange={(e) => onFieldValChange(e.target.value)} placeholder={campo.placeholder || ""} />
                )}
                {campo.tipo === "texto_formatado" && (
                  <Input
                    value={fieldVal || ""}
                    onChange={(e) => {
                      if (campo.mascara) {
                        onFieldValChange(applyMask(e.target.value, campo.mascara));
                      } else {
                        let val = e.target.value.toUpperCase();
                        if (campo.max_chars) val = val.slice(0, campo.max_chars);
                        onFieldValChange(val);
                      }
                    }}
                    placeholder={campo.placeholder || ""}
                    maxLength={campo.mascara ? campo.mascara.length : (campo.max_chars || undefined)}
                    className="font-mono"
                  />
                )}
                {campo.tipo === "numero" && (
                  <Input type="number" value={fieldVal || ""} onChange={(e) => onFieldValChange(e.target.value)} placeholder={campo.placeholder || ""} />
                )}
                {campo.tipo === "email" && (
                  <Input type="email" value={fieldVal || ""} onChange={(e) => onFieldValChange(e.target.value)} placeholder={campo.placeholder || ""} />
                )}
                {campo.tipo === "data" && (
                  <Input type="date" value={fieldVal || ""} onChange={(e) => onFieldValChange(e.target.value)} />
                )}
                {campo.tipo === "select" && campo.opcoes && (() => {
                  const opts = campo.opcoes.map((o: string, i: number) => ({ value: `opt_${i}`, label: o }));
                  const modo = campo.modo_exibicao || "menu";
                  if (modo === "botoes") {
                    return (
                      <ToggleGroup type="single" value={fieldVal || ""} onValueChange={(v) => { if (v) onFieldValChange(v); }} className="flex flex-wrap gap-2 justify-start">
                        {opts.map((opt: any) => (
                          <ToggleGroupItem key={opt.value} value={opt.label} className="border px-3 py-1.5 rounded-md text-sm">{opt.label}</ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    );
                  }
                  if (modo === "radio") {
                    return (
                      <RadioGroup value={fieldVal || ""} onValueChange={onFieldValChange} className="space-y-2">
                        {opts.map((opt: any) => (
                          <div key={opt.value} className="flex items-center gap-2">
                            <RadioGroupItem value={opt.label} id={`${pergunta.id}_${campoKey}_${opt.value}`} />
                            <Label htmlFor={`${pergunta.id}_${campoKey}_${opt.value}`} className="cursor-pointer font-normal">{opt.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    );
                  }
                  return (
                    <SearchableSelect options={opts} value={fieldVal} onValueChange={onFieldValChange} placeholder={campo.placeholder || "Selecione..."} />
                  );
                })()}
                {campo.tipo === "multipla_escolha" && campo.opcoes && (() => {
                  const opts = campo.opcoes.map((o: string, i: number) => ({ value: `opt_${i}`, label: o }));
                  const modo = campo.modo_exibicao || "check";
                  const currentArr: string[] = fieldVal || [];
                  if (modo === "botoes") {
                    return (
                      <ToggleGroup type="multiple" value={currentArr} onValueChange={onFieldValChange} className="flex flex-wrap gap-2 justify-start">
                        {opts.map((opt: any) => (
                          <ToggleGroupItem key={opt.value} value={opt.label} className="border px-3 py-1.5 rounded-md text-sm">{opt.label}</ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    );
                  }
                  if (modo === "menu") {
                    return (
                      <SearchableMultiSelect options={opts} value={currentArr} onValueChange={onFieldValChange} placeholder={campo.placeholder || "Selecione..."} perguntaId={`${pergunta.id}_${campoKey}`} />
                    );
                  }
                  return (
                    <div className="space-y-2">
                      {opts.map((opt: any) => (
                        <div key={opt.value} className="flex items-center gap-2">
                          <Checkbox
                            id={`${pergunta.id}_${campoKey}_${opt.value}`}
                            checked={currentArr.includes(opt.label)}
                            onCheckedChange={(checked) => {
                              if (checked) onFieldValChange([...currentArr, opt.label]);
                              else onFieldValChange(currentArr.filter((v: string) => v !== opt.label));
                            }}
                          />
                          <Label htmlFor={`${pergunta.id}_${campoKey}_${opt.value}`} className="cursor-pointer font-normal">{opt.label}</Label>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            );

            if (campoPermitirMultiplos) {
              const entries: any[] = Array.isArray(campoValue) ? campoValue : (campoValue ? [campoValue] : [""]);
              const canAdd = !campoMultiplosMax || entries.length < campoMultiplosMax;
              return (
                <div key={idx} className="space-y-1">
                  {campo.rotulo && <Label className="text-sm">{campo.rotulo}</Label>}
                  <div className="space-y-2">
                    {entries.map((entry: any, entryIdx: number) => (
                      <div key={entryIdx} className="flex items-start gap-1">
                        <div className="flex-1">
                          {renderCampoField(entry, (v) => {
                            const updated = [...entries];
                            updated[entryIdx] = v;
                            handleCampoChange(updated);
                          })}
                        </div>
                        {entries.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-destructive" onClick={() => {
                            const updated = entries.filter((_, i) => i !== entryIdx);
                            handleCampoChange(updated.length > 0 ? updated : [""]);
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {canAdd && (
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => handleCampoChange([...entries, ""])}>
                      <Plus className="h-3.5 w-3.5" /> Adicionar
                    </Button>
                  )}
                </div>
              );
            }

            return (
              <div key={idx} className="space-y-1">
                {campo.rotulo && <Label className="text-sm">{campo.rotulo}</Label>}
                {renderCampoField(campoValue, handleCampoChange)}
              </div>
            );
          })}
        </div>
      )}

      {pergunta.tipo === "pergunta_condicional" && config?.subperguntas && allValues && allPerguntas && (() => {
        const subperguntas = config.subperguntas as any[];
        const activeSubpergunta = subperguntas.find((sp: any) => {
          if (!sp.condicao) return false;
          const { pergunta_rotulo, valor_gatilho, operador } = sp.condicao;
          const parentPergunta = allPerguntas.find((p) => p.rotulo === pergunta_rotulo);
          if (!parentPergunta) return false;
          const parentValue = allValues[parentPergunta.id];
          if (parentValue === undefined || parentValue === null || parentValue === "") return false;
          const op = operador || "igual";
          switch (op) {
            case "igual": return String(parentValue) === valor_gatilho;
            case "diferente": return String(parentValue) !== valor_gatilho;
            case "contem": return String(parentValue).toLowerCase().includes(valor_gatilho.toLowerCase());
            default: return String(parentValue) === valor_gatilho;
          }
        });

        if (!activeSubpergunta) return null;
        const sp = activeSubpergunta;

        return (
          <div className="space-y-2">
            {sp.rotulo && <Label className="text-sm">{sp.rotulo}</Label>}
            {sp.tipo === "texto" && (
              <Input value={value || ""} onChange={(e) => onValueChange(e.target.value)} placeholder={sp.placeholder || ""} />
            )}
            {sp.tipo === "texto_formatado" && (
              <Input
                value={value || ""}
                onChange={(e) => {
                  if (sp.mascara) {
                    onValueChange(applyMask(e.target.value, sp.mascara));
                  } else {
                    let val = e.target.value.toUpperCase();
                    if (sp.max_chars) val = val.slice(0, sp.max_chars);
                    onValueChange(val);
                  }
                }}
                placeholder={sp.placeholder || ""}
                maxLength={sp.mascara ? sp.mascara.length : (sp.max_chars || undefined)}
                className="font-mono"
              />
            )}
            {sp.tipo === "numero" && (() => {
              const prefixo = sp.numero_prefixo;
              const sufixo = sp.numero_sufixo;
              const input = (
                <Input type="number" value={value || ""} onChange={(e) => onValueChange(e.target.value)} placeholder={sp.placeholder || ""}
                  min={sp.numero_min != null ? sp.numero_min : undefined}
                  max={sp.numero_max != null ? sp.numero_max : undefined}
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
            })()}
            {sp.tipo === "email" && (
              <Input type="email" value={value || ""} onChange={(e) => onValueChange(e.target.value)} placeholder={sp.placeholder || ""} />
            )}
            {sp.tipo === "texto_longo" && (
              <Textarea value={value || ""} onChange={(e) => onValueChange(e.target.value)} placeholder={sp.placeholder || ""} rows={4} />
            )}
            {sp.tipo === "data" && (
              <Input type="date" value={value || ""} onChange={(e) => onValueChange(e.target.value)} />
            )}
            {sp.tipo === "data_hora" && (
              <Input type="datetime-local" value={value || ""} onChange={(e) => onValueChange(e.target.value)} />
            )}
            {sp.tipo === "selecao_unica" && sp.opcoes && (
              <RadioGroup value={value || ""} onValueChange={onValueChange} className="space-y-2">
                {sp.opcoes.map((o: string, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <RadioGroupItem value={o} id={`${pergunta.id}_cond_su_${i}`} />
                    <Label htmlFor={`${pergunta.id}_cond_su_${i}`} className="cursor-pointer font-normal">{o}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            {sp.tipo === "checkbox" && (
              <div className="flex items-center gap-2">
                <Checkbox id={`${pergunta.id}_cond_check`} checked={value === true} onCheckedChange={(checked) => onValueChange(!!checked)} />
                <Label htmlFor={`${pergunta.id}_cond_check`} className="cursor-pointer font-normal">{sp.placeholder || "Sim"}</Label>
              </div>
            )}
            {sp.tipo === "arquivo" && (
              <div>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file) {
                      if (file.size === 0) { toast.error("O arquivo está vazio."); e.target.value = ""; return; }
                      if (file.size > 10 * 1024 * 1024) { toast.error("O arquivo excede 10MB."); e.target.value = ""; return; }
                      const allowed = ["application/pdf","image/jpeg","image/png","image/jpg","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
                      if (!allowed.includes(file.type)) { toast.error("Tipo não permitido. Aceitos: PDF, JPG, PNG, DOC, DOCX."); e.target.value = ""; return; }
                    }
                    onFileChange(file);
                  }}
                />
                {fileData && <p className="text-xs text-muted-foreground mt-1">Arquivo: {fileData.file.name} ({(fileData.file.size / 1024).toFixed(0)}KB)</p>}
              </div>
            )}
            {sp.tipo === "informativo" && (
              <div className="space-y-3">
                <div className="bg-muted/40 rounded-lg p-4 border border-muted">
                  {sp.info_tipo === "imagem" && sp.info_conteudo ? (
                    <img src={sp.info_conteudo} alt={sp.rotulo} className="max-w-full rounded-lg max-h-64 object-contain" />
                  ) : (
                    <div className="flex gap-2">
                      <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground">{sp.rotulo}</p>
                        {sp.info_conteudo && (
                          /<[a-z][\s\S]*>/i.test(sp.info_conteudo)
                            ? <div className="prose-content text-sm text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: sp.info_conteudo }} />
                            : <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{sp.info_conteudo}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {sp.info_exigir_aceite && (
                  <div className="flex items-center gap-2">
                    <Checkbox id={`aceite_cond_${pergunta.id}`} checked={value === true} onCheckedChange={(checked) => onValueChange(!!checked)} />
                    <Label htmlFor={`aceite_cond_${pergunta.id}`} className="cursor-pointer font-normal text-sm">
                      {sp.info_texto_aceite || "Li e aceito as informações acima"}
                    </Label>
                  </div>
                )}
              </div>
            )}
            {sp.tipo === "resposta_conjunta" && sp.conjunta_campos && (
              <div className="grid grid-cols-2 gap-4">
                {(sp.conjunta_campos as any[]).map((campo: any, ci: number) => {
                  const ck = ci === 0 ? "campo1" : "campo2";
                  const obj = (value as Record<string, any>) || {};
                  const cv = obj[ck] || "";
                  const handleCv = (v: any) => onValueChange({ ...obj, [ck]: v });
                  return (
                    <div key={ci} className="space-y-1">
                      {campo.rotulo && <Label className="text-sm">{campo.rotulo}</Label>}
                      {campo.tipo === "texto" && <Input value={cv} onChange={(e) => handleCv(e.target.value)} placeholder={campo.placeholder || ""} />}
                      {campo.tipo === "numero" && <Input type="number" value={cv} onChange={(e) => handleCv(e.target.value)} placeholder={campo.placeholder || ""} />}
                      {campo.tipo === "email" && <Input type="email" value={cv} onChange={(e) => handleCv(e.target.value)} placeholder={campo.placeholder || ""} />}
                      {campo.tipo === "data" && <Input type="date" value={cv} onChange={(e) => handleCv(e.target.value)} />}
                      {campo.tipo === "select" && campo.opcoes && (
                        <SearchableSelect options={campo.opcoes.map((o: string, i: number) => ({ value: `opt_${i}`, label: o }))} value={cv} onValueChange={handleCv} placeholder={campo.placeholder || "Selecione..."} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {sp.tipo === "select" && sp.opcoes && (() => {
              const opts = sp.opcoes.map((o: string, i: number) => ({ value: `opt_${i}`, label: o }));
              const modo = sp.modo_exibicao || "menu";
              if (modo === "botoes") {
                return (
                  <ToggleGroup type="single" value={value || ""} onValueChange={(v) => { if (v) onValueChange(v); }} className="flex flex-wrap gap-2 justify-start">
                    {opts.map((opt: any) => (
                      <ToggleGroupItem key={opt.value} value={opt.label} className="border px-3 py-1.5 rounded-md text-sm">{opt.label}</ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                );
              }
              if (modo === "radio") {
                return (
                  <RadioGroup value={value || ""} onValueChange={onValueChange} className="space-y-2">
                    {opts.map((opt: any) => (
                      <div key={opt.value} className="flex items-center gap-2">
                        <RadioGroupItem value={opt.label} id={`${pergunta.id}_cond_${opt.value}`} />
                        <Label htmlFor={`${pergunta.id}_cond_${opt.value}`} className="cursor-pointer font-normal">{opt.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                );
              }
              return <SearchableSelect options={opts} value={value || ""} onValueChange={onValueChange} placeholder={sp.placeholder || "Selecione..."} />;
            })()}
            {sp.tipo === "multipla_escolha" && sp.opcoes && (() => {
              const opts = sp.opcoes.map((o: string, i: number) => ({ value: `opt_${i}`, label: o }));
              const modo = sp.modo_exibicao || "check";
              const currentArr: string[] = value || [];
              if (modo === "botoes") {
                return (
                  <ToggleGroup type="multiple" value={currentArr} onValueChange={onValueChange} className="flex flex-wrap gap-2 justify-start">
                    {opts.map((opt: any) => (
                      <ToggleGroupItem key={opt.value} value={opt.label} className="border px-3 py-1.5 rounded-md text-sm">{opt.label}</ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                );
              }
              if (modo === "menu") {
                return <SearchableMultiSelect options={opts} value={currentArr} onValueChange={onValueChange} placeholder={sp.placeholder || "Selecione..."} perguntaId={`${pergunta.id}_cond`} />;
              }
              return (
                <div className="space-y-2">
                  {opts.map((opt: any) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${pergunta.id}_cond_${opt.value}`}
                        checked={currentArr.includes(opt.label)}
                        onCheckedChange={(checked) => {
                          if (checked) onValueChange([...currentArr, opt.label]);
                          else onValueChange(currentArr.filter((v: string) => v !== opt.label));
                        }}
                      />
                      <Label htmlFor={`${pergunta.id}_cond_${opt.value}`} className="cursor-pointer font-normal">{opt.label}</Label>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        );
      })()}
    </div>
  );
};

export default FormFieldRenderer;
