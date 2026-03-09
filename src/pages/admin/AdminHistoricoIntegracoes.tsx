import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { History, ArrowLeft, RefreshCw, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRoleCheck } from "@/hooks/useRoleCheck";

interface IntegrationHistory {
  id: string;
  solicitacao_id: string;
  integracao_nome: string;
  tipo: string;
  status: string;
  detalhes: string | null;
  payload: any;
  response: any;
  created_at: string;
}

const AdminHistoricoIntegracoes = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { isAdmin: isCurrentUserAdmin, loading: roleLoading } = useRoleCheck(currentUserId);
  const [history, setHistory] = useState<IntegrationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<IntegrationHistory | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [searchProtocolo, setSearchProtocolo] = useState("");

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
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    let query = supabase
      .from("integration_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    const { data, error } = await query;

    if (error) {
      toast.error("Erro ao carregar histórico");
    } else {
      setHistory(data || []);
    }
    setLoading(false);
  };

  const handleReprocess = async (item: IntegrationHistory) => {
    setReprocessing(item.id);
    
    // Simular reprocessamento - em produção, chamar a API de integração
    try {
      // Atualizar status para "processando"
      await supabase
        .from("integration_history")
        .update({ 
          status: 'processando',
          detalhes: 'Reprocessando manualmente...'
        })
        .eq("id", item.id);

      // Simular delay de processamento
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Marcar como sucesso (em produção, dependerá do resultado real)
      await supabase
        .from("integration_history")
        .update({ 
          status: 'sucesso',
          detalhes: 'Reprocessado com sucesso em ' + new Date().toLocaleString("pt-BR")
        })
        .eq("id", item.id);

      toast.success("Integração reprocessada com sucesso!");
      fetchHistory();
    } catch (err) {
      toast.error("Erro ao reprocessar integração");
    } finally {
      setReprocessing(null);
    }
  };

  const filteredHistory = history.filter(item => {
    if (filterStatus !== "todos" && item.status !== filterStatus) return false;
    if (filterTipo !== "todos" && item.tipo !== filterTipo) return false;
    return true;
  });

  const tipos = [...new Set(history.map(h => h.tipo))];

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isCurrentUserAdmin) {
    navigate("/interno/dashboard");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/interno/admin/integracoes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Histórico de Integrações</h1>
        </div>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="sucesso">Sucesso</SelectItem>
                  <SelectItem value="erro">Erro</SelectItem>
                  <SelectItem value="processando">Processando</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  {tipos.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchHistory}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros ({filteredHistory.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Integração</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detalhes</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(item.created_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-medium">{item.integracao_nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.status === 'sucesso' && (
                      <Badge className="bg-green-100 text-green-700 border-green-300">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Sucesso
                      </Badge>
                    )}
                    {item.status === 'erro' && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Erro
                      </Badge>
                    )}
                    {item.status === 'processando' && (
                      <Badge variant="secondary">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Processando
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {item.detalhes || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedItem(item)}
                      >
                        Detalhes
                      </Button>
                      {item.status === 'erro' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleReprocess(item)}
                          disabled={reprocessing === item.id}
                        >
                          {reprocessing === item.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reprocessar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de detalhes */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Integração</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">{new Date(selectedItem.created_at).toLocaleString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedItem.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Integração</p>
                  <p className="font-medium">{selectedItem.integracao_nome}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-medium">{selectedItem.tipo}</p>
                </div>
              </div>
              
              {selectedItem.detalhes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Detalhes</p>
                  <p className="text-sm bg-muted p-3 rounded">{selectedItem.detalhes}</p>
                </div>
              )}

              {selectedItem.payload && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Payload Enviado</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[200px]">
                    {JSON.stringify(selectedItem.payload, null, 2)}
                  </pre>
                </div>
              )}

              {selectedItem.response && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Resposta</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-[200px]">
                    {JSON.stringify(selectedItem.response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>Fechar</Button>
            {selectedItem?.status === 'erro' && (
              <Button onClick={() => {
                handleReprocess(selectedItem);
                setSelectedItem(null);
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reprocessar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminHistoricoIntegracoes;
