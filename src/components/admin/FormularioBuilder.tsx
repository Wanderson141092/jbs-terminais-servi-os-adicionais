import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Link2, GitBranch, Search,
} from "lucide-react";
import { QUESTION_TYPES, type BancoPergunta } from "./BancoPerguntasManager";

interface FormularioPergunta {
  id: string;
  formulario_id: string;
  pergunta_id: string;
  ordem: number;
  obrigatorio: boolean;
  pergunta?: BancoPergunta;
}

interface PerguntaCondicional {
  id: string;
  formulario_id: string;
  pergunta_id: string;
  pergunta_pai_id: string;
  valor_gatilho: string;
  operador: string;
}

interface PerguntaMapeamento {
  id: string;
  formulario_id: string;
  pergunta_id: string;
  campo_solicitacao: string;
}

interface FormularioBuilderProps {
  formularioId: string;
  onClose: () => void;
}

const CAMPOS_SOLICITACAO = [
  { value: "cliente_nome", label: "Nome do Cliente" },
  { value: "cliente_email", label: "E-mail do Cliente" },
  { value: "cnpj", label: "CNPJ" },
  { value: "tipo_operacao", label: "Serviço Adicional" },
  { value: "numero_conteiner", label: "Número do Contêiner" },
  { value: "lpco", label: "LPCO" },
  { value: "tipo_carga", label: "Tipo de Carga" },
  { value: "data_posicionamento", label: "Data do Serviço" },
  { value: "data_agendamento", label: "Data/Hora do Agendamento" },
  { value: "observacoes", label: "Observações" },
  { value: "categoria", label: "Categoria" },
];

const FormularioBuilder = ({ formularioId, onClose }: FormularioBuilderProps) => {
  const [bancoPerguntas, setBancoPerguntas] = useState<BancoPergunta[]>([]);
  const [vinculadas, setVinculadas] = useState<FormularioPergunta[]>([]);
  const [condicionais, setCondicionais] = useState<PerguntaCondicional[]>([]);
  const [mapeamentos, setMapeamentos] = useState<PerguntaMapeamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Conditional dialog
  const [showCondDialog, setShowCondDialog] = useState(false);
  const [condTarget, setCondTarget] = useState<string>("");
  const [condPai, setCondPai] = useState<string>("");
  const [condValor, setCondValor] = useState<string>("");
  const [condOperador, setCondOperador] = useState("igual");

  // Mapping dialog
  const [showMapDialog, setShowMapDialog] = useState(false);
  const [mapPergunta, setMapPergunta] = useState<string>("");
  const [mapCampo, setMapCampo] = useState<string>("");

  useEffect(() => {
    fetchAll();
  }, [formularioId]);

  const fetchAll = async () => {
    setLoading(true);
    const [bancoPerguntasRes, vinculadasRes, condRes, mapRes] = await Promise.all([
      supabase.from("banco_perguntas").select("*").eq("ativo", true).order("rotulo"),
      supabase.from("formulario_perguntas").select("*").eq("formulario_id", formularioId).order("ordem"),
      supabase.from("pergunta_condicionais").select("*").eq("formulario_id", formularioId),
      supabase.from("pergunta_mapeamento").select("*").eq("formulario_id", formularioId),
    ]);

    const banco = (bancoPerguntasRes.data as BancoPergunta[]) || [];
    setBancoPerguntas(banco);

    const vincs = (vinculadasRes.data as FormularioPergunta[]) || [];
    // Attach pergunta data
    setVinculadas(
      vincs.map((v) => ({
        ...v,
        pergunta: banco.find((b) => b.id === v.pergunta_id),
      }))
    );

    setCondicionais((condRes.data as PerguntaCondicional[]) || []);
    setMapeamentos((mapRes.data as PerguntaMapeamento[]) || []);
    setLoading(false);
  };

  const addPergunta = async (perguntaId: string) => {
    const maxOrdem = vinculadas.length > 0 ? Math.max(...vinculadas.map((v) => v.ordem)) + 1 : 0;
    const { error } = await supabase.from("formulario_perguntas").insert({
      formulario_id: formularioId,
      pergunta_id: perguntaId,
      ordem: maxOrdem,
      obrigatorio: false,
    });
    if (error) { toast.error("Erro ao vincular pergunta"); return; }
    toast.success("Pergunta adicionada ao formulário!");
    fetchAll();
  };

  const removePergunta = async (id: string) => {
    await supabase.from("formulario_perguntas").delete().eq("id", id);
    toast.success("Pergunta removida!");
    fetchAll();
  };

  const toggleObrigatorio = async (fp: FormularioPergunta) => {
    await supabase
      .from("formulario_perguntas")
      .update({ obrigatorio: !fp.obrigatorio })
      .eq("id", fp.id);
    fetchAll();
  };

  const movePergunta = async (fp: FormularioPergunta, direction: "up" | "down") => {
    const index = vinculadas.findIndex((v) => v.id === fp.id);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= vinculadas.length) return;

    const other = vinculadas[swapIndex];
    await Promise.all([
      supabase.from("formulario_perguntas").update({ ordem: other.ordem }).eq("id", fp.id),
      supabase.from("formulario_perguntas").update({ ordem: fp.ordem }).eq("id", other.id),
    ]);
    fetchAll();
  };

  // Condicionais
  const saveCondicional = async () => {
    if (!condTarget || !condPai || !condValor.trim()) {
      toast.error("Preencha todos os campos da condicional");
      return;
    }
    const { error } = await supabase.from("pergunta_condicionais").insert({
      formulario_id: formularioId,
      pergunta_id: condTarget,
      pergunta_pai_id: condPai,
      valor_gatilho: condValor,
      operador: condOperador,
    });
    if (error) { toast.error("Erro ao salvar condicional"); return; }
    toast.success("Condicional criada!");
    setShowCondDialog(false);
    setCondTarget(""); setCondPai(""); setCondValor(""); setCondOperador("igual");
    fetchAll();
  };

  const deleteCondicional = async (id: string) => {
    await supabase.from("pergunta_condicionais").delete().eq("id", id);
    toast.success("Condicional removida!");
    fetchAll();
  };

  // Mapeamentos
  const saveMapeamento = async () => {
    if (!mapPergunta || !mapCampo) {
      toast.error("Preencha todos os campos");
      return;
    }
    const { error } = await supabase.from("pergunta_mapeamento").insert({
      formulario_id: formularioId,
      pergunta_id: mapPergunta,
      campo_solicitacao: mapCampo,
    });
    if (error) { toast.error("Erro ao salvar mapeamento"); return; }
    toast.success("Mapeamento criado!");
    setShowMapDialog(false);
    setMapPergunta(""); setMapCampo("");
    fetchAll();
  };

  const deleteMapeamento = async (id: string) => {
    await supabase.from("pergunta_mapeamento").delete().eq("id", id);
    toast.success("Mapeamento removido!");
    fetchAll();
  };

  const availablePerguntas = bancoPerguntas.filter(
    (b) =>
      !vinculadas.some((v) => v.pergunta_id === b.id) &&
      b.rotulo.toLowerCase().includes(search.toLowerCase())
  );

  const getPerguntaLabel = (id: string) =>
    bancoPerguntas.find((b) => b.id === id)?.rotulo || vinculadas.find((v) => v.pergunta_id === id)?.pergunta?.rotulo || id;

  if (loading) {
    return <div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Perguntas vinculadas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Perguntas do Formulário ({vinculadas.length})</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowCondDialog(true); }}>
                <GitBranch className="h-4 w-4 mr-1" />
                Condicional
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setShowMapDialog(true); }}>
                <Link2 className="h-4 w-4 mr-1" />
                Mapeamento
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {vinculadas.map((vp, index) => {
            const conds = condicionais.filter((c) => c.pergunta_id === vp.pergunta_id);
            const maps = mapeamentos.filter((m) => m.pergunta_id === vp.pergunta_id);
            return (
              <div key={vp.id} className="flex items-start gap-2 p-3 border rounded-lg bg-card">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-1" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{vp.pergunta?.rotulo || "—"}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {QUESTION_TYPES.find((t) => t.value === vp.pergunta?.tipo)?.label || vp.pergunta?.tipo}
                    </Badge>
                    {vp.obrigatorio && <Badge variant="secondary" className="text-xs">Obrigatório</Badge>}
                    {conds.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        <GitBranch className="h-3 w-3 mr-1" />
                        {conds.length} condicional(is)
                      </Badge>
                    )}
                    {maps.length > 0 && (
                      <Badge variant="default" className="text-xs">
                        <Link2 className="h-3 w-3 mr-1" />
                        {maps.map((m) => CAMPOS_SOLICITACAO.find((c) => c.value === m.campo_solicitacao)?.label || m.campo_solicitacao).join(", ")}
                      </Badge>
                    )}
                  </div>
                  {conds.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {conds.map((c) => (
                        <div key={c.id} className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>Exibir quando "{getPerguntaLabel(c.pergunta_pai_id)}" {c.operador} "{c.valor_gatilho}"</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => deleteCondicional(c.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Switch checked={vp.obrigatorio} onCheckedChange={() => toggleObrigatorio(vp)} />
                  <Button variant="ghost" size="icon" onClick={() => movePergunta(vp, "up")} disabled={index === 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => movePergunta(vp, "down")} disabled={index === vinculadas.length - 1}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removePergunta(vp.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {vinculadas.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pergunta vinculada. Adicione do banco abaixo.</p>
          )}
        </CardContent>
      </Card>

      {/* Mapeamentos ativos */}
      {mapeamentos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Mapeamentos para Solicitação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {mapeamentos.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                <span>
                  <strong>{getPerguntaLabel(m.pergunta_id)}</strong> → {CAMPOS_SOLICITACAO.find((c) => c.value === m.campo_solicitacao)?.label || m.campo_solicitacao}
                </span>
                <Button variant="ghost" size="icon" onClick={() => deleteMapeamento(m.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Banco de perguntas disponíveis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Adicionar do Banco de Perguntas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar no banco de perguntas..."
              className="pl-9"
            />
          </div>
          <div className="max-h-[300px] overflow-auto space-y-1">
            {availablePerguntas.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/30 transition-colors">
                <div>
                  <p className="text-sm font-medium">{p.rotulo}</p>
                  <Badge variant="outline" className="text-xs mt-0.5">
                    {QUESTION_TYPES.find((t) => t.value === p.tipo)?.label || p.tipo}
                  </Badge>
                </div>
                <Button size="sm" variant="outline" onClick={() => addPergunta(p.id)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            ))}
            {availablePerguntas.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                {search ? "Nenhuma pergunta encontrada" : "Todas as perguntas já estão vinculadas"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Condicional Dialog */}
      <Dialog open={showCondDialog} onOpenChange={setShowCondDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Condicional de Exibição</DialogTitle>
            <DialogDescription>Configure quando uma pergunta deve ser exibida com base na resposta de outra</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pergunta a ser condicionada (será exibida se...)</Label>
              <Select value={condTarget} onValueChange={setCondTarget}>
                <SelectTrigger><SelectValue placeholder="Selecione a pergunta" /></SelectTrigger>
                <SelectContent>
                  {vinculadas.map((v) => (
                    <SelectItem key={v.pergunta_id} value={v.pergunta_id}>
                      {v.pergunta?.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pergunta pai (a resposta desta define a exibição)</Label>
              <Select value={condPai} onValueChange={setCondPai}>
                <SelectTrigger><SelectValue placeholder="Selecione a pergunta pai" /></SelectTrigger>
                <SelectContent>
                  {vinculadas.filter((v) => v.pergunta_id !== condTarget).map((v) => (
                    <SelectItem key={v.pergunta_id} value={v.pergunta_id}>
                      {v.pergunta?.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Operador</Label>
                <Select value={condOperador} onValueChange={setCondOperador}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="igual">É igual a</SelectItem>
                    <SelectItem value="diferente">É diferente de</SelectItem>
                    <SelectItem value="contem">Contém</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor gatilho</Label>
                <Input value={condValor} onChange={(e) => setCondValor(e.target.value)} placeholder="Valor que ativa a exibição" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCondDialog(false)}>Cancelar</Button>
            <Button onClick={saveCondicional}>Salvar Condicional</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mapeamento Dialog */}
      <Dialog open={showMapDialog} onOpenChange={setShowMapDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Mapeamento</DialogTitle>
            <DialogDescription>Vincule a resposta desta pergunta a um campo da solicitação</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Pergunta</Label>
              <Select value={mapPergunta} onValueChange={setMapPergunta}>
                <SelectTrigger><SelectValue placeholder="Selecione a pergunta" /></SelectTrigger>
                <SelectContent>
                  {vinculadas.map((v) => (
                    <SelectItem key={v.pergunta_id} value={v.pergunta_id}>
                      {v.pergunta?.rotulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Campo da Solicitação</Label>
              <Select value={mapCampo} onValueChange={setMapCampo}>
                <SelectTrigger><SelectValue placeholder="Selecione o campo destino" /></SelectTrigger>
                <SelectContent>
                  {CAMPOS_SOLICITACAO.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMapDialog(false)}>Cancelar</Button>
            <Button onClick={saveMapeamento}>Salvar Mapeamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormularioBuilder;
