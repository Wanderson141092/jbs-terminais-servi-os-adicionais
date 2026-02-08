import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Settings, ArrowLeft, Plus, Edit, Trash2, Building2, Clock, Key, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TipoSetor {
  id: string;
  nome: string;
  descricao: string | null;
  pode_aprovar: boolean;
  pode_recusar: boolean;
  pode_visualizar_todos: boolean;
  pode_editar_processo: boolean;
  ativo: boolean;
}

interface RegraServico {
  id: string;
  servico_id: string;
  hora_corte: string;
  limite_dia: number | null;
  dias_semana: string[];
  limite_seg: number | null;
  limite_ter: number | null;
  limite_qua: number | null;
  limite_qui: number | null;
  limite_sex: number | null;
  limite_sab: number | null;
  aplica_dia_anterior: boolean;
  ativo: boolean;
}

interface Servico {
  id: string;
  nome: string;
}

interface ProtocolConfig {
  id: string;
  prefixo: string;
  ultimo_numero: number;
}

const DIAS_SEMANA = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" }
];

const AdminParametros = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Tipos de Setor
  const [tiposSetor, setTiposSetor] = useState<TipoSetor[]>([]);
  const [showTipoDialog, setShowTipoDialog] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoSetor | null>(null);
  const [tipoFormData, setTipoFormData] = useState({
    nome: "",
    descricao: "",
    pode_aprovar: true,
    pode_recusar: true,
    pode_visualizar_todos: true,
    pode_editar_processo: true
  });

  // Regras de Serviço
  const [regras, setRegras] = useState<RegraServico[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [showRegraDialog, setShowRegraDialog] = useState(false);
  const [editingRegra, setEditingRegra] = useState<RegraServico | null>(null);
  const [regraFormData, setRegraFormData] = useState({
    servico_id: "",
    hora_corte: "17:00",
    limite_dia: "",
    dias_semana: ["seg", "ter", "qua", "qui", "sex"],
    limite_seg: "",
    limite_ter: "",
    limite_qua: "",
    limite_qui: "",
    limite_sex: "",
    limite_sab: "",
    aplica_dia_anterior: false
  });

  // Configuração de Protocolo
  const [protocolConfig, setProtocolConfig] = useState<ProtocolConfig | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    const [tiposRes, regrasRes, servicosRes, protocolRes] = await Promise.all([
      supabase.from("tipos_setor").select("*").order("nome"),
      supabase.from("regras_servico").select("*").order("created_at"),
      supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("protocol_config").select("*").limit(1).single()
    ]);

    if (tiposRes.data) setTiposSetor(tiposRes.data);
    if (regrasRes.data) setRegras(regrasRes.data);
    if (servicosRes.data) setServicos(servicosRes.data);
    if (protocolRes.data) setProtocolConfig(protocolRes.data);
    
    setLoading(false);
  };

  // ============= TIPOS DE SETOR =============
  const openTipoDialog = (tipo?: TipoSetor) => {
    if (tipo) {
      setEditingTipo(tipo);
      setTipoFormData({
        nome: tipo.nome,
        descricao: tipo.descricao || "",
        pode_aprovar: tipo.pode_aprovar,
        pode_recusar: tipo.pode_recusar,
        pode_visualizar_todos: tipo.pode_visualizar_todos,
        pode_editar_processo: tipo.pode_editar_processo
      });
    } else {
      setEditingTipo(null);
      setTipoFormData({
        nome: "",
        descricao: "",
        pode_aprovar: true,
        pode_recusar: true,
        pode_visualizar_todos: true,
        pode_editar_processo: true
      });
    }
    setShowTipoDialog(true);
  };

  const saveTipo = async () => {
    if (!tipoFormData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    if (editingTipo) {
      const { error } = await supabase
        .from("tipos_setor")
        .update({
          nome: tipoFormData.nome.toUpperCase(),
          descricao: tipoFormData.descricao || null,
          pode_aprovar: tipoFormData.pode_aprovar,
          pode_recusar: tipoFormData.pode_recusar,
          pode_visualizar_todos: tipoFormData.pode_visualizar_todos,
          pode_editar_processo: tipoFormData.pode_editar_processo,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingTipo.id);

      if (error) {
        toast.error("Erro ao atualizar tipo de setor");
        setSaving(false);
        return;
      }
      toast.success("Tipo de setor atualizado!");
    } else {
      const { error } = await supabase
        .from("tipos_setor")
        .insert({
          nome: tipoFormData.nome.toUpperCase(),
          descricao: tipoFormData.descricao || null,
          pode_aprovar: tipoFormData.pode_aprovar,
          pode_recusar: tipoFormData.pode_recusar,
          pode_visualizar_todos: tipoFormData.pode_visualizar_todos,
          pode_editar_processo: tipoFormData.pode_editar_processo
        });

      if (error) {
        toast.error("Erro ao criar tipo de setor");
        setSaving(false);
        return;
      }
      toast.success("Tipo de setor criado!");
    }

    setShowTipoDialog(false);
    setSaving(false);
    fetchAllData();
  };

  const toggleTipoAtivo = async (tipo: TipoSetor) => {
    const { error } = await supabase
      .from("tipos_setor")
      .update({ ativo: !tipo.ativo, updated_at: new Date().toISOString() })
      .eq("id", tipo.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success(tipo.ativo ? "Tipo desativado" : "Tipo ativado");
    fetchAllData();
  };

  const deleteTipo = async (tipo: TipoSetor) => {
    // Verifica se há setores vinculados (para COMEX e ARMAZEM que são do enum)
    // Para tipos customizados, verificamos pelo nome no campo setor
    const tipoNome = tipo.nome as "COMEX" | "ARMAZEM";
    const { data: setoresVinculados } = await supabase
      .from("setor_emails")
      .select("id")
      .eq("setor", tipoNome)
      .limit(1);

    if (setoresVinculados && setoresVinculados.length > 0) {
      toast.error("Não é possível excluir: existem setores vinculados. Desative em vez de excluir.");
      return;
    }

    const { error } = await supabase
      .from("tipos_setor")
      .delete()
      .eq("id", tipo.id);

    if (error) {
      toast.error("Erro ao excluir tipo de setor");
      return;
    }
    toast.success("Tipo de setor excluído!");
    fetchAllData();
  };

  // ============= REGRAS DE SERVIÇO =============
  const openRegraDialog = (regra?: RegraServico) => {
    if (regra) {
      setEditingRegra(regra);
      setRegraFormData({
        servico_id: regra.servico_id,
        hora_corte: regra.hora_corte,
        limite_dia: regra.limite_dia?.toString() || "",
        dias_semana: regra.dias_semana,
        limite_seg: regra.limite_seg?.toString() || "",
        limite_ter: regra.limite_ter?.toString() || "",
        limite_qua: regra.limite_qua?.toString() || "",
        limite_qui: regra.limite_qui?.toString() || "",
        limite_sex: regra.limite_sex?.toString() || "",
        limite_sab: regra.limite_sab?.toString() || "",
        aplica_dia_anterior: regra.aplica_dia_anterior
      });
    } else {
      setEditingRegra(null);
      setRegraFormData({
        servico_id: "",
        hora_corte: "17:00",
        limite_dia: "",
        dias_semana: ["seg", "ter", "qua", "qui", "sex"],
        limite_seg: "",
        limite_ter: "",
        limite_qua: "",
        limite_qui: "",
        limite_sex: "",
        limite_sab: "",
        aplica_dia_anterior: false
      });
    }
    setShowRegraDialog(true);
  };

  const toggleDiaSemana = (dia: string) => {
    setRegraFormData(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter(d => d !== dia)
        : [...prev.dias_semana, dia]
    }));
  };

  const saveRegra = async () => {
    if (!regraFormData.servico_id) {
      toast.error("Selecione um serviço");
      return;
    }

    const data = {
      servico_id: regraFormData.servico_id,
      hora_corte: regraFormData.hora_corte,
      limite_dia: regraFormData.limite_dia ? parseInt(regraFormData.limite_dia) : null,
      dias_semana: regraFormData.dias_semana,
      limite_seg: regraFormData.limite_seg ? parseInt(regraFormData.limite_seg) : null,
      limite_ter: regraFormData.limite_ter ? parseInt(regraFormData.limite_ter) : null,
      limite_qua: regraFormData.limite_qua ? parseInt(regraFormData.limite_qua) : null,
      limite_qui: regraFormData.limite_qui ? parseInt(regraFormData.limite_qui) : null,
      limite_sex: regraFormData.limite_sex ? parseInt(regraFormData.limite_sex) : null,
      limite_sab: regraFormData.limite_sab ? parseInt(regraFormData.limite_sab) : null,
      aplica_dia_anterior: regraFormData.aplica_dia_anterior,
      updated_at: new Date().toISOString()
    };

    setSaving(true);
    if (editingRegra) {
      const { error } = await supabase
        .from("regras_servico")
        .update(data)
        .eq("id", editingRegra.id);

      if (error) {
        toast.error("Erro ao atualizar regra");
        setSaving(false);
        return;
      }
      toast.success("Regra atualizada!");
    } else {
      const { error } = await supabase
        .from("regras_servico")
        .insert(data);

      if (error) {
        if (error.code === "23505") {
          toast.error("Já existe uma regra para este serviço");
        } else {
          toast.error("Erro ao criar regra");
        }
        setSaving(false);
        return;
      }
      toast.success("Regra criada!");
    }

    setShowRegraDialog(false);
    setSaving(false);
    fetchAllData();
  };

  const deleteRegra = async (regra: RegraServico) => {
    const { error } = await supabase
      .from("regras_servico")
      .delete()
      .eq("id", regra.id);

    if (error) {
      toast.error("Erro ao excluir regra");
      return;
    }
    toast.success("Regra excluída! Será aplicado o padrão do sistema.");
    fetchAllData();
  };

  const getServicoNome = (servicoId: string) => {
    return servicos.find(s => s.id === servicoId)?.nome || "—";
  };

  // ============= PROTOCOLO =============
  const saveProtocolConfig = async () => {
    if (!protocolConfig) return;

    setSaving(true);
    const { error } = await supabase
      .from("protocol_config")
      .update({
        prefixo: protocolConfig.prefixo,
        updated_at: new Date().toISOString()
      })
      .eq("id", protocolConfig.id);

    if (error) {
      toast.error("Erro ao salvar configuração de protocolo");
    } else {
      toast.success("Configuração de protocolo salva!");
    }
    setSaving(false);
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
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Parâmetros do Sistema</h1>
        </div>
      </div>

      <Tabs defaultValue="tipos" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tipos" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Tipos de Setor
          </TabsTrigger>
          <TabsTrigger value="regras" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Regras de Negócio
          </TabsTrigger>
          <TabsTrigger value="protocolo" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Protocolo
          </TabsTrigger>
        </TabsList>

        {/* ============= TIPOS DE SETOR ============= */}
        <TabsContent value="tipos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Tipos de Setor ({tiposSetor.length})</CardTitle>
              <Button onClick={() => openTipoDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Tipo
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Configure os tipos de setor disponíveis e suas permissões de acesso no sistema.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Aprovar</TableHead>
                    <TableHead>Recusar</TableHead>
                    <TableHead>Ver Todos</TableHead>
                    <TableHead>Editar</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiposSetor.map((tipo) => (
                    <TableRow key={tipo.id} className={!tipo.ativo ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{tipo.nome}</TableCell>
                      <TableCell>{tipo.descricao || "—"}</TableCell>
                      <TableCell>{tipo.pode_aprovar ? "✓" : "✗"}</TableCell>
                      <TableCell>{tipo.pode_recusar ? "✓" : "✗"}</TableCell>
                      <TableCell>{tipo.pode_visualizar_todos ? "✓" : "✗"}</TableCell>
                      <TableCell>{tipo.pode_editar_processo ? "✓" : "✗"}</TableCell>
                      <TableCell>
                        <Switch checked={tipo.ativo} onCheckedChange={() => toggleTipoAtivo(tipo)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openTipoDialog(tipo)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Tipo de Setor</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o tipo <strong>{tipo.nome}</strong>?
                                  Se houver setores vinculados, a exclusão não será permitida.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteTipo(tipo)} className="bg-destructive text-destructive-foreground">
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
            </CardContent>
          </Card>

          {/* Dialog para Tipo de Setor */}
          <Dialog open={showTipoDialog} onOpenChange={setShowTipoDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTipo ? "Editar Tipo de Setor" : "Novo Tipo de Setor"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={tipoFormData.nome}
                    onChange={(e) => setTipoFormData({ ...tipoFormData, nome: e.target.value.toUpperCase() })}
                    placeholder="Ex: FINANCEIRO"
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={tipoFormData.descricao}
                    onChange={(e) => setTipoFormData({ ...tipoFormData, descricao: e.target.value })}
                    placeholder="Descrição do tipo de setor"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Permissões</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pode_aprovar"
                      checked={tipoFormData.pode_aprovar}
                      onCheckedChange={(checked) => setTipoFormData({ ...tipoFormData, pode_aprovar: !!checked })}
                    />
                    <label htmlFor="pode_aprovar" className="text-sm">Pode aprovar solicitações</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pode_recusar"
                      checked={tipoFormData.pode_recusar}
                      onCheckedChange={(checked) => setTipoFormData({ ...tipoFormData, pode_recusar: !!checked })}
                    />
                    <label htmlFor="pode_recusar" className="text-sm">Pode recusar solicitações</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pode_visualizar_todos"
                      checked={tipoFormData.pode_visualizar_todos}
                      onCheckedChange={(checked) => setTipoFormData({ ...tipoFormData, pode_visualizar_todos: !!checked })}
                    />
                    <label htmlFor="pode_visualizar_todos" className="text-sm">Pode visualizar todos os processos</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pode_editar_processo"
                      checked={tipoFormData.pode_editar_processo}
                      onCheckedChange={(checked) => setTipoFormData({ ...tipoFormData, pode_editar_processo: !!checked })}
                    />
                    <label htmlFor="pode_editar_processo" className="text-sm">Pode editar processos</label>
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button onClick={saveTipo} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ============= REGRAS DE NEGÓCIO ============= */}
        <TabsContent value="regras">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Regras de Negócio por Serviço ({regras.length})</CardTitle>
              <Button onClick={() => openRegraDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Regra
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 p-4 rounded-lg mb-4 text-sm space-y-2">
                <p><strong>Padrões do sistema (quando não há regra configurada):</strong></p>
                <p>• <strong>Posicionamento:</strong> Hora de corte 15:00 do dia anterior, dias Seg-Sex, limite infinito</p>
                <p>• <strong>Demais serviços:</strong> Hora de corte 17:00 do dia da solicitação, dias Seg-Sáb, limite infinito</p>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Hora de Corte</TableHead>
                    <TableHead>Dia Anterior</TableHead>
                    <TableHead>Dias da Semana</TableHead>
                    <TableHead>Limite Geral</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regras.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma regra customizada. Os padrões do sistema serão aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    regras.map((regra) => (
                      <TableRow key={regra.id} className={!regra.ativo ? "opacity-50" : ""}>
                        <TableCell className="font-medium">{getServicoNome(regra.servico_id)}</TableCell>
                        <TableCell>{regra.hora_corte}</TableCell>
                        <TableCell>{regra.aplica_dia_anterior ? "Sim" : "Não"}</TableCell>
                        <TableCell>{regra.dias_semana.join(", ").toUpperCase()}</TableCell>
                        <TableCell>{regra.limite_dia || "∞"}</TableCell>
                        <TableCell>
                          <Switch checked={regra.ativo} onCheckedChange={async () => {
                            await supabase.from("regras_servico").update({ ativo: !regra.ativo }).eq("id", regra.id);
                            fetchAllData();
                          }} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openRegraDialog(regra)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Regra</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Excluir a regra para <strong>{getServicoNome(regra.servico_id)}</strong>?
                                    O padrão do sistema será aplicado.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteRegra(regra)} className="bg-destructive text-destructive-foreground">
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

          {/* Dialog para Regra de Serviço */}
          <Dialog open={showRegraDialog} onOpenChange={setShowRegraDialog}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingRegra ? "Editar Regra" : "Nova Regra de Serviço"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                  <Label>Serviço</Label>
                  <Select
                    value={regraFormData.servico_id}
                    onValueChange={(value) => {
                      setRegraFormData({ ...regraFormData, servico_id: value });
                      // Se for Posicionamento, define como dia anterior
                      const servico = servicos.find(s => s.id === value);
                      if (servico?.nome.toLowerCase().includes("posicionamento")) {
                        setRegraFormData(prev => ({ ...prev, servico_id: value, aplica_dia_anterior: true, hora_corte: "15:00" }));
                      }
                    }}
                    disabled={!!editingRegra}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {servicos.map((servico) => (
                        <SelectItem key={servico.id} value={servico.id}>
                          {servico.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Hora de Corte</Label>
                    <Input
                      type="time"
                      value={regraFormData.hora_corte}
                      onChange={(e) => setRegraFormData({ ...regraFormData, hora_corte: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Limite Geral/Dia</Label>
                    <Input
                      type="number"
                      value={regraFormData.limite_dia}
                      onChange={(e) => setRegraFormData({ ...regraFormData, limite_dia: e.target.value })}
                      placeholder="Infinito"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="aplica_dia_anterior"
                    checked={regraFormData.aplica_dia_anterior}
                    onCheckedChange={(checked) => setRegraFormData({ ...regraFormData, aplica_dia_anterior: !!checked })}
                  />
                  <label htmlFor="aplica_dia_anterior" className="text-sm">
                    Hora de corte aplica ao dia anterior (ex: Posicionamento)
                  </label>
                </div>

                <div>
                  <Label className="mb-2 block">Dias da Semana</Label>
                  <div className="flex flex-wrap gap-2">
                    {DIAS_SEMANA.map((dia) => (
                      <div key={dia.key} className="flex items-center space-x-1">
                        <Checkbox
                          id={dia.key}
                          checked={regraFormData.dias_semana.includes(dia.key)}
                          onCheckedChange={() => toggleDiaSemana(dia.key)}
                        />
                        <label htmlFor={dia.key} className="text-sm">{dia.label}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Limite por Dia da Semana (opcional)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {DIAS_SEMANA.map((dia) => (
                      <div key={dia.key}>
                        <Label className="text-xs">{dia.label}</Label>
                        <Input
                          type="number"
                          value={regraFormData[`limite_${dia.key}` as keyof typeof regraFormData] as string}
                          onChange={(e) => setRegraFormData({ ...regraFormData, [`limite_${dia.key}`]: e.target.value })}
                          placeholder="∞"
                          className="h-8"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button onClick={saveRegra} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ============= CONFIGURAÇÃO DE PROTOCOLO ============= */}
        <TabsContent value="protocolo">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Protocolo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
                <p><strong>Formato do Protocolo:</strong> {protocolConfig?.prefixo || "JBS"} + Letra do Serviço + Número Sequencial</p>
                <p>Exemplo: JBSP000001 (JBS + P de Posicionamento + Sequencial)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prefixo do Protocolo</Label>
                  <Input
                    value={protocolConfig?.prefixo || ""}
                    onChange={(e) => setProtocolConfig(prev => prev ? { ...prev, prefixo: e.target.value.toUpperCase() } : null)}
                    placeholder="JBS"
                    maxLength={5}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Máximo 5 caracteres</p>
                </div>
                <div>
                  <Label>Último Número Gerado</Label>
                  <Input
                    value={protocolConfig?.ultimo_numero || 0}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Somente leitura</p>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
                <p><strong>Formato do LPCO:</strong> 1 letra + 10 números = 11 caracteres</p>
                <p>Exemplo: A1234567890 (Regra fixa do Siscomex)</p>
                <p className="text-muted-foreground">O LPCO não é configurável, segue padrão do Siscomex.</p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-2">
                <p><strong>Formato do Contêiner:</strong> 4 letras + 7 números = 11 caracteres</p>
                <p>Exemplo: ABCD1234567 (Padrão internacional)</p>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveProtocolConfig} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar Configuração"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminParametros;
