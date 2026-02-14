import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Save, Palette } from "lucide-react";

interface EstiloFormulario {
  id: string;
  chave: string;
  nome: string;
  descricao: string | null;
  features: string[];
  config: any;
  ativo: boolean;
  ordem: number;
}

const EstilosFormularioManager = () => {
  const [estilos, setEstilos] = useState<EstiloFormulario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<EstiloFormulario | null>(null);
  const [formData, setFormData] = useState({
    chave: "",
    nome: "",
    descricao: "",
    features: "",
    ordem: 0,
  });

  useEffect(() => { fetchEstilos(); }, []);

  const fetchEstilos = async () => {
    const { data } = await supabase.from("estilos_formulario").select("*").order("ordem");
    setEstilos((data as EstiloFormulario[]) || []);
    setLoading(false);
  };

  const openDialog = (estilo?: EstiloFormulario) => {
    if (estilo) {
      setEditing(estilo);
      setFormData({
        chave: estilo.chave,
        nome: estilo.nome,
        descricao: estilo.descricao || "",
        features: estilo.features.join("\n"),
        ordem: estilo.ordem,
      });
    } else {
      setEditing(null);
      const maxOrdem = estilos.reduce((max, e) => Math.max(max, e.ordem), 0);
      setFormData({ chave: "", nome: "", descricao: "", features: "", ordem: maxOrdem + 1 });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.chave.trim() || !formData.nome.trim()) {
      toast.error("Chave e nome são obrigatórios");
      return;
    }
    const features = formData.features.split("\n").filter(f => f.trim()).map(f => f.trim());
    const data: any = {
      chave: formData.chave.trim().toLowerCase().replace(/\s+/g, "_"),
      nome: formData.nome.trim(),
      descricao: formData.descricao.trim() || null,
      features,
      ordem: formData.ordem,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from("estilos_formulario").update(data).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Estilo atualizado!");
    } else {
      const { error } = await supabase.from("estilos_formulario").insert(data);
      if (error) {
        if (error.code === "23505") toast.error("Chave já existe");
        else toast.error("Erro ao criar");
        return;
      }
      toast.success("Estilo criado!");
    }
    setShowDialog(false);
    fetchEstilos();
  };

  const handleDelete = async (estilo: EstiloFormulario) => {
    const { error } = await supabase.from("estilos_formulario").delete().eq("id", estilo.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Estilo excluído!");
    fetchEstilos();
  };

  const toggleAtivo = async (estilo: EstiloFormulario) => {
    await supabase.from("estilos_formulario").update({ ativo: !estilo.ativo }).eq("id", estilo.id);
    fetchEstilos();
  };

  if (loading) return <p className="text-muted-foreground text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Estilos de Formulário</p>
        <p>Gerencie os templates visuais disponíveis para criação de formulários. Cada estilo define um design e conjunto de funcionalidades único.</p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => openDialog()}>
          <Plus className="h-4 w-4 mr-2" /> Novo Estilo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Estilos Cadastrados ({estilos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Chave</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Funcionalidades</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estilos.map(estilo => (
                <TableRow key={estilo.id} className={!estilo.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{estilo.nome}</TableCell>
                  <TableCell className="font-mono text-xs">{estilo.chave}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{estilo.descricao || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {estilo.features.slice(0, 3).map((f, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{f}</Badge>
                      ))}
                      {estilo.features.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">+{estilo.features.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch checked={estilo.ativo} onCheckedChange={() => toggleAtivo(estilo)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openDialog(estilo)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir estilo "{estilo.nome}"?</AlertDialogTitle>
                            <AlertDialogDescription>Formulários que usam este estilo manterão a configuração até serem editados.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(estilo)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {estilos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum estilo cadastrado</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Novo"} Estilo</DialogTitle>
            <DialogDescription>Configure o template visual do formulário</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Chave identificadora</Label>
              <Input
                value={formData.chave}
                onChange={e => setFormData({ ...formData, chave: e.target.value })}
                placeholder="Ex: meu_estilo"
                disabled={!!editing}
              />
              <p className="text-xs text-muted-foreground mt-1">Identificador único, sem espaços. Não editável após criação.</p>
            </div>
            <div>
              <Label>Nome de exibição</Label>
              <Input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: Meu Estilo Personalizado" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} placeholder="Descrição do estilo visual" rows={2} />
            </div>
            <div>
              <Label>Funcionalidades (uma por linha)</Label>
              <Textarea value={formData.features} onChange={e => setFormData({ ...formData, features: e.target.value })} placeholder={"Campos básicos\nUpload de arquivos\nValidação"} rows={4} />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input type="number" value={formData.ordem} onChange={e => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })} />
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

export default EstilosFormularioManager;
