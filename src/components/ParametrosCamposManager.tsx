import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
}

const GRUPOS = [
  { key: "tipo_carga", label: "Tipo Carga", showSigla: true },
  { key: "categoria", label: "Categoria", showSigla: false },
  { key: "status_deferimento", label: "Status Deferimento", showSigla: false },
];

const ParametrosCamposManager = () => {
  const [items, setItems] = useState<ParametroCampo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ParametroCampo | null>(null);
  const [formData, setFormData] = useState({ grupo: "tipo_carga", valor: "", sigla: "", ordem: 0 });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("parametros_campos")
      .select("*")
      .order("grupo")
      .order("ordem");
    setItems((data as ParametroCampo[]) || []);
    setLoading(false);
  };

  const openDialog = (grupo: string, item?: ParametroCampo) => {
    if (item) {
      setEditingItem(item);
      setFormData({ grupo: item.grupo, valor: item.valor, sigla: item.sigla || "", ordem: item.ordem });
    } else {
      setEditingItem(null);
      const maxOrder = items.filter(i => i.grupo === grupo).reduce((max, i) => Math.max(max, i.ordem), 0);
      setFormData({ grupo, valor: "", sigla: "", ordem: maxOrder + 1 });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.valor.trim()) { toast.error("Valor é obrigatório"); return; }
    
    const data = {
      grupo: formData.grupo,
      valor: formData.valor.trim(),
      sigla: formData.sigla.trim() || null,
      ordem: formData.ordem,
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

  const renderGrupoTable = (grupo: { key: string; label: string; showSigla: boolean }) => {
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
                <TableHead>Ordem</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grupoItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={grupo.showSigla ? 5 : 4} className="text-center text-muted-foreground py-4">
                    Nenhum item cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                grupoItems.map(item => (
                  <TableRow key={item.id} className={!item.ativo ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{item.valor}</TableCell>
                    {grupo.showSigla && <TableCell className="font-mono">{item.sigla || "—"}</TableCell>}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar" : "Adicionar"} Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Valor</Label>
              <Input value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} placeholder="Nome do item" />
            </div>
            {GRUPOS.find(g => g.key === formData.grupo)?.showSigla && (
              <div>
                <Label>Sigla (abreviação)</Label>
                <Input value={formData.sigla} onChange={(e) => setFormData({ ...formData, sigla: e.target.value })} placeholder="Ex: Dry, Reefer, IMO" />
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
