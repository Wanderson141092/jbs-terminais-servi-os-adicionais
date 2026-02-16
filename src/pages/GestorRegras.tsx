import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save, Edit, Trash2, Clock, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import jbsLogo from "@/assets/jbs-terminais-logo.png";

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
}

interface Servico {
  id: string;
  nome: string;
}

const DIAS_SEMANA = [
  { key: "seg", label: "Seg" },
  { key: "ter", label: "Ter" },
  { key: "qua", label: "Qua" },
  { key: "qui", label: "Qui" },
  { key: "sex", label: "Sex" },
  { key: "sab", label: "Sáb" },
];

const GestorRegras = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regras, setRegras] = useState<RegraServico[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [allowedServiceIds, setAllowedServiceIds] = useState<string[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRegra, setEditingRegra] = useState<RegraServico | null>(null);
  const [formData, setFormData] = useState({
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
    recusar_apos_corte: false,
    agendar_proximo_dia: false,
  });

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/interno"); return; }

    // Get user's setor_email to find linked services
    const { data: profile } = await supabase
      .from("profiles")
      .select("email_setor")
      .eq("id", user.id)
      .single();

    if (!profile?.email_setor) {
      toast.error("Perfil sem setor vinculado");
      navigate("/interno/dashboard");
      return;
    }

    // Get setor_email record
    const { data: setorEmail } = await supabase
      .from("setor_emails")
      .select("id, perfis")
      .eq("email_setor", profile.email_setor)
      .eq("ativo", true)
      .single();

    if (!setorEmail || !setorEmail.perfis?.includes("GESTOR")) {
      toast.error("Você não tem permissão de Gestor");
      navigate("/interno/dashboard");
      return;
    }

    // Get services linked to this setor
    const { data: setorServicos } = await supabase
      .from("setor_servicos")
      .select("servico_id")
      .eq("setor_email_id", setorEmail.id);

    const linkedServiceIds = (setorServicos || []).map(ss => ss.servico_id);
    setAllowedServiceIds(linkedServiceIds);

    if (linkedServiceIds.length === 0) {
      setServicos([]);
      setRegras([]);
      setLoading(false);
      return;
    }

    // Fetch services and rules
    const [servicosRes, regrasRes] = await Promise.all([
      supabase.from("servicos").select("id, nome").eq("ativo", true).in("id", linkedServiceIds).order("nome"),
      supabase.from("regras_servico").select("*").in("servico_id", linkedServiceIds).order("created_at"),
    ]);

    setServicos(servicosRes.data || []);
    setRegras(regrasRes.data || []);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openDialog = (regra?: RegraServico) => {
    if (regra) {
      let tipoLimite: "nenhum" | "fixo" | "por_dia" = "nenhum";
      if (regra.limite_dia) tipoLimite = "fixo";
      else if (regra.limite_seg || regra.limite_ter || regra.limite_qua || regra.limite_qui || regra.limite_sex || regra.limite_sab) tipoLimite = "por_dia";

      setEditingRegra(regra);
      setFormData({
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
        recusar_apos_corte: regra.recusar_apos_corte,
        agendar_proximo_dia: regra.agendar_proximo_dia,
      });
    } else {
      setEditingRegra(null);
      setFormData({
        servico_id: "",
        hora_corte: "17:00",
        tipo_limite: "nenhum",
        limite_dia: "",
        dias_semana: ["seg", "ter", "qua", "qui", "sex"],
        limite_seg: "", limite_ter: "", limite_qua: "", limite_qui: "", limite_sex: "", limite_sab: "",
        aplica_dia_anterior: false,
        recusar_apos_corte: false,
        agendar_proximo_dia: false,
      });
    }
    setShowDialog(true);
  };

  const toggleDia = (dia: string) => {
    setFormData(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(dia) ? prev.dias_semana.filter(d => d !== dia) : [...prev.dias_semana, dia],
    }));
  };

  const saveRegra = async () => {
    if (!formData.servico_id) { toast.error("Selecione um serviço"); return; }
    if (!allowedServiceIds.includes(formData.servico_id)) { toast.error("Serviço não permitido"); return; }

    const data = {
      servico_id: formData.servico_id,
      hora_corte: formData.hora_corte,
      limite_dia: formData.tipo_limite === "fixo" && formData.limite_dia ? parseInt(formData.limite_dia) : null,
      dias_semana: formData.dias_semana,
      limite_seg: formData.tipo_limite === "por_dia" && formData.limite_seg ? parseInt(formData.limite_seg) : null,
      limite_ter: formData.tipo_limite === "por_dia" && formData.limite_ter ? parseInt(formData.limite_ter) : null,
      limite_qua: formData.tipo_limite === "por_dia" && formData.limite_qua ? parseInt(formData.limite_qua) : null,
      limite_qui: formData.tipo_limite === "por_dia" && formData.limite_qui ? parseInt(formData.limite_qui) : null,
      limite_sex: formData.tipo_limite === "por_dia" && formData.limite_sex ? parseInt(formData.limite_sex) : null,
      limite_sab: formData.tipo_limite === "por_dia" && formData.limite_sab ? parseInt(formData.limite_sab) : null,
      aplica_dia_anterior: formData.aplica_dia_anterior,
      recusar_apos_corte: formData.recusar_apos_corte,
      agendar_proximo_dia: formData.agendar_proximo_dia,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    if (editingRegra) {
      const { error } = await supabase.from("regras_servico").update(data).eq("id", editingRegra.id);
      if (error) { toast.error("Erro ao atualizar regra"); setSaving(false); return; }
      toast.success("Regra atualizada!");
    } else {
      const { error } = await supabase.from("regras_servico").insert(data);
      if (error) {
        toast.error(error.code === "23505" ? "Já existe uma regra para este serviço" : "Erro ao criar regra");
        setSaving(false);
        return;
      }
      toast.success("Regra criada!");
    }
    setShowDialog(false);
    setSaving(false);
    fetchData();
  };

  const toggleAtivo = async (regra: RegraServico) => {
    const { error } = await supabase
      .from("regras_servico")
      .update({ ativo: !regra.ativo, updated_at: new Date().toISOString() })
      .eq("id", regra.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    toast.success(regra.ativo ? "Regra desativada" : "Regra ativada");
    fetchData();
  };

  const deleteRegra = async (regra: RegraServico) => {
    const { error } = await supabase.from("regras_servico").delete().eq("id", regra.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Regra excluída!");
    fetchData();
  };

  const getServicoNome = (id: string) => servicos.find(s => s.id === id)?.nome || "—";

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="jbs-header sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white rounded-lg p-1.5 sm:p-2 shrink-0">
              <img src={jbsLogo} alt="JBS Terminais" className="h-6 sm:h-8 w-auto" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold">Gestor — Regras de Serviço</h1>
              <p className="text-[10px] sm:text-xs text-primary-foreground/70">Gerenciar regras dos serviços do seu setor</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/interno/dashboard")} className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Regras de Serviço</h2>
            <Badge variant="secondary" className="text-xs">{servicos.length} serviço(s) vinculado(s)</Badge>
          </div>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" /> Nova Regra
          </Button>
        </div>

        {servicos.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum serviço vinculado ao seu setor.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Hora Corte</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Limite</TableHead>
                    <TableHead>Dia Anterior</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regras.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma regra cadastrada. Clique em "Nova Regra" para criar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    regras.map(regra => (
                      <TableRow key={regra.id} className={!regra.ativo ? "opacity-50" : ""}>
                        <TableCell className="font-medium">{getServicoNome(regra.servico_id)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            <Clock className="h-3 w-3 mr-1" />{regra.hora_corte}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {regra.dias_semana.map(d => (
                              <Badge key={d} variant="secondary" className="text-[10px] px-1">{d}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {regra.limite_dia ? (
                            <Badge>{regra.limite_dia}/dia</Badge>
                          ) : (regra.limite_seg || regra.limite_ter) ? (
                            <Badge variant="outline">Por dia</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>{regra.aplica_dia_anterior ? "Sim" : "Não"}</TableCell>
                        <TableCell>
                          <Switch checked={regra.ativo} onCheckedChange={() => toggleAtivo(regra)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openDialog(regra)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    A regra do serviço "{getServicoNome(regra.servico_id)}" será removida permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteRegra(regra)}>Excluir</AlertDialogAction>
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
        )}
      </div>

      {/* Dialog de Regra */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRegra ? "Editar Regra" : "Nova Regra"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <Label>Serviço</Label>
              <Select value={formData.servico_id} onValueChange={v => setFormData({ ...formData, servico_id: v })} disabled={!!editingRegra}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {servicos.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Hora de Corte</Label>
              <Input type="time" value={formData.hora_corte} onChange={e => setFormData({ ...formData, hora_corte: e.target.value })} />
            </div>

            <div>
              <Label>Dias da Semana</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {DIAS_SEMANA.map(d => (
                  <div key={d.key} className="flex items-center gap-1">
                    <Checkbox checked={formData.dias_semana.includes(d.key)} onCheckedChange={() => toggleDia(d.key)} id={`dia-${d.key}`} />
                    <label htmlFor={`dia-${d.key}`} className="text-sm cursor-pointer">{d.label}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Tipo de Limite</Label>
              <Select value={formData.tipo_limite} onValueChange={v => setFormData({ ...formData, tipo_limite: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nenhum">Sem limite</SelectItem>
                  <SelectItem value="fixo">Limite fixo por dia</SelectItem>
                  <SelectItem value="por_dia">Limite por dia da semana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.tipo_limite === "fixo" && (
              <div>
                <Label>Limite por dia</Label>
                <Input type="number" value={formData.limite_dia} onChange={e => setFormData({ ...formData, limite_dia: e.target.value })} min={1} />
              </div>
            )}

            {formData.tipo_limite === "por_dia" && (
              <div className="grid grid-cols-3 gap-2">
                {DIAS_SEMANA.map(d => (
                  <div key={d.key}>
                    <Label className="text-xs">{d.label}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={(formData as any)[`limite_${d.key}`]}
                      onChange={e => setFormData({ ...formData, [`limite_${d.key}`]: e.target.value })}
                      className="h-8"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Aplica dia anterior?</Label>
              <Switch checked={formData.aplica_dia_anterior} onCheckedChange={c => setFormData({ ...formData, aplica_dia_anterior: c })} />
            </div>

            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Comportamento após o corte</p>
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-2">
                  <Label className="text-sm">Recusar automaticamente</Label>
                  <p className="text-[11px] text-muted-foreground">Pedido após o corte é recusado. Reativação somente por usuário interno com justificativa.</p>
                </div>
                <Switch checked={formData.recusar_apos_corte} onCheckedChange={c => setFormData({ ...formData, recusar_apos_corte: c, agendar_proximo_dia: c ? false : formData.agendar_proximo_dia })} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1 pr-2">
                  <Label className="text-sm">Agendar para próximo dia ativo</Label>
                  <p className="text-[11px] text-muted-foreground">Pedido após o corte será atendido no próximo dia marcado como ativo na regra.</p>
                </div>
                <Switch checked={formData.agendar_proximo_dia} onCheckedChange={c => setFormData({ ...formData, agendar_proximo_dia: c, recusar_apos_corte: c ? false : formData.recusar_apos_corte })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveRegra} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />{editingRegra ? "Salvar" : "Criar Regra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestorRegras;
