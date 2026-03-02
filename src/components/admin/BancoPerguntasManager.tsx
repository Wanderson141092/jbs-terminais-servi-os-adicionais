import { useState, useEffect } from "react";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Save, Edit, Trash2, Search, Lock, Unlock, Image, FileText, ClipboardPaste, X, GitBranch } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export const QUESTION_TYPES = [
  { value: "texto", label: "Texto Curto" },
  { value: "texto_longo", label: "Texto Longo" },
  { value: "texto_formatado", label: "Texto Formatado (Máscara)" },
  { value: "numero", label: "Número" },
  { value: "email", label: "E-mail" },
  { value: "data", label: "Data" },
  { value: "data_hora", label: "Data e Hora" },
  { value: "select", label: "Seleção Única" },
  { value: "multipla_escolha", label: "Múltipla Escolha" },
  { value: "checkbox", label: "Checkbox" },
  { value: "arquivo", label: "Upload de Arquivo" },
  { value: "informativo", label: "Bloco Informativo" },
  { value: "resposta_conjunta", label: "Resposta Conjunta" },
  { value: "pergunta_condicional", label: "Pergunta Condicional" },
];

const SUBCAMPO_TYPES = [
  { value: "texto", label: "Texto" },
  { value: "texto_formatado", label: "Texto Formatado" },
  { value: "numero", label: "Número" },
  { value: "select", label: "Seleção Única" },
  { value: "multipla_escolha", label: "Múltipla Escolha" },
  { value: "email", label: "E-mail" },
  { value: "data", label: "Data" },
  { value: "checkbox", label: "Checkbox" },
  { value: "arquivo", label: "Upload de Arquivo" },
  { value: "informativo", label: "Bloco Informativo" },
  { value: "resposta_conjunta", label: "Resposta Conjunta" },
];

export interface BancoPergunta {
  id: string;
  tipo: string;
  rotulo: string;
  descricao: string | null;
  placeholder: string | null;
  opcoes: unknown;
  config: unknown;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const BancoPerguntasManager = () => {
  const [perguntas, setPerguntas] = useState<BancoPergunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<BancoPergunta | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState("");
  const defaultSubpergunta = () => ({
    tipo: "texto", rotulo: "", placeholder: "", opcoes: "", mascara: "", max_chars: "", modo: "menu",
    condicao_pergunta_rotulo: "", condicao_valor: "", condicao_operador: "igual",
    info_tipo: "texto", info_conteudo: "", info_exigir_aceite: false, info_texto_aceite: "Li e aceito os termos acima",
    numero_prefixo: "", numero_sufixo: "", numero_min: "", numero_max: "", numero_permitir_negativo: true,
    conjunta_campos: null as any,
  });

  const [formData, setFormData] = useState({
    tipo: "texto",
    rotulo: "",
    descricao: "",
    placeholder: "",
    opcoes: "",
    largura: 100,
    permitir_multiplos: false,
    multiplos_max: "",
    // email config
    email_bloquear_dominio: false,
    email_dominio_bloqueado: "@jbsterminais.com.br",
    // informativo config
    info_tipo: "texto" as "texto" | "imagem",
    info_conteudo: "",
    info_exigir_aceite: false,
    info_texto_aceite: "Li e aceito os termos acima",
    // texto_formatado config
    formato_mascara: "",
    formato_min_chars: "",
    formato_max_chars: "",
    formato_transformar_maiusculo: true,
    // numero config
    numero_prefixo: "",
    numero_sufixo: "",
    numero_permitir_negativo: true,
    numero_min: "",
    numero_max: "",
    // select / multipla_escolha modo
    selecao_modo: "menu" as "menu" | "botoes" | "radio",
    multipla_modo: "check" as "check" | "menu" | "botoes",
    // resposta_conjunta config
    conjunta_campo1_tipo: "texto",
    conjunta_campo1_rotulo: "",
    conjunta_campo1_placeholder: "",
    conjunta_campo1_opcoes: "",
    conjunta_campo1_mascara: "",
    conjunta_campo1_max_chars: "",
    conjunta_campo1_modo: "menu",
    conjunta_campo1_permitir_multiplos: false,
    conjunta_campo1_multiplos_max: "",
    conjunta_campo2_tipo: "texto",
    conjunta_campo2_rotulo: "",
    conjunta_campo2_placeholder: "",
    conjunta_campo2_opcoes: "",
    conjunta_campo2_mascara: "",
    conjunta_campo2_max_chars: "",
    conjunta_campo2_modo: "menu",
    conjunta_campo2_permitir_multiplos: false,
    conjunta_campo2_multiplos_max: "",
    // pergunta_condicional config
    condicional_subperguntas: [defaultSubpergunta(), defaultSubpergunta()] as Array<ReturnType<typeof defaultSubpergunta>>,
  });

  useEffect(() => {
    fetchPerguntas();
  }, []);

  const fetchPerguntas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("banco_perguntas")
      .select("*")
      .order("created_at", { ascending: false });
    setPerguntas((data as BancoPergunta[]) || []);
    setLoading(false);
  };

  const openDialog = (pergunta?: BancoPergunta) => {
    if (pergunta) {
      setEditing(pergunta);
      const opcoesArr = pergunta.opcoes as { value: string; label: string }[] | null;
      const config = pergunta.config as Record<string, any> | null;
      setFormData({
        tipo: pergunta.tipo,
        rotulo: pergunta.rotulo,
        descricao: pergunta.descricao || "",
        placeholder: pergunta.placeholder || "",
        opcoes: opcoesArr?.map((o) => o.label).join("\n") || "",
        largura: config?.largura ?? 100,
        permitir_multiplos: config?.permitir_multiplos ?? false,
        multiplos_max: config?.multiplos_max?.toString() || "",
        email_bloquear_dominio: config?.bloquear_dominio ?? false,
        email_dominio_bloqueado: config?.dominio_bloqueado || "@jbsterminais.com.br",
        info_tipo: config?.conteudo_tipo || "texto",
        info_conteudo: config?.conteudo || "",
        info_exigir_aceite: config?.exigir_aceite || false,
        info_texto_aceite: config?.texto_aceite || "Li e aceito os termos acima",
        formato_mascara: config?.mascara || "",
        formato_min_chars: config?.min_chars?.toString() || "",
        formato_max_chars: config?.max_chars?.toString() || "",
        formato_transformar_maiusculo: config?.transformar_maiusculo ?? true,
        numero_prefixo: config?.prefixo || "",
        numero_sufixo: config?.sufixo || "",
        numero_permitir_negativo: config?.permitir_negativo ?? true,
        numero_min: config?.min?.toString() || "",
        numero_max: config?.max?.toString() || "",
        selecao_modo: config?.modo_exibicao || "menu",
        multipla_modo: config?.modo_exibicao || "check",
        conjunta_campo1_tipo: config?.campos?.[0]?.tipo || "texto",
        conjunta_campo1_rotulo: config?.campos?.[0]?.rotulo || "",
        conjunta_campo1_placeholder: config?.campos?.[0]?.placeholder || "",
        conjunta_campo1_opcoes: config?.campos?.[0]?.opcoes?.join("\n") || "",
        conjunta_campo1_mascara: config?.campos?.[0]?.mascara || "",
        conjunta_campo1_max_chars: config?.campos?.[0]?.max_chars?.toString() || "",
        conjunta_campo1_modo: config?.campos?.[0]?.modo_exibicao || "menu",
        conjunta_campo1_permitir_multiplos: config?.campos?.[0]?.permitir_multiplos ?? false,
        conjunta_campo1_multiplos_max: config?.campos?.[0]?.multiplos_max?.toString() || "",
        conjunta_campo2_tipo: config?.campos?.[1]?.tipo || "texto",
        conjunta_campo2_rotulo: config?.campos?.[1]?.rotulo || "",
        conjunta_campo2_placeholder: config?.campos?.[1]?.placeholder || "",
        conjunta_campo2_opcoes: config?.campos?.[1]?.opcoes?.join("\n") || "",
        conjunta_campo2_mascara: config?.campos?.[1]?.mascara || "",
        conjunta_campo2_max_chars: config?.campos?.[1]?.max_chars?.toString() || "",
        conjunta_campo2_modo: config?.campos?.[1]?.modo_exibicao || "menu",
        conjunta_campo2_permitir_multiplos: config?.campos?.[1]?.permitir_multiplos ?? false,
        conjunta_campo2_multiplos_max: config?.campos?.[1]?.multiplos_max?.toString() || "",
        condicional_subperguntas: config?.subperguntas
          ? (config.subperguntas as any[]).map((sp: any) => ({
              tipo: sp.tipo || "texto",
              rotulo: sp.rotulo || "",
              placeholder: sp.placeholder || "",
              opcoes: sp.opcoes?.join("\n") || "",
              mascara: sp.mascara || "",
              max_chars: sp.max_chars?.toString() || "",
              modo: sp.modo_exibicao || "menu",
              condicao_pergunta_rotulo: sp.condicao?.pergunta_rotulo || "",
              condicao_valor: sp.condicao?.valor_gatilho || "",
              condicao_operador: sp.condicao?.operador || "igual",
              info_tipo: sp.info_tipo || "texto",
              info_conteudo: sp.info_conteudo || "",
              info_exigir_aceite: sp.info_exigir_aceite || false,
              info_texto_aceite: sp.info_texto_aceite || "Li e aceito os termos acima",
              numero_prefixo: sp.numero_prefixo || "",
              numero_sufixo: sp.numero_sufixo || "",
              numero_min: sp.numero_min?.toString() || "",
              numero_max: sp.numero_max?.toString() || "",
              numero_permitir_negativo: sp.numero_permitir_negativo ?? true,
              conjunta_campos: sp.conjunta_campos || null,
            }))
          : [defaultSubpergunta(), defaultSubpergunta()],
      });
    } else {
      setEditing(null);
      setFormData({
        tipo: "texto",
        rotulo: "",
        descricao: "",
        placeholder: "",
        opcoes: "",
        largura: 100,
        permitir_multiplos: false,
        multiplos_max: "",
        email_bloquear_dominio: false,
        email_dominio_bloqueado: "@jbsterminais.com.br",
        info_tipo: "texto",
        info_conteudo: "",
        info_exigir_aceite: false,
        info_texto_aceite: "Li e aceito os termos acima",
        formato_mascara: "",
        formato_min_chars: "",
        formato_max_chars: "",
        formato_transformar_maiusculo: true,
        numero_prefixo: "",
        numero_sufixo: "",
        numero_permitir_negativo: true,
        numero_min: "",
        numero_max: "",
        selecao_modo: "menu",
        multipla_modo: "check",
        conjunta_campo1_tipo: "texto",
        conjunta_campo1_rotulo: "",
        conjunta_campo1_placeholder: "",
        conjunta_campo1_opcoes: "",
        conjunta_campo1_mascara: "",
        conjunta_campo1_max_chars: "",
        conjunta_campo1_modo: "menu",
        conjunta_campo1_permitir_multiplos: false,
        conjunta_campo1_multiplos_max: "",
        conjunta_campo2_tipo: "texto",
        conjunta_campo2_rotulo: "",
        conjunta_campo2_placeholder: "",
        conjunta_campo2_opcoes: "",
        conjunta_campo2_mascara: "",
        conjunta_campo2_max_chars: "",
        conjunta_campo2_modo: "menu",
        conjunta_campo2_permitir_multiplos: false,
        conjunta_campo2_multiplos_max: "",
        condicional_subperguntas: [defaultSubpergunta(), defaultSubpergunta()],
      });
    }
    setShowDialog(true);
  };

  const save = async () => {
    if (!formData.rotulo.trim()) {
      toast.error("Rótulo é obrigatório");
      return;
    }

    const opcoes = formData.opcoes
      .split("\n")
      .filter((o) => o.trim())
      .map((o, i) => ({ value: `opt_${i}`, label: o.trim() }));

    const config: Record<string, any> = {};
    if (formData.tipo === "informativo") {
      config.conteudo_tipo = formData.info_tipo;
      config.conteudo = formData.info_conteudo;
      config.exigir_aceite = formData.info_exigir_aceite;
      config.texto_aceite = formData.info_texto_aceite;
    }
    if (formData.tipo === "texto_formatado") {
      config.mascara = formData.formato_mascara;
      config.min_chars = formData.formato_min_chars ? parseInt(formData.formato_min_chars) : null;
      config.max_chars = formData.formato_max_chars ? parseInt(formData.formato_max_chars) : null;
      config.transformar_maiusculo = formData.formato_transformar_maiusculo;
    }
    if (formData.tipo === "numero") {
      config.prefixo = formData.numero_prefixo || null;
      config.sufixo = formData.numero_sufixo || null;
      config.permitir_negativo = formData.numero_permitir_negativo;
      config.min = formData.numero_min ? parseFloat(formData.numero_min) : null;
      config.max = formData.numero_max ? parseFloat(formData.numero_max) : null;
    }
    if (formData.tipo === "email") {
      if (formData.email_bloquear_dominio) {
        config.bloquear_dominio = true;
        config.dominio_bloqueado = formData.email_dominio_bloqueado || "@jbsterminais.com.br";
      }
    }
    if (formData.tipo === "select") {
      config.modo_exibicao = formData.selecao_modo;
    }
    if (formData.tipo === "multipla_escolha") {
      config.modo_exibicao = formData.multipla_modo;
    }
    if (formData.tipo === "resposta_conjunta") {
      const buildCampo = (prefix: "conjunta_campo1" | "conjunta_campo2") => {
        const tipo = formData[`${prefix}_tipo`];
        const opcoes = formData[`${prefix}_opcoes`]
          .split("\n").filter((o: string) => o.trim()).map((o: string) => o.trim());
        const campo: Record<string, any> = {
          tipo,
          rotulo: formData[`${prefix}_rotulo`],
          placeholder: formData[`${prefix}_placeholder`],
          opcoes: opcoes.length > 0 ? opcoes : null,
          mascara: formData[`${prefix}_mascara`] || null,
          max_chars: formData[`${prefix}_max_chars`] ? parseInt(formData[`${prefix}_max_chars`]) : null,
          modo_exibicao: (tipo === "select" || tipo === "multipla_escolha") ? formData[`${prefix}_modo`] : null,
        };
        const permitirKey = `${prefix}_permitir_multiplos` as keyof typeof formData;
        const maxKey = `${prefix}_multiplos_max` as keyof typeof formData;
        if (formData[permitirKey]) {
          campo.permitir_multiplos = true;
          if (formData[maxKey]) campo.multiplos_max = parseInt(formData[maxKey] as string);
        }
        return campo;
      };
      config.campos = [buildCampo("conjunta_campo1"), buildCampo("conjunta_campo2")];
    }
    if (formData.tipo === "pergunta_condicional") {
      config.subperguntas = formData.condicional_subperguntas.map((sp) => {
        const opcoes = sp.opcoes.split("\n").filter((o) => o.trim()).map((o) => o.trim());
        const sub: Record<string, any> = {
          tipo: sp.tipo,
          rotulo: sp.rotulo,
          placeholder: sp.placeholder || null,
          opcoes: opcoes.length > 0 ? opcoes : null,
          mascara: sp.mascara || null,
          max_chars: sp.max_chars ? parseInt(sp.max_chars) : null,
          modo_exibicao: (sp.tipo === "select" || sp.tipo === "multipla_escolha") ? sp.modo : null,
          condicao: {
            pergunta_rotulo: sp.condicao_pergunta_rotulo,
            valor_gatilho: sp.condicao_valor,
            operador: sp.condicao_operador,
          },
        };
        if (sp.tipo === "informativo") {
          sub.info_tipo = sp.info_tipo;
          sub.info_conteudo = sp.info_conteudo;
          sub.info_exigir_aceite = sp.info_exigir_aceite;
          sub.info_texto_aceite = sp.info_texto_aceite;
        }
        if (sp.tipo === "numero") {
          sub.numero_prefixo = sp.numero_prefixo || null;
          sub.numero_sufixo = sp.numero_sufixo || null;
          sub.numero_min = sp.numero_min ? parseFloat(sp.numero_min) : null;
          sub.numero_max = sp.numero_max ? parseFloat(sp.numero_max) : null;
          sub.numero_permitir_negativo = sp.numero_permitir_negativo;
        }
        if (sp.tipo === "resposta_conjunta" && sp.conjunta_campos) {
          sub.conjunta_campos = sp.conjunta_campos;
        }
        return sub;
      });
    }
    // Always save largura if not 100
    if (formData.largura && formData.largura !== 100) {
      config.largura = formData.largura;
    }
    // Save permitir_multiplos
    if (formData.permitir_multiplos) {
      config.permitir_multiplos = true;
      if (formData.multiplos_max) {
        config.multiplos_max = parseInt(formData.multiplos_max);
      }
    }

    const payload = {
      tipo: formData.tipo,
      rotulo: formData.rotulo,
      descricao: formData.descricao || null,
      placeholder: formData.placeholder || null,
      opcoes: opcoes.length > 0 ? opcoes : null,
      config: Object.keys(config).length > 0 ? config : {},
    };

    if (editing) {
      const { error } = await supabase
        .from("banco_perguntas")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar pergunta"); return; }
      toast.success("Pergunta atualizada!");
    } else {
      const { error } = await supabase.from("banco_perguntas").insert(payload);
      if (error) { toast.error("Erro ao criar pergunta"); return; }
      toast.success("Pergunta criada!");
    }

    setShowDialog(false);
    fetchPerguntas();
  };

  const toggleAtivo = async (p: BancoPergunta) => {
    const { error } = await supabase
      .from("banco_perguntas")
      .update({ ativo: !p.ativo, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) { toast.error("Erro ao alterar status"); return; }
    toast.success(p.ativo ? "Pergunta bloqueada" : "Pergunta desbloqueada");
    fetchPerguntas();
  };

  const deletePergunta = async (p: BancoPergunta) => {
    const { error } = await supabase.from("banco_perguntas").delete().eq("id", p.id);
    if (error) {
      if (error.message.includes("foreign key")) {
        toast.error("Esta pergunta está vinculada a formulários. Remova os vínculos primeiro.");
      } else {
        toast.error("Erro ao excluir pergunta");
      }
      return;
    }
    toast.success("Pergunta excluída!");
    fetchPerguntas();
  };

  const filtered = perguntas.filter(
    (p) =>
      p.rotulo.toLowerCase().includes(search.toLowerCase()) ||
      p.tipo.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pergunta..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Pergunta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Banco de Perguntas ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rótulo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className={!p.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{p.rotulo}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {QUESTION_TYPES.find((t) => t.value === p.tipo)?.label || p.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {p.descricao || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.ativo ? "default" : "secondary"} className="text-xs">
                      {p.ativo ? "Ativa" : "Bloqueada"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(p)} title="Editar">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => toggleAtivo(p)} title={p.ativo ? "Bloquear" : "Desbloquear"}>
                        {p.ativo ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deletePergunta(p)} className="text-destructive hover:text-destructive" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma pergunta encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Criação/Edição */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Pergunta" : "Nova Pergunta"}</DialogTitle>
            <DialogDescription>Configure os detalhes da pergunta que poderá ser usada em múltiplos formulários</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-[35%]">
                <Label>Tipo de Pergunta</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Label>Rótulo / Título</Label>
                <Input value={formData.rotulo} onChange={(e) => setFormData({ ...formData, rotulo: e.target.value })} placeholder="Ex: Nome completo" />
              </div>
            </div>
            <div>
              <Label>Subtítulo / Descrição</Label>
              <p className="text-xs text-muted-foreground mb-1">Texto exibido abaixo do rótulo no formulário (itálico, fonte menor)</p>
              <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Ex: Preencha conforme documento oficial" />
            </div>

            {formData.tipo !== "informativo" && formData.tipo !== "checkbox" && (
              <div>
                <Label>Placeholder</Label>
                <Input value={formData.placeholder} onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })} placeholder="Texto de ajuda no campo" />
              </div>
            )}

            <div>
              <Label>Largura no Formulário: {formData.largura}%</Label>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground">25%</span>
                <Slider
                  value={[formData.largura]}
                  onValueChange={(v) => setFormData({ ...formData, largura: v[0] })}
                  min={25}
                  max={100}
                  step={5}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground">100%</span>
              </div>
            </div>

            {!["informativo", "checkbox", "resposta_conjunta", "pergunta_condicional", "multipla_escolha", "anexo"].includes(formData.tipo) && (
              <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Permitir múltiplas respostas</Label>
                    <p className="text-xs text-muted-foreground">Adiciona botão + para o usuário incluir mais campos</p>
                  </div>
                  <Switch
                    checked={formData.permitir_multiplos}
                    onCheckedChange={(checked) => setFormData({ ...formData, permitir_multiplos: checked })}
                  />
                </div>
                {formData.permitir_multiplos && (
                  <div>
                    <Label>Máximo de campos (deixe vazio para ilimitado)</Label>
                    <Input
                      type="number"
                      min={2}
                      max={50}
                      value={formData.multiplos_max}
                      onChange={(e) => setFormData({ ...formData, multiplos_max: e.target.value })}
                      placeholder="Ilimitado"
                      className="w-32 mt-1"
                    />
                  </div>
                )}
              </div>
            )}

            {(formData.tipo === "select" || formData.tipo === "multipla_escolha") && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label>Opções (uma por linha)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => { setImportText(""); setShowImportDialog(true); }}
                    >
                      <ClipboardPaste className="h-4 w-4 mr-1" />
                      Importar
                    </Button>
                  </div>
                  <Textarea value={formData.opcoes} onChange={(e) => setFormData({ ...formData, opcoes: e.target.value })} placeholder={"Opção 1\nOpção 2\nOpção 3"} rows={4} />
                </div>
                {formData.tipo === "select" && (
                  <div>
                    <Label>Modo de Exibição</Label>
                    <Select value={formData.selecao_modo} onValueChange={(v) => setFormData({ ...formData, selecao_modo: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="menu">Menu (dropdown)</SelectItem>
                        <SelectItem value="botoes">Botões</SelectItem>
                        <SelectItem value="radio">Radio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.tipo === "multipla_escolha" && (
                  <div>
                    <Label>Modo de Exibição</Label>
                    <Select value={formData.multipla_modo} onValueChange={(v) => setFormData({ ...formData, multipla_modo: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="check">Check (checkbox)</SelectItem>
                        <SelectItem value="menu">Menu (dropdown multi)</SelectItem>
                        <SelectItem value="botoes">Botões</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {formData.tipo === "numero" && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <Label className="text-base font-semibold">Configuração do Campo Numérico</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prefixo</Label>
                    <Input value={formData.numero_prefixo} onChange={(e) => setFormData({ ...formData, numero_prefixo: e.target.value })} placeholder="Ex: R$, US$" />
                  </div>
                  <div>
                    <Label>Sufixo</Label>
                    <Input value={formData.numero_sufixo} onChange={(e) => setFormData({ ...formData, numero_sufixo: e.target.value })} placeholder="Ex: kg, un, %" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Número Mínimo</Label>
                    <Input type="number" value={formData.numero_min} onChange={(e) => setFormData({ ...formData, numero_min: e.target.value })} placeholder="Ex: 0" />
                  </div>
                  <div>
                    <Label>Número Máximo</Label>
                    <Input type="number" value={formData.numero_max} onChange={(e) => setFormData({ ...formData, numero_max: e.target.value })} placeholder="Ex: 1000" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.numero_permitir_negativo}
                    onCheckedChange={(c) => setFormData({ ...formData, numero_permitir_negativo: !!c })}
                    id="numero_negativo"
                  />
                  <Label htmlFor="numero_negativo" className="cursor-pointer">Permitir números negativos</Label>
                </div>
              </div>
            )}

            {formData.tipo === "email" && (
              <div className="space-y-3 border rounded-lg p-4 bg-muted/20">
                <Label className="text-base font-semibold">Configuração do E-mail</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.email_bloquear_dominio}
                    onCheckedChange={(c) => setFormData({ ...formData, email_bloquear_dominio: !!c })}
                    id="email_bloquear_dominio"
                  />
                  <Label htmlFor="email_bloquear_dominio" className="cursor-pointer">Bloquear domínio de e-mail específico</Label>
                </div>
                {formData.email_bloquear_dominio && (
                  <div>
                    <Label>Domínio bloqueado</Label>
                    <Input
                      value={formData.email_dominio_bloqueado}
                      onChange={(e) => setFormData({ ...formData, email_dominio_bloqueado: e.target.value })}
                      placeholder="@jbsterminais.com.br"
                    />
                    <p className="text-xs text-muted-foreground mt-1">E-mails com este domínio serão bloqueados ao preencher o formulário.</p>
                  </div>
                )}
              </div>
            )}

            {formData.tipo === "texto_formatado" && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <Label className="text-base font-semibold">Configuração de Formato</Label>
                <p className="text-xs text-muted-foreground -mt-2">
                  Use "A" para letras, "9" para números, "X" para letra ou número,
                  e qualquer outro caractere será fixo (separador).
                </p>
                <div>
                  <Label>Máscara de formato</Label>
                  <Input
                    value={formData.formato_mascara}
                    onChange={(e) => setFormData({ ...formData, formato_mascara: e.target.value.toUpperCase() })}
                    placeholder="Ex: AAAU9999999 ou XXX-9999"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Exemplos: Contêiner = AAAU9999999 | CPF = 999.999.999-99 | Código Misto = XXX-9999
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Mín. caracteres</Label>
                    <Input
                      type="number"
                      value={formData.formato_min_chars}
                      onChange={(e) => setFormData({ ...formData, formato_min_chars: e.target.value })}
                      placeholder="Ex: 11"
                    />
                  </div>
                  <div>
                    <Label>Máx. caracteres</Label>
                    <Input
                      type="number"
                      value={formData.formato_max_chars}
                      onChange={(e) => setFormData({ ...formData, formato_max_chars: e.target.value })}
                      placeholder="Ex: 14"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.formato_transformar_maiusculo}
                    onCheckedChange={(c) => setFormData({ ...formData, formato_transformar_maiusculo: !!c })}
                    id="formato_maiusculo"
                  />
                  <Label htmlFor="formato_maiusculo" className="cursor-pointer">Transformar em maiúsculo automaticamente</Label>
                </div>
              </div>
            )}

            {formData.tipo === "resposta_conjunta" && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <Label className="text-base font-semibold">Configuração da Resposta Conjunta</Label>
                {([1, 2] as const).map((num) => {
                  const prefix = `conjunta_campo${num}` as "conjunta_campo1" | "conjunta_campo2";
                  const tipoKey = `${prefix}_tipo` as keyof typeof formData;
                  const rotuloKey = `${prefix}_rotulo` as keyof typeof formData;
                  const placeholderKey = `${prefix}_placeholder` as keyof typeof formData;
                  const opcoesKey = `${prefix}_opcoes` as keyof typeof formData;
                  const mascaraKey = `${prefix}_mascara` as keyof typeof formData;
                  const maxCharsKey = `${prefix}_max_chars` as keyof typeof formData;
                  const modoKey = `${prefix}_modo` as keyof typeof formData;
                  const permitirMultKey = `${prefix}_permitir_multiplos` as keyof typeof formData;
                  const multiplosMaxKey = `${prefix}_multiplos_max` as keyof typeof formData;
                  const tipoValue = formData[tipoKey] as string;
                  const isSelecao = tipoValue === "select" || tipoValue === "multipla_escolha";
                  return (
                    <div key={num} className="border rounded-md p-3 space-y-3 bg-background">
                      <Label className="font-semibold">Subcampo {num}</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Tipo</Label>
                          <Select value={tipoValue} onValueChange={(v) => setFormData({ ...formData, [tipoKey]: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SUBCAMPO_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Rótulo</Label>
                          <Input value={formData[rotuloKey] as string} onChange={(e) => setFormData({ ...formData, [rotuloKey]: e.target.value })} placeholder="Ex: Prefixo" />
                        </div>
                      </div>
                      <div>
                        <Label>Placeholder</Label>
                        <Input value={formData[placeholderKey] as string} onChange={(e) => setFormData({ ...formData, [placeholderKey]: e.target.value })} placeholder="Texto de ajuda" />
                      </div>
                      {isSelecao && (
                        <>
                          <div>
                            <Label>Opções (uma por linha)</Label>
                            <Textarea value={formData[opcoesKey] as string} onChange={(e) => setFormData({ ...formData, [opcoesKey]: e.target.value })} placeholder={"Opção 1\nOpção 2"} rows={3} />
                          </div>
                          <div>
                            <Label>Modo de exibição</Label>
                            <Select value={formData[modoKey] as string} onValueChange={(v) => setFormData({ ...formData, [modoKey]: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="menu">Menu (dropdown)</SelectItem>
                                <SelectItem value="botoes">Botões</SelectItem>
                                {tipoValue === "select" && <SelectItem value="radio">Radio</SelectItem>}
                                {tipoValue === "multipla_escolha" && <SelectItem value="check">Checkbox</SelectItem>}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                      {tipoValue === "texto_formatado" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Máscara</Label>
                            <Input value={formData[mascaraKey] as string} onChange={(e) => setFormData({ ...formData, [mascaraKey]: e.target.value.toUpperCase() })} placeholder="Ex: 9999" className="font-mono" />
                          </div>
                          <div>
                            <Label>Máx. caracteres</Label>
                            <Input type="number" value={formData[maxCharsKey] as string} onChange={(e) => setFormData({ ...formData, [maxCharsKey]: e.target.value })} placeholder="Ex: 4" />
                          </div>
                        </div>
                      )}
                      {/* Permitir múltiplas respostas per subcampo */}
                      <div className="space-y-2 border-t pt-2 mt-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={formData[permitirMultKey] as boolean}
                            onCheckedChange={(c) => setFormData({ ...formData, [permitirMultKey]: !!c })}
                            id={`${prefix}_permitir_mult`}
                          />
                          <Label htmlFor={`${prefix}_permitir_mult`} className="cursor-pointer text-sm">Permitir múltiplas respostas</Label>
                        </div>
                        {formData[permitirMultKey] && (
                          <div>
                            <Label className="text-xs">Máximo (vazio = ilimitado)</Label>
                            <Input
                              type="number"
                              min={2}
                              max={50}
                              value={formData[multiplosMaxKey] as string}
                              onChange={(e) => setFormData({ ...formData, [multiplosMaxKey]: e.target.value })}
                              placeholder="Ilimitado"
                              className="w-32 mt-1"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {formData.tipo === "pergunta_condicional" && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Sub-perguntas Condicionais
                </Label>
                <p className="text-xs text-muted-foreground -mt-2">
                  Cada sub-pergunta será exibida apenas quando a condição for satisfeita. Informe o rótulo exato da pergunta-gatilho.
                </p>
                {formData.condicional_subperguntas.map((sp, idx) => {
                  const updateSub = (field: string, val: any) => {
                    const updated = [...formData.condicional_subperguntas];
                    updated[idx] = { ...updated[idx], [field]: val };
                    setFormData({ ...formData, condicional_subperguntas: updated });
                  };
                  const isSelecao = sp.tipo === "select" || sp.tipo === "multipla_escolha";
                  return (
                    <div key={idx} className="border rounded-md p-3 space-y-3 bg-background relative">
                      <div className="flex items-center justify-between">
                        <Label className="font-semibold">Sub-pergunta {idx + 1}</Label>
                        {formData.condicional_subperguntas.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => {
                              const updated = formData.condicional_subperguntas.filter((_, i) => i !== idx);
                              setFormData({ ...formData, condicional_subperguntas: updated });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {/* Condição */}
                      <div className="border-l-4 border-primary/30 pl-3 space-y-2">
                        <Label className="text-xs font-semibold text-primary">Condição (obrigatória)</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Pergunta-gatilho</Label>
                            <Select value={sp.condicao_pergunta_rotulo} onValueChange={(v) => updateSub("condicao_pergunta_rotulo", v)}>
                              <SelectTrigger><SelectValue placeholder="Selecione a pergunta" /></SelectTrigger>
                              <SelectContent>
                                {perguntas
                                  .filter((p) => p.ativo && p.rotulo !== formData.rotulo)
                                  .map((p) => (
                                    <SelectItem key={p.id} value={p.rotulo}>{p.rotulo}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Operador</Label>
                            <Select value={sp.condicao_operador} onValueChange={(v) => updateSub("condicao_operador", v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="igual">Igual</SelectItem>
                                <SelectItem value="diferente">Diferente</SelectItem>
                                <SelectItem value="contem">Contém</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Valor gatilho</Label>
                            <Input value={sp.condicao_valor} onChange={(e) => updateSub("condicao_valor", e.target.value)} placeholder="Ex: Importação" />
                          </div>
                        </div>
                      </div>
                      {/* Pergunta */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Tipo</Label>
                          <Select value={sp.tipo} onValueChange={(v) => updateSub("tipo", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {SUBCAMPO_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Rótulo</Label>
                          <Input value={sp.rotulo} onChange={(e) => updateSub("rotulo", e.target.value)} placeholder="Ex: Número do Container" />
                        </div>
                      </div>
                      {!["informativo", "checkbox"].includes(sp.tipo) && (
                        <div>
                          <Label>Placeholder</Label>
                          <Input value={sp.placeholder} onChange={(e) => updateSub("placeholder", e.target.value)} placeholder="Texto de ajuda" />
                        </div>
                      )}
                      {isSelecao && (
                        <>
                          <div>
                            <Label>Opções (uma por linha)</Label>
                            <Textarea value={sp.opcoes} onChange={(e) => updateSub("opcoes", e.target.value)} placeholder={"Opção 1\nOpção 2"} rows={3} />
                          </div>
                          <div>
                            <Label>Modo de exibição</Label>
                            <Select value={sp.modo} onValueChange={(v) => updateSub("modo", v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="menu">Menu (dropdown)</SelectItem>
                                <SelectItem value="botoes">Botões</SelectItem>
                                {sp.tipo === "select" && <SelectItem value="radio">Radio</SelectItem>}
                                {sp.tipo === "multipla_escolha" && <SelectItem value="check">Checkbox</SelectItem>}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                      {sp.tipo === "texto_formatado" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Máscara</Label>
                            <Input value={sp.mascara} onChange={(e) => updateSub("mascara", e.target.value.toUpperCase())} placeholder="Ex: AAAU9999999" className="font-mono" />
                          </div>
                          <div>
                            <Label>Máx. caracteres</Label>
                            <Input type="number" value={sp.max_chars} onChange={(e) => updateSub("max_chars", e.target.value)} placeholder="Ex: 11" />
                          </div>
                        </div>
                      )}
                      {sp.tipo === "numero" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Prefixo</Label>
                              <Input value={sp.numero_prefixo} onChange={(e) => updateSub("numero_prefixo", e.target.value)} placeholder="Ex: R$" />
                            </div>
                            <div>
                              <Label>Sufixo</Label>
                              <Input value={sp.numero_sufixo} onChange={(e) => updateSub("numero_sufixo", e.target.value)} placeholder="Ex: kg" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Mínimo</Label>
                              <Input type="number" value={sp.numero_min} onChange={(e) => updateSub("numero_min", e.target.value)} placeholder="0" />
                            </div>
                            <div>
                              <Label>Máximo</Label>
                              <Input type="number" value={sp.numero_max} onChange={(e) => updateSub("numero_max", e.target.value)} placeholder="1000" />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox checked={sp.numero_permitir_negativo} onCheckedChange={(c) => updateSub("numero_permitir_negativo", !!c)} id={`sp_neg_${idx}`} />
                            <Label htmlFor={`sp_neg_${idx}`} className="cursor-pointer text-sm">Permitir negativos</Label>
                          </div>
                        </div>
                      )}
                      {sp.tipo === "informativo" && (
                        <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
                          <Label className="text-sm font-semibold">Configuração do Bloco Informativo</Label>
                          <div>
                            <Label className="text-xs">Tipo de Conteúdo</Label>
                            <Select value={sp.info_tipo} onValueChange={(v) => updateSub("info_tipo", v)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="texto"><span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Texto</span></SelectItem>
                                <SelectItem value="imagem"><span className="flex items-center gap-2"><Image className="h-4 w-4" /> Imagem (URL)</span></SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">{sp.info_tipo === "texto" ? "Conteúdo do Texto" : "URL da Imagem"}</Label>
                            {sp.info_tipo === "texto" ? (
                              <RichTextEditor content={sp.info_conteudo} onChange={(html) => updateSub("info_conteudo", html)} />
                            ) : (
                              <Input value={sp.info_conteudo} onChange={(e) => updateSub("info_conteudo", e.target.value)} placeholder="https://exemplo.com/imagem.png" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox checked={sp.info_exigir_aceite} onCheckedChange={(c) => updateSub("info_exigir_aceite", !!c)} id={`sp_aceite_${idx}`} />
                            <Label htmlFor={`sp_aceite_${idx}`} className="cursor-pointer text-sm">Exigir campo de aceite</Label>
                          </div>
                          {sp.info_exigir_aceite && (
                            <div>
                              <Label className="text-xs">Texto do Aceite</Label>
                              <Input value={sp.info_texto_aceite} onChange={(e) => updateSub("info_texto_aceite", e.target.value)} placeholder="Li e aceito os termos acima" />
                            </div>
                          )}
                        </div>
                      )}
                      {sp.tipo === "resposta_conjunta" && (
                        <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
                          <Label className="text-sm font-semibold">Configuração da Resposta Conjunta</Label>
                          {[0, 1].map((ci) => {
                            const campos = sp.conjunta_campos || [{}, {}];
                            const campo = campos[ci] || {};
                            const updateCampo = (field: string, val: any) => {
                              const newCampos = [...(sp.conjunta_campos || [{}, {}])];
                              newCampos[ci] = { ...newCampos[ci], [field]: val };
                              updateSub("conjunta_campos", newCampos);
                            };
                            return (
                              <div key={ci} className="border rounded-md p-2 space-y-2 bg-background">
                                <Label className="text-xs font-semibold">Campo {ci + 1}</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <Label className="text-xs">Tipo</Label>
                                    <Select value={campo.tipo || "texto"} onValueChange={(v) => updateCampo("tipo", v)}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        {SUBCAMPO_TYPES.filter(t => t.value !== "resposta_conjunta" && t.value !== "informativo" && t.value !== "arquivo" && t.value !== "checkbox").map((t) => (
                                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Rótulo</Label>
                                    <Input value={campo.rotulo || ""} onChange={(e) => updateCampo("rotulo", e.target.value)} placeholder="Rótulo" />
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs">Placeholder</Label>
                                  <Input value={campo.placeholder || ""} onChange={(e) => updateCampo("placeholder", e.target.value)} placeholder="Placeholder" />
                                </div>
                                {(campo.tipo === "select" || campo.tipo === "multipla_escolha") && (
                                  <div>
                                    <Label className="text-xs">Opções (uma por linha)</Label>
                                    <Textarea value={campo.opcoes?.join?.("\n") || ""} onChange={(e) => updateCampo("opcoes", e.target.value.split("\n").filter((o: string) => o.trim()))} rows={2} />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      condicional_subperguntas: [
                        ...formData.condicional_subperguntas,
                        defaultSubpergunta(),
                      ],
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Sub-pergunta
                </Button>
              </div>
            )}

            {formData.tipo === "informativo" && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/20">
                <Label className="text-base font-semibold">Configuração do Bloco Informativo</Label>
                <div>
                  <Label>Tipo de Conteúdo</Label>
                  <Select value={formData.info_tipo} onValueChange={(v) => setFormData({ ...formData, info_tipo: v as "texto" | "imagem" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="texto">
                        <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Texto</span>
                      </SelectItem>
                      <SelectItem value="imagem">
                        <span className="flex items-center gap-2"><Image className="h-4 w-4" /> Imagem (URL)</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{formData.info_tipo === "texto" ? "Conteúdo do Texto" : "URL da Imagem"}</Label>
                  {formData.info_tipo === "texto" ? (
                    <RichTextEditor
                      content={formData.info_conteudo}
                      onChange={(html) => setFormData({ ...formData, info_conteudo: html })}
                    />
                  ) : (
                    <Input
                      value={formData.info_conteudo}
                      onChange={(e) => setFormData({ ...formData, info_conteudo: e.target.value })}
                      placeholder="https://exemplo.com/imagem.png"
                    />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.info_exigir_aceite}
                    onCheckedChange={(c) => setFormData({ ...formData, info_exigir_aceite: !!c })}
                    id="info_aceite"
                  />
                  <Label htmlFor="info_aceite" className="cursor-pointer">Exigir campo de aceite</Label>
                </div>
                {formData.info_exigir_aceite && (
                  <div>
                    <Label>Texto do Aceite</Label>
                    <Input
                      value={formData.info_texto_aceite}
                      onChange={(e) => setFormData({ ...formData, info_texto_aceite: e.target.value })}
                      placeholder="Li e aceito os termos acima"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={save}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Importação de Opções */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar Opções</DialogTitle>
            <DialogDescription>
              Cole as opções abaixo (uma por linha ou separadas por ponto-e-vírgula). Você pode editar antes de importar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"Cole aqui as opções...\nOpção A\nOpção B\nOu separadas por ; Ex: Opção A;Opção B;Opção C"}
              rows={10}
            />
            <p className="text-sm text-muted-foreground">
              {(() => {
                const count = importText
                  .split(/[\n;]/)
                  .map((l) => l.trim())
                  .filter((l) => l.length > 0).length;
                return count > 0 ? `${count} opção(ões) detectada(s)` : "Nenhuma opção detectada";
              })()}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                const lines = importText
                  .split(/[\n;]/)
                  .map((l) => l.trim())
                  .filter((l) => l.length > 0);
                if (lines.length === 0) {
                  toast.error("Nenhuma opção para importar");
                  return;
                }
                const current = formData.opcoes.trim();
                const allLines = current ? current.split("\n").concat(lines) : lines;
                const unique = [...new Set(allLines.map((l) => l.trim()).filter((l) => l.length > 0))];
                setFormData({ ...formData, opcoes: unique.join("\n") });
                setShowImportDialog(false);
                toast.success(`${lines.length} opção(ões) importada(s)`);
              }}
              disabled={importText.split(/[\n;]/).map((l) => l.trim()).filter((l) => l.length > 0).length === 0}
            >
              <ClipboardPaste className="h-4 w-4 mr-1" />
              Importar ({importText.split(/[\n;]/).map((l) => l.trim()).filter((l) => l.length > 0).length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BancoPerguntasManager;
