import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, ArrowLeft, Plus, Save, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Setor {
  id: string;
  email_setor: string;
  setor: string;
  descricao: string | null;
  ativo: boolean;
}

const AdminSetores = () => {
  const navigate = useNavigate();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSetor, setEditingSetor] = useState<Setor | null>(null);
  const [formData, setFormData] = useState({
    email_setor: "",
    setor: "COMEX" as "COMEX" | "ARMAZEM",
    descricao: ""
  });

  useEffect(() => {
    fetchSetores();
  }, []);

  const fetchSetores = async () => {
    const { data, error } = await supabase
      .from("setor_emails")
      .select("*")
      .order("setor");

    if (error) {
      toast.error("Erro ao carregar setores");
    } else {
      setSetores(data || []);
    }
    setLoading(false);
  };

  const handleToggleActive = async (setor: Setor) => {
    const { error } = await supabase
      .from("setor_emails")
      .update({ ativo: !setor.ativo })
      .eq("id", setor.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    toast.success(setor.ativo ? "Setor desativado" : "Setor ativado");
    fetchSetores();
  };

  const handleSave = async () => {
    if (!formData.email_setor.endsWith("@jbsterminais.com.br")) {
      toast.error("E-mail deve ser do domínio @jbsterminais.com.br");
      return;
    }

    if (editingSetor) {
      const { error } = await supabase
        .from("setor_emails")
        .update({
          email_setor: formData.email_setor,
          setor: formData.setor,
          descricao: formData.descricao || null
        })
        .eq("id", editingSetor.id);

      if (error) {
        toast.error("Erro ao atualizar setor");
        return;
      }
      toast.success("Setor atualizado!");
    } else {
      const { error } = await supabase
        .from("setor_emails")
        .insert({
          email_setor: formData.email_setor,
          setor: formData.setor,
          descricao: formData.descricao || null
        });

      if (error) {
        toast.error("Erro ao adicionar setor");
        return;
      }
      toast.success("Setor adicionado!");
    }

    setShowAddDialog(false);
    setEditingSetor(null);
    setFormData({ email_setor: "", setor: "COMEX", descricao: "" });
    fetchSetores();
  };

  const openEditDialog = (setor: Setor) => {
    setEditingSetor(setor);
    setFormData({
      email_setor: setor.email_setor,
      setor: setor.setor as "COMEX" | "ARMAZEM",
      descricao: setor.descricao || ""
    });
    setShowAddDialog(true);
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
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Setores</h1>
          </div>
        </div>

        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setEditingSetor(null);
            setFormData({ email_setor: "", setor: "COMEX", descricao: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Setor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSetor ? "Editar Setor" : "Adicionar Setor"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>E-mail do Setor</Label>
                <Input
                  value={formData.email_setor}
                  onChange={(e) => setFormData({ ...formData, email_setor: e.target.value })}
                  placeholder="setor@jbsterminais.com.br"
                />
              </div>
              <div>
                <Label>Tipo de Setor</Label>
                <Select
                  value={formData.setor}
                  onValueChange={(value: "COMEX" | "ARMAZEM") => setFormData({ ...formData, setor: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMEX">COMEX</SelectItem>
                    <SelectItem value="ARMAZEM">ARMAZÉM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição do setor"
                />
              </div>
              <Button onClick={handleSave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {editingSetor ? "Salvar Alterações" : "Adicionar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setores Cadastrados ({setores.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail do Setor</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {setores.map((setor) => (
                <TableRow key={setor.id} className={!setor.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-mono">{setor.email_setor}</TableCell>
                  <TableCell>{setor.setor}</TableCell>
                  <TableCell>{setor.descricao || "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={setor.ativo}
                      onCheckedChange={() => handleToggleActive(setor)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(setor)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetores;
