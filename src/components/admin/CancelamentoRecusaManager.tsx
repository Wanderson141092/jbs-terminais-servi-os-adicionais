import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Save, Ban, XCircle, ShieldAlert } from "lucide-react";

interface ConfigItem {
  id: string;
  servico_ids: string[];
  tipo: string;
  status_habilitados: string[];
  ativo: boolean;
}

interface Servico {
  id: string;
  nome: string;
}

interface StatusOption {
  value: string;
  label: string;
}

const TIPOS = [
  {
    key: "cancelamento_direto",
    label: "Cancelamento Direto (pelo cliente)",
    description: "Status em que o cancelamento pode ser executado diretamente, sem confirmação interna.",
    icon: <Ban className="h-4 w-4" />,
    color: "text-orange-600",
  },
  {
    key: "cancelamento_confirmacao",
    label: "Cancelamento com Confirmação Interna",
    description: "Status em que o cancelamento requer validação operacional (análise de custo).",
    icon: <ShieldAlert className="h-4 w-4" />,
    color: "text-amber-600",
  },
  {
    key: "recusa",
    label: "Recusa",
    description: "Status em que o botão Recusar fica disponível na análise.",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-destructive",
  },
];

const CancelamentoRecusaManager = () => {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ConfigItem | null>(null);
  const [formData, setFormData] = useState({
    servico_ids: [] as string[],
    tipo: "cancelamento_direto",
    status_habilitados: [] as string[],
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [configRes, servicosRes, statusRes] = await Promise.all([
      supabase.from("cancelamento_recusa_config").select("*").order("created_at"),
      supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
      supabase
        .from("parametros_campos")
        .select("valor, sigla")
        .eq("grupo", "status_processo")
        .eq("ativo", true)
        .order("ordem"),
    ]);

    setConfigs((configRes.data as ConfigItem[]) || []);
    setServicos(servicosRes.data || []);

    const opts = (statusRes.data || []).map((s: any) => ({
      value:
        s.sigla ||
        s.valor
          .toLowerCase()
          .replace(/ /g, "_")
          .replace(/-/g, "_")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""),
      label: s.valor,
    }));
    setStatusOptions(opts);
    setLoading(false);
  };

  const getServicoNome = (id: string) =>
    servicos.find((s) => s.id === id)?.nome || id.slice(0, 8);

  const getServicosNomes = (ids: string[]) =>
    ids.map((id) => getServicoNome(id));

  const getStatusLabel = (val: string) =>
    statusOptions.find((s) => s.value === val)?.label || val;

  const openDialog = (item?: ConfigItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        servico_ids: item.servico_ids || [],
        tipo: item.tipo,
        status_habilitados: item.status_habilitados || [],
      });
    } else {
      setEditingItem(null);
      setFormData({ servico_ids: [], tipo: "cancelamento_direto", status_habilitados: [] });
    }
    setShowDialog(true);
  };

  const toggleStatus = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      status_habilitados: prev.status_habilitados.includes(val)
        ? prev.status_habilitados.filter((v) => v !== val)
        : [...prev.status_habilitados, val],
    }));
  };

  const handleSave = async () => {
    if (formData.servico_ids.length === 0) {
      toast.error("Selecione pelo menos um serviço");
      return;
    }
    if (formData.status_habilitados.length === 0) {
      toast.error("Selecione pelo menos um status");
      return;
    }

    const data: any = {
      servico_ids: formData.servico_ids,
      tipo: formData.tipo,
      status_habilitados: formData.status_habilitados,
      updated_at: new Date().toISOString(),
    };

    if (editingItem) {
      const { error } = await supabase
        .from("cancelamento_recusa_config")
        .update(data)
        .eq("id", editingItem.id);
      if (error) {
        toast.error("Erro ao atualizar");
        return;
      }
      toast.success("Atualizado!");
    } else {
      const { error } = await supabase.from("cancelamento_recusa_config").insert(data);
      if (error) {
        if (error.code === "23505")
          toast.error("Já existe uma configuração para este serviço e tipo");
        else toast.error("Erro ao criar");
        return;
      }
      toast.success("Configuração criada!");
    }
    setShowDialog(false);
    fetchAll();
  };

  const toggleAtivo = async (item: ConfigItem) => {
    await supabase
      .from("cancelamento_recusa_config")
      .update({ ativo: !item.ativo })
      .eq("id", item.id);
    fetchAll();
  };

  const tipoInfo = (tipo: string) => TIPOS.find((t) => t.key === tipo);

  if (loading) return <p className="text-muted-foreground text-center py-8">Carregando...</p>;

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Regras de Cancelamento e Recusa
            </CardTitle>
            <Button size="sm" onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 bg-muted/30 border-b text-sm text-muted-foreground space-y-1">
              <p><strong>Cancelamento Direto:</strong> O cancelamento é executado sem confirmação interna (feito pelo cliente antes do início do serviço).</p>
              <p><strong>Cancelamento com Confirmação:</strong> Exige validação operacional (análise de custo de serviço) por um usuário interno.</p>
              <p><strong>Recusa:</strong> O botão "Recusar" fica ativo na análise nos status configurados.</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status Habilitados</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhuma regra configurada.
                    </TableCell>
                  </TableRow>
                ) : (
                  configs.map((item) => {
                    const info = tipoInfo(item.tipo);
                    return (
                      <TableRow key={item.id} className={!item.ativo ? "opacity-50" : ""}>
                        <TableCell className="font-medium">
                          <div className="flex flex-wrap gap-1">
                            {getServicosNomes(item.servico_ids).map((nome, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">{nome}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 text-xs font-medium ${info?.color}`}>
                            {info?.icon}
                            {info?.label}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.status_habilitados.map((s) => (
                              <Badge key={s} variant="outline" className="text-[10px]">
                                {getStatusLabel(s)}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch checked={item.ativo} onCheckedChange={() => toggleAtivo(item)} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => openDialog(item)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar" : "Adicionar"} Regra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Serviços</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione os serviços que esta regra se aplica. Deixe vazio = todos.
              </p>
              <div className="space-y-2 max-h-40 overflow-auto border rounded-md p-3">
                {servicos.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`svc-${s.id}`}
                      checked={formData.servico_ids.includes(s.id)}
                      onCheckedChange={() => {
                        setFormData((prev) => ({
                          ...prev,
                          servico_ids: prev.servico_ids.includes(s.id)
                            ? prev.servico_ids.filter((id) => id !== s.id)
                            : [...prev.servico_ids, s.id],
                        }));
                      }}
                    />
                    <label htmlFor={`svc-${s.id}`} className="text-sm cursor-pointer">
                      {s.nome}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Tipo de Ação</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                disabled={!!editingItem}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.key} value={t.key}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {TIPOS.find((t) => t.key === formData.tipo)?.description}
              </p>
            </div>
            <div>
              <Label>Status em que esta ação fica habilitada</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Selecione os status do processo em que o botão ficará ativo na análise.
              </p>
              <div className="space-y-2 max-h-48 overflow-auto border rounded-md p-3">
                {statusOptions.map((opt) => (
                  <div key={opt.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`st-${opt.value}`}
                      checked={formData.status_habilitados.includes(opt.value)}
                      onCheckedChange={() => toggleStatus(opt.value)}
                    />
                    <label htmlFor={`st-${opt.value}`} className="text-sm cursor-pointer">
                      {opt.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CancelamentoRecusaManager;
