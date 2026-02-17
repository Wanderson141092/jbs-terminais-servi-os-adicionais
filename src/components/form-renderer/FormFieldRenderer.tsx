import { useState } from "react";
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
import { Info, Image as ImageIcon, ChevronDown, Search, Check } from "lucide-react";
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
                  /<[a-z][\s\S]*>/i.test(config.conteudo)
                    ? <div className="prose-content text-sm text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: config.conteudo }} />
                    : <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{config.conteudo}</p>
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

      {pergunta.tipo === "texto_formatado" && (() => {
        const mascara = config?.mascara as string | undefined;
        const maxChars = config?.max_chars as number | undefined;
        return (
          <Input
            value={value || ""}
            onChange={(e) => {
              if (mascara) {
                onValueChange(applyMask(e.target.value, mascara));
              } else {
                let val = e.target.value.toUpperCase();
                if (maxChars) val = val.slice(0, maxChars);
                onValueChange(val);
              }
            }}
            placeholder={pergunta.placeholder || ""}
            maxLength={mascara ? mascara.length : (maxChars || undefined)}
            className="font-mono"
          />
        );
      })()}

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

      {pergunta.tipo === "resposta_conjunta" && config?.campos && (
        <div className="grid grid-cols-2 gap-4">
          {(config.campos as any[]).map((campo: any, idx: number) => {
            const campoKey = idx === 0 ? "campo1" : "campo2";
            const currentObj = (value as Record<string, any>) || {};
            const campoValue = currentObj[campoKey] || "";

            const handleCampoChange = (v: any) => {
              onValueChange({ ...currentObj, [campoKey]: v });
            };

            return (
              <div key={idx} className="space-y-1">
                {campo.rotulo && <Label className="text-sm">{campo.rotulo}</Label>}
                {campo.tipo === "texto" && (
                  <Input value={campoValue} onChange={(e) => handleCampoChange(e.target.value)} placeholder={campo.placeholder || ""} />
                )}
                {campo.tipo === "texto_formatado" && (
                  <Input
                    value={campoValue}
                    onChange={(e) => {
                      if (campo.mascara) {
                        handleCampoChange(applyMask(e.target.value, campo.mascara));
                      } else {
                        let val = e.target.value.toUpperCase();
                        if (campo.max_chars) val = val.slice(0, campo.max_chars);
                        handleCampoChange(val);
                      }
                    }}
                    placeholder={campo.placeholder || ""}
                    maxLength={campo.mascara ? campo.mascara.length : (campo.max_chars || undefined)}
                    className="font-mono"
                  />
                )}
                {campo.tipo === "numero" && (
                  <Input type="number" value={campoValue} onChange={(e) => handleCampoChange(e.target.value)} placeholder={campo.placeholder || ""} />
                )}
                {campo.tipo === "email" && (
                  <Input type="email" value={campoValue} onChange={(e) => handleCampoChange(e.target.value)} placeholder={campo.placeholder || ""} />
                )}
                {campo.tipo === "data" && (
                  <Input type="date" value={campoValue} onChange={(e) => handleCampoChange(e.target.value)} />
                )}
                {campo.tipo === "select" && campo.opcoes && (() => {
                  const opts = campo.opcoes.map((o: string, i: number) => ({ value: `opt_${i}`, label: o }));
                  const modo = campo.modo_exibicao || "menu";

                  if (modo === "botoes") {
                    return (
                      <ToggleGroup type="single" value={campoValue || ""} onValueChange={(v) => { if (v) handleCampoChange(v); }} className="flex flex-wrap gap-2 justify-start">
                        {opts.map((opt: any) => (
                          <ToggleGroupItem key={opt.value} value={opt.label} className="border px-3 py-1.5 rounded-md text-sm">{opt.label}</ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    );
                  }
                  if (modo === "radio") {
                    return (
                      <RadioGroup value={campoValue || ""} onValueChange={handleCampoChange} className="space-y-2">
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
                    <SearchableSelect options={opts} value={campoValue} onValueChange={handleCampoChange} placeholder={campo.placeholder || "Selecione..."} />
                  );
                })()}
                {campo.tipo === "multipla_escolha" && campo.opcoes && (() => {
                  const opts = campo.opcoes.map((o: string, i: number) => ({ value: `opt_${i}`, label: o }));
                  const modo = campo.modo_exibicao || "check";
                  const currentArr: string[] = campoValue || [];

                  if (modo === "botoes") {
                    return (
                      <ToggleGroup type="multiple" value={currentArr} onValueChange={handleCampoChange} className="flex flex-wrap gap-2 justify-start">
                        {opts.map((opt: any) => (
                          <ToggleGroupItem key={opt.value} value={opt.label} className="border px-3 py-1.5 rounded-md text-sm">{opt.label}</ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    );
                  }
                  if (modo === "menu") {
                    return (
                      <SearchableMultiSelect options={opts} value={currentArr} onValueChange={handleCampoChange} placeholder={campo.placeholder || "Selecione..."} perguntaId={`${pergunta.id}_${campoKey}`} />
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
                              if (checked) handleCampoChange([...currentArr, opt.label]);
                              else handleCampoChange(currentArr.filter((v: string) => v !== opt.label));
                            }}
                          />
                          <Label htmlFor={`${pergunta.id}_${campoKey}_${opt.value}`} className="cursor-pointer font-normal">{opt.label}</Label>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {pergunta.tipo === "pergunta_condicional" && config?.subperguntas && allValues && allPerguntas && (() => {
        const subperguntas = config.subperguntas as any[];
        // Find the first sub-question whose condition is met
        const activeSubpergunta = subperguntas.find((sp: any) => {
          if (!sp.condicao) return false;
          const { pergunta_rotulo, valor_gatilho, operador } = sp.condicao;
          // Find the parent question by rotulo
          const parentPergunta = allPerguntas.find((p) => p.rotulo === pergunta_rotulo);
          if (!parentPergunta) return false;
          const parentValue = allValues[parentPergunta.id];
          if (parentValue === undefined || parentValue === null || parentValue === "") return false;
          switch (operador) {
            case "igual": return String(parentValue) === valor_gatilho;
            case "diferente": return String(parentValue) !== valor_gatilho;
            case "contem": return String(parentValue).toLowerCase().includes(valor_gatilho.toLowerCase());
            default: return false;
          }
        });

        if (!activeSubpergunta) return null;

        const sp = activeSubpergunta;
        const spKey = `sub_${sp.rotulo}`;

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
            {sp.tipo === "numero" && (
              <Input type="number" value={value || ""} onChange={(e) => onValueChange(e.target.value)} placeholder={sp.placeholder || ""} />
            )}
            {sp.tipo === "email" && (
              <Input type="email" value={value || ""} onChange={(e) => onValueChange(e.target.value)} placeholder={sp.placeholder || ""} />
            )}
            {sp.tipo === "data" && (
              <Input type="date" value={value || ""} onChange={(e) => onValueChange(e.target.value)} />
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
