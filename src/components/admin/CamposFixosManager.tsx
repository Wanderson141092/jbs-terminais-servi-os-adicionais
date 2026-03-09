import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Save, Eye, EyeOff, Globe, Monitor, Plus, Trash2 } from "lucide-react";

/** Known solicitacoes columns available for campo_fixo mapping */
const SOLICITACOES_COLUMNS: { key: string; label: string; group: string }[] = [
  { key: "protocolo", label: "Protocolo", group: "Identificação" },
  { key: "numero_conteiner", label: "Número do Contêiner", group: "Identificação" },
  { key: "lpco", label: "LPCO", group: "Identificação" },
  { key: "chave_consulta", label: "Chave de Consulta", group: "Identificação" },
  { key: "cnpj", label: "CNPJ", group: "Cliente" },
  { key: "cliente_nome", label: "Nome do Cliente", group: "Cliente" },
  { key: "cliente_email", label: "E-mail do Cliente", group: "Cliente" },
  { key: "tipo_carga", label: "Tipo de Carga", group: "Operação" },
  { key: "tipo_operacao", label: "Tipo de Operação", group: "Operação" },
  { key: "categoria", label: "Categoria", group: "Operação" },
  { key: "data_posicionamento", label: "Data de Posicionamento", group: "Datas" },
  { key: "data_agendamento", label: "Data de Agendamento", group: "Datas" },
  { key: "observacoes", label: "Observações", group: "Outros" },
  { key: "status", label: "Status", group: "Outros" },
  { key: "status_vistoria", label: "Status da Vistoria", group: "Outros" },
];

interface CampoFixo {
  id: string;
  campo_chave: string;
  campo_label: string;
  visivel_externo: boolean;
  visivel_analise: boolean;
  obrigatorio_analise: boolean;
  servico_ids: string[];
  ordem: number;
  ativo: boolean;
}

interface Servico {
  id: string;
  nome: string;
}

const CamposFixosManager = () => {
  const [campos, setCampos] = useState<CampoFixo[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCampo, setEditingCampo] = useState<CampoFixo | null>(null);
  const [formData, setFormData] = useState({
    campo_chave: "",
    campo_label: "",
    visivel_externo: false,
    visivel_analise: true,
    obrigatorio_analise: false,
    servico_ids: [] as string[],
    ordem: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [camposRes, servicosRes] = await Promise.all([
      supabase.from("campos_fixos_config").select("*").order("ordem"),
      supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
    ]);
    setCampos((camposRes.data as CampoFixo[]) || []);
    setServicos(servicosRes.data || []);
    setLoading(false);
  };

  const openDialog = (campo?: CampoFixo) => {
    if (campo) {
      setEditingCampo(campo);
      setFormData({
        campo_chave: campo.campo_chave,
        campo_label: campo.campo_label,
        visivel_externo: campo.visivel_externo,
        visivel_analise: campo.visivel_analise,
        obrigatorio_analise: campo.obrigatorio_analise,
        servico_ids: campo.servico_ids || [],
        ordem: campo.ordem,
      });
    } else {
      setEditingCampo(null);
      const maxOrdem = campos.length > 0 ? Math.max(...campos.map(c => c.ordem)) + 1 : 0;
      setFormData({
        campo_chave: "",
        campo_label: "",
        visivel_externo: false,
        visivel_analise: true,
        obrigatorio_analise: false,
        servico_ids: [],
        ordem: maxOrdem,
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.campo_chave.trim()) {
      toast.error("Informe a chave do campo");
      return;
    }
    if (!formData.campo_label.trim()) {
      toast.error("Informe o rótulo do campo");
      return;
    }

    // Normalize key: lowercase, underscores, no accents
    const normalizedKey = formData.campo_chave
      .toLowerCase()
      .replace(/ /g, "_")
      .replace(/-/g, "_")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_]/g, "");

    if (editingCampo) {
      const { error } = await supabase
        .from("campos_fixos_config")
        .update({
          campo_label: formData.campo_label,
          visivel_externo: formData.visivel_externo,
          visivel_analise: formData.visivel_analise,
          obrigatorio_analise: formData.obrigatorio_analise,
          servico_ids: formData.servico_ids,
          ordem: formData.ordem,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingCampo.id);
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Campo atualizado!");
    } else {
      // Check duplicate key
      if (campos.some(c => c.campo_chave === normalizedKey)) {
        toast.error("Já existe um campo com esta chave");
        return;
      }
      const { error } = await supabase.from("campos_fixos_config").insert({
        campo_chave: normalizedKey,
        campo_label: formData.campo_label,
        visivel_externo: formData.visivel_externo,
        visivel_analise: formData.visivel_analise,
        obrigatorio_analise: formData.obrigatorio_analise,
        servico_ids: formData.servico_ids,
        ordem: formData.ordem,
      });
      if (error) {
        if (error.code === "23505") toast.error("Já existe um campo com esta chave");
        else toast.error("Erro ao criar campo");
        return;
      }
      toast.success("Campo criado!");
    }
    setShowDialog(false);
    fetchData();
  };

  const handleDelete = async (campo: CampoFixo) => {
    if (!confirm(`Tem certeza que deseja excluir o campo "${campo.campo_label}"?`)) return;

    const probe = await supabase.from("solicitacoes").select(`id,${campo.campo_chave}`).limit(1);
    const hasColumn = !probe.error;

    if (hasColumn) {
      const { count, error: countError } = await supabase
        .from("solicitacoes")
        .select("id", { count: "exact", head: true })
        .not(campo.campo_chave, "is", null);

      if (countError) {
        toast.error("Erro ao validar uso do campo nos processos.");
        return;
      }

      if ((count || 0) > 0) {
        const { error: disableError } = await supabase
          .from("campos_fixos_config")
          .update({ ativo: false, visivel_analise: false, visivel_externo: false, updated_at: new Date().toISOString() })
          .eq("id", campo.id);

        if (disableError) {
          toast.error("Campo possui dados e não pôde ser desativado automaticamente.");
          return;
        }

        toast.warning(`Campo possui ${count} processo(s) com valor e foi desativado para preservar histórico.`);
        fetchData();
        return;
      }
    }

    const [{ error: mappingError }, { error: deleteError }] = await Promise.all([
      supabase.from("pergunta_mapeamento").delete().eq("campo_solicitacao", campo.campo_chave),
      supabase.from("campos_fixos_config").delete().eq("id", campo.id),
    ]);

    if (mappingError) {
      toast.error("Erro ao limpar vínculos do campo.");
      return;
    }

    if (deleteError) {
      toast.error("Erro ao excluir campo.");
      return;
    }

    toast.success("Campo excluído!");
    fetchData();
  };

  const toggleAtivo = async (campo: CampoFixo) => {
    await supabase.from("campos_fixos_config").update({ ativo: !campo.ativo }).eq("id", campo.id);
    fetchData();
  };

  const toggleQuick = async (campo: CampoFixo, field: "visivel_externo" | "visivel_analise") => {
    await supabase.from("campos_fixos_config").update({ [field]: !campo[field] }).eq("id", campo.id);
    fetchData();
  };

  const toggleServicoId = (servicoId: string) => {
    setFormData(prev => ({
      ...prev,
      servico_ids: prev.servico_ids.includes(servicoId)
        ? prev.servico_ids.filter(id => id !== servicoId)
        : [...prev.servico_ids, servicoId],
    }));
  };

  if (loading) return <p className="text-muted-foreground text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Campos Fixos da Análise</p>
        <p>Configure quais campos fixos da solicitação devem aparecer na tela de análise interna e na consulta externa do cliente. Crie novos campos para serviços futuros ou personalizações específicas.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-base">Campos Configurados ({campos.length})</CardTitle>
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-1" /> Novo Campo
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campo</TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center"><Monitor className="h-3 w-3" /> Análise</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center"><Globe className="h-3 w-3" /> Externo</span>
                </TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum campo configurado.
                  </TableCell>
                </TableRow>
              ) : (
                campos.map(campo => (
                  <TableRow key={campo.id} className={!campo.ativo ? "opacity-50" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{campo.campo_label}</p>
                        <p className="text-xs text-muted-foreground font-mono">{campo.campo_chave}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleQuick(campo, "visivel_analise")}
                      >
                        {campo.visivel_analise ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleQuick(campo, "visivel_externo")}
                      >
                        {campo.visivel_externo ? <Globe className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs">
                      {campo.servico_ids.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {campo.servico_ids.map(id => (
                            <Badge key={id} variant="outline" className="text-[10px]">
                              {servicos.find(s => s.id === id)?.nome || id.slice(0, 8)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Todos</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch checked={campo.ativo} onCheckedChange={() => toggleAtivo(campo)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDialog(campo)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(campo)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCampo ? `Editar Campo: ${editingCampo.campo_chave}` : "Novo Campo Fixo"}</DialogTitle>
            <DialogDescription>
              {editingCampo 
                ? "Configure a visibilidade e comportamento deste campo" 
                : "Crie um novo campo fixo. A chave será o identificador interno usado no sistema."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Chave do campo (identificador interno)</Label>
              <Input
                value={formData.campo_chave}
                onChange={e => setFormData({ ...formData, campo_chave: e.target.value })}
                placeholder="ex: numero_bl, peso_carga"
                disabled={!!editingCampo}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {editingCampo 
                  ? "A chave não pode ser alterada após a criação." 
                  : "Use letras minúsculas e underscores. Será normalizado automaticamente."}
              </p>
            </div>
            <div>
              <Label>Rótulo exibido</Label>
              <Input
                value={formData.campo_label}
                onChange={e => setFormData({ ...formData, campo_label: e.target.value })}
                placeholder="ex: Número do BL, Peso da Carga"
              />
            </div>
            <div>
              <Label>Ordem de exibição</Label>
              <Input
                type="number"
                value={formData.ordem}
                onChange={e => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label>Visível na análise interna</Label>
              <Switch checked={formData.visivel_analise} onCheckedChange={v => setFormData({ ...formData, visivel_analise: v })} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label>Visível na consulta externa</Label>
              <Switch checked={formData.visivel_externo} onCheckedChange={v => setFormData({ ...formData, visivel_externo: v })} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label>Obrigatório na análise</Label>
              <Switch checked={formData.obrigatorio_analise} onCheckedChange={v => setFormData({ ...formData, obrigatorio_analise: v })} />
            </div>
            <div>
              <Label>Serviços (deixe vazio para todos)</Label>
              <div className="space-y-2 max-h-48 overflow-auto border rounded-md p-3 mt-1">
                {servicos.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`fix-srv-${s.id}`}
                      checked={formData.servico_ids.includes(s.id)}
                      onCheckedChange={() => toggleServicoId(s.id)}
                    />
                    <label htmlFor={`fix-srv-${s.id}`} className="text-sm cursor-pointer">{s.nome}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CamposFixosManager;
