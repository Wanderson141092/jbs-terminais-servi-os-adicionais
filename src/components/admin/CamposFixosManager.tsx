import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Save, Eye, EyeOff, Globe, Monitor } from "lucide-react";

interface CampoFixo {
  id: string;
  campo_chave: string;
  campo_label: string;
  visivel_externo: boolean;
  visivel_analise: boolean;
  obrigatorio_analise: boolean;
  servico_ids: string[];
  ordem: number;
  ativo: boolean;
}

interface Servico {
  id: string;
  nome: string;
}

const CamposFixosManager = () => {
  const [campos, setCampos] = useState<CampoFixo[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCampo, setEditingCampo] = useState<CampoFixo | null>(null);
  const [formData, setFormData] = useState({
    campo_label: "",
    visivel_externo: false,
    visivel_analise: true,
    obrigatorio_analise: false,
    servico_ids: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [camposRes, servicosRes] = await Promise.all([
      supabase.from("campos_fixos_config").select("*").order("ordem"),
      supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
    ]);
    setCampos((camposRes.data as CampoFixo[]) || []);
    setServicos(servicosRes.data || []);
    setLoading(false);
  };

  const openEdit = (campo: CampoFixo) => {
    setEditingCampo(campo);
    setFormData({
      campo_label: campo.campo_label,
      visivel_externo: campo.visivel_externo,
      visivel_analise: campo.visivel_analise,
      obrigatorio_analise: campo.obrigatorio_analise,
      servico_ids: campo.servico_ids || [],
    });
  };

  const handleSave = async () => {
    if (!editingCampo) return;
    const { error } = await supabase
      .from("campos_fixos_config")
      .update({
        campo_label: formData.campo_label,
        visivel_externo: formData.visivel_externo,
        visivel_analise: formData.visivel_analise,
        obrigatorio_analise: formData.obrigatorio_analise,
        servico_ids: formData.servico_ids,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingCampo.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Campo atualizado!");
    setEditingCampo(null);
    fetchData();
  };

  const toggleAtivo = async (campo: CampoFixo) => {
    await supabase.from("campos_fixos_config").update({ ativo: !campo.ativo }).eq("id", campo.id);
    fetchData();
  };

  const toggleQuick = async (campo: CampoFixo, field: "visivel_externo" | "visivel_analise") => {
    await supabase.from("campos_fixos_config").update({ [field]: !campo[field] }).eq("id", campo.id);
    fetchData();
  };

  const toggleServicoId = (servicoId: string) => {
    setFormData(prev => ({
      ...prev,
      servico_ids: prev.servico_ids.includes(servicoId)
        ? prev.servico_ids.filter(id => id !== servicoId)
        : [...prev.servico_ids, servicoId],
    }));
  };

  if (loading) return <p className="text-muted-foreground text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Campos Fixos da Análise</p>
        <p>Configure quais campos fixos da solicitação devem aparecer na tela de análise interna e na consulta externa do cliente. Use os ícones para alternar a visibilidade rapidamente.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campos Configurados ({campos.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campo</TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center"><Monitor className="h-3 w-3" /> Análise</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center"><Globe className="h-3 w-3" /> Externo</span>
                </TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campos.map(campo => (
                <TableRow key={campo.id} className={!campo.ativo ? "opacity-50" : ""}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{campo.campo_label}</p>
                      <p className="text-xs text-muted-foreground font-mono">{campo.campo_chave}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleQuick(campo, "visivel_analise")}
                    >
                      {campo.visivel_analise ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleQuick(campo, "visivel_externo")}
                    >
                      {campo.visivel_externo ? <Globe className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </TableCell>
                  <TableCell className="text-xs">
                    {campo.servico_ids.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {campo.servico_ids.map(id => (
                          <Badge key={id} variant="outline" className="text-[10px]">
                            {servicos.find(s => s.id === id)?.nome || id.slice(0, 8)}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Todos</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch checked={campo.ativo} onCheckedChange={() => toggleAtivo(campo)} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(campo)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCampo} onOpenChange={() => setEditingCampo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Campo: {editingCampo?.campo_chave}</DialogTitle>
            <DialogDescription>Configure a visibilidade e comportamento deste campo</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Rótulo exibido</Label>
              <Input value={formData.campo_label} onChange={e => setFormData({ ...formData, campo_label: e.target.value })} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label>Visível na análise interna</Label>
              <Switch checked={formData.visivel_analise} onCheckedChange={v => setFormData({ ...formData, visivel_analise: v })} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label>Visível na consulta externa</Label>
              <Switch checked={formData.visivel_externo} onCheckedChange={v => setFormData({ ...formData, visivel_externo: v })} />
            </div>
            <div className="flex items-center justify-between border rounded-md p-3">
              <Label>Obrigatório na análise</Label>
              <Switch checked={formData.obrigatorio_analise} onCheckedChange={v => setFormData({ ...formData, obrigatorio_analise: v })} />
            </div>
            <div>
              <Label>Serviços (deixe vazio para todos)</Label>
              <div className="space-y-2 max-h-48 overflow-auto border rounded-md p-3 mt-1">
                {servicos.map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`fix-srv-${s.id}`}
                      checked={formData.servico_ids.includes(s.id)}
                      onCheckedChange={() => toggleServicoId(s.id)}
                    />
                    <label htmlFor={`fix-srv-${s.id}`} className="text-sm cursor-pointer">{s.nome}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCampo(null)}>Cancelar</Button>
            <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CamposFixosManager;
