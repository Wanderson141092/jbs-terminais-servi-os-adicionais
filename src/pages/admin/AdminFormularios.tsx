import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Save,
  Edit,
  Trash2,
  FileText,
  GripVertical,
  Eye,
  Download,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Formulario {
  id: string;
  titulo: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
}

interface Campo {
  id: string;
  formulario_id: string;
  tipo: string;
  rotulo: string;
  placeholder: string | null;
  obrigatorio: boolean;
  opcoes: unknown;
  condicao: unknown;
  ordem: number;
}

interface Resposta {
  id: string;
  formulario_id: string;
  respostas: unknown;
  arquivos: unknown;
  created_at: string;
}

// Estilos de formulário disponíveis
const FORM_STYLES = [
  { 
    value: "jbs", 
    label: "JBS Terminais (Padrão)", 
    description: "Design institucional JBS com cores e tipografia padrão",
    features: ["Campos básicos", "Upload de arquivos", "Lógica condicional", "Validação em tempo real"]
  },
  { 
    value: "hashdata", 
    label: "Hashdata", 
    description: "Estilo inspirado no sistema Hashdata com layout corporativo",
    features: ["Layout em grid", "Seções colapsáveis", "Campos agrupados", "Progresso visual"]
  },
  { 
    value: "google", 
    label: "Google Forms", 
    description: "Design minimalista inspirado no Google Forms",
    features: ["Layout vertical", "Respostas opcionais", "Múltiplas seções", "Tema claro/escuro"]
  },
  { 
    value: "jotform", 
    label: "Jotform", 
    description: "Layout moderno com cards e animações suaves",
    features: ["Cards por campo", "Animações", "Temas personalizáveis", "Progresso por etapas"]
  },
  { 
    value: "formstack", 
    label: "Formstack", 
    description: "Formulário empresarial com layout profissional",
    features: ["Campos inline", "Validação avançada", "Integração de pagamentos", "Assinaturas digitais"]
  },
];

const FIELD_TYPES = [
  { value: "texto", label: "Texto Curto" },
  { value: "texto_longo", label: "Texto Longo" },
  { value: "numero", label: "Número" },
  { value: "data", label: "Data" },
  { value: "select", label: "Seleção Única" },
  { value: "multipla_escolha", label: "Múltipla Escolha" },
  { value: "checkbox", label: "Checkbox" },
  { value: "arquivo", label: "Upload de Arquivo" },
];

const AdminFormularios = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);

  // Form dialog
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingForm, setEditingForm] = useState<Formulario | null>(null);
  const [formData, setFormData] = useState({ titulo: "", descricao: "", estilo: "jbs" });
  const [selectedStyle, setSelectedStyle] = useState("jbs");

  // Fields dialog
  const [showFieldsDialog, setShowFieldsDialog] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<Campo | null>(null);
  const [fieldData, setFieldData] = useState({
    tipo: "texto",
    rotulo: "",
    placeholder: "",
    obrigatorio: false,
    opcoes: "",
    condicao_campo: "",
    condicao_operador: "igual",
    condicao_valor: "",
  });

  // Responses dialog
  const [showResponsesDialog, setShowResponsesDialog] = useState(false);
  const [selectedFormForResponses, setSelectedFormForResponses] = useState<string | null>(null);

  useEffect(() => {
    fetchFormularios();
  }, []);

  const fetchFormularios = async () => {
    setLoading(true);
    const { data } = await supabase.from("formularios").select("*").order("created_at", { ascending: false });
    setFormularios(data || []);
    setLoading(false);
  };

  const fetchCampos = async (formularioId: string) => {
    const { data } = await supabase
      .from("formulario_campos")
      .select("*")
      .eq("formulario_id", formularioId)
      .order("ordem");
    setCampos(data || []);
  };

  const fetchRespostas = async (formularioId: string) => {
    const { data } = await supabase
      .from("formulario_respostas")
      .select("*")
      .eq("formulario_id", formularioId)
      .order("created_at", { ascending: false });
    setRespostas(data || []);
  };

  // Form CRUD
  const openFormDialog = (form?: Formulario) => {
    if (form) {
      setEditingForm(form);
      setFormData({ titulo: form.titulo, descricao: form.descricao || "", estilo: "jbs" });
      setSelectedStyle("jbs");
    } else {
      setEditingForm(null);
      setFormData({ titulo: "", descricao: "", estilo: "jbs" });
      setSelectedStyle("jbs");
    }
    setShowFormDialog(true);
  };

  const saveForm = async () => {
    if (!formData.titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (editingForm) {
      const { error } = await supabase
        .from("formularios")
        .update({
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingForm.id);

      if (error) {
        toast.error("Erro ao atualizar formulário");
        return;
      }
      toast.success("Formulário atualizado!");
    } else {
      const { error } = await supabase.from("formularios").insert({
        titulo: formData.titulo,
        descricao: formData.descricao || null,
      });

      if (error) {
        toast.error("Erro ao criar formulário");
        return;
      }
      toast.success("Formulário criado!");
    }

    setShowFormDialog(false);
    fetchFormularios();
  };

  const toggleFormActive = async (form: Formulario) => {
    const { error } = await supabase
      .from("formularios")
      .update({ ativo: !form.ativo, updated_at: new Date().toISOString() })
      .eq("id", form.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success(form.ativo ? "Formulário desativado" : "Formulário ativado");
    fetchFormularios();
  };

  const deleteForm = async (form: Formulario) => {
    const { error } = await supabase.from("formularios").delete().eq("id", form.id);
    if (error) {
      toast.error("Erro ao excluir formulário");
      return;
    }
    toast.success("Formulário excluído!");
    fetchFormularios();
  };

  // Fields management
  const openFieldsDialog = async (formularioId: string) => {
    setSelectedFormId(formularioId);
    await fetchCampos(formularioId);
    setShowFieldsDialog(true);
  };

  const openFieldEditor = (field?: Campo) => {
    if (field) {
      setEditingField(field);
      const opcoesArr = field.opcoes as { value: string; label: string }[] | null;
      const condicaoObj = field.condicao as { campo_id: string; operador: string; valor: string } | null;
      setFieldData({
        tipo: field.tipo,
        rotulo: field.rotulo,
        placeholder: field.placeholder || "",
        obrigatorio: field.obrigatorio,
        opcoes: opcoesArr?.map((o) => o.label).join("\n") || "",
        condicao_campo: condicaoObj?.campo_id || "",
        condicao_operador: condicaoObj?.operador || "igual",
        condicao_valor: condicaoObj?.valor || "",
      });
    } else {
      setEditingField(null);
      setFieldData({
        tipo: "texto",
        rotulo: "",
        placeholder: "",
        obrigatorio: false,
        opcoes: "",
        condicao_campo: "",
        condicao_operador: "igual",
        condicao_valor: "",
      });
    }
  };

  const saveField = async () => {
    if (!fieldData.rotulo.trim() || !selectedFormId) {
      toast.error("Rótulo é obrigatório");
      return;
    }

    const opcoes = fieldData.opcoes
      .split("\n")
      .filter((o) => o.trim())
      .map((o, i) => ({ value: `opt_${i}`, label: o.trim() }));

    const condicao = fieldData.condicao_campo
      ? {
          campo_id: fieldData.condicao_campo,
          operador: fieldData.condicao_operador,
          valor: fieldData.condicao_valor,
        }
      : null;

    const data = {
      formulario_id: selectedFormId,
      tipo: fieldData.tipo,
      rotulo: fieldData.rotulo,
      placeholder: fieldData.placeholder || null,
      obrigatorio: fieldData.obrigatorio,
      opcoes: opcoes.length > 0 ? opcoes : null,
      condicao,
    };

    if (editingField) {
      const { error } = await supabase.from("formulario_campos").update(data).eq("id", editingField.id);
      if (error) {
        toast.error("Erro ao atualizar campo");
        return;
      }
      toast.success("Campo atualizado!");
    } else {
      const maxOrdem = campos.length > 0 ? Math.max(...campos.map((c) => c.ordem)) + 1 : 0;
      const { error } = await supabase.from("formulario_campos").insert({ ...data, ordem: maxOrdem });
      if (error) {
        toast.error("Erro ao criar campo");
        return;
      }
      toast.success("Campo adicionado!");
    }

    setEditingField(null);
    setFieldData({ tipo: "texto", rotulo: "", placeholder: "", obrigatorio: false, opcoes: "", condicao_campo: "", condicao_operador: "igual", condicao_valor: "" });
    await fetchCampos(selectedFormId);
  };

  const deleteField = async (field: Campo) => {
    const { error } = await supabase.from("formulario_campos").delete().eq("id", field.id);
    if (error) {
      toast.error("Erro ao excluir campo");
      return;
    }
    toast.success("Campo excluído!");
    if (selectedFormId) await fetchCampos(selectedFormId);
  };

  const moveField = async (field: Campo, direction: "up" | "down") => {
    const index = campos.findIndex((c) => c.id === field.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= campos.length) return;

    const otherField = campos[swapIndex];
    await Promise.all([
      supabase.from("formulario_campos").update({ ordem: otherField.ordem }).eq("id", field.id),
      supabase.from("formulario_campos").update({ ordem: field.ordem }).eq("id", otherField.id),
    ]);
    if (selectedFormId) await fetchCampos(selectedFormId);
  };

  // Responses
  const openResponsesDialog = async (formularioId: string) => {
    setSelectedFormForResponses(formularioId);
    await fetchCampos(formularioId);
    await fetchRespostas(formularioId);
    setShowResponsesDialog(true);
  };

  const exportCSV = () => {
    if (campos.length === 0 || respostas.length === 0) return;

    const headers = ["Data", ...campos.map((c) => c.rotulo)];
    const rows = respostas.map((r) => [
      new Date(r.created_at).toLocaleString("pt-BR"),
      ...campos.map((c) => {
        const val = r.respostas[c.id];
        if (Array.isArray(val)) return val.join(", ");
        return val || "";
      }),
    ]);

    const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respostas_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/interno/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Formulários</h1>
          </div>
        </div>
        <Button onClick={() => openFormDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Formulário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulários Cadastrados ({formularios.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formularios.map((form) => (
                <TableRow key={form.id} className={!form.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{form.titulo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{form.descricao || "—"}</TableCell>
                  <TableCell>
                    <Switch checked={form.ativo} onCheckedChange={() => toggleFormActive(form)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openFieldsDialog(form.id)} title="Gerenciar campos">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openResponsesDialog(form.id)} title="Ver respostas">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openFormDialog(form)} title="Editar">
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteForm(form)} className="text-destructive hover:text-destructive" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {formularios.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum formulário cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingForm ? "Editar Formulário" : "Novo Formulário"}</DialogTitle>
            <DialogDescription>Configure as informações básicas e o estilo do formulário</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>Título</Label>
              <Input value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} placeholder="Nome do formulário" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Descrição opcional" />
            </div>
            
            {/* Seletor de Estilo */}
            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-3 block">Estilo do Formulário</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Escolha o estilo visual e funcional do formulário. O design seguirá o padrão JBS Terminais com as características do estilo selecionado.
              </p>
              <div className="grid grid-cols-1 gap-3">
                {FORM_STYLES.map((style) => (
                  <div 
                    key={style.value}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedStyle === style.value 
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                        : "border-border hover:border-muted-foreground"
                    }`}
                    onClick={() => {
                      setSelectedStyle(style.value);
                      setFormData({ ...formData, estilo: style.value });
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                        selectedStyle === style.value 
                          ? "border-primary bg-primary" 
                          : "border-muted-foreground"
                      }`}>
                        {selectedStyle === style.value && (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full"></div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{style.label}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{style.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {style.features.map((feature, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveForm}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fields Dialog */}
      <Dialog open={showFieldsDialog} onOpenChange={setShowFieldsDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Campos do Formulário</DialogTitle>
            <DialogDescription>Gerencie os campos que aparecerão no formulário</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add/Edit Field Form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{editingField ? "Editar Campo" : "Adicionar Campo"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={fieldData.tipo} onValueChange={(v) => setFieldData({ ...fieldData, tipo: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Rótulo</Label>
                    <Input value={fieldData.rotulo} onChange={(e) => setFieldData({ ...fieldData, rotulo: e.target.value })} placeholder="Ex: Nome completo" />
                  </div>
                </div>
                <div>
                  <Label>Placeholder</Label>
                  <Input value={fieldData.placeholder} onChange={(e) => setFieldData({ ...fieldData, placeholder: e.target.value })} placeholder="Texto de ajuda" />
                </div>
                {(fieldData.tipo === "select" || fieldData.tipo === "multipla_escolha") && (
                  <div>
                    <Label>Opções (uma por linha)</Label>
                    <Textarea value={fieldData.opcoes} onChange={(e) => setFieldData({ ...fieldData, opcoes: e.target.value })} placeholder="Opção 1&#10;Opção 2&#10;Opção 3" rows={4} />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox checked={fieldData.obrigatorio} onCheckedChange={(c) => setFieldData({ ...fieldData, obrigatorio: !!c })} id="obrigatorio" />
                  <Label htmlFor="obrigatorio" className="cursor-pointer">Campo obrigatório</Label>
                </div>

                {/* Conditional Logic */}
                <Accordion type="single" collapsible className="border rounded-lg">
                  <AccordionItem value="condicao" className="border-0">
                    <AccordionTrigger className="px-4 py-2 text-sm">Lógica Condicional</AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-3">
                      <div>
                        <Label className="text-xs">Mostrar este campo quando...</Label>
                        <Select value={fieldData.condicao_campo} onValueChange={(v) => setFieldData({ ...fieldData, condicao_campo: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um campo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Sempre visível</SelectItem>
                            {campos.filter((c) => c.id !== editingField?.id).map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.rotulo}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {fieldData.condicao_campo && (
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={fieldData.condicao_operador} onValueChange={(v) => setFieldData({ ...fieldData, condicao_operador: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="igual">É igual a</SelectItem>
                              <SelectItem value="diferente">É diferente de</SelectItem>
                              <SelectItem value="contem">Contém</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input value={fieldData.condicao_valor} onChange={(e) => setFieldData({ ...fieldData, condicao_valor: e.target.value })} placeholder="Valor" />
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex gap-2">
                  {editingField && (
                    <Button variant="outline" onClick={() => openFieldEditor()}>
                      Cancelar Edição
                    </Button>
                  )}
                  <Button onClick={saveField}>
                    <Plus className="h-4 w-4 mr-2" />
                    {editingField ? "Atualizar Campo" : "Adicionar Campo"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Fields List */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Campos ({campos.length})</Label>
              {campos.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2 p-3 border rounded-lg bg-card">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{field.rotulo}</p>
                    <p className="text-xs text-muted-foreground">{FIELD_TYPES.find((t) => t.value === field.tipo)?.label}</p>
                  </div>
                  {field.obrigatorio && <Badge variant="secondary" className="text-xs">Obrigatório</Badge>}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => moveField(field, "up")} disabled={index === 0}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => moveField(field, "down")} disabled={index === campos.length - 1}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openFieldEditor(field)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteField(field)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {campos.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum campo adicionado</p>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Responses Dialog */}
      <Dialog open={showResponsesDialog} onOpenChange={setShowResponsesDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Respostas ({respostas.length})
              {respostas.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>Visualize as respostas enviadas para este formulário</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  {campos.map((c) => (
                    <TableHead key={c.id}>{c.rotulo}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {respostas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                    {campos.map((c) => {
                      const respostasObj = r.respostas as Record<string, unknown>;
                      const val = respostasObj[c.id];
                      const arquivosArr = r.arquivos as { campo_id: string; file_url: string; file_name: string }[] | null;
                      const arquivo = arquivosArr?.find((a) => a.campo_id === c.id);
                      if (arquivo) {
                        return (
                          <TableCell key={c.id}>
                            <a href={arquivo.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">
                              {arquivo.file_name}
                            </a>
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={c.id} className="text-sm">
                          {Array.isArray(val) ? val.join(", ") : (val as string) || "—"}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
                {respostas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={campos.length + 1} className="text-center text-muted-foreground py-8">
                      Nenhuma resposta recebida
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFormularios;
