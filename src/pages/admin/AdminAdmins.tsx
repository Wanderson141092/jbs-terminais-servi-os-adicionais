import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, ArrowLeft, Plus, Save, Edit, Trash2, Key } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminAccount {
  id: string;
  cpf: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

const AdminAdmins = () => {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [selectedAdminForPassword, setSelectedAdminForPassword] = useState<AdminAccount | null>(null);
  const [formData, setFormData] = useState({
    cpf: "",
    nome: "",
    senha: "",
    confirmarSenha: ""
  });
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    const { data, error } = await supabase
      .from("admin_accounts")
      .select("id, cpf, nome, ativo, created_at")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar administradores");
    } else {
      setAdmins(data || []);
    }
    setLoading(false);
  };

  const formatCPF = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
    if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
    return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
  };

  const validateCPF = (cpf: string): boolean => {
    const nums = cpf.replace(/\D/g, '');
    return nums.length === 11;
  };

  const handleToggleActive = async (admin: AdminAccount) => {
    const { error } = await supabase
      .from("admin_accounts")
      .update({ ativo: !admin.ativo })
      .eq("id", admin.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    toast.success(admin.ativo ? "Administrador desativado" : "Administrador ativado");
    fetchAdmins();
  };

  const handleSave = async () => {
    const cpfNums = formData.cpf.replace(/\D/g, '');
    
    if (!validateCPF(formData.cpf)) {
      toast.error("CPF inválido");
      return;
    }

    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (!editingAdmin && formData.senha.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (!editingAdmin && formData.senha !== formData.confirmarSenha) {
      toast.error("Senhas não conferem");
      return;
    }

    if (editingAdmin) {
      const { error } = await supabase
        .from("admin_accounts")
        .update({
          cpf: cpfNums,
          nome: formData.nome,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingAdmin.id);

      if (error) {
        toast.error("Erro ao atualizar administrador");
        return;
      }
      toast.success("Administrador atualizado!");
    } else {
      const { error } = await supabase
        .from("admin_accounts")
        .insert({
          cpf: cpfNums,
          nome: formData.nome,
          senha_hash: formData.senha // Em produção, usar hash bcrypt
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("CPF já cadastrado");
        } else {
          toast.error("Erro ao adicionar administrador");
        }
        return;
      }
      toast.success("Administrador adicionado!");
    }

    setShowDialog(false);
    setEditingAdmin(null);
    setFormData({ cpf: "", nome: "", senha: "", confirmarSenha: "" });
    fetchAdmins();
  };

  const handleChangePassword = async () => {
    if (!selectedAdminForPassword) return;
    
    if (newPassword.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    const { error } = await supabase
      .from("admin_accounts")
      .update({ 
        senha_hash: newPassword,
        updated_at: new Date().toISOString()
      })
      .eq("id", selectedAdminForPassword.id);

    if (error) {
      toast.error("Erro ao alterar senha");
      return;
    }

    toast.success(`Senha de ${selectedAdminForPassword.nome} alterada!`);
    setShowPasswordDialog(false);
    setSelectedAdminForPassword(null);
    setNewPassword("");
  };

  const handleDelete = async (admin: AdminAccount) => {
    const { error } = await supabase
      .from("admin_accounts")
      .delete()
      .eq("id", admin.id);

    if (error) {
      toast.error("Erro ao excluir administrador");
      return;
    }

    toast.success("Administrador excluído!");
    fetchAdmins();
  };

  const openEditDialog = (admin: AdminAccount) => {
    setEditingAdmin(admin);
    setFormData({
      cpf: formatCPF(admin.cpf),
      nome: admin.nome,
      senha: "",
      confirmarSenha: ""
    });
    setShowDialog(true);
  };

  const openPasswordDialog = (admin: AdminAccount) => {
    setSelectedAdminForPassword(admin);
    setNewPassword("");
    setShowPasswordDialog(true);
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
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Administradores do Sistema</h1>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setEditingAdmin(null);
            setFormData({ cpf: "", nome: "", senha: "", confirmarSenha: "" });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAdmin ? "Editar Administrador" : "Adicionar Administrador"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>CPF</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  placeholder="000.000.000-00"
                  disabled={!!editingAdmin}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Usado para login na aba Admin
                </p>
              </div>
              <div>
                <Label>Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              {!editingAdmin && (
                <>
                  <div>
                    <Label>Senha</Label>
                    <Input
                      type="password"
                      value={formData.senha}
                      onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label>Confirmar Senha</Label>
                    <Input
                      type="password"
                      value={formData.confirmarSenha}
                      onChange={(e) => setFormData({ ...formData, confirmarSenha: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                </>
              )}
              <Button onClick={handleSave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {editingAdmin ? "Salvar Alterações" : "Adicionar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha - {selectedAdminForPassword?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nova Senha</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Mínimo 6 caracteres
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancelar</Button>
            <Button onClick={handleChangePassword}>
              <Key className="h-4 w-4 mr-2" />
              Alterar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Administradores Cadastrados ({admins.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Estes usuários podem fazer login na aba "Admin" usando CPF e senha, mantendo o acesso mesmo se a conta principal for perdida.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id} className={!admin.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{admin.nome}</TableCell>
                  <TableCell className="font-mono">{formatCPF(admin.cpf)}</TableCell>
                  <TableCell>{new Date(admin.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Switch
                      checked={admin.ativo}
                      onCheckedChange={() => handleToggleActive(admin)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(admin)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openPasswordDialog(admin)}>
                        <Key className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir Administrador</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir <strong>{admin.nome}</strong>?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(admin)}
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
              ))}
              {admins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum administrador cadastrado por CPF. Use o usuário "Admin" padrão.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAdmins;
