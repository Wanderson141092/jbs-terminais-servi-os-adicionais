import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LogOut, Bell, ClipboardList, CheckCircle2, XCircle, Clock,
  Eye, Filter, Search, ChevronLeft, ChevronRight, Settings, Users,
  Building2, FileText, Link2, Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import StatusBadge, { STATUS_LABELS } from "@/components/StatusBadge";
import SetorSelector from "@/components/SetorSelector";
import AnaliseDialog from "@/components/AnaliseDialog";
import NotificationsPanel from "@/components/NotificationsPanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User, Session } from "@supabase/supabase-js";
import jbsLogo from "@/assets/jbs-terminais-logo.png";
import { startOfWeek, addDays, format, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAdminCheck } from "@/hooks/useAdminCheck";

interface Servico {
  id: string;
  nome: string;
  codigo_prefixo: string;
  ativo: boolean;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [servicos, setServicos] = useState<Servico[]>([]);
  
  const { isAdmin } = useAdminCheck(user?.id || null);

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
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(data);
  }, [user]);

  const fetchServicos = useCallback(async () => {
    const { data } = await supabase
      .from("servicos")
      .select("*")
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
    
    // If no specific filters, exclude finalized by default
    if (statusFilter === "all") {
      query = query.not("status", "in", '("vistoria_finalizada")');
    }

    const { data, error } = await query.limit(200);

    if (error) {
      toast.error("Erro ao carregar solicitações.");
    } else {
      setSolicitacoes(data || []);
    }
    setLoading(false);
  }, [statusFilter]);

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

  // Admin bypasses setor requirement
  if (!profile?.setor && !isAdmin && user) {
    return <SetorSelector userId={user.id} onComplete={fetchProfile} />;
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
    return matchesStatus && matchesTipo && matchesSearch;
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
                {profile?.nome} · {isAdmin ? "Admin" : profile?.setor}
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/interno/admin/logs")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Histórico (Logs)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/interno/admin/integracoes")}>
                    <Link2 className="h-4 w-4 mr-2" />
                    Integrações
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
                  <p className="text-[10px] text-muted-foreground">pedidos</p>
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
                <SelectTrigger className="w-[220px]">
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
              <Button variant="outline" size="sm" onClick={fetchSolicitacoes}>
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-primary text-primary-foreground">
                  <TableHead className="text-primary-foreground">Protocolo</TableHead>
                  <TableHead className="text-primary-foreground">Cliente</TableHead>
                  <TableHead className="text-primary-foreground">Contêiner</TableHead>
                  <TableHead className="text-primary-foreground">Status</TableHead>
                  <TableHead className="text-primary-foreground">COMEX</TableHead>
                  <TableHead className="text-primary-foreground">Armazém</TableHead>
                  <TableHead className="text-primary-foreground">Data</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      Nenhuma solicitação encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm font-medium">{s.protocolo}</TableCell>
                      <TableCell className="text-sm">{s.cliente_nome}</TableCell>
                      <TableCell className="text-sm font-mono">{s.numero_conteiner || "—"}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell>
                        <ApprovalIndicator approved={s.comex_aprovado} />
                      </TableCell>
                      <TableCell>
                        <ApprovalIndicator approved={s.armazem_aprovado} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSolicitacao(s)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Analysis Dialog */}
        {selectedSolicitacao && profile && (
          <AnaliseDialog
            solicitacao={selectedSolicitacao}
            profile={profile}
            userId={user!.id}
            isAdmin={isAdmin}
            onClose={() => {
              setSelectedSolicitacao(null);
              fetchSolicitacoes();
            }}
          />
        )}
      </main>
    </div>
  );
};

const StatCard = ({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color?: string }) => (
  <Card className="border-0 shadow-sm">
    <CardContent className="py-4 flex items-center gap-3">
      <span className={color || "text-muted-foreground"}>{icon}</span>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const ApprovalIndicator = ({ approved }: { approved: boolean | null }) => {
  if (approved === null || approved === undefined) {
    return <span className="text-xs text-muted-foreground">Pendente</span>;
  }
  return approved ? (
    <CheckCircle2 className="h-4 w-4 text-secondary" />
  ) : (
    <XCircle className="h-4 w-4 text-destructive" />
  );
};

export default InternoDashboard;
