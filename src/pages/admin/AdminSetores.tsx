import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, ArrowLeft, Plus, Save, Edit, Trash2, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Setor {
  id: string;
  email_setor: string;
  setor: string;
  descricao: string | null;
  perfis: string[];
  ativo: boolean;
}

interface Servico {
  id: string;
  nome: string;
}

// Perfis disponíveis para seleção (renomeado de "Tipo Setor")
const PERFIS_DISPONIVEIS = [
  { value: "ADMINISTRATIVO", label: "Administrativo" },
  { value: "OPERACIONAL", label: "Operacional" },
  { value: "GESTOR", label: "Gestor" },
];

const AdminSetores = () => {
  const navigate = useNavigate();
  const [setores, setSetores] = useState<Setor[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAccessDialog, setShowAccessDialog] = useState(false);
  const [editingSetor, setEditingSetor] = useState<Setor | null>(null);
  const [selectedSetorForAccess, setSelectedSetorForAccess] = useState<Setor | null>(null);
  const [selectedServicos, setSelectedServicos] = useState<Set<string>>(new Set());
  const [setorServicosMap, setSetorServicosMap] = useState<Record<string, Set<string>>>({});
  const [formData, setFormData] = useState({
    email_setor: "",
    perfis: [] as string[],
    descricao: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [setoresRes, servicosRes, setorServicosRes] = await Promise.all([
      supabase.from("setor_emails").select("*").order("descricao"),
      supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("setor_servicos").select("setor_email_id, servico_id")
    ]);

    if (setoresRes.error) {
      toast.error("Erro ao carregar setores");
    } else {
      // Parse perfis array - some old records may not have it
      const parsed = (setoresRes.data || []).map(s => ({
        ...s,
        perfis: s.perfis || []
      }));
      setSetores(parsed);
    }
    
    if (servicosRes.data) setServicos(servicosRes.data);
    
    // Map setor_servicos
    if (setorServicosRes.data) {
      const map: Record<string, Set<string>> = {};
      setorServicosRes.data.forEach(ss => {
        if (!map[ss.setor_email_id]) map[ss.setor_email_id] = new Set();
        map[ss.setor_email_id].add(ss.servico_id);
      });
      setSetorServicosMap(map);
    }
    
    setLoading(false);
  };

  const handleToggleActive = async (setor: Setor) => {
    const { error } = await supabase
      .from("setor_emails")
      .update({ ativo: !setor.ativo })
      .eq("id", setor.id);

    if (error) {
      toast.error("Erro ao atualizar status: " + error.message);
      return;
    }

    toast.success(setor.ativo ? "Setor desativado" : "Setor ativado");
    fetchData();
  };

  const togglePerfil = (perfil: string) => {
    setFormData(prev => ({
      ...prev,
      perfis: prev.perfis.includes(perfil)
        ? prev.perfis.filter(p => p !== perfil)
        : [...prev.perfis, perfil]
    }));
  };

  const handleSave = async () => {
    if (!formData.email_setor.endsWith("@jbsterminais.com.br")) {
      toast.error("E-mail deve ser do domínio @jbsterminais.com.br");
      return;
    }

    if (formData.perfis.length === 0) {
      toast.error("Selecione pelo menos um perfil");
      return;
    }

    // Determinar o setor principal para compatibilidade com enum antigo
    // Se tem ADMINISTRATIVO, usar COMEX. Se tem OPERACIONAL, usar ARMAZEM.
    // Se tem ambos, usar o primeiro.
    let setorValue = "COMEX";
    if (formData.perfis.includes("OPERACIONAL") && !formData.perfis.includes("ADMINISTRATIVO")) {
      setorValue = "ARMAZEM";
    }

    if (editingSetor) {
      const { error } = await supabase
        .from("setor_emails")
        .update({
          email_setor: formData.email_setor,
          setor: setorValue as any,
          perfis: formData.perfis,
          descricao: formData.descricao || null
        })
        .eq("id", editingSetor.id);

      if (error) {
        toast.error("Erro ao atualizar setor: " + error.message);
        return;
      }
      toast.success("Setor atualizado!");
    } else {
      const { error } = await supabase
        .from("setor_emails")
        .insert({
          email_setor: formData.email_setor,
          setor: setorValue as any,
          perfis: formData.perfis,
          descricao: formData.descricao || null
        });

      if (error) {
        toast.error("Erro ao adicionar setor: " + error.message);
        return;
      }
      toast.success("Setor adicionado!");
    }

    setShowAddDialog(false);
    setEditingSetor(null);
    setFormData({ email_setor: "", perfis: [], descricao: "" });
    fetchData();
  };

  const handleDelete = async (setor: Setor) => {
    const { data: linkedUsers } = await supabase
      .from("profiles")
      .select("id")
      .eq("email_setor", setor.email_setor)
      .limit(1);

    if (linkedUsers && linkedUsers.length > 0) {
      toast.error("Não é possível excluir: existem usuários vinculados a este setor. Desative-o em vez de excluir.");
      return;
    }

    await supabase.from("setor_servicos").delete().eq("setor_email_id", setor.id);

    const { error } = await supabase
      .from("setor_emails")
      .delete()
      .eq("id", setor.id);

    if (error) {
      toast.error("Erro ao excluir setor: " + error.message);
      return;
    }

    toast.success("Setor excluído!");
    fetchData();
  };

  const openEditDialog = (setor: Setor) => {
    setEditingSetor(setor);
    
    // Se não tem perfis salvos, inferir do setor antigo
    let perfis = setor.perfis || [];
    if (perfis.length === 0) {
      if (setor.setor === "COMEX" || setor.setor === "ADMINISTRATIVO") {
        perfis = ["ADMINISTRATIVO"];
      } else if (setor.setor === "ARMAZEM" || setor.setor === "OPERACIONAL") {
        perfis = ["OPERACIONAL"];
      }
    }
    
    setFormData({
      email_setor: setor.email_setor,
      perfis: perfis,
      descricao: setor.descricao || ""
    });
    setShowAddDialog(true);
  };

  const openAccessDialog = async (setor: Setor) => {
    setSelectedSetorForAccess(setor);
    const currentPermissions = setorServicosMap[setor.id] || new Set();
    setSelectedServicos(new Set(currentPermissions));
    setShowAccessDialog(true);
  };

  const toggleServicoAccess = (servicoId: string) => {
    setSelectedServicos(prev => {
      const next = new Set(prev);
      if (next.has(servicoId)) {
        next.delete(servicoId);
      } else {
        next.add(servicoId);
      }
      return next;
    });
  };

  const saveAccessPermissions = async () => {
    if (!selectedSetorForAccess) return;

    await supabase.from("setor_servicos").delete().eq("setor_email_id", selectedSetorForAccess.id);

    if (selectedServicos.size > 0) {
      const inserts = Array.from(selectedServicos).map(servicoId => ({
        setor_email_id: selectedSetorForAccess.id,
        servico_id: servicoId
      }));

      const { error } = await supabase.from("setor_servicos").insert(inserts);
      if (error) {
        toast.error("Erro ao salvar permissões");
        return;
      }
    }

    const setorNome = selectedSetorForAccess.descricao || selectedSetorForAccess.email_setor;
    toast.success(`Permissões atualizadas para ${setorNome}`);
    setShowAccessDialog(false);
    setSelectedSetorForAccess(null);
    fetchData();
  };

  const getPerfisDisplay = (setor: Setor) => {
    const perfis = setor.perfis || [];
    if (perfis.length === 0) {
      // Fallback para enum antigo
      if (setor.setor === "COMEX") return ["Administrativo"];
      if (setor.setor === "ARMAZEM") return ["Operacional"];
      return [setor.setor];
    }
    return perfis.map(p => {
      if (p === "ADMINISTRATIVO") return "Administrativo";
      if (p === "OPERACIONAL") return "Operacional";
      if (p === "GESTOR") return "Gestor";
      return p;
    });
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
            setFormData({ email_setor: "", perfis: [], descricao: "" });
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
                <Label>Perfil(is)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione um ou mais perfis para este setor
                </p>
                <div className="space-y-2">
                  {PERFIS_DISPONIVEIS.map(perfil => (
                    <div key={perfil.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={perfil.value}
                        checked={formData.perfis.includes(perfil.value)}
                        onCheckedChange={() => togglePerfil(perfil.value)}
                      />
                      <Label htmlFor={perfil.value} className="cursor-pointer">
                        {perfil.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label>Descrição / Nome do Setor</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Ex: Comércio Exterior"
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

      {/* Access Permissions Dialog */}
      <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Permissões de Acesso - {selectedSetorForAccess?.descricao || selectedSetorForAccess?.email_setor}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Selecione os serviços que este setor pode acessar e gerenciar:
            </p>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {servicos.map((servico) => (
                <div key={servico.id} className="flex items-center space-x-3">
                  <Checkbox
                    id={servico.id}
                    checked={selectedServicos.has(servico.id)}
                    onCheckedChange={() => toggleServicoAccess(servico.id)}
                  />
                  <Label htmlFor={servico.id} className="cursor-pointer">
                    {servico.nome}
                  </Label>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={saveAccessPermissions} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Salvar Permissões
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Setores Cadastrados ({setores.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail do Setor</TableHead>
                <TableHead>Nome / Descrição</TableHead>
                <TableHead>Perfil(is)</TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {setores.map((setor) => {
                const servicosCount = setorServicosMap[setor.id]?.size || 0;
                const perfisDisplay = getPerfisDisplay(setor);
                return (
                  <TableRow key={setor.id} className={!setor.ativo ? "opacity-50" : ""}>
                    <TableCell className="font-mono text-sm">{setor.email_setor}</TableCell>
                    <TableCell className="font-medium">{setor.descricao || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {perfisDisplay.map(p => (
                          <Badge key={p} variant="secondary" className="text-xs">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={servicosCount > 0 ? "text-primary" : "text-muted-foreground"}>
                        {servicosCount} serviço(s)
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={setor.ativo}
                        onCheckedChange={() => handleToggleActive(setor)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(setor)} title="Editar">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openAccessDialog(setor)} title="Permissões">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" title="Excluir">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Setor</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o setor <strong>{setor.descricao || setor.email_setor}</strong>?
                                Se houver usuários vinculados, a exclusão não será permitida.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(setor)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSetores;
