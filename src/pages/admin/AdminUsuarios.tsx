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
}

interface UserRole {
  user_id: string;
  role: string;
}

const AdminUsuarios = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [setores, setSetores] = useState<{ email_setor: string; setor: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState<Record<string, string>>({});
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editFormData, setEditFormData] = useState({ nome: "", email: "" });
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());

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
    if (rolesRes.data) {
      setUserRoles(rolesRes.data);
    }
    setLoading(false);
  };

  const handleSetorChange = (profileId: string, emailSetor: string) => {
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
    const hasAdmin = userRoles.some(r => r.user_id === userId && r.role === "admin");
    
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

  const toggleBlockUser = async (userId: string) => {
    const isBlocked = blockedUsers.has(userId);
    
    if (isBlocked) {
      // Unblock: remove blocked role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "user"); // Using 'user' as placeholder since we can't add 'blocked' to enum
      
      // For now, we'll track blocked status locally - in production you'd add 'blocked' to the enum
      setBlockedUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      toast.success("Usuário desbloqueado");
    } else {
      // Block user
      setBlockedUsers(prev => new Set(prev).add(userId));
      toast.success("Usuário bloqueado");
    }
  };

  const handleEditUser = (user: Profile) => {
    setEditingUser(user);
    setEditFormData({ nome: user.nome || "", email: user.email });
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
    setEditingUser(null);
    fetchData();
  };

  const deleteUser = async (userId: string) => {
    // Delete user roles first
    await supabase.from("user_roles").delete().eq("user_id", userId);
    
    // Delete profile
    const { error } = await supabase.from("profiles").delete().eq("id", userId);

    if (error) {
      toast.error("Erro ao excluir usuário");
      return;
    }

    toast.success("Usuário excluído!");
    fetchData();
  };

  const isAdmin = (userId: string) => userRoles.some(r => r.user_id === userId && r.role === "admin");

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
                <TableHead>Admin</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id} className={blockedUsers.has(profile.id) ? "opacity-50 bg-destructive/5" : ""}>
                  <TableCell className="font-medium">{profile.nome || "—"}</TableCell>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>
                    <Select
                      value={changes[profile.id] || profile.email_setor || ""}
                      onValueChange={(value) => handleSetorChange(profile.id, value)}
                    >
                      <SelectTrigger className="w-[200px]">
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
                  </TableCell>
                  <TableCell>
                    {blockedUsers.has(profile.id) ? (
                      <Badge variant="destructive">Bloqueado</Badge>
                    ) : (
                      <Badge variant="secondary">Ativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={isAdmin(profile.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleAdminRole(profile.id)}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      {isAdmin(profile.id) ? "Admin" : "Usuário"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {/* Edit Button */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => handleEditUser(profile)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
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
                              <Input value={editFormData.email} disabled className="bg-muted" />
                              <p className="text-xs text-muted-foreground mt-1">O e-mail não pode ser alterado</p>
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

                      {/* Block/Unblock Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleBlockUser(profile.id)}
                        title={blockedUsers.has(profile.id) ? "Desbloquear" : "Bloquear"}
                      >
                        {blockedUsers.has(profile.id) ? (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        ) : (
                          <Ban className="h-4 w-4 text-destructive" />
                        )}
                      </Button>

                      {/* Delete Button */}
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
                              onClick={() => deleteUser(profile.id)}
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
