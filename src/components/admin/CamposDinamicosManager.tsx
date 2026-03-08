import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, Globe, Eye, EyeOff } from "lucide-react";

interface CampoAnalise {
  id: string;
  nome: string;
  tipo: string;
  opcoes: any;
  servico_ids: string[];
  obrigatorio: boolean;
  visivel_externo: boolean;
  ordem: number;
  ativo: boolean;
}

interface Servico {
  id: string;
  nome: string;
}

const TIPOS_CAMPO = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Número" },
  { value: "data", label: "Data" },
  { value: "checkbox", label: "Checkbox" },
  { value: "select", label: "Seleção" },
];

const CamposDinamicosManager = () => {
  const [campos, setCampos] = useState<CampoAnalise[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<CampoAnalise | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "texto",
    opcoes: "",
    obrigatorio: false,
    visivel_externo: false,
    servico_ids: [] as string[],
    ordem: 0,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [camposRes, servicosRes] = await Promise.all([
      supabase.from("campos_analise").select("*").order("ordem"),
      supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
    ]);
    setCampos((camposRes.data as CampoAnalise[]) || []);
    setServicos(servicosRes.data || []);
    setLoading(false);
  };

  const openDialog = (campo?: CampoAnalise) => {
    if (campo) {
      setEditing(campo);
      const opcoes = campo.opcoes as { value: string; label: string }[] | null;
      setFormData({
        nome: campo.nome,
        tipo: campo.tipo,
        opcoes: opcoes?.map(o => o.label).join("\n") || "",
        obrigatorio: campo.obrigatorio,
        visivel_externo: campo.visivel_externo,
        servico_ids: campo.servico_ids || [],
        ordem: campo.ordem,
      });
    } else {
      setEditing(null);
      const maxOrdem = campos.reduce((max, c) => Math.max(max, c.ordem), 0);
      setFormData({ nome: "", tipo: "texto", opcoes: "", obrigatorio: false, visivel_externo: false, servico_ids: [], ordem: maxOrdem + 1 });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const opcoes = formData.opcoes.split("\n").filter(o => o.trim()).map((o, i) => ({ value: `opt_${i}`, label: o.trim() }));

    const data: any = {
      nome: formData.nome.trim(),
      tipo: formData.tipo,
      opcoes: opcoes.length > 0 ? opcoes : null,
      obrigatorio: formData.obrigatorio,
      visivel_externo: formData.visivel_externo,
      servico_ids: formData.servico_ids,
      ordem: formData.ordem,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from("campos_analise").update(data).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Campo atualizado!");
    } else {
      const { error } = await supabase.from("campos_analise").insert(data);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Campo criado!");
    }
    setShowDialog(false);
    fetchData();
  };

  const handleDelete = async (campo: CampoAnalise) => {
    const [{ count: valuesCount, error: valuesError }, { error: mappingCleanupError }] = await Promise.all([
      supabase
        .from("campos_analise_valores")
        .select("id", { count: "exact", head: true })
        .eq("campo_id", campo.id),
      supabase.from("pergunta_mapeamento").delete().eq("campo_analise_id", campo.id),
    ]);

    if (valuesError) {
      toast.error("Erro ao validar vínculos do campo.");
      return;
    }

    if (mappingCleanupError) {
      toast.error("Erro ao limpar mapeamentos do campo.");
      return;
    }

    if ((valuesCount || 0) > 0) {
      const { error: disableError } = await supabase
        .from("campos_analise")
        .update({ ativo: false, visivel_externo: false, updated_at: new Date().toISOString() })
        .eq("id", campo.id);

      if (disableError) {
        toast.error("Campo possui dados e não pôde ser desativado automaticamente.");
        return;
      }

      toast.warning(`Campo possui ${valuesCount} registro(s) e foi apenas desativado para preservar histórico.`);
      fetchData();
      return;
    }

    const { error } = await supabase.from("campos_analise").delete().eq("id", campo.id);
    if (error) {
      toast.error("Erro ao excluir campo.");
      return;
    }

    toast.success("Campo excluído com sucesso.");
    fetchData();
  };

  const toggleAtivo = async (campo: CampoAnalise) => {
    await supabase.from("campos_analise").update({ ativo: !campo.ativo }).eq("id", campo.id);
    fetchData();
  };

  const toggleVisivel = async (campo: CampoAnalise) => {
    await supabase.from("campos_analise").update({ visivel_externo: !campo.visivel_externo }).eq("id", campo.id);
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
        <p className="font-medium text-foreground mb-1">Campos Dinâmicos de Análise</p>
        <p>Crie campos personalizados que aparecem na análise interna. Podem ser vinculados a perguntas de formulário via mapeamento no Construtor.</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" /> Novo Campo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campos Dinâmicos ({campos.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Externo</TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead>Ordem</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campos.map(campo => (
                <TableRow key={campo.id} className={!campo.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{campo.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {TIPOS_CAMPO.find(t => t.value === campo.tipo)?.label || campo.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleVisivel(campo)}>
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
                      <span className="text-muted-foreground">Global</span>
                    )}
                  </TableCell>
                  <TableCell>{campo.ordem}</TableCell>
                  <TableCell>
                    <Switch checked={campo.ativo} onCheckedChange={() => toggleAtivo(campo)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openDialog(campo)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir "{campo.nome}"?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita. Valores existentes vinculados serão perdidos.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(campo)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {campos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum campo criado</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} Campo Dinâmico</DialogTitle>
            <DialogDescription>Configure o campo que aparecerá na análise interna</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nome</Label>
              <Input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Quadra, Peso, Referência..." />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={formData.tipo} onValueChange={v => setFormData({ ...formData, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_CAMPO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {formData.tipo === "select" && (
              <div>
                <Label>Opções (uma por linha)</Label>
                <Textarea value={formData.opcoes} onChange={e => setFormData({ ...formData, opcoes: e.target.value })} placeholder={"Opção 1\nOpção 2"} rows={3} />
              </div>
            )}
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label>Obrigatório</Label>
              <Switch checked={formData.obrigatorio} onCheckedChange={v => setFormData({ ...formData, obrigatorio: v })} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label>Visível na consulta externa</Label>
              <Switch checked={formData.visivel_externo} onCheckedChange={v => setFormData({ ...formData, visivel_externo: v })} />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input type="number" value={formData.ordem} onChange={e => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Serviços (vazio = global)</Label>
              <div className="space-y-2 max-h-48 overflow-auto border rounded-md p-3 mt-1">
                {servicos.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox id={`din-srv-${s.id}`} checked={formData.servico_ids.includes(s.id)} onCheckedChange={() => toggleServicoId(s.id)} />
                    <label htmlFor={`din-srv-${s.id}`} className="text-sm cursor-pointer">{s.nome}</label>
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

export default CamposDinamicosManager;
