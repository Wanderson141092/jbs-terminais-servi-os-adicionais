import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRoleCheck } from "@/hooks/useRoleCheck";
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
import { Save, Settings, ArrowLeft, Plus, Edit, Trash2, Clock, FileText, Globe, Eye, Link2, List, Bell, GitBranch, Ban } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import ExternalButtonsManager from "@/components/ExternalButtonsManager";
import ParametrosCamposManager from "@/components/ParametrosCamposManager";
import CamposFixosManager from "@/components/admin/CamposFixosManager";
import CamposDinamicosManager from "@/components/admin/CamposDinamicosManager";
import ConsultaEtapasManager from "@/components/admin/ConsultaEtapasManager";
import CancelamentoRecusaManager from "@/components/admin/CancelamentoRecusaManager";
import PaginaExternaConfigManager from "@/components/admin/PaginaExternaConfigManager";
import LancamentoCobrancaManager from "@/components/admin/LancamentoCobrancaManager";
import ToggleActivationManager from "@/components/admin/ToggleActivationManager";
import ProtocolCountByService from "@/components/admin/ProtocolCountByService";

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
  recusar_apos_corte: boolean;
  agendar_proximo_dia: boolean;
  ativo: boolean;
  usar_horario_por_dia: boolean;
  horarios_por_dia: Record<string, string> | null;
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
  setor_ids?: string[];
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { isAdmin: isCurrentUserAdmin, isGestor } = useRoleCheck(currentUserId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/interno");
        return;
      }
      setCurrentUserId(session.user.id);
    });
  }, [navigate]);

  // Regras de Serviço
  const [regras, setRegras] = useState<RegraServico[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [showRegraDialog, setShowRegraDialog] = useState(false);
  const [editingRegra, setEditingRegra] = useState<RegraServico | null>(null);
  const [showCorteDialog, setShowCorteDialog] = useState(false);
  const [corteRegra, setCorteRegra] = useState<RegraServico | null>(null);
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
    aplica_dia_anterior: false,
    usar_horario_por_dia: false,
    horarios_por_dia: {} as Record<string, string>
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
    tipos_notificacao: [] as string[],
    setor_ids: [] as string[]
  });

  const TIPOS_NOTIFICACAO = [
    { key: "push", label: "Notificação Push (Nativa)" },
    { key: "toast", label: "Toast na Tela" },
    { key: "email", label: "E-mail" },
  ];

  // Dynamic status options from parametros_campos
  const [statusProcessoOptions, setStatusProcessoOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    fetchAllData();
    fetchStatusProcesso();
  }, []);

  const fetchStatusProcesso = async () => {
    const { data } = await supabase
      .from("parametros_campos")
      .select("valor, sigla")
      .eq("grupo", "status_processo")
      .eq("ativo", true)
      .order("ordem");
    const options = (data || []).map((s: any) => ({
      value: s.sigla || s.valor.toLowerCase().replace(/ /g, '_').replace(/-/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
      label: s.valor
    }));
    setStatusProcessoOptions(options);
  };

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

    if (regrasRes.data) setRegras(regrasRes.data.map(r => ({ ...r, horarios_por_dia: (r.horarios_por_dia as Record<string, string> | null) })));
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
        aplica_dia_anterior: regra.aplica_dia_anterior,
        usar_horario_por_dia: regra.usar_horario_por_dia,
        horarios_por_dia: (() => {
          const h = regra.horarios_por_dia || {};
          // If usar_horario_por_dia is on but horarios_por_dia is empty, pre-populate from hora_corte
          if (regra.usar_horario_por_dia && Object.keys(h).length === 0) {
            const init: Record<string, string> = {};
            regra.dias_semana.forEach(d => { init[d] = regra.hora_corte; });
            return init;
          }
          return h;
        })()
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
        aplica_dia_anterior: false,
        usar_horario_por_dia: false,
        horarios_por_dia: {}
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
      usar_horario_por_dia: regraFormData.usar_horario_por_dia,
      horarios_por_dia: regraFormData.usar_horario_por_dia ? regraFormData.horarios_por_dia : null,
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
    if (setorId === "admin") return "🛡️ Administrador do Sistema";
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
        tipos_notificacao: rule.tipos_notificacao,
        setor_ids: rule.setor_ids || []
      });
    } else {
      setEditingNotif(null);
      setNotifFormData({ servico_id: "", status_gatilho: "", tipos_notificacao: [], setor_ids: [] });
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

  const toggleSetorNotif = (setorId: string) => {
    setNotifFormData(prev => ({
      ...prev,
      setor_ids: prev.setor_ids.includes(setorId)
        ? prev.setor_ids.filter(id => id !== setorId)
        : [...prev.setor_ids, setorId]
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
      setor_ids: notifFormData.setor_ids,
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
  // Access guard
  if (!loading && !isCurrentUserAdmin && !isGestor) {
    navigate("/interno/dashboard");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/interno/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Parâmetros do Sistema</h1>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/interno/admin/parametros/ajuda")}>
          <FileText className="h-4 w-4 mr-2" />
          Manual
        </Button>
      </div>

      <Tabs defaultValue="pagina-externa" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="pagina-externa" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Pág. Externa
          </TabsTrigger>
          {isCurrentUserAdmin && (
            <>
              <TabsTrigger value="pagina-interna" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Pág. Interna
              </TabsTrigger>
              <TabsTrigger value="campos-respostas" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Campos
              </TabsTrigger>
              <TabsTrigger value="mapeamento-campos" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Mapeamento de Campos
              </TabsTrigger>
              <TabsTrigger value="consulta-etapas" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Consulta
              </TabsTrigger>
              <TabsTrigger value="cancelamento-recusa" className="flex items-center gap-2">
                <Ban className="h-4 w-4" />
                Cancel./Recusa
              </TabsTrigger>
            </>
          )}
          {isCurrentUserAdmin && (
            <TabsTrigger value="regras" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Regras
            </TabsTrigger>
          )}
          {isCurrentUserAdmin && (
            <>
              <TabsTrigger value="notificacoes" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notificações
              </TabsTrigger>
              <TabsTrigger value="protocolo" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Protocolo
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ============= PÁGINA EXTERNA ============= */}
        <TabsContent value="pagina-externa">
          <div className="space-y-6">
            <ExternalButtonsManager />
            <Separator />
            <PaginaExternaConfigManager />
          </div>
        </TabsContent>

        {/* ============= PÁGINA INTERNA ============= */}
        <TabsContent value="pagina-interna">
          <div className="space-y-6">
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Regras de Roteamento
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

            <ToggleActivationManager />

            <LancamentoCobrancaManager />
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
                Gerencie os valores disponíveis para Tipo Carga, Categoria, Status de Deferimento, Status de Processo e Pendências.
              </p>
              <ParametrosCamposManager />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============= MAPEAMENTO DE CAMPOS — Fixo & Dinâmico ============= */}
        <TabsContent value="mapeamento-campos">
          <Tabs defaultValue="fixo" className="space-y-4">
            <TabsList>
              <TabsTrigger value="fixo">Campo Fixo</TabsTrigger>
              <TabsTrigger value="dinamico">Campo Dinâmico</TabsTrigger>
            </TabsList>
            <TabsContent value="fixo">
              <CamposFixosManager />
            </TabsContent>
            <TabsContent value="dinamico">
              <CamposDinamicosManager />
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ============= CONSULTA ETAPAS ============= */}
        <TabsContent value="consulta-etapas">
          <ConsultaEtapasManager />
        </TabsContent>

        {/* ============= CANCELAMENTO / RECUSA ============= */}
        <TabsContent value="cancelamento-recusa">
          <CancelamentoRecusaManager />
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
                            <Button variant="ghost" size="icon" onClick={() => {
                              setCorteRegra(regra);
                              setShowCorteDialog(true);
                            }} title="Comportamento após corte">
                              <Clock className="h-4 w-4 text-orange-600" />
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
                Configure quais status disparam notificações e de qual tipo, por serviço.
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Status Gatilho</TableHead>
                    <TableHead>Setores Destino</TableHead>
                    <TableHead>Tipos de Notificação</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifRules.map(rule => (
                    <TableRow key={rule.id} className={!rule.ativo ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{getServicoNome(rule.servico_id)}</TableCell>
                      <TableCell>{statusProcessoOptions.find(s => s.value === rule.status_gatilho)?.label || rule.status_gatilho}</TableCell>
                      <TableCell className="text-xs">
                        {rule.setor_ids && rule.setor_ids.length > 0 ? (
                          rule.setor_ids.map(id => getSetorLabel(id)).join(", ")
                        ) : (
                          <span className="text-muted-foreground">Todos</span>
                        )}
                      </TableCell>
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
                                <AlertDialogTitle>Excluir Regra</AlertDialogTitle>
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
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                      Texto inicial que compõe o número do protocolo gerado automaticamente. Exemplo: {protocolConfig.prefixo}A000001
                    </p>
                  </div>
                  <div>
                    <Label>Último Número Gerado</Label>
                    <Input value={protocolConfig.ultimo_numero} disabled className="bg-muted" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Sequência numérica atual do protocolo. Esse valor é incrementado automaticamente a cada nova solicitação.
                    </p>
                  </div>
                  <Button onClick={saveProtocolConfig} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              )}

              {/* Contagem de protocolos por serviço */}
              <Separator className="my-4" />
              <ProtocolCountByService servicos={servicos} />
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
              <p className="text-xs text-muted-foreground mt-1">Serviço adicional ao qual esta regra será aplicada. Cada serviço pode ter apenas uma regra.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Hora de Corte Geral</Label>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={regraFormData.usar_horario_por_dia} 
                      onCheckedChange={(checked) => {
                        if (checked) {
                          // Pre-populate horarios_por_dia with hora_corte for all active days
                          const initialHorarios: Record<string, string> = {};
                          regraFormData.dias_semana.forEach(dia => {
                            initialHorarios[dia] = regraFormData.horarios_por_dia?.[dia] || regraFormData.hora_corte;
                          });
                          setRegraFormData(prev => ({ ...prev, usar_horario_por_dia: true, horarios_por_dia: initialHorarios }));
                        } else {
                          setRegraFormData(prev => ({ ...prev, usar_horario_por_dia: false }));
                        }
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Horário diferenciado por dia</span>
                  </div>
                </div>
                
                {!regraFormData.usar_horario_por_dia ? (
                  <>
                    <Input
                      type="time"
                      value={regraFormData.hora_corte}
                      onChange={(e) => setRegraFormData(prev => ({ ...prev, hora_corte: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">Horário limite padrão para todos os dias.</p>
                  </>
                ) : (
                  <div className="space-y-3 mt-3 border rounded-md p-3 max-h-60 overflow-y-auto">
                    <p className="text-xs text-muted-foreground mb-2">Selecione os dias que terão horário diferenciado:</p>
                    {DIAS_SEMANA.map(dia => {
                      const isDiaAtivo = regraFormData.dias_semana.includes(dia.key);
                      if (!isDiaAtivo) return null; // Only show cutoff config for active days
                      
                      const currentTime = regraFormData.horarios_por_dia?.[dia.key] || regraFormData.hora_corte;
                      
                      return (
                        <div key={dia.key} className="flex items-center justify-between">
                          <Label className="text-sm w-24">{dia.label}</Label>
                          <Input
                            type="time"
                            value={currentTime}
                            className="w-32 h-8 text-sm"
                            onChange={(e) => {
                              const newHorarios = { ...(regraFormData.horarios_por_dia || {}) };
                              newHorarios[dia.key] = e.target.value;
                              setRegraFormData(prev => ({ ...prev, horarios_por_dia: newHorarios }));
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Dias de Operação</Label>
              <p className="text-xs text-muted-foreground mb-2">Dias da semana em que o serviço aceita solicitações. Dias desmarcados bloquearão novos pedidos.</p>
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
              <p className="text-xs text-muted-foreground mb-2">Define como limitar a quantidade de solicitações por dia: sem restrição, valor fixo para todos os dias ou valores específicos por dia da semana.</p>
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
                  Defina a quantidade máxima de solicitações para cada dia da semana.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Segunda</Label>
                    <Input type="number" value={regraFormData.limite_seg} onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_seg: e.target.value }))} placeholder="—" />
                  </div>
                  <div>
                    <Label className="text-xs">Terça</Label>
                    <Input type="number" value={regraFormData.limite_ter} onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_ter: e.target.value }))} placeholder="—" />
                  </div>
                  <div>
                    <Label className="text-xs">Quarta</Label>
                    <Input type="number" value={regraFormData.limite_qua} onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_qua: e.target.value }))} placeholder="—" />
                  </div>
                  <div>
                    <Label className="text-xs">Quinta</Label>
                    <Input type="number" value={regraFormData.limite_qui} onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_qui: e.target.value }))} placeholder="—" />
                  </div>
                  <div>
                    <Label className="text-xs">Sexta</Label>
                    <Input type="number" value={regraFormData.limite_sex} onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_sex: e.target.value }))} placeholder="—" />
                  </div>
                  <div>
                    <Label className="text-xs">Sábado</Label>
                    <Input type="number" value={regraFormData.limite_sab} onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_sab: e.target.value }))} placeholder="—" />
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
              <div>
                <Label htmlFor="aplica_dia_anterior">Considerar data informada (D+1)</Label>
                <p className="text-xs text-muted-foreground">
                  <strong>Ativado:</strong> O corte só se aplica se o horário do pedido ≥ corte <strong>E</strong> a data informada (posicionamento/agendamento) for D+1 ou anterior.{" "}
                  <strong>Desativado:</strong> O corte se aplica apenas pelo horário, independente da data informada. Em ambos os casos, o tratamento segue o "Comportamento após o Corte".
                </p>
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
              <p className="text-xs text-muted-foreground mt-1">Serviço ao qual esta regra de roteamento se aplica.</p>
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
              <p className="text-xs text-muted-foreground mt-1">Campo da solicitação usado como critério para decidir qual setor é responsável. Baseado nos mapeamentos configurados em Integrações.</p>
            </div>
            <div>
              <Label>Valor do Critério (opcional)</Label>
              <Input
                value={routingFormData.valor_criterio}
                onChange={(e) => setRoutingFormData(prev => ({ ...prev, valor_criterio: e.target.value }))}
                placeholder="Deixe vazio para qualquer valor"
              />
              <p className="text-xs text-muted-foreground mt-1">Valor específico do campo critério que ativa esta regra. Se vazio, qualquer valor aciona o roteamento.</p>
            </div>
            <div>
              <Label>Setores que devem ser notificados *</Label>
              <p className="text-xs text-muted-foreground mb-2">Selecione pelo menos um setor</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="setor-admin-routing"
                    checked={routingFormData.setor_ids.includes("admin")}
                    onCheckedChange={() => toggleSetorForRouting("admin")}
                  />
                  <Label htmlFor="setor-admin-routing" className="cursor-pointer text-sm font-semibold">
                    🛡️ Administrador do Sistema
                  </Label>
                </div>
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
              <p className="text-xs text-muted-foreground mt-1">Serviço adicional vinculado a esta regra de notificação.</p>
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
                  {statusProcessoOptions.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Status que, ao ser atingido pelo processo, dispara automaticamente a notificação configurada.</p>
            </div>
            
            <div>
              <Label>Setores a serem notificados</Label>
              <p className="text-xs text-muted-foreground mb-2">Se vazio, notifica todos os envolvidos</p>
              <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-auto">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="setor-notif-admin"
                    checked={notifFormData.setor_ids.includes("admin")}
                    onCheckedChange={() => toggleSetorNotif("admin")}
                  />
                  <label htmlFor="setor-notif-admin" className="text-sm cursor-pointer font-semibold">
                    🛡️ Administrador do Sistema
                  </label>
                </div>
                {setorEmails.map(setor => (
                  <div key={setor.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`setor-notif-${setor.id}`}
                      checked={notifFormData.setor_ids.includes(setor.id)}
                      onCheckedChange={() => toggleSetorNotif(setor.id)}
                    />
                    <label htmlFor={`setor-notif-${setor.id}`} className="text-sm cursor-pointer">
                      {setor.descricao || setor.email_setor}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Tipos de Notificação *</Label>
              <p className="text-xs text-muted-foreground mb-2">Canais por onde a notificação será enviada quando o status gatilho for atingido.</p>
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
      {/* Dialog para Comportamento após Corte */}
      <Dialog open={showCorteDialog} onOpenChange={setShowCorteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Comportamento após o Corte
            </DialogTitle>
          </DialogHeader>
          {corteRegra && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                Defina o que acontece quando uma solicitação é enviada após o horário de corte para <strong>{getServicoNome(corteRegra.servico_id)}</strong>.
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <Label className="text-sm font-medium">Recusar automaticamente</Label>
                    <p className="text-xs text-muted-foreground">Solicitações após o corte são recusadas.</p>
                  </div>
                  <Switch
                    checked={corteRegra.recusar_apos_corte}
                    onCheckedChange={(checked) => {
                      setCorteRegra({
                        ...corteRegra,
                        recusar_apos_corte: checked,
                        agendar_proximo_dia: checked ? false : corteRegra.agendar_proximo_dia,
                      });
                    }}
                  />
                </div>
                <div className="flex items-center justify-between border rounded-md p-3">
                  <div>
                    <Label className="text-sm font-medium">Agendar para próximo dia ativo</Label>
                    <p className="text-xs text-muted-foreground">Solicitações após o corte são reagendadas.</p>
                  </div>
                  <Switch
                    checked={corteRegra.agendar_proximo_dia}
                    onCheckedChange={(checked) => {
                      setCorteRegra({
                        ...corteRegra,
                        agendar_proximo_dia: checked,
                        recusar_apos_corte: checked ? false : corteRegra.recusar_apos_corte,
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!corteRegra) return;
                setSaving(true);
                const { error } = await supabase.from("regras_servico").update({
                  recusar_apos_corte: corteRegra.recusar_apos_corte,
                  agendar_proximo_dia: corteRegra.agendar_proximo_dia,
                  updated_at: new Date().toISOString(),
                }).eq("id", corteRegra.id);
                if (error) { toast.error("Erro ao salvar"); }
                else { toast.success("Comportamento após corte atualizado!"); }
                setSaving(false);
                setShowCorteDialog(false);
                fetchAllData();
              }}
              disabled={saving}
            >
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
