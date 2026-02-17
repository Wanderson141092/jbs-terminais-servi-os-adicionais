import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Save, Edit, Trash2, FileText, Eye, Download, Database, Settings2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useGestorCheck } from "@/hooks/useGestorCheck";
import BancoPerguntasManager from "@/components/admin/BancoPerguntasManager";
import FormularioBuilder from "@/components/admin/FormularioBuilder";
import CamposDinamicosManager from "@/components/admin/CamposDinamicosManager";
import EstilosFormularioManager from "@/components/admin/EstilosFormularioManager";

interface Formulario {
  id: string;
  titulo: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  estilo?: string;
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

interface FormStyle {
  id: string;
  chave: string;
  nome: string;
  descricao: string | null;
  features: string[];
  ativo: boolean;
}

const AdminFormularios = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { isAdmin: isCurrentUserAdmin } = useAdminCheck(currentUserId);
  const { isGestor } = useGestorCheck(currentUserId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  const [loading, setLoading] = useState(true);
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [campos, setCampos] = useState<Campo[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [formStyles, setFormStyles] = useState<FormStyle[]>([]);

  // Form dialog
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingForm, setEditingForm] = useState<Formulario | null>(null);
  const [formData, setFormData] = useState({ titulo: "", descricao: "", estilo: "jbs" });
  const [selectedStyle, setSelectedStyle] = useState("jbs");

  // Builder dialog
  const [showBuilderDialog, setShowBuilderDialog] = useState(false);
  const [builderFormId, setBuilderFormId] = useState<string | null>(null);

  // Responses dialog
  const [showResponsesDialog, setShowResponsesDialog] = useState(false);
  const [selectedFormForResponses, setSelectedFormForResponses] = useState<string | null>(null);

  useEffect(() => { fetchFormularios(); fetchStyles(); }, []);

  const fetchFormularios = async () => {
    setLoading(true);
    const { data } = await supabase.from("formularios").select("*").order("created_at", { ascending: false });
    setFormularios(data || []);
    setLoading(false);
  };

  const fetchStyles = async () => {
    const { data } = await supabase.from("estilos_formulario").select("*").eq("ativo", true).order("ordem");
    setFormStyles((data as FormStyle[]) || []);
  };

  const fetchCampos = async (formularioId: string) => {
    const { data } = await supabase.from("formulario_campos").select("*").eq("formulario_id", formularioId).order("ordem");
    setCampos(data || []);
  };

  const fetchRespostas = async (formularioId: string) => {
    const { data } = await supabase.from("formulario_respostas").select("*").eq("formulario_id", formularioId).order("created_at", { ascending: false });
    setRespostas(data || []);
  };

  // Form CRUD
  const openFormDialog = (form?: Formulario) => {
    if (form) {
      setEditingForm(form);
      const estilo = form.estilo || "jbs";
      setFormData({ titulo: form.titulo, descricao: form.descricao || "", estilo });
      setSelectedStyle(estilo);
    } else {
      setEditingForm(null);
      setFormData({ titulo: "", descricao: "", estilo: "jbs" });
      setSelectedStyle("jbs");
    }
    setShowFormDialog(true);
  };

  const saveForm = async () => {
    if (!formData.titulo.trim()) { toast.error("Título é obrigatório"); return; }
    if (editingForm) {
      const { error } = await supabase.from("formularios").update({
        titulo: formData.titulo, descricao: formData.descricao || null, estilo: formData.estilo, updated_at: new Date().toISOString(),
      }).eq("id", editingForm.id);
      if (error) { toast.error("Erro ao atualizar formulário"); return; }
      toast.success("Formulário atualizado!");
    } else {
      const { error } = await supabase.from("formularios").insert({
        titulo: formData.titulo, descricao: formData.descricao || null, estilo: formData.estilo,
      });
      if (error) { toast.error("Erro ao criar formulário"); return; }
      toast.success("Formulário criado!");
    }
    setShowFormDialog(false);
    fetchFormularios();
  };

  const toggleFormActive = async (form: Formulario) => {
    const { error } = await supabase.from("formularios").update({ ativo: !form.ativo, updated_at: new Date().toISOString() }).eq("id", form.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success(form.ativo ? "Formulário desativado" : "Formulário ativado");
    fetchFormularios();
  };

  const deleteForm = async (form: Formulario) => {
    const { error } = await supabase.from("formularios").delete().eq("id", form.id);
    if (error) { toast.error("Erro ao excluir formulário"); return; }
    toast.success("Formulário excluído!");
    fetchFormularios();
  };

  // Builder
  const openBuilder = (formularioId: string) => {
    setBuilderFormId(formularioId);
    setShowBuilderDialog(true);
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
        const val = (r.respostas as Record<string, unknown>)[c.id];
        if (Array.isArray(val)) return val.join(", ");
        return (val as string) || "";
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
    return <div className="flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  // Access guard: only admin or gestor
  if (!loading && !isCurrentUserAdmin && !isGestor) {
    navigate("/interno/dashboard");
    return null;
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
      </div>

      <Tabs defaultValue="formularios" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 max-w-3xl">
          <TabsTrigger value="formularios" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Formulários
          </TabsTrigger>
          <TabsTrigger value="perguntas" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Perguntas
          </TabsTrigger>
          <TabsTrigger value="campos_dinamicos" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Campos Dinâmicos
          </TabsTrigger>
          <TabsTrigger value="estilos" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Estilos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formularios">
          <div className="flex justify-end mb-4">
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
                    <TableHead>Estilo</TableHead>
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
                        <Badge variant="outline" className="text-xs">
                          {formStyles.find((s) => s.chave === (form.estilo || "jbs"))?.nome || form.estilo || "JBS"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch checked={form.ativo} onCheckedChange={() => toggleFormActive(form)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openBuilder(form.id)} title="Construtor de perguntas">
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openResponsesDialog(form.id)} title="Ver respostas">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openFormDialog(form)} title="Editar">
                            <Edit className="h-4 w-4" />
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
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum formulário cadastrado</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perguntas">
          <BancoPerguntasManager />
        </TabsContent>

        <TabsContent value="campos_dinamicos">
          <CamposDinamicosManager />
        </TabsContent>

        <TabsContent value="estilos">
          <EstilosFormularioManager />
        </TabsContent>
      </Tabs>

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
            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-3 block">Estilo do Formulário</Label>
              <p className="text-sm text-muted-foreground mb-4">Escolha o estilo visual e funcional do formulário.</p>
              <div className="grid grid-cols-1 gap-3">
                {formStyles.map((style) => (
                  <div
                    key={style.chave}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedStyle === style.chave ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-muted-foreground"
                    }`}
                    onClick={() => { setSelectedStyle(style.chave); setFormData({ ...formData, estilo: style.chave }); }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${selectedStyle === style.chave ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                        {selectedStyle === style.chave && <div className="w-full h-full flex items-center justify-center"><div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" /></div>}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{style.nome}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{style.descricao}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {style.features.map((f, i) => <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>Cancelar</Button>
            <Button onClick={saveForm}><Save className="h-4 w-4 mr-2" />Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Builder Dialog */}
      <Dialog open={showBuilderDialog} onOpenChange={setShowBuilderDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Construtor do Formulário
            </DialogTitle>
            <DialogDescription>Selecione perguntas do banco, configure condicionais e mapeamentos</DialogDescription>
          </DialogHeader>
          {builderFormId && (
            <FormularioBuilder
              formularioId={builderFormId}
              onClose={() => setShowBuilderDialog(false)}
            />
          )}
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
                  {campos.map((c) => <TableHead key={c.id}>{c.rotulo}</TableHead>)}
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
                        return <TableCell key={c.id}><a href={arquivo.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">{arquivo.file_name}</a></TableCell>;
                      }
                      return <TableCell key={c.id} className="text-sm">{Array.isArray(val) ? val.join(", ") : (val as string) || "—"}</TableCell>;
                    })}
                  </TableRow>
                ))}
                {respostas.length === 0 && (
                  <TableRow><TableCell colSpan={campos.length + 1} className="text-center text-muted-foreground py-8">Nenhuma resposta recebida</TableCell></TableRow>
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
