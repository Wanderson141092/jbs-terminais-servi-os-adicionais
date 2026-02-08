import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link2, ArrowLeft, Plus, Save, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Integracao {
  id: string;
  nome: string;
  tipo: string;
  url: string | null;
  api_key: string | null;
  config: Record<string, any>;
  ativo: boolean;
}

const AdminIntegracoes = () => {
  const navigate = useNavigate();
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingIntegracao, setEditingIntegracao] = useState<Integracao | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "api",
    url: "",
    api_key: "",
    config: "{}"
  });

  useEffect(() => {
    fetchIntegracoes();
  }, []);

  const fetchIntegracoes = async () => {
    const { data, error } = await supabase
      .from("integracoes")
      .select("*")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar integrações");
    } else {
      setIntegracoes((data || []).map(d => ({
        ...d,
        config: (typeof d.config === 'object' && d.config !== null ? d.config : {}) as Record<string, any>
      })));
    }
    setLoading(false);
  };

  const handleToggleActive = async (integracao: Integracao) => {
    const { error } = await supabase
      .from("integracoes")
      .update({ ativo: !integracao.ativo, updated_at: new Date().toISOString() })
      .eq("id", integracao.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    toast.success(integracao.ativo ? "Integração desativada" : "Integração ativada");
    fetchIntegracoes();
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.tipo) {
      toast.error("Nome e tipo são obrigatórios");
      return;
    }

    let configJson;
    try {
      configJson = JSON.parse(formData.config);
    } catch {
      toast.error("Configuração JSON inválida");
      return;
    }

    if (editingIntegracao) {
      const { error } = await supabase
        .from("integracoes")
        .update({
          nome: formData.nome,
          tipo: formData.tipo,
          url: formData.url || null,
          api_key: formData.api_key || null,
          config: configJson,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingIntegracao.id);

      if (error) {
        toast.error("Erro ao atualizar integração");
        return;
      }
      toast.success("Integração atualizada!");
    } else {
      const { error } = await supabase
        .from("integracoes")
        .insert({
          nome: formData.nome,
          tipo: formData.tipo,
          url: formData.url || null,
          api_key: formData.api_key || null,
          config: configJson
        });

      if (error) {
        toast.error("Erro ao adicionar integração");
        return;
      }
      toast.success("Integração adicionada!");
    }

    setShowDialog(false);
    setEditingIntegracao(null);
    setFormData({ nome: "", tipo: "api", url: "", api_key: "", config: "{}" });
    fetchIntegracoes();
  };

  const openEditDialog = (integracao: Integracao) => {
    setEditingIntegracao(integracao);
    setFormData({
      nome: integracao.nome,
      tipo: integracao.tipo,
      url: integracao.url || "",
      api_key: integracao.api_key || "",
      config: JSON.stringify(integracao.config, null, 2)
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
            <Link2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setEditingIntegracao(null);
            setFormData({ nome: "", tipo: "api", url: "", api_key: "", config: "{}" });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Integração
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingIntegracao ? "Editar Integração" : "Adicionar Integração"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Hashdata"
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Input
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  placeholder="api, formulario, webhook..."
                />
              </div>
              <div>
                <Label>URL</Label>
                <Input
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label>API Key (opcional)</Label>
                <Input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="Chave de API"
                />
              </div>
              <div>
                <Label>Mapeamento de Campos (JSON)</Label>
                <Textarea
                  value={formData.config}
                  onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                  placeholder='{"campo_interno": "campo_externo"}'
                  rows={4}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Configure a relação entre campos internos e externos
                </p>
              </div>
              <Button onClick={handleSave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {editingIntegracao ? "Salvar Alterações" : "Adicionar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integrações Configuradas ({integracoes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integracoes.map((integracao) => (
                <TableRow key={integracao.id} className={!integracao.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{integracao.nome}</TableCell>
                  <TableCell>{integracao.tipo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {integracao.url || "—"}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={integracao.ativo}
                      onCheckedChange={() => handleToggleActive(integracao)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(integracao)}>
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

export default AdminIntegracoes;
