import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, ArrowLeft, Save, Shield } from "lucide-react";
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
                <TableHead>Admin</TableHead>
                <TableHead>Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
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
