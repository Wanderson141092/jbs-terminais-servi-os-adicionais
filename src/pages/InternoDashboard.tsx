import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Bell, ClipboardList, CheckCircle2, XCircle, Clock,
  Eye, Filter, Search, ChevronLeft, ChevronRight, Settings, Users,
  Building2, FileText, Link2, Menu, RefreshCw, DollarSign, SquareCheck, Download, FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ExcelExportDialog from "@/components/ExcelExportDialog";
import { downloadProcessoPdf, downloadBatchPdfs } from "@/components/ProcessoPdfGenerator";
import { formatTipoCarga } from "@/lib/tipoCarga";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatusBadge, { STATUS_LABELS } from "@/components/StatusBadge";
import AnaliseDialog from "@/components/AnaliseDialog";
import NotificationsPanel from "@/components/NotificationsPanel";
import ReclassificacaoDialog from "@/components/ReclassificacaoDialog";
import SetorSelector from "@/components/SetorSelector";
import BatchApprovalDialog from "@/components/BatchApprovalDialog";
import BatchStatusDialog from "@/components/BatchStatusDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";
import jbsLogo from "@/assets/jbs-terminais-logo.png";
import { startOfWeek, addDays, format, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import useNotifications from "@/hooks/useNotifications";
import DeferimentoDialog from "@/components/DeferimentoDialog";

interface Servico {
  id: string;
  nome: string;
  codigo_prefixo: string;
  ativo: boolean;
  tipo_agendamento: string | null;
  status_confirmacao_lancamento?: string[];
}

const InternoDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [tipoServicoFilter, setTipoServicoFilter] = useState("Todos");
  const [lancamentoFilter, setLancamentoFilter] = useState<"all" | "pendente" | "confirmado">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<any>(null);
  const [reclassificacaoSolicitacao, setReclassificacaoSolicitacao] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [showSetorSelector, setShowSetorSelector] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchApproval, setShowBatchApproval] = useState(false);
  const [showBatchStatus, setShowBatchStatus] = useState(false);
  const [userPerfis, setUserPerfis] = useState<string[]>([]);
  const [deferimentoSolicitacao, setDeferimentoSolicitacao] = useState<any>(null);
  const [showExcelExport, setShowExcelExport] = useState(false);
  
  const { isAdmin } = useAdminCheck(user?.id || null);
  
  // Initialize native notifications
  useNotifications(user?.id || null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) navigate("/interno");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) navigate("/interno");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*, setor_emails(perfis, descricao)")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data);
    
    // Get perfis from setor_emails
    if (data?.setor_emails?.perfis) {
      setUserPerfis(data.setor_emails.perfis);
    }
  }, [user]);

  const fetchServicos = useCallback(async () => {
    const { data } = await supabase
      .from("servicos")
      .select("*, status_confirmacao_lancamento")
      .eq("ativo", true)
      .order("nome");
    setServicos(data || []);
  }, []);

  const fetchSolicitacoes = useCallback(async () => {
    setLoading(true);
    
    // By default, don't load old completed records - user must filter
    let query = supabase
      .from("solicitacoes")
      .select("*")
      .order("created_at", { ascending: false });
    
    // Filter logic:
    // - If service=todos AND lançamento=todos: exclude vistoria_finalizada (show nothing meaningful)
    // - If service=todos AND lançamento=pendente/confirmado: include vistoria_finalizada (need them for launch filter)
    // - If specific service: that's the primary filter
    if (statusFilter === "all" && lancamentoFilter === "all") {
      query = query.not("status", "in", '("vistoria_finalizada")');
    }

    const { data, error } = await query.limit(200);

    if (error) {
      toast.error("Erro ao carregar solicitações.");
    } else {
      setSolicitacoes(data || []);
    }
    setLoading(false);
  }, [statusFilter, lancamentoFilter]);

  const fetchUnread = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("usuario_id", user.id)
      .eq("lida", false);
    setUnreadCount(count || 0);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSolicitacoes();
      fetchUnread();
      fetchServicos();
    }
  }, [user, fetchProfile, fetchSolicitacoes, fetchUnread, fetchServicos]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/interno");
  };

  // Verifica se precisa mostrar SetorSelector:
  // - Não é admin
  // - Não logou como admin (admin@jbsterminais.com.br)
  // - Profile existe mas não tem setor definido
  // - Email é do domínio @jbsterminais.com.br
  useEffect(() => {
    // Admins (role ou email admin@jbsterminais.com.br) NUNCA veem o SetorSelector
    const isAdminEmail = profile?.email === "admin@jbsterminais.com.br";
    if (isAdmin || isAdminEmail) {
      setShowSetorSelector(false);
      return;
    }
    
    // Só mostra SetorSelector se não tem setor e é email corporativo
    if (profile && !profile.setor && !profile.email_setor && profile.email?.endsWith("@jbsterminais.com.br")) {
      setShowSetorSelector(true);
    } else {
      setShowSetorSelector(false);
    }
  }, [profile, isAdmin]);

  // Se precisa configurar setor, mostra SetorSelector
  if (showSetorSelector && user) {
    return (
      <SetorSelector 
        userId={user.id} 
        onComplete={() => {
          setShowSetorSelector(false);
          fetchProfile();
        }} 
      />
    );
  }

  // Week days for dashboard
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(currentWeekStart, i));

  const filtered = solicitacoes.filter((s) => {
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesTipo = tipoServicoFilter === "Todos" || s.tipo_operacao === tipoServicoFilter;
    const matchesSearch =
      !searchTerm ||
      s.protocolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.lpco && s.lpco.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.numero_conteiner && s.numero_conteiner.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro de lançamento
    let matchesLancamento = true;
    if (lancamentoFilter !== "all") {
      const servico = servicos.find(sv => sv.nome === s.tipo_operacao);
      if (!servico?.status_confirmacao_lancamento?.length) {
        matchesLancamento = false;
      } else {
        const needsLaunch = servico.status_confirmacao_lancamento.includes(s.status);
        if (lancamentoFilter === "pendente") {
          matchesLancamento = needsLaunch && !s.lancamento_confirmado;
        } else if (lancamentoFilter === "confirmado") {
          matchesLancamento = needsLaunch && s.lancamento_confirmado === true;
        }
      }
    }

    // Se serviço=todos E lançamento=todos, não mostrar nada (query já exclui vistoria_finalizada)
    // Se serviço=todos E lançamento=pendente/confirmado, mostrar apenas os com lançamento matching
    if (tipoServicoFilter === "Todos" && lancamentoFilter === "all") {
      // Comportamento padrão - query já filtrou vistoria_finalizada
    }
    
    return matchesStatus && matchesTipo && matchesSearch && matchesLancamento;
  });

  const statusCounts = filtered.reduce((acc: Record<string, number>, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  // Group by date for weekly view (filtered by service type)
  const getCountForDay = (day: Date, status?: string) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return filtered.filter(s => {
      const matches = s.data_posicionamento === dayStr;
      if (status) {
        return matches && s.status === status;
      }
      return matches;
    }).length;
  };

  const tipoServicosOptions = ["Todos", ...servicos.map(s => s.nome)];

  // Mapeamento de labels para exibição
  const getSetorLabel = (setor: string | null) => {
    if (!setor) return "—";
    const labels: Record<string, string> = {
      "COMEX": "Administrativo",
      "ARMAZEM": "Operacional",
      "ADMINISTRATIVO": "Administrativo",
      "OPERACIONAL": "Operacional",
      "MASTER": "Master"
    };
    return labels[setor] || setor;
  };

  // Check if user has Operacional profile for batch approval
  const hasOperacionalProfile = userPerfis.includes("OPERACIONAL") || profile?.setor === "ARMAZEM" || isAdmin;

  // Get processes eligible for batch approval (pending armazem approval)
  const selectedForBatchApproval = filtered.filter(s => 
    selectedIds.includes(s.id) && 
    s.status === "aguardando_confirmacao" && 
    s.armazem_aprovado === null
  );

  // Get processes eligible for batch status update (already approved)
  const selectedForBatchStatus = filtered.filter(s => 
    selectedIds.includes(s.id) && 
    (s.status === "confirmado_aguardando_vistoria" || s.comex_aprovado || s.armazem_aprovado)
  );

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(s => s.id));
    }
  };

  // Calculate launch counters
  const lancamentoPendente = solicitacoes.filter(s => {
    const servico = servicos.find(sv => sv.nome === s.tipo_operacao);
    if (!servico?.status_confirmacao_lancamento?.length) return false;
    return servico.status_confirmacao_lancamento.includes(s.status) && !s.lancamento_confirmado;
  }).length;

  const lancamentoConfirmado = solicitacoes.filter(s => {
    const servico = servicos.find(sv => sv.nome === s.tipo_operacao);
    if (!servico?.status_confirmacao_lancamento?.length) return false;
    return servico.status_confirmacao_lancamento.includes(s.status) && s.lancamento_confirmado === true;
  }).length;

  // Check if process needs launch confirmation
  const needsLaunchConfirmation = (s: any) => {
    const servico = servicos.find(sv => sv.nome === s.tipo_operacao);
    if (!servico?.status_confirmacao_lancamento?.length) return false;
    return servico.status_confirmacao_lancamento.includes(s.status);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="jbs-header sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo area with white background */}
            <div className="bg-white rounded-lg p-2">
              <img src={jbsLogo} alt="JBS Terminais" className="h-8 w-auto" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Serviços Adicionais</h1>
              <p className="text-xs text-primary-foreground/70">
                {profile?.nome} · {isAdmin ? "Admin" : getSetorLabel(profile?.setor)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Admin Menu */}
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <Menu className="h-4 w-4 mr-1" />
                    Admin
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/interno/admin/parametros")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Parâmetros
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/interno/admin/usuarios")}>
                    <Users className="h-4 w-4 mr-2" />
                    Usuários
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/interno/admin/setores")}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Setores
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/interno/admin/servicos")}>
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Serviços
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/interno/admin/formularios")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Formulários
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/interno/admin/admins")}>
                    <Users className="h-4 w-4 mr-2" />
                    Administradores CPF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/interno/admin/logs")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Histórico (Logs)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/interno/admin/integracoes")}>
                    <Link2 className="h-4 w-4 mr-2" />
                    Integrações
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/interno/admin/historico-integracoes")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Histórico Integrações
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Logs for all users */}
            {!isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/interno/admin/logs")}
                className="text-primary-foreground hover:bg-primary-foreground/10"
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-primary-foreground hover:bg-primary-foreground/10 relative"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* Notifications Panel */}
        {showNotifications && user && (
          <NotificationsPanel userId={user.id} onClose={() => {
            setShowNotifications(false);
            fetchUnread();
          }} />
        )}

        {/* Weekly Dashboard */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Visão Semanal</h2>
              <div className="flex items-center gap-2">
                <Select value={tipoServicoFilter} onValueChange={setTipoServicoFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo de Serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {tipoServicosOptions.map(tipo => (
                      <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[100px] text-center">
                  {format(currentWeekStart, "'Semana de' dd/MM", { locale: ptBR })}
                </span>
                <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {weekDays.map((day, i) => (
                <div key={i} className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground uppercase">
                    {format(day, "EEEE", { locale: ptBR })}
                  </p>
                  <p className="text-lg font-bold">{format(day, "dd/MM")}</p>
                  <p className="text-2xl font-bold text-primary mt-1">{getCountForDay(day)}</p>
                  <p className="text-[10px] text-muted-foreground">{getCountForDay(day) === 1 ? "solicitação" : "solicitações"}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards - now shows filtered total */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            label={tipoServicoFilter === "Todos" ? "Total" : tipoServicoFilter} 
            value={filtered.length} 
            icon={<ClipboardList className="h-5 w-5" />} 
          />
          <StatCard label="Aguardando" value={statusCounts["aguardando_confirmacao"] || 0} icon={<Clock className="h-5 w-5" />} color="text-yellow-600" />
          <StatCard label="Confirmados" value={statusCounts["confirmado_aguardando_vistoria"] || 0} icon={<CheckCircle2 className="h-5 w-5" />} color="text-blue-600" />
          <StatCard label="Recusados" value={statusCounts["recusado"] || 0} icon={<XCircle className="h-5 w-5" />} color="text-destructive" />
        </div>

        {/* Launch Counters */}
        {(lancamentoPendente > 0 || lancamentoConfirmado > 0) && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <StatCard 
              label="Lançamento Pendente" 
              value={lancamentoPendente} 
              icon={<DollarSign className="h-5 w-5" />} 
              color="text-destructive" 
            />
            <StatCard 
              label="Lançamento Confirmado" 
              value={lancamentoConfirmado} 
              icon={<DollarSign className="h-5 w-5" />} 
              color="text-muted-foreground" 
            />
          </div>
        )}

        {/* Status breakdown */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <Badge
              key={key}
              variant={statusFilter === key ? "default" : "outline"}
              className="cursor-pointer hover:bg-muted transition-colors"
              onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
            >
              {label}: {statusCounts[key] || 0}
            </Badge>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por protocolo, LPCO, contêiner ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="border-0 bg-muted/50"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={lancamentoFilter} onValueChange={(v) => setLancamentoFilter(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Lançamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Lançamento Pendente</SelectItem>
                  <SelectItem value="confirmado">Lançamento Confirmado</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchSolicitacoes}>
                Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowExcelExport(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Exportar
              </Button>
              {selectedIds.length > 0 && selectedIds.length <= 10 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => downloadBatchPdfs(filtered.filter(s => selectedIds.includes(s.id)))}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  PDF ({selectedIds.length})
                </Button>
              )}
              
              {/* Batch Action Buttons */}
              {selectedIds.length > 0 && (
                <div className="flex gap-2">
                  {hasOperacionalProfile && selectedForBatchApproval.length > 0 && (
                    <Button 
                      size="sm" 
                      className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                      onClick={() => setShowBatchApproval(true)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Aprovar ({selectedForBatchApproval.length})
                    </Button>
                  )}
                  {selectedForBatchStatus.length > 0 && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setShowBatchStatus(true)}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Atualizar Status ({selectedForBatchStatus.length})
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary hover:bg-primary">
                  <TableHead className="text-primary-foreground w-[40px]">
                    <div className="bg-white rounded p-0.5 w-fit">
                      <Checkbox
                        checked={selectedIds.length === filtered.length && filtered.length > 0}
                        onCheckedChange={() => toggleSelectAll()}
                        className="bg-white data-[state=checked]:bg-white data-[state=checked]:text-primary border-primary"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-primary-foreground w-[100px]">Ações</TableHead>
                  <TableHead className="text-primary-foreground w-[50px]">$</TableHead>
                  <TableHead className="text-primary-foreground">Protocolo</TableHead>
                  <TableHead className="text-primary-foreground">Serviço Adicional</TableHead>
                  <TableHead className="text-primary-foreground">Data Serviço</TableHead>
                  <TableHead className="text-primary-foreground">Contêiner</TableHead>
                  <TableHead className="text-primary-foreground">Tipo Carga</TableHead>
                  <TableHead className="text-primary-foreground">Cliente</TableHead>
                  <TableHead className="text-primary-foreground">Status</TableHead>
                  <TableHead className="text-primary-foreground">Administrativa</TableHead>
                  <TableHead className="text-primary-foreground">Operacional</TableHead>
                  <TableHead className="text-primary-foreground">Data Solic.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-12 text-muted-foreground">
                      Nenhuma solicitação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(s.id)}
                          onCheckedChange={() => toggleSelection(s.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSolicitacao(s)}
                            title="Visualizar / Analisar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {/* Botão reclassificar - só aparece se já tem decisão */}
                          {(s.comex_aprovado !== null || s.armazem_aprovado !== null) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setReclassificacaoSolicitacao(s)}
                              title="Reclassificar Aprovação"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Botão Deferimento - aparece quando status corresponde ao configurado no serviço */}
                          {(() => {
                            const servicoConf = servicos.find(sv => sv.nome === s.tipo_operacao);
                            const statusLanc = servicoConf?.status_confirmacao_lancamento || [];
                            const showDefBtn = statusLanc.includes(s.status) && 
                              (s.tipo_operacao || "").toLowerCase().includes("posicionamento") &&
                              (s.categoria || "").toLowerCase() === "exportação";
                            if (!showDefBtn) return null;
                            return (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeferimentoSolicitacao(s)}
                                title="Deferimento"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            );
                          })()}
                          {/* PDF individual */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadProcessoPdf(s)}
                            title="Salvar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        {needsLaunchConfirmation(s) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedSolicitacao(s)}
                            title={s.lancamento_confirmado ? "Lançamento Confirmado" : "Aguardando confirmação de lançamento"}
                            className={s.lancamento_confirmado ? "text-muted-foreground" : "text-destructive"}
                          >
                            <DollarSign className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">{s.protocolo}</TableCell>
                      <TableCell className="text-sm">{s.tipo_operacao || "Posicionamento"}</TableCell>
                      <TableCell className="text-sm">
                        {(() => {
                          const servicoConfig = servicos.find(sv => sv.nome === s.tipo_operacao);
                          if (servicoConfig?.tipo_agendamento === "data_horario" && s.data_agendamento) {
                            return new Date(s.data_agendamento).toLocaleString("pt-BR", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit"
                            });
                          }
                          if (s.data_posicionamento) {
                            return new Date(s.data_posicionamento + 'T00:00:00').toLocaleDateString("pt-BR");
                          }
                          return "—";
                        })()}
                      </TableCell>
                      <TableCell className="text-sm font-mono">{s.numero_conteiner || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {formatTipoCarga(s.tipo_carga)}
                      </TableCell>
                      <TableCell className="text-sm">{s.cliente_nome}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell>
                        <ApprovalIndicator approved={s.comex_aprovado} />
                      </TableCell>
                      <TableCell>
                        <ApprovalIndicator approved={s.armazem_aprovado} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Análise Dialog */}
      {selectedSolicitacao && profile && user && (
        <AnaliseDialog
          solicitacao={selectedSolicitacao}
          profile={{
            ...profile,
            // Mapear setor antigo para novo
            setor: profile.setor === "COMEX" ? "COMEX" : profile.setor === "ARMAZEM" ? "ARMAZEM" : profile.setor,
            perfis: userPerfis
          }}
          userId={user.id}
          isAdmin={isAdmin}
          onClose={() => {
            setSelectedSolicitacao(null);
            fetchSolicitacoes();
          }}
        />
      )}

      {/* Reclassificação Dialog */}
      {reclassificacaoSolicitacao && user && profile && (
        <ReclassificacaoDialog
          solicitacao={reclassificacaoSolicitacao}
          userId={user.id}
          userSetor={profile.setor}
          userPerfis={userPerfis}
          isAdmin={isAdmin}
          onClose={() => {
            setReclassificacaoSolicitacao(null);
            fetchSolicitacoes();
          }}
        />
      )}

      {/* Batch Approval Dialog */}
      {showBatchApproval && user && (
        <BatchApprovalDialog
          solicitacoes={selectedForBatchApproval}
          userId={user.id}
          onClose={() => setShowBatchApproval(false)}
          onSuccess={() => {
            setShowBatchApproval(false);
            setSelectedIds([]);
            fetchSolicitacoes();
          }}
        />
      )}

      {/* Batch Status Dialog */}
      {showBatchStatus && user && (
        <BatchStatusDialog
          solicitacoes={selectedForBatchStatus}
          userId={user.id}
          onClose={() => setShowBatchStatus(false)}
          onSuccess={() => {
            setShowBatchStatus(false);
            setSelectedIds([]);
            fetchSolicitacoes();
          }}
        />
      )}

      {/* Deferimento Dialog */}
      {deferimentoSolicitacao && user && (
        <DeferimentoDialog
          solicitacao={deferimentoSolicitacao}
          userId={user.id}
          onClose={() => {
            setDeferimentoSolicitacao(null);
            fetchSolicitacoes();
          }}
        />
      )}

      {/* Excel Export Dialog */}
      <ExcelExportDialog open={showExcelExport} onClose={() => setShowExcelExport(false)} />
    </div>
  );
};

// Helper Components
const StatCard = ({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color?: string }) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="py-4 px-5 flex items-center gap-4">
      <div className={`${color || "text-primary"}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const ApprovalIndicator = ({ approved }: { approved: boolean | null }) => {
  if (approved === null) {
    return <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>;
  }
  if (approved) {
    return <Badge className="bg-secondary text-secondary-foreground">Aprovado</Badge>;
  }
  return <Badge variant="destructive">Recusado</Badge>;
};

export default InternoDashboard;
