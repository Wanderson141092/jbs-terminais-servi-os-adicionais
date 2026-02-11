import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Bell, ClipboardList, CheckCircle2, XCircle, Clock,
  Eye, Filter, Search, ChevronLeft, ChevronRight, Settings, Users,
  Building2, FileText, Link2, Menu, RefreshCw, DollarSign, SquareCheck, Download, FileSpreadsheet, ShieldCheck
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

const ITEMS_PER_PAGE = 10;

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
  const [aprovacaoFilter, setAprovacaoFilter] = useState<"all" | "pendente" | "aprovado" | "reprovado">("all");
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
  const [currentPage, setCurrentPage] = useState(1);
  const [deferimentoCounts, setDeferimentoCounts] = useState({ pendente: 0, recusado: 0, recebido: 0 });
  
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
    
    let query = supabase
      .from("solicitacoes")
      .select("*")
      .order("created_at", { ascending: false });
    
    // Always load data now - filters work on the table only
    const { data, error } = await query.limit(500);

    if (error) {
      toast.error("Erro ao carregar solicitações.");
    } else {
      setSolicitacoes(data || []);
    }
    setLoading(false);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, tipoServicoFilter, lancamentoFilter, aprovacaoFilter, searchTerm]);

  const fetchDeferimentoCounts = useCallback(async () => {
    // Get Posicionamento solicitacao IDs first
    const { data: posSolicitacoes } = await supabase
      .from("solicitacoes")
      .select("id")
      .ilike("tipo_operacao", "%posicionamento%");
    
    if (!posSolicitacoes || posSolicitacoes.length === 0) {
      setDeferimentoCounts({ pendente: 0, recusado: 0, recebido: 0 });
      return;
    }

    const posIds = posSolicitacoes.map(s => s.id);
    
    const { data: docs } = await supabase
      .from("deferimento_documents")
      .select("status, solicitacao_id")
      .eq("document_type", "deferimento")
      .in("solicitacao_id", posIds);
    
    if (docs) {
      const pendente = docs.filter(d => !d.status || d.status === "pendente").length;
      const recusado = docs.filter(d => d.status === "recusado").length;
      const recebido = docs.filter(d => d.status === "aceito").length;
      setDeferimentoCounts({ pendente, recusado, recebido });
    }
  }, []);

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
      fetchDeferimentoCounts();
    }
  }, [user, fetchProfile, fetchSolicitacoes, fetchUnread, fetchServicos, fetchDeferimentoCounts]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/interno");
  };

  useEffect(() => {
    const isAdminEmail = profile?.email === "admin@jbsterminais.com.br";
    if (isAdmin || isAdminEmail) {
      setShowSetorSelector(false);
      return;
    }
    
    if (profile && !profile.setor && !profile.email_setor && profile.email?.endsWith("@jbsterminais.com.br")) {
      setShowSetorSelector(true);
    } else {
      setShowSetorSelector(false);
    }
  }, [profile, isAdmin]);

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

  // Dashboard counts use ALL solicitacoes (filtered by service for dashboard only)
  const dashboardFiltered = solicitacoes.filter((s) => {
    return tipoServicoFilter === "Todos" || s.tipo_operacao === tipoServicoFilter;
  });

  // Table filters (separate from dashboard)
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

    // Filtro de aprovação
    let matchesAprovacao = true;
    if (aprovacaoFilter !== "all") {
      if (aprovacaoFilter === "pendente") {
        matchesAprovacao = s.comex_aprovado === null || s.armazem_aprovado === null;
      } else if (aprovacaoFilter === "aprovado") {
        matchesAprovacao = s.comex_aprovado === true && s.armazem_aprovado === true;
      } else if (aprovacaoFilter === "reprovado") {
        matchesAprovacao = s.comex_aprovado === false || s.armazem_aprovado === false;
      }
    }
    
    return matchesStatus && matchesTipo && matchesSearch && matchesLancamento && matchesAprovacao;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedFiltered = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Dashboard counts use dashboardFiltered (only service filter applies)
  const dashboardStatusCounts = dashboardFiltered.reduce((acc: Record<string, number>, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  // Group by date for weekly view
  const getCountForDay = (day: Date, status?: string) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return dashboardFiltered.filter(s => {
      const matches = s.data_posicionamento === dayStr;
      if (status) {
        return matches && s.status === status;
      }
      return matches;
    }).length;
  };

  const tipoServicosOptions = ["Todos", ...servicos.map(s => s.nome)];

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

  const hasOperacionalProfile = userPerfis.includes("OPERACIONAL") || profile?.setor === "ARMAZEM" || isAdmin;

  const selectedForBatchApproval = filtered.filter(s => 
    selectedIds.includes(s.id) && 
    s.status === "aguardando_confirmacao" && 
    s.armazem_aprovado === null
  );

  const selectedForBatchStatus = filtered.filter(s => 
    selectedIds.includes(s.id) && 
    (s.status === "confirmado_aguardando_vistoria" || s.comex_aprovado || s.armazem_aprovado)
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedFiltered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedFiltered.map(s => s.id));
    }
  };

  // Launch counters - always use dashboardFiltered (service filter only)
  const lancamentoPendente = dashboardFiltered.filter(s => {
    const servico = servicos.find(sv => sv.nome === s.tipo_operacao);
    if (!servico?.status_confirmacao_lancamento?.length) return false;
    return servico.status_confirmacao_lancamento.includes(s.status) && !s.lancamento_confirmado;
  }).length;

  const lancamentoConfirmado = dashboardFiltered.filter(s => {
    const servico = servicos.find(sv => sv.nome === s.tipo_operacao);
    if (!servico?.status_confirmacao_lancamento?.length) return false;
    return servico.status_confirmacao_lancamento.includes(s.status) && s.lancamento_confirmado === true;
  }).length;

  const needsLaunchConfirmation = (s: any) => {
    const servico = servicos.find(sv => sv.nome === s.tipo_operacao);
    if (!servico?.status_confirmacao_lancamento?.length) return false;
    return servico.status_confirmacao_lancamento.includes(s.status);
  };

  // Check if deferimento button should be active
  const isDeferimentoActive = (s: any) => {
    return s.status === "vistoria_finalizada" && 
      (s.tipo_operacao || "").toLowerCase().includes("posicionamento") &&
      (s.categoria || "").toLowerCase() === "exportação";
  };

  // Status vistoria color
  const getVistoriaStatusColor = (status: string | null) => {
    if (!status) return "";
    const lower = status.toLowerCase();
    if (lower.includes("finalizada")) return "text-green-600";
    if (lower.includes("pendência")) return "text-yellow-600";
    if (lower.includes("não vistoriado")) return "text-red-600";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="jbs-header sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
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
            
            {!isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/interno/admin/logs")} className="text-primary-foreground hover:bg-primary-foreground/10">
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
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-primary-foreground hover:bg-primary-foreground/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
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

        {/* Stats Cards - dashboard counts (service filter only) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            label={tipoServicoFilter === "Todos" ? "Total" : tipoServicoFilter} 
            value={dashboardFiltered.length} 
            icon={<ClipboardList className="h-5 w-5" />} 
          />
          <StatCard label="Aguardando" value={dashboardStatusCounts["aguardando_confirmacao"] || 0} icon={<Clock className="h-5 w-5" />} color="text-yellow-600" />
          <StatCard label="Confirmados" value={dashboardStatusCounts["confirmado_aguardando_vistoria"] || 0} icon={<CheckCircle2 className="h-5 w-5" />} color="text-blue-600" />
          <StatCard label="Recusados" value={dashboardStatusCounts["recusado"] || 0} icon={<XCircle className="h-5 w-5" />} color="text-destructive" />
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

        {/* Deferimento Counters - for Posicionamento */}
        {(tipoServicoFilter === "Todos" || tipoServicoFilter.toLowerCase().includes("posicionamento")) && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard 
              label="Def. Pendente" 
              value={deferimentoCounts.pendente} 
              icon={<Clock className="h-5 w-5" />} 
              color="text-yellow-600" 
            />
            <StatCard 
              label="Def. Recusado" 
              value={deferimentoCounts.recusado} 
              icon={<XCircle className="h-5 w-5" />} 
              color="text-destructive" 
            />
            <StatCard 
              label="Def. Recebido" 
              value={deferimentoCounts.recebido} 
              icon={<CheckCircle2 className="h-5 w-5" />} 
              color="text-green-600" 
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
              {label}: {dashboardStatusCounts[key] || 0}
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
              <Select value={aprovacaoFilter} onValueChange={(v) => setAprovacaoFilter(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Aprovação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pendente">Aprovação Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="reprovado">Reprovado</SelectItem>
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
                        checked={selectedIds.length === paginatedFiltered.length && paginatedFiltered.length > 0}
                        onCheckedChange={() => toggleSelectAll()}
                        className="bg-white data-[state=checked]:bg-white data-[state=checked]:text-primary border-primary"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-primary-foreground w-[130px]">Ações</TableHead>
                  <TableHead className="text-primary-foreground w-[50px]">$</TableHead>
                  <TableHead className="text-primary-foreground">Protocolo</TableHead>
                  <TableHead className="text-primary-foreground">Serviço Adicional</TableHead>
                  <TableHead className="text-primary-foreground">Data Serviço</TableHead>
                  <TableHead className="text-primary-foreground">Contêiner</TableHead>
                  <TableHead className="text-primary-foreground">Tipo Carga</TableHead>
                  <TableHead className="text-primary-foreground">Cliente</TableHead>
                  <TableHead className="text-primary-foreground">Status</TableHead>
                  <TableHead className="text-primary-foreground">Vistoria</TableHead>
                  <TableHead className="text-primary-foreground">Administrativa</TableHead>
                  <TableHead className="text-primary-foreground">Operacional</TableHead>
                  <TableHead className="text-primary-foreground">Data Solic.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-12 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : paginatedFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-12 text-muted-foreground">
                      Nenhuma solicitação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedFiltered.map((s) => (
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
                          {/* Deferimento button - between reclassificação and download */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => isDeferimentoActive(s) ? setDeferimentoSolicitacao(s) : null}
                            title="Deferimento"
                            disabled={!isDeferimentoActive(s)}
                            className={isDeferimentoActive(s) ? "text-blue-600 hover:text-blue-700" : "text-muted-foreground/40"}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
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
                        <span className={`text-xs font-medium ${getVistoriaStatusColor(s.status_vistoria)}`}>
                          {s.status_vistoria || "—"}
                        </span>
                      </TableCell>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {filtered.length} resultado(s) · Página {currentPage} de {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Análise Dialog */}
      {selectedSolicitacao && profile && user && (
        <AnaliseDialog
          solicitacao={selectedSolicitacao}
          profile={{
            ...profile,
            setor: profile.setor === "COMEX" ? "COMEX" : profile.setor === "ARMAZEM" ? "ARMAZEM" : profile.setor,
            perfis: userPerfis
          }}
          userId={user.id}
          isAdmin={isAdmin}
          onClose={() => {
            setSelectedSolicitacao(null);
            fetchSolicitacoes();
            fetchDeferimentoCounts();
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
            fetchDeferimentoCounts();
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
