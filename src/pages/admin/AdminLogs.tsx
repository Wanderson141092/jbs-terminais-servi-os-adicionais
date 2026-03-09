import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, ArrowLeft, Download, Search, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRoleCheck } from "@/hooks/useRoleCheck";

interface AuditLog {
  id: string;
  acao: string;
  detalhes: string | null;
  created_at: string;
  solicitacao_id: string;
  usuario_id: string;
  entidade: string | null;
  entidade_id: string | null;
}

const AdminLogs = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { isAdmin: isCurrentUserAdmin, loading: roleLoading } = useRoleCheck(currentUserId);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAcao, setFilterAcao] = useState("all");
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/interno");
        return;
      }
      setCurrentUserId(session.user.id);
    });
  }, [navigate]);

  useEffect(() => {
    fetchLogs();
    fetchProfiles();
  }, []);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      toast.error("Erro ao carregar logs");
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  };

  const fetchProfiles = async () => {
    const { data } = await (supabase.from("profiles_v" as any).select("id, nome, email") as any);
    if (data) {
      const map: Record<string, string> = {};
      (data as any[]).forEach((p: any) => { map[p.id] = p.nome || p.email; });
      setProfiles(map);
    }
  };

  const getUniqueActions = () => {
    const actions = [...new Set(logs.map(l => l.acao))];
    return actions.sort();
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.acao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.detalhes || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.solicitacao_id.includes(searchTerm);
    
    const matchesFilter = filterAcao === "all" || log.acao === filterAcao;
    
    return matchesSearch && matchesFilter;
  });

  const exportToCSV = () => {
    const headers = ["Data/Hora", "Ação", "Usuário", "Solicitação", "Detalhes"];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
      log.acao,
      profiles[log.usuario_id] || log.usuario_id,
      log.solicitacao_id,
      log.detalhes || ""
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `logs_${format(new Date(), "yyyy-MM-dd_HHmm")}.csv`;
    link.click();
  };

  const exportToJSON = () => {
    const data = filteredLogs.map(log => ({
      dataHora: format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss"),
      acao: log.acao,
      usuario: profiles[log.usuario_id] || log.usuario_id,
      solicitacao: log.solicitacao_id,
      detalhes: log.detalhes
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `logs_${format(new Date(), "yyyy-MM-dd_HHmm")}.json`;
    link.click();
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
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Histórico de Registros</h1>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" onClick={exportToJSON}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ação, detalhes ou ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 bg-muted/50"
              />
            </div>
            <Select value={filterAcao} onValueChange={setFilterAcao}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {getUniqueActions().map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros ({filteredLogs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[600px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Solicitação</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{log.acao}</TableCell>
                    <TableCell className="text-sm">
                      {profiles[log.usuario_id] || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.solicitacao_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {log.detalhes || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 w-7 p-0"
                        title="Ver detalhes"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Log */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes do Registro
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-[120px_1fr] gap-y-2 gap-x-3">
                <span className="font-semibold text-muted-foreground">Data/Hora:</span>
                <span>{format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</span>
                
                <span className="font-semibold text-muted-foreground">Ação:</span>
                <span className="font-medium">{selectedLog.acao}</span>
                
                <span className="font-semibold text-muted-foreground">Usuário:</span>
                <span>{profiles[selectedLog.usuario_id] || "—"}</span>
                
                <span className="font-semibold text-muted-foreground">ID Usuário:</span>
                <span className="font-mono text-xs break-all">{selectedLog.usuario_id}</span>
                
                <span className="font-semibold text-muted-foreground">Solicitação:</span>
                <span className="font-mono text-xs break-all">{selectedLog.solicitacao_id}</span>

                {selectedLog.entidade && (
                  <>
                    <span className="font-semibold text-muted-foreground">Entidade:</span>
                    <span>{selectedLog.entidade}</span>
                  </>
                )}

                {selectedLog.entidade_id && (
                  <>
                    <span className="font-semibold text-muted-foreground">ID Entidade:</span>
                    <span className="font-mono text-xs break-all">{selectedLog.entidade_id}</span>
                  </>
                )}
              </div>

              {selectedLog.detalhes && (
                <div className="border-t pt-3 mt-3">
                  <p className="font-semibold text-muted-foreground mb-1">Detalhes:</p>
                  <div className="bg-muted/50 rounded-lg p-3 whitespace-pre-wrap break-words text-foreground">
                    {selectedLog.detalhes}
                  </div>
                </div>
              )}

              <div className="border-t pt-3 mt-3">
                <p className="font-semibold text-muted-foreground mb-1">ID do Registro:</p>
                <span className="font-mono text-xs text-muted-foreground">{selectedLog.id}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLog(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLogs;
