import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link2, ArrowLeft, Plus, Save, Edit, Trash2, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ExcelImportMappings from "@/components/ExcelImportMappings";

interface Integracao {
  id: string;
  nome: string;
  tipo: string;
  url: string | null;
  api_key: string | null;
  config: Record<string, any>;
  ativo: boolean;
}

interface FieldMapping {
  id: string;
  integracao_id: string | null;
  campo_interno: string;
  campo_externo: string;
  descricao: string | null;
  sistema: string;
}

const AdminIntegracoes = () => {
  const navigate = useNavigate();
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [editingIntegracao, setEditingIntegracao] = useState<Integracao | null>(null);
  const [editingMapping, setEditingMapping] = useState<FieldMapping | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "api",
    url: "",
    api_key: "",
    config: "{}"
  });
  const [mappingFormData, setMappingFormData] = useState({
    integracao_id: "",
    campo_interno: "",
    campo_externo: "",
    descricao: "",
    sistema: "hashdata"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [integracoesRes, mappingsRes] = await Promise.all([
      supabase.from("integracoes").select("*").order("nome"),
      supabase.from("field_mappings").select("*").order("campo_interno")
    ]);

    if (integracoesRes.data) {
      setIntegracoes(integracoesRes.data.map(d => ({
        ...d,
        config: (typeof d.config === 'object' && d.config !== null ? d.config : {}) as Record<string, any>
      })));
    }
    
    if (mappingsRes.data) {
      setFieldMappings(mappingsRes.data);
    }
    
    setLoading(false);
  };

  // ============= INTEGRAÇÕES =============
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
    fetchData();
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
    fetchData();
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

  const deleteIntegracao = async (integracao: Integracao) => {
    // Delete field mappings first
    await supabase.from("field_mappings").delete().eq("integracao_id", integracao.id);
    
    const { error } = await supabase
      .from("integracoes")
      .delete()
      .eq("id", integracao.id);

    if (error) {
      toast.error("Erro ao excluir integração");
      return;
    }
    toast.success("Integração excluída!");
    fetchData();
  };

  // ============= FIELD MAPPINGS =============
  const openMappingDialog = (mapping?: FieldMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      setMappingFormData({
        integracao_id: mapping.integracao_id || "",
        campo_interno: mapping.campo_interno,
        campo_externo: mapping.campo_externo,
        descricao: mapping.descricao || "",
        sistema: mapping.sistema || "hashdata"
      });
    } else {
      setEditingMapping(null);
      setMappingFormData({
        integracao_id: "",
        campo_interno: "",
        campo_externo: "",
        descricao: "",
        sistema: "hashdata"
      });
    }
    setShowMappingDialog(true);
  };

  const saveMapping = async () => {
    if (!mappingFormData.campo_interno || !mappingFormData.campo_externo) {
      toast.error("Campos interno e externo são obrigatórios");
      return;
    }

    const data = {
      integracao_id: mappingFormData.integracao_id || null,
      campo_interno: mappingFormData.campo_interno,
      campo_externo: mappingFormData.campo_externo,
      descricao: mappingFormData.descricao || null,
      sistema: mappingFormData.sistema
    };

    if (editingMapping) {
      const { error } = await supabase
        .from("field_mappings")
        .update(data)
        .eq("id", editingMapping.id);

      if (error) {
        toast.error("Erro ao atualizar mapeamento");
        return;
      }
      toast.success("Mapeamento atualizado!");
    } else {
      const { error } = await supabase
        .from("field_mappings")
        .insert(data);

      if (error) {
        toast.error("Erro ao adicionar mapeamento");
        return;
      }
      toast.success("Mapeamento adicionado!");
    }

    setShowMappingDialog(false);
    setEditingMapping(null);
    fetchData();
  };

  const deleteMapping = async (mapping: FieldMapping) => {
    const { error } = await supabase
      .from("field_mappings")
      .delete()
      .eq("id", mapping.id);

    if (error) {
      toast.error("Erro ao excluir mapeamento");
      return;
    }
    toast.success("Mapeamento excluído!");
    fetchData();
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
          <Link2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Integrações</h1>
        </div>
      </div>

      <Tabs defaultValue="integracoes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="integracoes">Sistemas Externos</TabsTrigger>
          <TabsTrigger value="mappings">Mapeamento de Campos</TabsTrigger>
        </TabsList>

        {/* ============= INTEGRAÇÕES ============= */}
        <TabsContent value="integracoes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Integrações Configuradas ({integracoes.length})</CardTitle>
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
                        placeholder="Ex: Hashdata, SmartNX"
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="api">API</SelectItem>
                          <SelectItem value="formulario">Formulário</SelectItem>
                          <SelectItem value="webhook">Webhook</SelectItem>
                          <SelectItem value="iframe">iFrame</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Label>Configuração Extra (JSON)</Label>
                      <Textarea
                        value={formData.config}
                        onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                        placeholder='{"chave": "valor"}'
                        rows={4}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                  <DialogFooter className="mt-4">
                    <Button onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      {editingIntegracao ? "Salvar Alterações" : "Adicionar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                  {integracoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhuma integração configurada. Adicione Hashdata, SmartNX ou outros sistemas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    integracoes.map((integracao) => (
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
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(integracao)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Integração</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Excluir <strong>{integracao.nome}</strong>? Os mapeamentos de campos serão perdidos.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteIntegracao(integracao)} className="bg-destructive text-destructive-foreground">
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= FIELD MAPPINGS ============= */}
        <TabsContent value="mappings">
           <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle>Mapeamento de Campos ({fieldMappings.length})</CardTitle>
              <div className="flex gap-2 items-center">
                <ExcelImportMappings onImported={fetchData} />
                <Button onClick={() => openMappingDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Mapeamento
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg mb-4 text-sm">
                <p><strong>Exemplo de mapeamento:</strong></p>
                <p>Campo interno: <code>data_solicitacao</code> → Hashdata: <code>DATA_SOLICITACAO</code> → SmartNX: <code>Data Posicionamento</code></p>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campo Interno</TableHead>
                    <TableHead>Campo Externo</TableHead>
                    <TableHead>Sistema</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fieldMappings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum mapeamento configurado. Adicione a relação entre campos internos e externos.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fieldMappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell className="font-mono text-sm">{mapping.campo_interno}</TableCell>
                        <TableCell className="font-mono text-sm">{mapping.campo_externo}</TableCell>
                        <TableCell>{mapping.sistema}</TableCell>
                        <TableCell className="text-muted-foreground">{mapping.descricao || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openMappingDialog(mapping)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Mapeamento</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Excluir o mapeamento <strong>{mapping.campo_interno}</strong>?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMapping(mapping)} className="bg-destructive text-destructive-foreground">
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Dialog para Field Mapping */}
          <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingMapping ? "Editar Mapeamento" : "Novo Mapeamento de Campo"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Sistema</Label>
                  <Select
                    value={mappingFormData.sistema}
                    onValueChange={(value) => setMappingFormData({ ...mappingFormData, sistema: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hashdata">Hashdata</SelectItem>
                      <SelectItem value="smartnx">SmartNX</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Campo Interno (na página)</Label>
                  <Input
                    value={mappingFormData.campo_interno}
                    onChange={(e) => setMappingFormData({ ...mappingFormData, campo_interno: e.target.value })}
                    placeholder="Ex: data_solicitacao"
                  />
                </div>
                <div>
                  <Label>Campo Externo (no sistema)</Label>
                  <Input
                    value={mappingFormData.campo_externo}
                    onChange={(e) => setMappingFormData({ ...mappingFormData, campo_externo: e.target.value })}
                    placeholder="Ex: DATA_SOLICITACAO"
                  />
                </div>
                <div>
                  <Label>Descrição (opcional)</Label>
                  <Input
                    value={mappingFormData.descricao}
                    onChange={(e) => setMappingFormData({ ...mappingFormData, descricao: e.target.value })}
                    placeholder="Descrição do campo"
                  />
                </div>
                <div>
                  <Label>Integração Vinculada (opcional)</Label>
                  <Select
                    value={mappingFormData.integracao_id || "none"}
                    onValueChange={(value) => setMappingFormData({ ...mappingFormData, integracao_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Nenhuma" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {integracoes.map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button onClick={saveMapping}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminIntegracoes;
