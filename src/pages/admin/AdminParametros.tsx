import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Settings, ArrowLeft, Plus, Edit, Trash2, Clock, FileText, Globe, Eye, Link2, List, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ExternalButtonsManager from "@/components/ExternalButtonsManager";
import ParametrosCamposManager from "@/components/ParametrosCamposManager";

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

interface PageConfig {
  id: string;
  config_key: string;
  config_value: string | null;
  config_type: string;
  description: string | null;
  is_active: boolean;
}

interface RoutingRule {
  id: string;
  servico_id: string;
  campo_criterio: string;
  valor_criterio: string;
  setor_ids: string[];
  ativo: boolean;
}

interface FieldMapping {
  campo_interno: string;
  campo_externo: string;
}

interface SetorEmail {
  id: string;
  email_setor: string;
  descricao: string | null;
}

interface NotificationRule {
  id: string;
  servico_id: string;
  status_gatilho: string;
  tipos_notificacao: string[];
  ativo: boolean;
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

  // Regras de Serviço
  const [regras, setRegras] = useState<RegraServico[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [showRegraDialog, setShowRegraDialog] = useState(false);
  const [editingRegra, setEditingRegra] = useState<RegraServico | null>(null);
  const [regraFormData, setRegraFormData] = useState({
    servico_id: "",
    hora_corte: "17:00",
    tipo_limite: "nenhum" as "nenhum" | "fixo" | "por_dia",
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

  // Configuração de Página Externa
  const [pageConfigs, setPageConfigs] = useState<PageConfig[]>([]);
  const [editingPageConfig, setEditingPageConfig] = useState<PageConfig | null>(null);
  const [showPageConfigDialog, setShowPageConfigDialog] = useState(false);

  // Routing Rules
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]);
  const [showRoutingDialog, setShowRoutingDialog] = useState(false);
  const [editingRouting, setEditingRouting] = useState<RoutingRule | null>(null);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [setorEmails, setSetorEmails] = useState<SetorEmail[]>([]);
  const [routingFormData, setRoutingFormData] = useState({
    servico_id: "",
    campo_criterio: "",
    valor_criterio: "",
    setor_ids: [] as string[]
  });

  // Notification Rules
  const [notifRules, setNotifRules] = useState<NotificationRule[]>([]);
  const [showNotifDialog, setShowNotifDialog] = useState(false);
  const [editingNotif, setEditingNotif] = useState<NotificationRule | null>(null);
  const [notifFormData, setNotifFormData] = useState({
    servico_id: "",
    status_gatilho: "",
    tipos_notificacao: [] as string[]
  });

  const TIPOS_NOTIFICACAO = [
    { key: "push", label: "Notificação Push (Nativa)" },
    { key: "toast", label: "Toast na Tela" },
    { key: "email", label: "E-mail" },
  ];

  const STATUS_GATILHO_OPTIONS = [
    { value: "aguardando_confirmacao", label: "Aguardando Confirmação" },
    { value: "confirmado_aguardando_vistoria", label: "Confirmado - Aguardando Vistoria" },
    { value: "vistoria_finalizada", label: "Vistoria Finalizada" },
    { value: "vistoriado_com_pendencia", label: "Vistoriado com Pendência" },
    { value: "nao_vistoriado", label: "Não Vistoriado" },
    { value: "recusado", label: "Recusado" },
    { value: "cancelado", label: "Cancelado" },
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    const [regrasRes, servicosRes, protocolRes, pageConfigRes, routingRes, fieldMappingsRes, setorEmailsRes, notifRulesRes] = await Promise.all([
      supabase.from("regras_servico").select("*").order("created_at"),
      supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("protocol_config").select("*").limit(1).single(),
      supabase.from("page_config").select("*").order("config_key"),
      supabase.from("service_routing_rules").select("*").order("created_at"),
      supabase.from("field_mappings").select("campo_interno, campo_externo"),
      supabase.from("setor_emails").select("id, email_setor, descricao").eq("ativo", true),
      supabase.from("notification_rules").select("*").order("created_at")
    ]);

    if (regrasRes.data) setRegras(regrasRes.data);
    if (servicosRes.data) setServicos(servicosRes.data);
    if (protocolRes.data) setProtocolConfig(protocolRes.data);
    if (pageConfigRes.data) setPageConfigs(pageConfigRes.data);
    if (routingRes.data) setRoutingRules(routingRes.data);
    if (fieldMappingsRes.data) setFieldMappings(fieldMappingsRes.data);
    if (setorEmailsRes.data) setSetorEmails(setorEmailsRes.data);
    if (notifRulesRes.data) setNotifRules(notifRulesRes.data as NotificationRule[]);
    
    setLoading(false);
  };

  // ============= REGRAS DE SERVIÇO =============
  const openRegraDialog = (regra?: RegraServico) => {
    if (regra) {
      // Determinar tipo de limite com base nos dados
      let tipoLimite: "nenhum" | "fixo" | "por_dia" = "nenhum";
      if (regra.limite_dia) {
        tipoLimite = "fixo";
      } else if (regra.limite_seg || regra.limite_ter || regra.limite_qua || regra.limite_qui || regra.limite_sex || regra.limite_sab) {
        tipoLimite = "por_dia";
      }
      
      setEditingRegra(regra);
      setRegraFormData({
        servico_id: regra.servico_id,
        hora_corte: regra.hora_corte,
        tipo_limite: tipoLimite,
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
        tipo_limite: "nenhum",
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
    toast.success("Regra excluída!");
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

  // ============= PAGE CONFIG =============
  const openPageConfigDialog = (config: PageConfig) => {
    setEditingPageConfig(config);
    setShowPageConfigDialog(true);
  };

  const savePageConfig = async () => {
    if (!editingPageConfig) return;

    setSaving(true);
    const { error } = await supabase
      .from("page_config")
      .update({
        config_value: editingPageConfig.config_value,
        updated_at: new Date().toISOString()
      })
      .eq("id", editingPageConfig.id);

    if (error) {
      toast.error("Erro ao salvar configuração");
    } else {
      toast.success("Configuração salva!");
    }
    setShowPageConfigDialog(false);
    setSaving(false);
    fetchAllData();
  };

  // ============= ROUTING RULES =============
  const openRoutingDialog = (rule?: RoutingRule) => {
    if (rule) {
      setEditingRouting(rule);
      setRoutingFormData({
        servico_id: rule.servico_id,
        campo_criterio: rule.campo_criterio,
        valor_criterio: rule.valor_criterio,
        setor_ids: rule.setor_ids
      });
    } else {
      setEditingRouting(null);
      setRoutingFormData({
        servico_id: "",
        campo_criterio: "",
        valor_criterio: "",
        setor_ids: []
      });
    }
    setShowRoutingDialog(true);
  };

  const toggleSetorForRouting = (setorId: string) => {
    setRoutingFormData(prev => ({
      ...prev,
      setor_ids: prev.setor_ids.includes(setorId)
        ? prev.setor_ids.filter(id => id !== setorId)
        : [...prev.setor_ids, setorId]
    }));
  };

  const saveRoutingRule = async () => {
    if (!routingFormData.servico_id || !routingFormData.campo_criterio || routingFormData.setor_ids.length === 0) {
      toast.error("Preencha todos os campos obrigatórios (serviço, campo critério e pelo menos um setor)");
      return;
    }

    const data = {
      servico_id: routingFormData.servico_id,
      campo_criterio: routingFormData.campo_criterio,
      valor_criterio: routingFormData.valor_criterio,
      setor_ids: routingFormData.setor_ids,
      updated_at: new Date().toISOString()
    };

    setSaving(true);
    if (editingRouting) {
      const { error } = await supabase
        .from("service_routing_rules")
        .update(data)
        .eq("id", editingRouting.id);

      if (error) {
        toast.error("Erro ao atualizar regra de roteamento");
        setSaving(false);
        return;
      }
      toast.success("Regra atualizada!");
    } else {
      const { error } = await supabase
        .from("service_routing_rules")
        .insert(data);

      if (error) {
        toast.error("Erro ao criar regra de roteamento");
        setSaving(false);
        return;
      }
      toast.success("Regra criada!");
    }

    setShowRoutingDialog(false);
    setSaving(false);
    fetchAllData();
  };

  const deleteRoutingRule = async (rule: RoutingRule) => {
    const { error } = await supabase
      .from("service_routing_rules")
      .delete()
      .eq("id", rule.id);

    if (error) {
      toast.error("Erro ao excluir regra");
      return;
    }
    toast.success("Regra excluída!");
    fetchAllData();
  };

  const getSetorLabel = (setorId: string) => {
    const setor = setorEmails.find(s => s.id === setorId);
    return setor?.descricao || setor?.email_setor || setorId;
  };

  // ============= NOTIFICATION RULES =============
  const openNotifDialog = (rule?: NotificationRule) => {
    if (rule) {
      setEditingNotif(rule);
      setNotifFormData({
        servico_id: rule.servico_id,
        status_gatilho: rule.status_gatilho,
        tipos_notificacao: rule.tipos_notificacao
      });
    } else {
      setEditingNotif(null);
      setNotifFormData({ servico_id: "", status_gatilho: "", tipos_notificacao: [] });
    }
    setShowNotifDialog(true);
  };

  const toggleTipoNotif = (tipo: string) => {
    setNotifFormData(prev => ({
      ...prev,
      tipos_notificacao: prev.tipos_notificacao.includes(tipo)
        ? prev.tipos_notificacao.filter(t => t !== tipo)
        : [...prev.tipos_notificacao, tipo]
    }));
  };

  const saveNotifRule = async () => {
    if (!notifFormData.servico_id || !notifFormData.status_gatilho || notifFormData.tipos_notificacao.length === 0) {
      toast.error("Preencha todos os campos e selecione pelo menos um tipo de notificação");
      return;
    }

    const data = {
      servico_id: notifFormData.servico_id,
      status_gatilho: notifFormData.status_gatilho,
      tipos_notificacao: notifFormData.tipos_notificacao,
      updated_at: new Date().toISOString()
    };

    setSaving(true);
    if (editingNotif) {
      const { error } = await supabase.from("notification_rules").update(data).eq("id", editingNotif.id);
      if (error) { toast.error("Erro ao atualizar regra"); setSaving(false); return; }
      toast.success("Regra atualizada!");
    } else {
      const { error } = await supabase.from("notification_rules").insert(data);
      if (error) {
        if (error.code === "23505") toast.error("Já existe uma regra para este serviço e status");
        else toast.error("Erro ao criar regra");
        setSaving(false); return;
      }
      toast.success("Regra criada!");
    }
    setShowNotifDialog(false);
    setSaving(false);
    fetchAllData();
  };

  const deleteNotifRule = async (rule: NotificationRule) => {
    const { error } = await supabase.from("notification_rules").delete().eq("id", rule.id);
    if (error) { toast.error("Erro ao excluir regra"); return; }
    toast.success("Regra excluída!");
    fetchAllData();
  };

  const toggleNotifAtivo = async (rule: NotificationRule) => {
    await supabase.from("notification_rules").update({ ativo: !rule.ativo }).eq("id", rule.id);
    fetchAllData();
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

      <Tabs defaultValue="pagina-externa" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pagina-externa" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Pág. Externa
          </TabsTrigger>
          <TabsTrigger value="pagina-interna" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Pág. Interna
          </TabsTrigger>
          <TabsTrigger value="campos-respostas" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Campos
          </TabsTrigger>
          <TabsTrigger value="regras" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="protocolo" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Protocolo
          </TabsTrigger>
        </TabsList>

        {/* ============= PÁGINA EXTERNA ============= */}
        <TabsContent value="pagina-externa">
          <ExternalButtonsManager />
        </TabsContent>

        {/* ============= PÁGINA INTERNA ============= */}
        <TabsContent value="pagina-interna">
          <div className="space-y-6">
            {/* Visualização de anexos - agora está em Serviços */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Visualização de Anexos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  A configuração de anexos embutidos ou botão visualizar agora é definida <strong>por serviço</strong>.
                </p>
                <p className="text-sm text-muted-foreground">
                  Acesse <Button variant="link" className="p-0 h-auto" onClick={() => navigate("/interno/admin/servicos")}>Serviços</Button> para configurar como os anexos são exibidos em cada serviço.
                </p>
              </CardContent>
            </Card>

            {/* Regras de Roteamento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Regras de Roteamento (Subcritérios de Visualização)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Defina quais setores devem ser notificados para atuar em processos com base em critérios específicos.
                </p>
                
                <div className="flex justify-end">
                  <Button onClick={() => openRoutingDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Regra
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Campo Critério</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Setores</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routingRules.map(rule => (
                      <TableRow key={rule.id}>
                        <TableCell>{getServicoNome(rule.servico_id)}</TableCell>
                        <TableCell>{rule.campo_criterio}</TableCell>
                        <TableCell>{rule.valor_criterio || "Qualquer"}</TableCell>
                        <TableCell className="text-xs">
                          {rule.setor_ids.map(id => getSetorLabel(id)).join(", ")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openRoutingDialog(rule)}>
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
                                    Tem certeza que deseja excluir esta regra de roteamento?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteRoutingRule(rule)} className="bg-destructive text-destructive-foreground">
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {routingRules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma regra configurada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ============= CAMPOS RESPOSTAS ============= */}
        <TabsContent value="campos-respostas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Parâmetros de Campos Respostas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Gerencie os valores disponíveis para Tipo Carga, Categoria e Status de Deferimento.
              </p>
              <ParametrosCamposManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= REGRAS DE SERVIÇO ============= */}
        <TabsContent value="regras">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Regras por Serviço ({regras.length})</CardTitle>
              <Button onClick={() => openRegraDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Regra
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Defina os limites diários, hora de corte e dias de operação para cada serviço.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Hora Corte</TableHead>
                    <TableHead>Limites</TableHead>
                    <TableHead>Dias Operação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regras.map((regra) => {
                    const hasPerDayLimits = regra.limite_seg || regra.limite_ter || regra.limite_qua || 
                                            regra.limite_qui || regra.limite_sex || regra.limite_sab;
                    return (
                      <TableRow key={regra.id}>
                        <TableCell className="font-medium">{getServicoNome(regra.servico_id)}</TableCell>
                        <TableCell>{regra.hora_corte}</TableCell>
                        <TableCell className="text-xs">
                          {regra.limite_dia ? (
                            <span>{regra.limite_dia}/dia</span>
                          ) : hasPerDayLimits ? (
                            <span title={`Seg: ${regra.limite_seg || '—'}, Ter: ${regra.limite_ter || '—'}, Qua: ${regra.limite_qua || '—'}, Qui: ${regra.limite_qui || '—'}, Sex: ${regra.limite_sex || '—'}, Sáb: ${regra.limite_sab || '—'}`}>
                              Por dia da semana
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Sem limite</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {regra.dias_semana.join(", ").toUpperCase()}
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
                                    Tem certeza que deseja excluir a regra para <strong>{getServicoNome(regra.servico_id)}</strong>?
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
                    );
                  })}
                  {regras.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhuma regra configurada. O sistema usará valores padrão.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= REGRAS DE NOTIFICAÇÃO ============= */}
        <TabsContent value="notificacoes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Regras de Notificação ({notifRules.length})
              </CardTitle>
              <Button onClick={() => openNotifDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Regra
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure quais status disparam notificações e de qual tipo, por serviço. A notificação <strong>não será enviada</strong> ao usuário que realizou a atualização, apenas aos demais com acesso ao serviço.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Status Gatilho</TableHead>
                    <TableHead>Tipos de Notificação</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifRules.map(rule => (
                    <TableRow key={rule.id} className={!rule.ativo ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{getServicoNome(rule.servico_id)}</TableCell>
                      <TableCell>{STATUS_GATILHO_OPTIONS.find(s => s.value === rule.status_gatilho)?.label || rule.status_gatilho}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap gap-1">
                          {rule.tipos_notificacao.map(t => (
                            <Badge key={t} variant="outline" className="text-[10px]">
                              {TIPOS_NOTIFICACAO.find(tn => tn.key === t)?.label || t}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch checked={rule.ativo} onCheckedChange={() => toggleNotifAtivo(rule)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openNotifDialog(rule)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Regra de Notificação</AlertDialogTitle>
                                <AlertDialogDescription>Tem certeza que deseja excluir esta regra?</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteNotifRule(rule)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {notifRules.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhuma regra de notificação configurada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= PROTOCOLO ============= */}
        <TabsContent value="protocolo">
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Protocolo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure o prefixo dos protocolos gerados automaticamente.
              </p>
              {protocolConfig && (
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label>Prefixo do Protocolo</Label>
                    <Input
                      value={protocolConfig.prefixo}
                      onChange={(e) => setProtocolConfig({ ...protocolConfig, prefixo: e.target.value.toUpperCase() })}
                      placeholder="JBS"
                      maxLength={5}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Exemplo: {protocolConfig.prefixo}A000001
                    </p>
                  </div>
                  <div>
                    <Label>Último Número Gerado</Label>
                    <Input value={protocolConfig.ultimo_numero} disabled className="bg-muted" />
                  </div>
                  <Button onClick={saveProtocolConfig} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para Regra */}
      <Dialog open={showRegraDialog} onOpenChange={setShowRegraDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRegra ? "Editar Regra" : "Adicionar Regra"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Serviço</Label>
              <Select
                value={regraFormData.servico_id}
                onValueChange={(v) => setRegraFormData(prev => ({ ...prev, servico_id: v }))}
                disabled={!!editingRegra}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicos.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
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
                  onChange={(e) => setRegraFormData(prev => ({ ...prev, hora_corte: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Dias de Operação</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {DIAS_SEMANA.map(dia => (
                  <div key={dia.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={dia.key}
                      checked={regraFormData.dias_semana.includes(dia.key)}
                      onCheckedChange={() => toggleDiaSemana(dia.key)}
                    />
                    <Label htmlFor={dia.key} className="cursor-pointer text-sm">{dia.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Tipo de limite - Diário Fixo ou Por Dia da Semana */}
            <div className="border-t pt-4">
              <Label className="mb-2 block">Tipo de Limite de Quantidade</Label>
              <Select
                value={regraFormData.tipo_limite}
                onValueChange={(v: "nenhum" | "fixo" | "por_dia") => {
                  if (v === "fixo") {
                    setRegraFormData(prev => ({
                      ...prev,
                      tipo_limite: "fixo",
                      limite_seg: "", limite_ter: "", limite_qua: "", 
                      limite_qui: "", limite_sex: "", limite_sab: ""
                    }));
                  } else if (v === "por_dia") {
                    setRegraFormData(prev => ({ 
                      ...prev, 
                      tipo_limite: "por_dia",
                      limite_dia: "" 
                    }));
                  } else {
                    setRegraFormData(prev => ({
                      ...prev,
                      tipo_limite: "nenhum",
                      limite_dia: "",
                      limite_seg: "", limite_ter: "", limite_qua: "", 
                      limite_qui: "", limite_sex: "", limite_sab: ""
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de limite" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Sem limite</SelectItem>
                  <SelectItem value="fixo">Limite diário fixo</SelectItem>
                  <SelectItem value="por_dia">Limite por dia da semana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Limite diário fixo */}
            {regraFormData.tipo_limite === "fixo" && (
              <div>
                <Label>Limite Diário (todos os dias)</Label>
                <Input
                  type="number"
                  value={regraFormData.limite_dia}
                  onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_dia: e.target.value }))}
                  placeholder="Ex: 10"
                  min="1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Quantidade máxima de solicitações permitidas por dia para este serviço
                </p>
              </div>
            )}

            {/* Limites por dia da semana */}
            {regraFormData.tipo_limite === "por_dia" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Defina a quantidade máxima de solicitações para cada dia da semana. Deixe em branco para sem limite naquele dia.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Segunda</Label>
                    <Input
                      type="number"
                      value={regraFormData.limite_seg}
                      onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_seg: e.target.value }))}
                      placeholder="—"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Terça</Label>
                    <Input
                      type="number"
                      value={regraFormData.limite_ter}
                      onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_ter: e.target.value }))}
                      placeholder="—"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Quarta</Label>
                    <Input
                      type="number"
                      value={regraFormData.limite_qua}
                      onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_qua: e.target.value }))}
                      placeholder="—"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Quinta</Label>
                    <Input
                      type="number"
                      value={regraFormData.limite_qui}
                      onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_qui: e.target.value }))}
                      placeholder="—"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sexta</Label>
                    <Input
                      type="number"
                      value={regraFormData.limite_sex}
                      onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_sex: e.target.value }))}
                      placeholder="—"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Sábado</Label>
                    <Input
                      type="number"
                      value={regraFormData.limite_sab}
                      onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_sab: e.target.value }))}
                      placeholder="—"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="aplica_dia_anterior"
                checked={regraFormData.aplica_dia_anterior}
                onCheckedChange={(c) => setRegraFormData(prev => ({ ...prev, aplica_dia_anterior: !!c }))}
              />
              <Label htmlFor="aplica_dia_anterior">
                Aplicar regra ao dia anterior
              </Label>
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

      {/* Dialog para Page Config */}
      <Dialog open={showPageConfigDialog} onOpenChange={setShowPageConfigDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Configuração</DialogTitle>
          </DialogHeader>
          {editingPageConfig && (
            <div className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">{editingPageConfig.description}</p>
              
              {editingPageConfig.config_type === 'boolean' ? (
                <div className="flex items-center gap-3">
                  <Switch
                    checked={editingPageConfig.config_value === 'true'}
                    onCheckedChange={(checked) => setEditingPageConfig({
                      ...editingPageConfig,
                      config_value: checked ? 'true' : 'false'
                    })}
                  />
                  <Label>{editingPageConfig.config_value === 'true' ? 'Sim' : 'Não'}</Label>
                </div>
              ) : (
                <Input
                  value={editingPageConfig.config_value || ''}
                  onChange={(e) => setEditingPageConfig({
                    ...editingPageConfig,
                    config_value: e.target.value
                  })}
                  placeholder={editingPageConfig.config_type === 'url' ? 'https://...' : 'Valor'}
                />
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={savePageConfig} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Routing Rule */}
      <Dialog open={showRoutingDialog} onOpenChange={setShowRoutingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRouting ? "Editar Regra" : "Adicionar Regra de Roteamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Serviço</Label>
              <Select
                value={routingFormData.servico_id}
                onValueChange={(v) => setRoutingFormData(prev => ({ ...prev, servico_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicos.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Campo Critério (do Mapeamento de Campos)</Label>
              <Select
                value={routingFormData.campo_criterio}
                onValueChange={(v) => setRoutingFormData(prev => ({ ...prev, campo_criterio: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o campo" />
                </SelectTrigger>
                <SelectContent>
                  {fieldMappings.map(fm => (
                    <SelectItem key={fm.campo_interno} value={fm.campo_interno}>
                      {fm.campo_interno} ({fm.campo_externo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor do Critério (opcional)</Label>
              <Input
                value={routingFormData.valor_criterio}
                onChange={(e) => setRoutingFormData(prev => ({ ...prev, valor_criterio: e.target.value }))}
                placeholder="Deixe vazio para qualquer valor"
              />
            </div>
            <div>
              <Label>Setores que devem ser notificados *</Label>
              <p className="text-xs text-muted-foreground mb-2">Selecione pelo menos um setor</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                {setorEmails.map(setor => (
                  <div key={setor.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`setor-${setor.id}`}
                      checked={routingFormData.setor_ids.includes(setor.id)}
                      onCheckedChange={() => toggleSetorForRouting(setor.id)}
                    />
                    <Label htmlFor={`setor-${setor.id}`} className="cursor-pointer text-sm">
                      {setor.descricao || setor.email_setor}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={saveRoutingRule} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Notification Rule */}
      <Dialog open={showNotifDialog} onOpenChange={setShowNotifDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingNotif ? "Editar Regra" : "Adicionar Regra de Notificação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Serviço</Label>
              <Select
                value={notifFormData.servico_id}
                onValueChange={(v) => setNotifFormData(prev => ({ ...prev, servico_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicos.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status Gatilho</Label>
              <Select
                value={notifFormData.status_gatilho}
                onValueChange={(v) => setNotifFormData(prev => ({ ...prev, status_gatilho: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_GATILHO_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipos de Notificação *</Label>
              <p className="text-xs text-muted-foreground mb-2">Selecione pelo menos um tipo</p>
              <div className="space-y-2 border rounded-lg p-3">
                {TIPOS_NOTIFICACAO.map(tipo => (
                  <div key={tipo.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`notif-${tipo.key}`}
                      checked={notifFormData.tipos_notificacao.includes(tipo.key)}
                      onCheckedChange={() => toggleTipoNotif(tipo.key)}
                    />
                    <Label htmlFor={`notif-${tipo.key}`} className="cursor-pointer text-sm">{tipo.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={saveNotifRule} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminParametros;
