import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Trash2, Plus, ArrowUpDown, Eye, CheckSquare, GitBranch, AlertTriangle } from "lucide-react";

interface EtapaConfig {
  id: string;
  chave: string;
  titulo: string;
  tipo: string;
  grupo: string;
  ordem: number;
  ativo: boolean;
  servico_ids: string[];
  etapa_equivalente: string | null;
  status_gatilho: string[] | null;
  descricao: string | null;
}

const GRUPOS = [
  { value: "geral", label: "Geral (todos os serviços)", color: "bg-blue-100 text-blue-800" },
  { value: "posicionamento_vistoria", label: "Posicionamento - Vistoria", color: "bg-green-100 text-green-800" },
  { value: "posicionamento_servico", label: "Posicionamento - Serviço", color: "bg-teal-100 text-teal-800" },
  { value: "outros_servicos", label: "Outros Serviços", color: "bg-purple-100 text-purple-800" },
  { value: "deferimento", label: "Deferimento (sub-timeline)", color: "bg-yellow-100 text-yellow-800" },
  { value: "terminal", label: "Terminal (Cancelado/Recusado)", color: "bg-red-100 text-red-800" },
  { value: "checklist_geral", label: "Checklist - Geral", color: "bg-blue-50 text-blue-700" },
  { value: "checklist_posicionamento", label: "Checklist - Posicionamento", color: "bg-green-50 text-green-700" },
  { value: "checklist_outros", label: "Checklist - Outros Serviços", color: "bg-purple-50 text-purple-700" },
  { value: "checklist_deferimento", label: "Checklist - Deferimento", color: "bg-yellow-50 text-yellow-700" },
];

const getGrupoInfo = (grupo: string) => GRUPOS.find(g => g.value === grupo) || { value: grupo, label: grupo, color: "bg-muted text-muted-foreground" };

const ConsultaEtapasManager = () => {
  const [etapas, setEtapas] = useState<EtapaConfig[]>([]);
  const [allEtapas, setAllEtapas] = useState<EtapaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EtapaConfig | null>(null);
  const [form, setForm] = useState({
    chave: "",
    titulo: "",
    tipo: "timeline",
    grupo: "geral",
    ordem: 0,
    ativo: true,
    etapa_equivalente: "",
    status_gatilho: "",
    descricao: "",
  });
  const [activeTab, setActiveTab] = useState("timeline");

  const fetchEtapas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("consulta_etapas_config")
      .select("*")
      .order("tipo")
      .order("grupo")
      .order("ordem");

    if (error) {
      toast.error("Erro ao carregar etapas");
    } else {
      setAllEtapas((data || []) as unknown as EtapaConfig[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchEtapas(); }, []);

  useEffect(() => {
    setEtapas(allEtapas.filter(e => e.tipo === activeTab || (activeTab === "checklist" && e.tipo === "checklist")));
  }, [allEtapas, activeTab]);

  const openDialog = (etapa?: EtapaConfig) => {
    if (etapa) {
      setEditing(etapa);
      setForm({
        chave: etapa.chave,
        titulo: etapa.titulo,
        tipo: etapa.tipo,
        grupo: etapa.grupo,
        ordem: etapa.ordem,
        ativo: etapa.ativo,
        etapa_equivalente: etapa.etapa_equivalente || "",
        status_gatilho: (etapa.status_gatilho || []).join(", "),
        descricao: etapa.descricao || "",
      });
    } else {
      setEditing(null);
      setForm({
        chave: "",
        titulo: "",
        tipo: activeTab === "checklist" ? "checklist" : "timeline",
        grupo: "geral",
        ordem: 0,
        ativo: true,
        etapa_equivalente: "",
        status_gatilho: "",
        descricao: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.chave.trim() || !form.titulo.trim()) {
      toast.error("Chave e Título são obrigatórios");
      return;
    }

    const payload = {
      chave: form.chave.trim(),
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      grupo: form.grupo,
      ordem: form.ordem,
      ativo: form.ativo,
      etapa_equivalente: form.etapa_equivalente.trim() || null,
      status_gatilho: form.status_gatilho.split(",").map(s => s.trim()).filter(Boolean),
      descricao: form.descricao.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase
        .from("consulta_etapas_config")
        .update(payload)
        .eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Etapa atualizada");
    } else {
      const { error } = await supabase
        .from("consulta_etapas_config")
        .insert(payload);
      if (error) { toast.error("Erro ao criar: " + error.message); return; }
      toast.success("Etapa criada");
    }
    setDialogOpen(false);
    fetchEtapas();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("consulta_etapas_config").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Etapa excluída");
    fetchEtapas();
  };

  const handleToggle = async (etapa: EtapaConfig) => {
    await supabase
      .from("consulta_etapas_config")
      .update({ ativo: !etapa.ativo, updated_at: new Date().toISOString() })
      .eq("id", etapa.id);
    fetchEtapas();
  };

  // Group etapas by grupo
  const grouped = etapas.reduce<Record<string, EtapaConfig[]>>((acc, e) => {
    (acc[e.grupo] = acc[e.grupo] || []).push(e);
    return acc;
  }, {});

  const timelineChaves = allEtapas.filter(e => e.tipo === "timeline").map(e => e.chave);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Configuração da Consulta Externa
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure as etapas da timeline de progresso e as fases do checklist que aparecem na página de consulta do cliente.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <TabsList>
              <TabsTrigger value="timeline" className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="checklist" className="flex items-center gap-1">
                <CheckSquare className="h-3.5 w-3.5" />
                Checklist
              </TabsTrigger>
            </TabsList>
            <Button size="sm" onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-1" />
              Nova Etapa
            </Button>
          </div>

          <TabsContent value="timeline" className="space-y-4 mt-4">
            {Object.entries(grouped)
              .sort(([, a], [, b]) => (a[0]?.ordem || 0) - (b[0]?.ordem || 0))
              .map(([grupo, items]) => {
                const info = getGrupoInfo(grupo);
                return (
                  <div key={grupo} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={info.color}>{info.label}</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">Ord.</TableHead>
                          <TableHead>Chave</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Equivalente</TableHead>
                          <TableHead>Status Gatilho</TableHead>
                          <TableHead className="w-16">Ativo</TableHead>
                          <TableHead className="w-20">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.sort((a, b) => a.ordem - b.ordem).map(etapa => (
                          <TableRow key={etapa.id} className={!etapa.ativo ? "opacity-50" : ""}>
                            <TableCell className="font-mono text-xs">{etapa.ordem}</TableCell>
                            <TableCell className="font-mono text-xs">{etapa.chave}</TableCell>
                            <TableCell className="font-medium text-sm">{etapa.titulo}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {etapa.etapa_equivalente && (
                                <Badge variant="outline" className="text-xs">
                                  ↔ {etapa.etapa_equivalente}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              {(etapa.status_gatilho || []).map(s => (
                                <Badge key={s} variant="secondary" className="mr-1 text-[10px]">{s}</Badge>
                              ))}
                            </TableCell>
                            <TableCell>
                              <Switch checked={etapa.ativo} onCheckedChange={() => handleToggle(etapa)} />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openDialog(etapa)}>
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
                                      <AlertDialogTitle>Excluir Etapa</AlertDialogTitle>
                                      <AlertDialogDescription>Deseja excluir "{etapa.titulo}"?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(etapa.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            {Object.keys(grouped).length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">Nenhuma etapa de timeline configurada.</p>
            )}
          </TabsContent>

          <TabsContent value="checklist" className="space-y-4 mt-4">
            {Object.entries(grouped)
              .sort(([, a], [, b]) => (a[0]?.ordem || 0) - (b[0]?.ordem || 0))
              .map(([grupo, items]) => {
                const info = getGrupoInfo(grupo);
                return (
                  <div key={grupo} className="space-y-2">
                    <Badge variant="outline" className={info.color}>{info.label}</Badge>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">Ord.</TableHead>
                          <TableHead>Chave</TableHead>
                          <TableHead>Título</TableHead>
                          <TableHead>Status Gatilho</TableHead>
                          <TableHead className="w-16">Ativo</TableHead>
                          <TableHead className="w-20">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.sort((a, b) => a.ordem - b.ordem).map(etapa => (
                          <TableRow key={etapa.id} className={!etapa.ativo ? "opacity-50" : ""}>
                            <TableCell className="font-mono text-xs">{etapa.ordem}</TableCell>
                            <TableCell className="font-mono text-xs">{etapa.chave}</TableCell>
                            <TableCell className="font-medium text-sm">{etapa.titulo}</TableCell>
                            <TableCell className="text-xs">
                              {(etapa.status_gatilho || []).map(s => (
                                <Badge key={s} variant="secondary" className="mr-1 text-[10px]">{s}</Badge>
                              ))}
                            </TableCell>
                            <TableCell>
                              <Switch checked={etapa.ativo} onCheckedChange={() => handleToggle(etapa)} />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => openDialog(etapa)}>
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
                                      <AlertDialogTitle>Excluir Fase</AlertDialogTitle>
                                      <AlertDialogDescription>Deseja excluir "{etapa.titulo}"?</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(etapa.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            {Object.keys(grouped).length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">Nenhuma fase de checklist configurada.</p>
            )}
          </TabsContent>
        </Tabs>

        {/* Info box */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-800 space-y-1">
            <p><strong>Grupos de Timeline:</strong> "Geral" aparece em todos os fluxos. "Posicionamento - Vistoria" aparece quando o motivo não é serviço especial. "Posicionamento - Serviço" substitui quando o motivo é Fumigação/Laudo/Lacre. "Outros Serviços" para demais serviços.</p>
            <p><strong>Etapa Equivalente:</strong> Indica qual etapa esta substitui (ex: "aguardando_servico" substitui "aguardando_vistoria").</p>
            <p><strong>Status Gatilho:</strong> Os status do banco que ativam/completam esta etapa.</p>
            <p><strong>Checklist:</strong> Use <code>{"{nome}"}</code> no título para inserir dinamicamente o nome do serviço.</p>
          </div>
        </div>
      </CardContent>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Etapa" : "Nova Etapa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Chave (identificador)</Label>
                <Input value={form.chave} onChange={e => setForm(f => ({ ...f, chave: e.target.value }))} placeholder="ex: aguardando_vistoria" />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input type="number" value={form.ordem} onChange={e => setForm(f => ({ ...f, ordem: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <Label>Título (exibido ao cliente)</Label>
              <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder='ex: Confirmado - Aguardando Vistoria' />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timeline">Timeline</SelectItem>
                    <SelectItem value="checklist">Checklist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grupo</Label>
                <Select value={form.grupo} onValueChange={v => setForm(f => ({ ...f, grupo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GRUPOS.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Status Gatilho (separados por vírgula)</Label>
              <Input value={form.status_gatilho} onChange={e => setForm(f => ({ ...f, status_gatilho: e.target.value }))} placeholder="aguardando_confirmacao, confirmado_aguardando_vistoria" />
              <p className="text-xs text-muted-foreground mt-1">Status do banco que ativam esta etapa</p>
            </div>
            <div>
              <Label>Etapa Equivalente (substitui)</Label>
              <Select value={form.etapa_equivalente || "__none__"} onValueChange={v => setForm(f => ({ ...f, etapa_equivalente: v === "__none__" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {timelineChaves.filter(c => c !== form.chave).map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição (interno)</Label>
              <Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={v => setForm(f => ({ ...f, ativo: v }))} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ConsultaEtapasManager;
