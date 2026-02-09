import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Settings, ArrowLeft, Plus, Edit, Trash2, Clock, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
    const [regrasRes, servicosRes, protocolRes] = await Promise.all([
      supabase.from("regras_servico").select("*").order("created_at"),
      supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("protocol_config").select("*").limit(1).single()
    ]);

    if (regrasRes.data) setRegras(regrasRes.data);
    if (servicosRes.data) setServicos(servicosRes.data);
    if (protocolRes.data) setProtocolConfig(protocolRes.data);
    
    setLoading(false);
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

      <Tabs defaultValue="regras" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="regras" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Regras de Negócio
          </TabsTrigger>
          <TabsTrigger value="protocolo" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Protocolo
          </TabsTrigger>
        </TabsList>

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
                    <TableHead>Limite/Dia</TableHead>
                    <TableHead>Dias Operação</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regras.map((regra) => (
                    <TableRow key={regra.id}>
                      <TableCell className="font-medium">{getServicoNome(regra.servico_id)}</TableCell>
                      <TableCell>{regra.hora_corte}</TableCell>
                      <TableCell>{regra.limite_dia || "Sem limite"}</TableCell>
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
                                  O sistema aplicará as configurações padrão.
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
                  ))}
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

          {/* Dialog para Regra */}
          <Dialog open={showRegraDialog} onOpenChange={setShowRegraDialog}>
            <DialogContent className="max-w-lg">
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
                  <div>
                    <Label>Limite por Dia</Label>
                    <Input
                      type="number"
                      value={regraFormData.limite_dia}
                      onChange={(e) => setRegraFormData(prev => ({ ...prev, limite_dia: e.target.value }))}
                      placeholder="Sem limite"
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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="aplica_dia_anterior"
                    checked={regraFormData.aplica_dia_anterior}
                    onCheckedChange={(c) => setRegraFormData(prev => ({ ...prev, aplica_dia_anterior: !!c }))}
                  />
                  <Label htmlFor="aplica_dia_anterior">
                    Aplicar regra ao dia anterior (pedidos após hora de corte contam para o próximo dia)
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
                      Exemplo: {protocolConfig.prefixo}A000001 (prefixo + letra do serviço + número)
                    </p>
                  </div>
                  <div>
                    <Label>Último Número Gerado</Label>
                    <Input
                      value={protocolConfig.ultimo_numero}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Este campo é atualizado automaticamente
                    </p>
                  </div>
                  <Button onClick={saveProtocolConfig} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Salvando..." : "Salvar Configuração"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminParametros;
