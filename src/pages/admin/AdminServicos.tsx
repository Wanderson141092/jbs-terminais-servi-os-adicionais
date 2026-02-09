import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ClipboardList, ArrowLeft, Plus, Save, Edit, Trash2, Calendar, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Servico {
  id: string;
  nome: string;
  codigo_prefixo: string;
  descricao: string | null;
  ativo: boolean;
  tipo_agendamento: string | null;
  anexos_embutidos: boolean | null;
  status_confirmacao_lancamento?: string[];
}

const STATUS_OPTIONS = [
  { value: "confirmado_aguardando_vistoria", label: "Confirmado - Aguardando Vistoria" },
  { value: "vistoria_finalizada", label: "Vistoria Finalizada" },
  { value: "vistoriado_com_pendencia", label: "Vistoriado com Pendência" },
  { value: "nao_vistoriado", label: "Não Vistoriado" },
];

const AdminServicos = () => {
  const navigate = useNavigate();
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingServico, setEditingServico] = useState<Servico | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    codigo_prefixo: "",
    descricao: "",
    tipo_agendamento: "none",
    anexos_embutidos: true,
    status_confirmacao_lancamento: [] as string[]
  });

  useEffect(() => {
    fetchServicos();
  }, []);

  const fetchServicos = async () => {
    const { data, error } = await supabase
      .from("servicos")
      .select("*")
      .order("nome");

    if (error) {
      toast.error("Erro ao carregar serviços");
    } else {
      setServicos(data || []);
    }
    setLoading(false);
  };

  const checkHasRecords = async (servicoNome: string): Promise<boolean> => {
    const { count } = await supabase
      .from("solicitacoes")
      .select("*", { count: "exact", head: true })
      .eq("tipo_operacao", servicoNome);
    
    return (count || 0) > 0;
  };

  const handleToggleActive = async (servico: Servico) => {
    const { error } = await supabase
      .from("servicos")
      .update({ ativo: !servico.ativo, updated_at: new Date().toISOString() })
      .eq("id", servico.id);

    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }

    toast.success(servico.ativo ? "Serviço desativado" : "Serviço ativado");
    fetchServicos();
  };

  const handleToggleAnexos = async (servico: Servico) => {
    const { error } = await supabase
      .from("servicos")
      .update({ 
        anexos_embutidos: !servico.anexos_embutidos, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", servico.id);

    if (error) {
      toast.error("Erro ao atualizar visualização de anexos");
      return;
    }

    toast.success(servico.anexos_embutidos ? "Anexos: Botão visualizar" : "Anexos: Embutidos na tela");
    fetchServicos();
  };

  const handleDelete = async (servico: Servico) => {
    const hasRecords = await checkHasRecords(servico.nome);
    
    if (hasRecords) {
      toast.error("Este serviço possui registros. Apenas desative-o.");
      return;
    }

    const { error } = await supabase
      .from("servicos")
      .delete()
      .eq("id", servico.id);

    if (error) {
      toast.error("Erro ao excluir serviço");
      return;
    }

    toast.success("Serviço excluído!");
    fetchServicos();
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.codigo_prefixo) {
      toast.error("Nome e código são obrigatórios");
      return;
    }

    if (formData.codigo_prefixo.length !== 1) {
      toast.error("Código prefixo deve ter apenas 1 caractere");
      return;
    }

    const tipoAgendamento = formData.tipo_agendamento === "none" ? null : formData.tipo_agendamento;

    if (editingServico) {
      const { error } = await supabase
        .from("servicos")
        .update({
          nome: formData.nome,
          codigo_prefixo: formData.codigo_prefixo.toUpperCase(),
          descricao: formData.descricao || null,
          tipo_agendamento: tipoAgendamento,
          anexos_embutidos: formData.anexos_embutidos,
          status_confirmacao_lancamento: formData.status_confirmacao_lancamento,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingServico.id);

      if (error) {
        toast.error("Erro ao atualizar serviço");
        return;
      }
      toast.success("Serviço atualizado!");
    } else {
      const { error } = await supabase
        .from("servicos")
        .insert({
          nome: formData.nome,
          codigo_prefixo: formData.codigo_prefixo.toUpperCase(),
          descricao: formData.descricao || null,
          tipo_agendamento: tipoAgendamento,
          anexos_embutidos: formData.anexos_embutidos,
          status_confirmacao_lancamento: formData.status_confirmacao_lancamento
        });

      if (error) {
        toast.error("Erro ao adicionar serviço");
        return;
      }
      toast.success("Serviço adicionado!");
    }

    setShowDialog(false);
    setEditingServico(null);
    setFormData({ 
      nome: "", 
      codigo_prefixo: "", 
      descricao: "", 
      tipo_agendamento: "none",
      anexos_embutidos: true,
      status_confirmacao_lancamento: []
    });
    fetchServicos();
  };

  const openEditDialog = (servico: Servico) => {
    setEditingServico(servico);
    setFormData({
      nome: servico.nome,
      codigo_prefixo: servico.codigo_prefixo,
      descricao: servico.descricao || "",
      tipo_agendamento: servico.tipo_agendamento || "none",
      anexos_embutidos: servico.anexos_embutidos ?? true,
      status_confirmacao_lancamento: servico.status_confirmacao_lancamento || []
    });
    setShowDialog(true);
  };

  const toggleStatusConfirmacao = (status: string) => {
    setFormData(prev => ({
      ...prev,
      status_confirmacao_lancamento: prev.status_confirmacao_lancamento.includes(status)
        ? prev.status_confirmacao_lancamento.filter(s => s !== status)
        : [...prev.status_confirmacao_lancamento, status]
    }));
  };

  const getAgendamentoLabel = (tipo: string | null) => {
    if (!tipo) return "—";
    if (tipo === "data") return "Data (DD/MM/AAAA)";
    if (tipo === "data_horario") return "Data e Horário";
    return "—";
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
            <ClipboardList className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Gerenciar Serviços</h1>
          </div>
        </div>

        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setEditingServico(null);
            setFormData({ 
              nome: "", 
              codigo_prefixo: "", 
              descricao: "",
              tipo_agendamento: "none",
              anexos_embutidos: true,
              status_confirmacao_lancamento: []
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingServico ? "Editar Serviço" : "Adicionar Serviço"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <Label>Nome do Serviço</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Posicionamento"
                />
              </div>
              <div>
                <Label>Código Prefixo (1 letra)</Label>
                <Input
                  value={formData.codigo_prefixo}
                  onChange={(e) => setFormData({ ...formData, codigo_prefixo: e.target.value.slice(0, 1).toUpperCase() })}
                  placeholder="P"
                  maxLength={1}
                  className="w-20"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Usado no protocolo: JBS{formData.codigo_prefixo || "X"}000001
                </p>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição do serviço"
                />
              </div>

              <div className="border-t pt-4">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Agendamento
                </Label>
                <Select 
                  value={formData.tipo_agendamento} 
                  onValueChange={(v) => setFormData({ ...formData, tipo_agendamento: v })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Tipo de agendamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não (usar data de solicitação)</SelectItem>
                    <SelectItem value="data">Sim - Somente Data (DD/MM/AAAA)</SelectItem>
                    <SelectItem value="data_horario">Sim - Data e Horário (DD/MM/AAAA - hh:mm)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.tipo_agendamento === "none" && "Processos usarão a coluna 'Data Solicitação'"}
                  {formData.tipo_agendamento === "data" && "Posicionamento: usa campo 'Data Posicionamento'"}
                  {formData.tipo_agendamento === "data_horario" && "Agendamentos: usa campo 'Data Agendamento' com hora"}
                </p>
              </div>

              <div className="border-t pt-4">
                <Label className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Visualização de Anexos
                </Label>
                <div className="flex items-center gap-3 mt-2">
                  <Switch
                    checked={formData.anexos_embutidos}
                    onCheckedChange={(c) => setFormData({ ...formData, anexos_embutidos: c })}
                  />
                  <span className="text-sm">
                    {formData.anexos_embutidos ? "Anexos embutidos na tela" : "Botão para visualizar"}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label>Status para Confirmação de Lançamento ($)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione os status que acionam o alerta de lançamento pendente
                </p>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map(opt => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={opt.value}
                        checked={formData.status_confirmacao_lancamento.includes(opt.value)}
                        onCheckedChange={() => toggleStatusConfirmacao(opt.value)}
                      />
                      <Label htmlFor={opt.value} className="cursor-pointer text-sm">{opt.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {editingServico ? "Salvar Alterações" : "Adicionar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serviços Cadastrados ({servicos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Prefixo</TableHead>
                <TableHead>Agendamento</TableHead>
                <TableHead>Anexos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicos.map((servico) => (
                <TableRow key={servico.id} className={!servico.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{servico.nome}</TableCell>
                  <TableCell className="font-mono">{servico.codigo_prefixo}</TableCell>
                  <TableCell>
                    {servico.tipo_agendamento ? (
                      <Badge variant="outline" className="text-xs">
                        {getAgendamentoLabel(servico.tipo_agendamento)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleToggleAnexos(servico)}
                      title={servico.anexos_embutidos ? "Clique para: Botão visualizar" : "Clique para: Embutido"}
                    >
                      <Eye className={`h-4 w-4 ${servico.anexos_embutidos ? "text-primary" : "text-muted-foreground"}`} />
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={servico.ativo}
                      onCheckedChange={() => handleToggleActive(servico)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(servico)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(servico)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

export default AdminServicos;