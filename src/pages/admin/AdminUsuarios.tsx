import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, ArrowLeft, Save, Shield, Edit, Trash2, Ban, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Profile {
  id: string;
  nome: string | null;
  email: string;
  setor: string | null;
  email_setor: string | null;
  created_at: string;
  bloqueado: boolean;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface Setor {
  email_setor: string;
  setor: string;
}

// ID do Admin Master - primeiro admin criado no sistema
const ADMIN_MASTER_EMAIL = "admin@jbsterminais.com.br";

const AdminUsuarios = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editFormData, setEditFormData] = useState({ nome: "" });
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [profilesRes, setoresRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("nome"),
      supabase.from("setor_emails").select("email_setor, setor").eq("ativo", true),
      supabase.from("user_roles").select("user_id, role")
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data);
    if (setoresRes.data) setSetores(setoresRes.data);
    if (rolesRes.data) setUserRoles(rolesRes.data);
    setLoading(false);
  };

  const isAdmin = (userId: string) => userRoles.some(r => r.user_id === userId && r.role === "admin");
  
  const isAdminMaster = (profile: Profile) => {
    // O admin master é o primeiro admin criado - identificamos pelo email ou pelo primeiro admin
    const adminUsers = profiles.filter(p => isAdmin(p.id));
    if (adminUsers.length === 0) return false;
    
    // Se tem email específico de admin, é o master
    if (profile.email === ADMIN_MASTER_EMAIL) return true;
    
    // Ou é o admin mais antigo
    const sortedAdmins = adminUsers.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return sortedAdmins[0]?.id === profile.id;
  };

  const handleSetorChange = (profileId: string, emailSetor: string) => {
    // Admin não precisa de setor
    if (isAdmin(profileId)) {
      toast.info("Administradores não precisam de setor - têm acesso a tudo");
      return;
    }
    setChanges(prev => ({ ...prev, [profileId]: emailSetor }));
  };

  const saveChanges = async () => {
    for (const [profileId, emailSetor] of Object.entries(changes)) {
      const setorInfo = setores.find(s => s.email_setor === emailSetor);
      
      const { error } = await supabase
        .from("profiles")
        .update({ 
          email_setor: emailSetor,
          setor: (setorInfo?.setor || null) as "COMEX" | "ARMAZEM" | null,
          updated_at: new Date().toISOString()
        })
        .eq("id", profileId);

      if (error) {
        toast.error("Erro ao atualizar usuário");
        return;
      }
    }

    toast.success("Alterações salvas!");
    setChanges({});
    fetchData();
  };

  const toggleAdminRole = async (userId: string) => {
    const profile = profiles.find(p => p.id === userId);
    if (!profile) return;

    // Não pode remover admin do Admin Master
    if (isAdminMaster(profile) && isAdmin(userId)) {
      toast.error("Não é possível remover a permissão de Admin do usuário Admin Master");
      return;
    }

    const hasAdmin = isAdmin(userId);
    
    if (hasAdmin) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
      
      if (error) {
        toast.error("Erro ao remover permissão de admin");
        return;
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
      
      if (error) {
        toast.error("Erro ao adicionar permissão de admin");
        return;
      }
    }

    toast.success(hasAdmin ? "Permissão de admin removida" : "Permissão de admin concedida");
    fetchData();
  };

  const toggleBlockUser = async (profile: Profile) => {
    // Não pode bloquear o Admin Master
    if (isAdminMaster(profile)) {
      toast.error("Não é possível bloquear o usuário Admin Master");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ bloqueado: !profile.bloqueado, updated_at: new Date().toISOString() })
      .eq("id", profile.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    toast.success(profile.bloqueado ? "Usuário desbloqueado" : "Usuário bloqueado");
    fetchData();
  };

  const handleEditUser = (user: Profile) => {
    setEditingUser(user);
    setEditFormData({ nome: user.nome || "" });
    setShowEditDialog(true);
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;

    const { error } = await supabase
      .from("profiles")
      .update({ 
        nome: editFormData.nome,
        updated_at: new Date().toISOString()
      })
      .eq("id", editingUser.id);

    if (error) {
      toast.error("Erro ao atualizar usuário");
      return;
    }

    toast.success("Usuário atualizado!");
    setShowEditDialog(false);
    setEditingUser(null);
    fetchData();
  };

  const deleteUser = async (profile: Profile) => {
    // Não pode excluir o Admin Master
    if (isAdminMaster(profile)) {
      toast.error("Não é possível excluir o usuário Admin Master");
      return;
    }

    // Delete user roles first
    await supabase.from("user_roles").delete().eq("user_id", profile.id);
    
    // Delete profile
    const { error } = await supabase.from("profiles").delete().eq("id", profile.id);

    if (error) {
      toast.error("Erro ao excluir usuário");
      return;
    }

    toast.success("Usuário excluído!");
    fetchData();
  };

  const getSetorDisplay = (profile: Profile) => {
    if (isAdmin(profile.id)) {
      return "Todos (Admin)";
    }
    return profile.setor || "Não definido";
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
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/interno/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h1>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={editFormData.nome}
                onChange={(e) => setEditFormData(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={editingUser?.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground mt-1">O e-mail não pode ser alterado (vinculado ao Microsoft)</p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={saveUserEdit}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados ({profiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => {
                const isMaster = isAdminMaster(profile);
                const isUserAdmin = isAdmin(profile.id);
                
                return (
                  <TableRow 
                    key={profile.id} 
                    className={profile.bloqueado ? "opacity-50 bg-destructive/5" : isMaster ? "bg-primary/5" : ""}
                  >
                    <TableCell className="font-medium">
                      {profile.nome || "—"}
                      {isMaster && <Badge variant="outline" className="ml-2 text-xs">Master</Badge>}
                    </TableCell>
                    <TableCell>{profile.email}</TableCell>
                    <TableCell>
                      {isUserAdmin ? (
                        <Badge variant="secondary">Todos (Admin)</Badge>
                      ) : (
                        <Select
                          value={changes[profile.id] || profile.email_setor || ""}
                          onValueChange={(value) => handleSetorChange(profile.id, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Selecione o setor" />
                          </SelectTrigger>
                          <SelectContent>
                            {setores.map(s => (
                              <SelectItem key={s.email_setor} value={s.email_setor}>
                                {s.setor}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell>
                      {profile.bloqueado ? (
                        <Badge variant="destructive">Bloqueado</Badge>
                      ) : (
                        <Badge variant="secondary">Ativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant={isUserAdmin ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleAdminRole(profile.id)}
                        disabled={isMaster && isUserAdmin}
                        title={isMaster && isUserAdmin ? "Admin Master não pode perder permissão" : ""}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        {isUserAdmin ? "Admin" : "Usuário"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {/* Edit Button */}
                        <Button variant="ghost" size="icon" onClick={() => handleEditUser(profile)}>
                          <Edit className="h-4 w-4" />
                        </Button>

                        {/* Block/Unblock Button - disabled for Admin Master */}
                        {!isMaster && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleBlockUser(profile)}
                            title={profile.bloqueado ? "Desbloquear" : "Bloquear"}
                          >
                            {profile.bloqueado ? (
                              <CheckCircle className="h-4 w-4 text-primary" />
                            ) : (
                              <Ban className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        )}

                        {/* Delete Button - disabled for Admin Master */}
                        {!isMaster && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o usuário <strong>{profile.nome || profile.email}</strong>?
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(profile)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {Object.keys(changes).length > 0 && (
            <div className="flex justify-end mt-4">
              <Button onClick={saveChanges}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsuarios;
