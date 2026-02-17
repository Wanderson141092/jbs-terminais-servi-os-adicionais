import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, ArrowLeft, Save, Shield, Edit, Trash2, Ban, CheckCircle, Plus, Key } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useGestorCheck } from "@/hooks/useGestorCheck";

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
  descricao: string | null;
}

// ID do Admin Master - primeiro admin criado no sistema
const ADMIN_MASTER_EMAIL = "admin@jbsterminais.com.br";

// Hook to check if the current logged-in user is the Admin Master
const useCurrentUserIsMaster = () => {
  const [isMaster, setIsMaster] = useState(false);
  
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", session.user.id)
          .maybeSingle();
        setIsMaster(profile?.email === ADMIN_MASTER_EMAIL);
      }
    };
    check();
  }, []);
  
  return isMaster;
};
const AdminUsuarios = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editFormData, setEditFormData] = useState({ nome: "", email: "" });
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Criar usuário
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createFormData, setCreateFormData] = useState({ nome: "", email: "", senha: "" });
  const [createLoading, setCreateLoading] = useState(false);
  
  // Alterar senha Admin
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Alterar senha de outro usuário
  const [showUserPasswordDialog, setShowUserPasswordDialog] = useState(false);
  const [userPasswordTarget, setUserPasswordTarget] = useState<Profile | null>(null);
  const [userPasswordData, setUserPasswordData] = useState({ novaSenha: "", confirmarSenha: "" });
  const [userPasswordLoading, setUserPasswordLoading] = useState(false);
  
  const currentUserIsMaster = useCurrentUserIsMaster();
  const { isAdmin: isCurrentUserAdmin } = useAdminCheck(currentUserId);
  const { isGestor, gestorSetorEmail } = useGestorCheck(currentUserId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [profilesRes, setoresRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("nome"),
      supabase.from("setor_emails").select("email_setor, setor, descricao").eq("ativo", true),
      supabase.from("user_roles").select("user_id, role")
    ]);

    if (profilesRes.data) {
      // Remover duplicados por email
      const uniqueProfiles = profilesRes.data.reduce((acc: Profile[], profile) => {
        if (!acc.find(p => p.email === profile.email)) {
          acc.push(profile);
        }
        return acc;
      }, []);
      setProfiles(uniqueProfiles);
    }
    if (setoresRes.data) setSetores(setoresRes.data);
    if (rolesRes.data) setUserRoles(rolesRes.data);
    setLoading(false);
  };

  const isAdmin = (userId: string) => userRoles.some(r => r.user_id === userId && r.role === "admin");
  const isUserGestor = (userId: string) => userRoles.some(r => r.user_id === userId && r.role === "gestor");
  
  const getUserRole = (userId: string): "admin" | "gestor" | "user" => {
    if (isAdmin(userId)) return "admin";
    if (isUserGestor(userId)) return "gestor";
    return "user";
  };
  
  const isAdminMaster = (profile: Profile) => {
    if (profile.email === ADMIN_MASTER_EMAIL) return true;
    const adminUsers = profiles.filter(p => isAdmin(p.id));
    if (adminUsers.length === 0) return false;
    const sortedAdmins = adminUsers.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    return sortedAdmins[0]?.id === profile.id;
  };

  // Verifica se é usuário criado internamente (não via Microsoft)
  const isInternalUser = (profile: Profile) => {
    // Usuário interno: criado pela plataforma (pode ter sido criado manualmente)
    // Usuário Microsoft: tem email @jbsterminais.com.br mas não é o admin
    return profile.email === ADMIN_MASTER_EMAIL || !profile.email.includes("@");
  };

  const handleSetorChange = (profileId: string, emailSetor: string) => {
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
          setor: (setorInfo?.setor || null) as any,
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

  const setUserRole = async (userId: string, newRole: "admin" | "gestor" | "user") => {
    const profile = profiles.find(p => p.id === userId);
    if (!profile) return;

    if (isAdminMaster(profile) && newRole !== "admin") {
      toast.error("Não é possível remover a permissão de Admin do usuário Admin Master");
      return;
    }

    // Remove all existing roles for this user
    const { error: deleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    
    if (deleteError) {
      toast.error("Erro ao atualizar permissão");
      return;
    }

    // If new role is not 'user', insert the role
    if (newRole !== "user") {
      const { error: insertError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: newRole });
      
      if (insertError) {
        toast.error("Erro ao atualizar permissão");
        return;
      }
    }

    const roleLabels = { admin: "Admin", gestor: "Gestor", user: "Usuário" };
    toast.success(`Perfil alterado para ${roleLabels[newRole]}`);
    fetchData();
  };

  const toggleBlockUser = async (profile: Profile) => {
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
    setEditFormData({ nome: user.nome || "", email: user.email });
    setShowEditDialog(true);
  };

  const saveUserEdit = async () => {
    if (!editingUser) return;

    const updateData: any = { 
      nome: editFormData.nome,
      updated_at: new Date().toISOString()
    };

    // Só permite alterar email para usuários internos (não Microsoft)
    if (isInternalUser(editingUser) && editFormData.email !== editingUser.email) {
      updateData.email = editFormData.email;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
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
    if (isAdminMaster(profile)) {
      toast.error("Não é possível excluir o usuário Admin Master");
      return;
    }

    await supabase.from("user_roles").delete().eq("user_id", profile.id);
    const { error } = await supabase.from("profiles").delete().eq("id", profile.id);

    if (error) {
      toast.error("Erro ao excluir usuário");
      return;
    }

    toast.success("Usuário excluído!");
    fetchData();
  };

  // Criar usuário interno
  const handleCreateUser = async () => {
    if (!createFormData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!createFormData.email.trim() || !createFormData.email.endsWith("@jbsterminais.com.br")) {
      toast.error("E-mail deve ser do domínio @jbsterminais.com.br");
      return;
    }
    if (createFormData.senha.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    setCreateLoading(true);

    // Criar usuário no Supabase Auth
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: createFormData.email,
      password: createFormData.senha,
      options: {
        emailRedirectTo: `${window.location.origin}/interno/dashboard`
      }
    });

    if (signUpError) {
      toast.error("Erro ao criar usuário: " + signUpError.message);
      setCreateLoading(false);
      return;
    }

    if (signUpData.user) {
      // Criar profile
      await supabase.from("profiles").upsert({
        id: signUpData.user.id,
        email: createFormData.email,
        nome: createFormData.nome,
        bloqueado: true, // Começa bloqueado até confirmar email
      });

      toast.success("Usuário criado! Um e-mail de confirmação foi enviado. O cadastro ficará desativado até a confirmação.");
    }

    setShowCreateDialog(false);
    setCreateFormData({ nome: "", email: "", senha: "" });
    setCreateLoading(false);
    fetchData();
  };

  // Alterar senha Admin
  const handleChangePassword = async () => {
    if (passwordData.novaSenha !== passwordData.confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (passwordData.novaSenha.length < 6) {
      toast.error("Nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    setPasswordLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: passwordData.novaSenha
    });

    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
      setPasswordLoading(false);
      return;
    }

    toast.success("Senha alterada com sucesso!");
    setShowPasswordDialog(false);
    setPasswordData({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
    setPasswordLoading(false);
  };

  // Alterar senha de outro usuário (via edge function)
  const handleChangeUserPassword = async () => {
    if (!userPasswordTarget) return;
    if (userPasswordData.novaSenha !== userPasswordData.confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (userPasswordData.novaSenha.length < 6) {
      toast.error("Nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    setUserPasswordLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("admin-change-password", {
      body: { user_id: userPasswordTarget.id, new_password: userPasswordData.novaSenha },
    });

    if (res.error || res.data?.error) {
      toast.error(res.data?.error || "Erro ao alterar senha");
      setUserPasswordLoading(false);
      return;
    }

    toast.success(`Senha de ${userPasswordTarget.nome || userPasswordTarget.email} alterada com sucesso!`);
    setShowUserPasswordDialog(false);
    setUserPasswordTarget(null);
    setUserPasswordData({ novaSenha: "", confirmarSenha: "" });
    setUserPasswordLoading(false);
  };

  const openUserPasswordDialog = (profile: Profile) => {
    setUserPasswordTarget(profile);
    setUserPasswordData({ novaSenha: "", confirmarSenha: "" });
    setShowUserPasswordDialog(true);
  };

  const getSetorLabel = (setor: string | null) => {
    if (!setor) return "Não definido";
    const labels: Record<string, string> = {
      "COMEX": "Administrativo",
      "ARMAZEM": "Operacional",
      "ADMINISTRATIVO": "Administrativo",
      "OPERACIONAL": "Operacional",
      "MASTER": "Master"
    };
    return labels[setor] || setor;
  };

  // Access guard: only admin or gestor
  if (!loading && !isCurrentUserAdmin && !isGestor) {
    navigate("/interno/dashboard");
    return null;
  }

  // Filter profiles for gestor: only show users from same setor
  const displayedProfiles = isGestor && !isCurrentUserAdmin
    ? profiles.filter(p => p.email_setor === gestorSetorEmail)
    : profiles;

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
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Usuários</h1>
          </div>
        </div>
        <div className="flex gap-2">
          {isCurrentUserAdmin && (
            <>
              <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
                <Key className="h-4 w-4 mr-2" />
                Alterar Senha Admin
              </Button>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Usuário
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Dialog Criar Usuário */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Usuário Interno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={createFormData.nome}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="usuario@jbsterminais.com.br"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Apenas domínio @jbsterminais.com.br
              </p>
            </div>
            <div>
              <Label>Senha Inicial</Label>
              <Input
                type="password"
                value={createFormData.senha}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, senha: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
              <p>Um e-mail será enviado para o usuário confirmar o cadastro.</p>
              <p className="mt-1">O acesso ficará desativado até a confirmação.</p>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={createLoading}>
              {createLoading ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Alterar Senha Admin */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha do Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nova Senha</Label>
              <Input
                type="password"
                value={passwordData.novaSenha}
                onChange={(e) => setPasswordData(prev => ({ ...prev, novaSenha: e.target.value }))}
                placeholder="Nova senha"
              />
            </div>
            <div>
              <Label>Confirmar Nova Senha</Label>
              <Input
                type="password"
                value={passwordData.confirmarSenha}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmarSenha: e.target.value }))}
                placeholder="Confirme a nova senha"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={passwordLoading}>
              {passwordLoading ? "Alterando..." : "Alterar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <Input 
                value={editFormData.email} 
                onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={editingUser ? !isInternalUser(editingUser) : true} 
                className={editingUser && !isInternalUser(editingUser) ? "bg-muted" : ""}
              />
              {editingUser && !isInternalUser(editingUser) && (
                <p className="text-xs text-muted-foreground mt-1">
                  E-mail vinculado ao Microsoft não pode ser alterado
                </p>
              )}
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

      {/* Dialog Alterar Senha de Usuário */}
      <Dialog open={showUserPasswordDialog} onOpenChange={setShowUserPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha - {userPasswordTarget?.nome || userPasswordTarget?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Nova Senha</Label>
              <Input
                type="password"
                value={userPasswordData.novaSenha}
                onChange={(e) => setUserPasswordData(prev => ({ ...prev, novaSenha: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <Label>Confirmar Nova Senha</Label>
              <Input
                type="password"
                value={userPasswordData.confirmarSenha}
                onChange={(e) => setUserPasswordData(prev => ({ ...prev, confirmarSenha: e.target.value }))}
                placeholder="Confirme a nova senha"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowUserPasswordDialog(false)}>Cancelar</Button>
            <Button onClick={handleChangeUserPassword} disabled={userPasswordLoading}>
              {userPasswordLoading ? "Alterando..." : "Alterar Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados ({displayedProfiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Status</TableHead>
                {isCurrentUserAdmin && <TableHead>Tipo</TableHead>}
                <TableHead>Cadastro</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedProfiles.map((profile) => {
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
                                {s.descricao || s.email_setor}
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
                    {isCurrentUserAdmin && (
                    <TableCell>
                      {currentUserIsMaster && !(isMaster && isUserAdmin) ? (
                        <Select
                          value={getUserRole(profile.id)}
                          onValueChange={(value) => setUserRole(profile.id, value as "admin" | "gestor" | "user")}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[100] bg-popover">
                            <SelectItem value="admin">
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" /> Admin
                              </span>
                            </SelectItem>
                            <SelectItem value="gestor">
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" /> Gestor
                              </span>
                            </SelectItem>
                            <SelectItem value="user">Usuário</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={isUserAdmin ? "default" : getUserRole(profile.id) === "gestor" ? "secondary" : "outline"}>
                          {isUserAdmin ? "Admin" : getUserRole(profile.id) === "gestor" ? "Gestor" : "Usuário"}
                          {isMaster && isUserAdmin && " (Master)"}
                        </Badge>
                      )}
                    </TableCell>
                    )}
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditUser(profile)}>
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button variant="ghost" size="icon" onClick={() => openUserPasswordDialog(profile)} title="Alterar senha">
                          <Key className="h-4 w-4" />
                        </Button>

                        {isCurrentUserAdmin && !isMaster && (
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

                        {isCurrentUserAdmin && !isMaster && (
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
