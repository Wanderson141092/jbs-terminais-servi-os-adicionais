import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, ArrowLeft, Plus, Save, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Servico {
  id: string;
  nome: string;
  codigo_prefixo: string;
  descricao: string | null;
  ativo: boolean;
}

const AdminServicos = () => {
  const navigate = useNavigate();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    codigo_prefixo: "",
    descricao: ""
  });

  useEffect(() => {
    fetchServicos();
  }, []);

  const fetchServicos = async () => {
    const { data, error } = await supabase
      .from("servicos")
      .select("*")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar serviços");
    } else {
      setServicos(data || []);
    }
    setLoading(false);
  };

  const checkHasRecords = async (servicoNome: string): Promise<boolean> => {
    const { count } = await supabase
      .from("solicitacoes")
      .select("*", { count: "exact", head: true })
      .eq("tipo_operacao", servicoNome);
    
    return (count || 0) > 0;
  };

  const handleToggleActive = async (servico: Servico) => {
    const { error } = await supabase
      .from("servicos")
      .update({ ativo: !servico.ativo, updated_at: new Date().toISOString() })
      .eq("id", servico.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    toast.success(servico.ativo ? "Serviço desativado" : "Serviço ativado");
    fetchServicos();
  };

  const handleDelete = async (servico: Servico) => {
    const hasRecords = await checkHasRecords(servico.nome);
    
    if (hasRecords) {
      toast.error("Este serviço possui registros. Apenas desative-o.");
      return;
    }

    const { error } = await supabase
      .from("servicos")
      .delete()
      .eq("id", servico.id);

    if (error) {
      toast.error("Erro ao excluir serviço");
      return;
    }

    toast.success("Serviço excluído!");
    fetchServicos();
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.codigo_prefixo) {
      toast.error("Nome e código são obrigatórios");
      return;
    }

    if (formData.codigo_prefixo.length !== 1) {
      toast.error("Código prefixo deve ter apenas 1 caractere");
      return;
    }

    if (editingServico) {
      const { error } = await supabase
        .from("servicos")
        .update({
          nome: formData.nome,
          codigo_prefixo: formData.codigo_prefixo.toUpperCase(),
          descricao: formData.descricao || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingServico.id);

      if (error) {
        toast.error("Erro ao atualizar serviço");
        return;
      }
      toast.success("Serviço atualizado!");
    } else {
      const { error } = await supabase
        .from("servicos")
        .insert({
          nome: formData.nome,
          codigo_prefixo: formData.codigo_prefixo.toUpperCase(),
          descricao: formData.descricao || null
        });

      if (error) {
        toast.error("Erro ao adicionar serviço");
        return;
      }
      toast.success("Serviço adicionado!");
    }

    setShowDialog(false);
    setEditingServico(null);
    setFormData({ nome: "", codigo_prefixo: "", descricao: "" });
    fetchServicos();
  };

  const openEditDialog = (servico: Servico) => {
    setEditingServico(servico);
    setFormData({
      nome: servico.nome,
      codigo_prefixo: servico.codigo_prefixo,
      descricao: servico.descricao || ""
    });
    setShowDialog(true);
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
            <ClipboardList className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Serviços</h1>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setEditingServico(null);
            setFormData({ nome: "", codigo_prefixo: "", descricao: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Serviço
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingServico ? "Editar Serviço" : "Adicionar Serviço"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nome do Serviço</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Posicionamento"
                />
              </div>
              <div>
                <Label>Código Prefixo (1 letra)</Label>
                <Input
                  value={formData.codigo_prefixo}
                  onChange={(e) => setFormData({ ...formData, codigo_prefixo: e.target.value.slice(0, 1).toUpperCase() })}
                  placeholder="P"
                  maxLength={1}
                  className="w-20"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Usado no protocolo: JBS{formData.codigo_prefixo || "X"}000001
                </p>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição do serviço"
                />
              </div>
              <Button onClick={handleSave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {editingServico ? "Salvar Alterações" : "Adicionar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serviços Cadastrados ({servicos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Prefixo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicos.map((servico) => (
                <TableRow key={servico.id} className={!servico.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{servico.nome}</TableCell>
                  <TableCell className="font-mono">{servico.codigo_prefixo}</TableCell>
                  <TableCell>{servico.descricao || "—"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={servico.ativo}
                      onCheckedChange={() => handleToggleActive(servico)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(servico)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(servico)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

export default AdminServicos;
