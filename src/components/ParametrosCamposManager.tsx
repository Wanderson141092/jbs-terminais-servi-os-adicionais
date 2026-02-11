import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save } from "lucide-react";

interface ParametroCampo {
  id: string;
  grupo: string;
  valor: string;
  sigla: string | null;
  ordem: number;
  ativo: boolean;
  servico_ids: string[];
}

interface Servico {
  id: string;
  nome: string;
}

const GRUPOS = [
  { key: "tipo_carga", label: "Tipo Carga", showSigla: true, showServicoIds: false },
  { key: "categoria", label: "Categoria", showSigla: false, showServicoIds: false },
  { key: "status_deferimento", label: "Status Deferimento", showSigla: false, showServicoIds: false },
  { key: "status_processo", label: "Status do Processo", showSigla: false, showServicoIds: true },
  { key: "pendencia_opcoes", label: "Opções de Pendência (Vistoria)", showSigla: false, showServicoIds: true },
];

const ParametrosCamposManager = () => {
  const [items, setItems] = useState<ParametroCampo[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ParametroCampo | null>(null);
  const [formData, setFormData] = useState({ grupo: "tipo_carga", valor: "", sigla: "", ordem: 0, servico_ids: [] as string[] });

  useEffect(() => { fetchItems(); fetchServicos(); }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("parametros_campos")
      .select("*")
      .order("grupo")
      .order("ordem");
    setItems((data as ParametroCampo[]) || []);
    setLoading(false);
  };

  const fetchServicos = async () => {
    const { data } = await supabase
      .from("servicos")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome");
    setServicos(data || []);
  };

  const openDialog = (grupo: string, item?: ParametroCampo) => {
    if (item) {
      setEditingItem(item);
      setFormData({ grupo: item.grupo, valor: item.valor, sigla: item.sigla || "", ordem: item.ordem, servico_ids: item.servico_ids || [] });
    } else {
      setEditingItem(null);
      const maxOrder = items.filter(i => i.grupo === grupo).reduce((max, i) => Math.max(max, i.ordem), 0);
      setFormData({ grupo, valor: "", sigla: "", ordem: maxOrder + 1, servico_ids: [] });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.valor.trim()) { toast.error("Valor é obrigatório"); return; }
    
    const data: any = {
      grupo: formData.grupo,
      valor: formData.valor.trim(),
      sigla: formData.sigla.trim() || null,
      ordem: formData.ordem,
      servico_ids: formData.servico_ids,
      updated_at: new Date().toISOString(),
    };

    if (editingItem) {
      const { error } = await supabase.from("parametros_campos").update(data).eq("id", editingItem.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Atualizado!");
    } else {
      const { error } = await supabase.from("parametros_campos").insert(data);
      if (error) {
        if (error.code === "23505") toast.error("Valor já existe neste grupo");
        else toast.error("Erro ao criar");
        return;
      }
      toast.success("Adicionado!");
    }
    setShowDialog(false);
    fetchItems();
  };

  const handleDelete = async (item: ParametroCampo) => {
    const { error } = await supabase.from("parametros_campos").delete().eq("id", item.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Excluído!");
    fetchItems();
  };

  const toggleAtivo = async (item: ParametroCampo) => {
    await supabase.from("parametros_campos").update({ ativo: !item.ativo }).eq("id", item.id);
    fetchItems();
  };

  const toggleServicoId = (servicoId: string) => {
    setFormData(prev => ({
      ...prev,
      servico_ids: prev.servico_ids.includes(servicoId)
        ? prev.servico_ids.filter(id => id !== servicoId)
        : [...prev.servico_ids, servicoId]
    }));
  };

  const currentGrupo = GRUPOS.find(g => g.key === formData.grupo);

  const renderGrupoTable = (grupo: typeof GRUPOS[0]) => {
    const grupoItems = items.filter(i => i.grupo === grupo.key);
    return (
      <Card key={grupo.key}>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-base">{grupo.label} ({grupoItems.length})</CardTitle>
          <Button size="sm" onClick={() => openDialog(grupo.key)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Valor</TableHead>
                {grupo.showSigla && <TableHead>Sigla</TableHead>}
                {grupo.showServicoIds && <TableHead>Serviços</TableHead>}
                <TableHead>Ordem</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupoItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={grupo.showSigla || grupo.showServicoIds ? 6 : 4} className="text-center text-muted-foreground py-4">
                    Nenhum item cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                grupoItems.map(item => (
                  <TableRow key={item.id} className={!item.ativo ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{item.valor}</TableCell>
                    {grupo.showSigla && <TableCell className="font-mono">{item.sigla || "—"}</TableCell>}
                    {grupo.showServicoIds && (
                      <TableCell className="text-xs">
                        {item.servico_ids?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {item.servico_ids.map(id => (
                              <Badge key={id} variant="outline" className="text-[10px]">
                                {servicos.find(s => s.id === id)?.nome || id.slice(0, 8)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Todos</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>{item.ordem}</TableCell>
                    <TableCell>
                      <Switch checked={item.ativo} onCheckedChange={() => toggleAtivo(item)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openDialog(grupo.key, item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir "{item.valor}"?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(item)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  if (loading) return <p className="text-muted-foreground text-center py-8">Carregando...</p>;

  return (
    <>
      <div className="space-y-6">
        {GRUPOS.map(grupo => renderGrupoTable(grupo))}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar" : "Adicionar"} Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Valor</Label>
              <Input value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} placeholder="Nome do item" />
            </div>
            {currentGrupo?.showSigla && (
              <div>
                <Label>Sigla (abreviação)</Label>
                <Input value={formData.sigla} onChange={(e) => setFormData({ ...formData, sigla: e.target.value })} placeholder="Ex: Dry, Reefer, IMO" />
              </div>
            )}
            {currentGrupo?.showServicoIds && (
              <div>
                <Label>Serviços associados</Label>
                <p className="text-xs text-muted-foreground mb-2">Deixe vazio para aplicar a todos os serviços</p>
                <div className="space-y-2 max-h-48 overflow-auto border rounded-md p-3">
                  {servicos.map(servico => (
                    <div key={servico.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`srv-${servico.id}`}
                        checked={formData.servico_ids.includes(servico.id)}
                        onCheckedChange={() => toggleServicoId(servico.id)}
                      />
                      <label htmlFor={`srv-${servico.id}`} className="text-sm cursor-pointer">{servico.nome}</label>
                    </div>
                  ))}
                  {servicos.length === 0 && <p className="text-xs text-muted-foreground">Nenhum serviço cadastrado</p>}
                </div>
              </div>
            )}
            <div>
              <Label>Ordem</Label>
              <Input type="number" value={formData.ordem} onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ParametrosCamposManager;
