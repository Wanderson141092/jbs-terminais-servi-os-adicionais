import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus,
  Save,
  Edit,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  FileText,
  Layout,
  Ship,
  Anchor,
  Container,
  Warehouse,
  Package,
  Box,
  Truck,
  Construction,
  ArrowUpFromLine,
  Layers,
  Send,
  Search,
  Settings,
} from "lucide-react";

interface ExternalButton {
  id: string;
  titulo: string;
  descricao: string | null;
  icone: string | null;
  tipo: string;
  url: string | null;
  formulario_id: string | null;
  ordem: number;
  ativo: boolean;
  abrir_nova_aba: boolean | null;
}

interface Formulario {
  id: string;
  titulo: string;
}

const ICON_OPTIONS = [
  { value: "FileText", label: "Documento" },
  { value: "Layout", label: "Layout" },
  { value: "ExternalLink", label: "Link Externo" },
  { value: "Send", label: "Enviar" },
  { value: "Search", label: "Buscar" },
  { value: "Settings", label: "Configurações" },
  { value: "Ship", label: "Navio" },
  { value: "Anchor", label: "Área Portuária" },
  { value: "Container", label: "Contêiner" },
  { value: "Warehouse", label: "Armazém" },
  { value: "Package", label: "Caixa / Pacote" },
  { value: "Box", label: "Pallet / Volume" },
  { value: "Truck", label: "Gate / Caminhão" },
  { value: "Construction", label: "STS / Guindaste" },
  { value: "ArrowUpFromLine", label: "Levantamento de Contêiner" },
  { value: "Layers", label: "Pilha de Contêineres" },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, Layout, ExternalLink, Send, Search, Settings,
  Ship, Anchor, Container, Warehouse, Package, Box, Truck,
  Construction, ArrowUpFromLine, Layers,
};

const ExternalButtonsManager = () => {
  const [buttons, setButtons] = useState<ExternalButton[]>([]);
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingButton, setEditingButton] = useState<ExternalButton | null>(null);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    icone: "FileText",
    tipo: "iframe",
    url: "",
    formulario_id: "",
    abrir_nova_aba: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [buttonsRes, formsRes] = await Promise.all([
      supabase.from("external_buttons").select("*").order("ordem"),
      supabase.from("formularios").select("id, titulo").eq("ativo", true),
    ]);

    setButtons(buttonsRes.data || []);
    setFormularios(formsRes.data || []);
    setLoading(false);
  };

  const openDialog = (button?: ExternalButton) => {
    if (button) {
      setEditingButton(button);
      setFormData({
        titulo: button.titulo,
        descricao: button.descricao || "",
        icone: button.icone || "FileText",
        tipo: button.tipo,
        url: button.url || "",
        formulario_id: button.formulario_id || "",
        abrir_nova_aba: button.abrir_nova_aba || false,
      });
    } else {
      setEditingButton(null);
      setFormData({
        titulo: "",
        descricao: "",
        icone: "FileText",
        tipo: "iframe",
        url: "",
        formulario_id: "",
        abrir_nova_aba: false,
      });
    }
    setShowDialog(true);
  };

  const saveButton = async () => {
    if (!formData.titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (formData.tipo === "iframe" || formData.tipo === "link") {
      if (!formData.url.trim()) {
        toast.error("URL é obrigatória para este tipo");
        return;
      }
    }

    if (formData.tipo === "formulario" && !formData.formulario_id) {
      toast.error("Selecione um formulário");
      return;
    }

    const data = {
      titulo: formData.titulo,
      descricao: formData.descricao || null,
      icone: formData.icone,
      tipo: formData.tipo,
      url: formData.tipo !== "formulario" ? formData.url : null,
      formulario_id: formData.tipo === "formulario" ? formData.formulario_id : null,
      abrir_nova_aba: formData.tipo === "link" ? formData.abrir_nova_aba : false,
      updated_at: new Date().toISOString(),
    };

    if (editingButton) {
      const { error } = await supabase.from("external_buttons").update(data).eq("id", editingButton.id);
      if (error) {
        toast.error("Erro ao atualizar botão");
        return;
      }
      toast.success("Botão atualizado!");
    } else {
      const maxOrdem = buttons.length > 0 ? Math.max(...buttons.map((b) => b.ordem)) + 1 : 0;
      const { error } = await supabase.from("external_buttons").insert({ ...data, ordem: maxOrdem });
      if (error) {
        toast.error("Erro ao criar botão");
        return;
      }
      toast.success("Botão criado!");
    }

    setShowDialog(false);
    fetchData();
  };

  const toggleActive = async (button: ExternalButton) => {
    const { error } = await supabase
      .from("external_buttons")
      .update({ ativo: !button.ativo, updated_at: new Date().toISOString() })
      .eq("id", button.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success(button.ativo ? "Botão desativado" : "Botão ativado");
    fetchData();
  };

  const deleteButton = async (button: ExternalButton) => {
    const { error } = await supabase.from("external_buttons").delete().eq("id", button.id);
    if (error) {
      toast.error("Erro ao excluir botão");
      return;
    }
    toast.success("Botão excluído!");
    fetchData();
  };

  const moveButton = async (button: ExternalButton, direction: "up" | "down") => {
    const index = buttons.findIndex((b) => b.id === button.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= buttons.length) return;

    const otherButton = buttons[swapIndex];
    await Promise.all([
      supabase.from("external_buttons").update({ ordem: otherButton.ordem }).eq("id", button.id),
      supabase.from("external_buttons").update({ ordem: button.ordem }).eq("id", otherButton.id),
    ]);
    fetchData();
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "iframe":
        return "Iframe no Modal";
      case "link":
        return "Link Externo";
      case "formulario":
        return "Formulário Interno";
      default:
        return tipo;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Layout className="h-5 w-5" />
          Gerenciar Botões Externos
        </CardTitle>
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Botão
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Configure os botões que aparecerão na página externa. Arraste para reordenar.
        </p>

        <div className="space-y-2">
          {buttons.map((button, index) => (
            <div
              key={button.id}
              className={`flex items-center gap-3 p-4 border rounded-lg bg-card ${
                !button.ativo ? "opacity-50" : ""
              }`}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
              <div className="flex-1">
                <p className="font-medium">{button.titulo}</p>
                <p className="text-sm text-muted-foreground">
                  {getTipoLabel(button.tipo)}
                  {button.descricao && ` · ${button.descricao}`}
                </p>
              </div>
              <Switch checked={button.ativo} onCheckedChange={() => toggleActive(button)} />
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveButton(button, "up")}
                  disabled={index === 0}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => moveButton(button, "down")}
                  disabled={index === buttons.length - 1}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openDialog(button)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteButton(button)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {buttons.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum botão configurado. Clique em "Adicionar Botão" para criar o primeiro.
            </p>
          )}
        </div>
      </CardContent>

      {/* Button Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingButton ? "Editar Botão" : "Adicionar Botão"}
            </DialogTitle>
            <DialogDescription>
              Configure as propriedades do botão externo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div>
              <Label>Título do Botão</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Solicitar Serviço"
              />
            </div>

            <div>
              <Label>Descrição (exibida no card)</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição curta do botão"
                rows={2}
              />
            </div>

            <div>
              <Label>Ícone</Label>
              <Select
                value={formData.icone}
                onValueChange={(v) => setFormData({ ...formData, icone: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t pt-4">
              <Label className="font-semibold">Tipo de Ação</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData({ ...formData, tipo: v })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iframe">Abrir Iframe no Modal</SelectItem>
                  <SelectItem value="link">Abrir Link Externo</SelectItem>
                  <SelectItem value="formulario">Abrir Formulário Interno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.tipo === "iframe" || formData.tipo === "link") && (
              <div>
                <Label>URL</Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}

            {formData.tipo === "link" && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.abrir_nova_aba}
                  onCheckedChange={(c) => setFormData({ ...formData, abrir_nova_aba: c })}
                  id="nova_aba"
                />
                <Label htmlFor="nova_aba" className="cursor-pointer">
                  Abrir em nova aba
                </Label>
              </div>
            )}

            {formData.tipo === "formulario" && (
              <div>
                <Label>Formulário</Label>
                <Select
                  value={formData.formulario_id}
                  onValueChange={(v) => setFormData({ ...formData, formulario_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um formulário" />
                  </SelectTrigger>
                  <SelectContent>
                    {formularios.map((form) => (
                      <SelectItem key={form.id} value={form.id}>
                        {form.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formularios.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Nenhum formulário ativo. Crie um em Admin → Formulários.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={saveButton}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ExternalButtonsManager;
