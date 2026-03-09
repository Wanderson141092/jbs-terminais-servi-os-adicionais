import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Save, Eye, EyeOff, Globe, Monitor, Plus, Trash2 } from "lucide-react";

/** Legacy solicitacoes columns still available for mapping */
const SOLICITACOES_COLUMNS: { key: string; label: string }[] = [
  { key: "protocolo", label: "Protocolo" },
  { key: "numero_conteiner", label: "Número do Contêiner" },
  { key: "lpco", label: "LPCO" },
  { key: "chave_consulta", label: "Chave de Consulta" },
  { key: "cnpj", label: "CNPJ" },
  { key: "cliente_nome", label: "Nome do Cliente" },
  { key: "cliente_email", label: "E-mail do Cliente" },
  { key: "tipo_carga", label: "Tipo de Carga" },
  { key: "tipo_operacao", label: "Tipo de Operação" },
  { key: "categoria", label: "Categoria" },
  { key: "data_posicionamento", label: "Data de Posicionamento" },
  { key: "data_agendamento", label: "Data de Agendamento" },
  { key: "observacoes", label: "Observações" },
  { key: "status", label: "Status" },
  { key: "status_vistoria", label: "Status da Vistoria" },
];

const SYSTEM_SOURCE = "__sistema__";

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

interface Servico { id: string; nome: string; }

interface Formulario { id: string; titulo: string; }

interface PerguntaFormulario {
  pergunta_id: string;
  formulario_id: string;
  rotulo: string;
}

const CamposFixosManager = () => {
  const [campos, setCampos] = useState<CampoFixo[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [perguntas, setPerguntas] = useState<PerguntaFormulario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCampo, setEditingCampo] = useState<CampoFixo | null>(null);

  // Source selector: "__sistema__" or a formulario id
  const [selectedSource, setSelectedSource] = useState<string>("");

  const [formData, setFormData] = useState({
    campo_chave: "",
    campo_label: "",
    visivel_externo: false,
    visivel_analise: true,
    obrigatorio_analise: false,
    servico_ids: [] as string[],
    ordem: 0,
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [camposRes, servicosRes, formsRes, perguntasRes] = await Promise.all([
      supabase.from("campos_fixos_config").select("*").order("ordem"),
      supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("formularios").select("id, titulo").eq("ativo", true).order("titulo"),
      supabase
        .from("formulario_perguntas")
        .select("pergunta_id, formulario_id, banco_perguntas!inner(rotulo)")
        .order("ordem"),
    ]);

    setCampos((camposRes.data as CampoFixo[]) || []);
    setServicos(servicosRes.data || []);
    setFormularios((formsRes.data as Formulario[]) || []);

    // Flatten the joined data
    const mapped: PerguntaFormulario[] = (perguntasRes.data || []).map((row: any) => ({
      pergunta_id: row.pergunta_id,
      formulario_id: row.formulario_id,
      rotulo: row.banco_perguntas?.rotulo || row.pergunta_id,
    }));
    setPerguntas(mapped);
    setLoading(false);
  };

  /** Build a lookup: campo_chave → display label */
  const chaveDisplayMap = useMemo(() => {
    const map: Record<string, { label: string; source: string }> = {};
    // system columns
    for (const col of SOLICITACOES_COLUMNS) {
      map[col.key] = { label: col.label, source: "Sistema" };
    }
    // form questions
    for (const p of perguntas) {
      const form = formularios.find(f => f.id === p.formulario_id);
      map[p.pergunta_id] = {
        label: p.rotulo,
        source: form?.titulo || "Formulário",
      };
    }
    return map;
  }, [perguntas, formularios]);

  const openDialog = (campo?: CampoFixo) => {
    if (campo) {
      setEditingCampo(campo);
      // Determine which source this campo_chave belongs to
      const isSystem = SOLICITACOES_COLUMNS.some(c => c.key === campo.campo_chave);
      if (isSystem) {
        setSelectedSource(SYSTEM_SOURCE);
      } else {
        const match = perguntas.find(p => p.pergunta_id === campo.campo_chave);
        setSelectedSource(match?.formulario_id || "");
      }
      setFormData({
        campo_chave: campo.campo_chave,
        campo_label: campo.campo_label,
        visivel_externo: campo.visivel_externo,
        visivel_analise: campo.visivel_analise,
        obrigatorio_analise: campo.obrigatorio_analise,
        servico_ids: campo.servico_ids || [],
        ordem: campo.ordem,
      });
    } else {
      setEditingCampo(null);
      setSelectedSource("");
      const maxOrdem = campos.length > 0 ? Math.max(...campos.map(c => c.ordem)) + 1 : 0;
      setFormData({
        campo_chave: "",
        campo_label: "",
        visivel_externo: false,
        visivel_analise: true,
        obrigatorio_analise: false,
        servico_ids: [],
        ordem: maxOrdem,
      });
    }
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formData.campo_chave.trim()) {
      toast.error("Selecione a chave do campo");
      return;
    }
    if (!formData.campo_label.trim()) {
      toast.error("Informe o rótulo do campo");
      return;
    }

    const normalizedKey = formData.campo_chave;

    if (editingCampo) {
      const { error } = await supabase
        .from("campos_fixos_config")
        .update({
          campo_label: formData.campo_label,
          visivel_externo: formData.visivel_externo,
          visivel_analise: formData.visivel_analise,
          obrigatorio_analise: formData.obrigatorio_analise,
          servico_ids: formData.servico_ids,
          ordem: formData.ordem,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingCampo.id);
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Campo atualizado!");
    } else {
      if (campos.some(c => c.campo_chave === normalizedKey)) {
        toast.error("Já existe um campo com esta chave");
        return;
      }
      const { error } = await supabase.from("campos_fixos_config").insert({
        campo_chave: normalizedKey,
        campo_label: formData.campo_label,
        visivel_externo: formData.visivel_externo,
        visivel_analise: formData.visivel_analise,
        obrigatorio_analise: formData.obrigatorio_analise,
        servico_ids: formData.servico_ids,
        ordem: formData.ordem,
      });
      if (error) {
        if (error.code === "23505") toast.error("Já existe um campo com esta chave");
        else toast.error("Erro ao criar campo");
        return;
      }
      toast.success("Campo criado!");
    }
    setShowDialog(false);
    fetchData();
  };

  const handleDelete = async (campo: CampoFixo) => {
    if (!confirm(`Tem certeza que deseja excluir o campo "${campo.campo_label}"?`)) return;

    // Only probe solicitacoes column for system keys
    const isSystemKey = SOLICITACOES_COLUMNS.some(c => c.key === campo.campo_chave);
    if (isSystemKey) {
      const probe = await supabase.from("solicitacoes").select(`id,${campo.campo_chave}`).limit(1);
      if (!probe.error) {
        const { count } = await supabase
          .from("solicitacoes")
          .select("id", { count: "exact", head: true })
          .not(campo.campo_chave, "is", null);

        if ((count || 0) > 0) {
          await supabase
            .from("campos_fixos_config")
            .update({ ativo: false, visivel_analise: false, visivel_externo: false, updated_at: new Date().toISOString() })
            .eq("id", campo.id);
          toast.warning(`Campo possui ${count} processo(s) com valor e foi desativado para preservar histórico.`);
          fetchData();
          return;
        }
      }
    }

    await Promise.all([
      supabase.from("pergunta_mapeamento").delete().eq("campo_solicitacao", campo.campo_chave),
      supabase.from("campos_fixos_config").delete().eq("id", campo.id),
    ]);
    toast.success("Campo excluído!");
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

  /** Available questions for the selected form, excluding already-used keys */
  const availableQuestions = useMemo(() => {
    if (selectedSource === SYSTEM_SOURCE || !selectedSource) return [];
    const usedKeys = new Set(campos.map(c => c.campo_chave));
    if (editingCampo) usedKeys.delete(editingCampo.campo_chave);
    return perguntas
      .filter(p => p.formulario_id === selectedSource && !usedKeys.has(p.pergunta_id));
  }, [selectedSource, perguntas, campos, editingCampo]);

  /** Available system columns excluding already-used keys */
  const availableSystemCols = useMemo(() => {
    const usedKeys = new Set(campos.map(c => c.campo_chave));
    if (editingCampo) usedKeys.delete(editingCampo.campo_chave);
    return SOLICITACOES_COLUMNS.filter(c => !usedKeys.has(c.key));
  }, [campos, editingCampo]);

  if (loading) return <p className="text-muted-foreground text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 border rounded-lg p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Campos Fixos da Análise</p>
        <p>Configure quais campos devem aparecer na análise interna e consulta externa. Você pode vincular a uma <strong>pergunta de formulário</strong> (para trazer a resposta automaticamente) ou a um <strong>campo do sistema</strong>.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-base">Campos Configurados ({campos.length})</CardTitle>
          <Button size="sm" onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-1" /> Novo Campo
          </Button>
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
              {campos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum campo configurado.
                  </TableCell>
                </TableRow>
              ) : (
                campos.map(campo => {
                  const info = chaveDisplayMap[campo.campo_chave];
                  return (
                    <TableRow key={campo.id} className={!campo.ativo ? "opacity-50" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{campo.campo_label}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {info ? (
                              <>
                                <Badge variant="outline" className="text-[10px] font-normal">{info.source}</Badge>
                                <span className="text-[11px] text-muted-foreground">{info.label}</span>
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground font-mono">{campo.campo_chave}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleQuick(campo, "visivel_analise")}>
                          {campo.visivel_analise ? <Eye className="h-4 w-4 text-primary" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleQuick(campo, "visivel_externo")}>
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
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDialog(campo)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(campo)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCampo ? `Editar Campo: ${editingCampo.campo_label}` : "Novo Campo Fixo"}</DialogTitle>
            <DialogDescription>
              {editingCampo
                ? "Configure a visibilidade e comportamento deste campo."
                : "Escolha a origem do dado: uma pergunta de formulário ou um campo do sistema."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Source picker */}
            <div>
              <Label>Origem do dado</Label>
              {editingCampo ? (
                <Input value={
                  chaveDisplayMap[formData.campo_chave]
                    ? `${chaveDisplayMap[formData.campo_chave].source} → ${chaveDisplayMap[formData.campo_chave].label}`
                    : formData.campo_chave
                } disabled />
              ) : (
                <Select
                  value={selectedSource}
                  onValueChange={(v) => {
                    setSelectedSource(v);
                    setFormData(prev => ({ ...prev, campo_chave: "", campo_label: "" }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione formulário ou sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SYSTEM_SOURCE}>
                      <span className="font-medium">Campos do Sistema (Solicitação)</span>
                    </SelectItem>
                    {formularios.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Key picker — only for new fields */}
            {!editingCampo && selectedSource && (
              <div>
                <Label>
                  {selectedSource === SYSTEM_SOURCE ? "Campo do sistema" : "Pergunta do formulário"}
                </Label>
                <Select
                  value={formData.campo_chave}
                  onValueChange={(value) => {
                    let label = "";
                    if (selectedSource === SYSTEM_SOURCE) {
                      label = SOLICITACOES_COLUMNS.find(c => c.key === value)?.label || "";
                    } else {
                      label = perguntas.find(p => p.pergunta_id === value)?.rotulo || "";
                    }
                    setFormData(prev => ({
                      ...prev,
                      campo_chave: value,
                      campo_label: prev.campo_label || label,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={
                      selectedSource === SYSTEM_SOURCE
                        ? "Selecione o campo"
                        : "Selecione a pergunta"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedSource === SYSTEM_SOURCE ? (
                      availableSystemCols.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2">Todos os campos do sistema já foram adicionados.</p>
                      ) : (
                        availableSystemCols.map(col => (
                          <SelectItem key={col.key} value={col.key}>
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">{col.key}</span>
                              <span>{col.label}</span>
                            </span>
                          </SelectItem>
                        ))
                      )
                    ) : (
                      availableQuestions.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2">Nenhuma pergunta disponível neste formulário.</p>
                      ) : (
                        availableQuestions.map(q => (
                          <SelectItem key={q.pergunta_id} value={q.pergunta_id}>
                            {q.rotulo}
                          </SelectItem>
                        ))
                      )
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedSource === SYSTEM_SOURCE
                    ? "Mapeia diretamente para uma coluna da tabela de solicitações."
                    : "A resposta do cliente a esta pergunta será exibida como valor do campo."}
                </p>
              </div>
            )}

            <div>
              <Label>Rótulo exibido</Label>
              <Input
                value={formData.campo_label}
                onChange={e => setFormData({ ...formData, campo_label: e.target.value })}
                placeholder="ex: Número do BL, Peso da Carga"
              />
            </div>
            <div>
              <Label>Ordem de exibição</Label>
              <Input
                type="number"
                value={formData.ordem}
                onChange={e => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
              />
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
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CamposFixosManager;
