import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DollarSign, Plus, Edit, Trash2, Save } from "lucide-react";

interface CobrancaConfig {
  id: string;
  nome: string;
  rotulo_analise: string;
  tipo: string;
  servico_ids: string[];
  campo_referencia: string | null;
  ativo: boolean;
}

interface Servico {
  id: string;
  nome: string;
}

const LancamentoCobrancaManager = () => {
  const [configs, setConfigs] = useState<CobrancaConfig[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [pendenciaOpcoes, setPendenciaOpcoes] = useState<string[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<CobrancaConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    rotulo_analise: "",
    tipo: "servico",
    servico_ids: [] as string[],
    campo_referencia: "",
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [configRes, servicosRes, pendenciaRes] = await Promise.all([
      supabase.from("lancamento_cobranca_config").select("*").order("created_at"),
      supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("parametros_campos").select("valor").eq("grupo", "pendencia_opcoes").eq("ativo", true).order("ordem"),
    ]);
    setConfigs((configRes.data || []) as CobrancaConfig[]);
    setServicos(servicosRes.data || []);
    setPendenciaOpcoes((pendenciaRes.data || []).map((p: any) => p.valor));
  };

  const openDialog = (config?: CobrancaConfig) => {
    if (config) {
      setEditing(config);
      setFormData({
        nome: config.nome,
        rotulo_analise: config.rotulo_analise,
        tipo: config.tipo,
        servico_ids: config.servico_ids,
        campo_referencia: config.campo_referencia || "",
      });
    } else {
      setEditing(null);
      setFormData({ nome: "", rotulo_analise: "", tipo: "servico", servico_ids: [], campo_referencia: "" });
    }
    setShowDialog(true);
  };

  const toggleServico = (id: string) => {
    setFormData(prev => ({
      ...prev,
      servico_ids: prev.servico_ids.includes(id) ? prev.servico_ids.filter(s => s !== id) : [...prev.servico_ids, id],
    }));
  };

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.rotulo_analise.trim()) {
      toast.error("Preencha o nome e o rótulo de análise.");
      return;
    }

    setSaving(true);
    const payload = {
      nome: formData.nome.trim(),
      rotulo_analise: formData.rotulo_analise.trim(),
      tipo: formData.tipo,
      servico_ids: formData.servico_ids,
      campo_referencia: formData.tipo === "pendencia" ? formData.campo_referencia || null : null,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from("lancamento_cobranca_config").update(payload).eq("id", editing.id);
      if (error) { toast.error("Erro ao atualizar"); setSaving(false); return; }
      toast.success("Configuração atualizada!");
    } else {
      const { error } = await supabase.from("lancamento_cobranca_config").insert(payload);
      if (error) { toast.error("Erro ao criar"); setSaving(false); return; }
      toast.success("Configuração criada!");
    }

    setShowDialog(false);
    setSaving(false);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("lancamento_cobranca_config").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Excluído!");
    fetchAll();
  };

  const toggleAtivo = async (config: CobrancaConfig) => {
    await supabase.from("lancamento_cobranca_config").update({ ativo: !config.ativo, updated_at: new Date().toISOString() }).eq("id", config.id);
    fetchAll();
  };

  const getServicoNome = (id: string) => servicos.find(s => s.id === id)?.nome || id;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Gerenciamento de Lançamento de Cobranças
        </CardTitle>
        <Button onClick={() => openDialog()} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure os tipos de cobrança disponíveis no sistema. Cada cobrança pode ser vinculada a um serviço adicional ou a um campo de pendência específico.
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Rótulo na Análise</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Serviços Vinculados</TableHead>
              <TableHead>Campo Referência</TableHead>
              <TableHead>Ativo</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map(config => (
              <TableRow key={config.id} className={!config.ativo ? "opacity-50" : ""}>
                <TableCell className="font-medium">{config.nome}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs gap-1">
                    <DollarSign className="h-3 w-3" />
                    {config.rotulo_analise}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={config.tipo === "servico" ? "default" : "secondary"} className="text-xs">
                    {config.tipo === "servico" ? "Serviço Adicional" : "Pendência"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs max-w-[200px]">
                  {config.servico_ids.length > 0
                    ? config.servico_ids.map(id => getServicoNome(id)).join(", ")
                    : <span className="text-muted-foreground">Todos</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {config.campo_referencia || "—"}
                </TableCell>
                <TableCell>
                  <Switch checked={config.ativo} onCheckedChange={() => toggleAtivo(config)} />
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(config)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir cobrança?</AlertDialogTitle>
                          <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(config.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {configs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma configuração cadastrada.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cobrança" : "Nova Cobrança"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nome da Cobrança *</Label>
              <Input value={formData.nome} onChange={e => setFormData(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Lanç. Posicionamento" />
              <p className="text-xs text-muted-foreground mt-1">Identificador único da cobrança no sistema.</p>
            </div>
            <div>
              <Label>Rótulo na Análise *</Label>
              <Input value={formData.rotulo_analise} onChange={e => setFormData(p => ({ ...p, rotulo_analise: e.target.value }))} placeholder="Ex: Lanç. Posicionamento" />
              <p className="text-xs text-muted-foreground mt-1">Texto exibido como badge na tela de análise interna.</p>
            </div>
            <div>
              <Label>Tipo de Vínculo</Label>
              <Select value={formData.tipo} onValueChange={v => setFormData(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="servico">Serviço Adicional</SelectItem>
                  <SelectItem value="pendencia">Campo de Pendência</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Define se a cobrança é vinculada diretamente a um serviço ou ativada por um campo de pendência.</p>
            </div>

            {formData.tipo === "pendencia" && (
              <div>
                <Label>Campo de Pendência</Label>
                <Select value={formData.campo_referencia} onValueChange={v => setFormData(p => ({ ...p, campo_referencia: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a pendência" /></SelectTrigger>
                  <SelectContent>
                    {pendenciaOpcoes.map(op => (
                      <SelectItem key={op} value={op}>{op}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Pendência que ativa essa cobrança quando selecionada no processo.</p>
              </div>
            )}

            <div>
              <Label>Serviços Vinculados</Label>
              <p className="text-xs text-muted-foreground mb-2">Selecione os serviços onde esta cobrança se aplica. Deixe vazio para todos.</p>
              <div className="flex flex-wrap gap-2 border rounded-md p-3 max-h-40 overflow-auto">
                {servicos.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`srv-${s.id}`}
                      checked={formData.servico_ids.includes(s.id)}
                      onCheckedChange={() => toggleServico(s.id)}
                    />
                    <Label htmlFor={`srv-${s.id}`} className="text-sm cursor-pointer">{s.nome}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default LancamentoCobrancaManager;
