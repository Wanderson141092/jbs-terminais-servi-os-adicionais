import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Save, Edit, Trash2, FileText, Eye, Download, Database, Settings2, HelpCircle, List, Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useGestorCheck } from "@/hooks/useGestorCheck";
import BancoPerguntasManager from "@/components/admin/BancoPerguntasManager";
import FormularioBuilder from "@/components/admin/FormularioBuilder";
import CamposDinamicosManager from "@/components/admin/CamposDinamicosManager";
import EstilosFormularioManager from "@/components/admin/EstilosFormularioManager";
import { normalizeFormValue } from "@/lib/normalizeFormValue";

interface Formulario {
  id: string;
  titulo: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  estilo?: string;
  servico_id?: string | null;
}

interface PerguntaExportavel {
  id: string;
  rotulo: string;
  formulario_id: string;
  pergunta_id: string;
  obrigatorio: boolean;
  ordem: number;
  pergunta?: {
    id: string;
    rotulo: string;
    tipo: string;
  } | null;
}

interface Resposta {
  id: string;
  formulario_id: string;
  respostas: unknown;
  arquivos: unknown;
  created_at: string;
}

interface FormStyle {
  id: string;
  chave: string;
  nome: string;
  descricao: string | null;
  features: string[];
  ativo: boolean;
}

interface ManualSecao {
  titulo: string;
  descricao: string;
  campos?: { nome: string; descricao: string; obrigatorio?: boolean }[];
  acoes?: { nome: string; descricao: string }[];
  subsecoes?: { titulo: string; descricao: string; campos?: { nome: string; descricao: string; obrigatorio?: boolean }[]; acoes?: { nome: string; descricao: string }[] }[];
}

const FORMULARIOS_MANUAL: ManualSecao[] = [
  {
    titulo: "Aba: Formulários",
    descricao: "Lista todos os formulários cadastrados. Cada formulário pode ser ativado/desativado, editado, configurado com o construtor ou ter suas respostas visualizadas.",
    campos: [
      { nome: "Título", descricao: "Nome de identificação do formulário exibido na listagem e no cabeçalho público.", obrigatorio: true },
      { nome: "Descrição", descricao: "Texto explicativo exibido abaixo do título no formulário público." },
      { nome: "Serviço Vinculado", descricao: "Define a qual serviço este formulário pertence. ESSENCIAL para a geração correta do protocolo (usa o código prefixo do serviço) e para preencher automaticamente o campo 'Serviço Adicional' na solicitação, mesmo sem mapeamento manual do campo 'tipo_operacao'." },
      { nome: "Estilo", descricao: "Estilo visual e funcional do formulário (JBS, Minimal, etc.). Cada estilo tem características próprias de layout e cores." },
      { nome: "Status (Ativo/Inativo)", descricao: "Controla se o formulário está disponível para preenchimento público." },
    ],
    acoes: [
      { nome: "Novo Formulário", descricao: "Cria um formulário com título, descrição, serviço vinculado e estilo." },
      { nome: "Construtor (⚙️)", descricao: "Abre o construtor para adicionar/remover perguntas, configurar condicionais e mapeamentos." },
      { nome: "Ver Respostas (👁️)", descricao: "Visualiza todas as respostas enviadas para o formulário com opção de exportar CSV." },
      { nome: "Editar (✏️)", descricao: "Altera título, descrição, serviço vinculado e estilo." },
      { nome: "Excluir (🗑️)", descricao: "Remove permanentemente o formulário." },
    ],
  },
  {
    titulo: "Construtor do Formulário",
    descricao: "Tela principal de configuração de perguntas. Aqui você monta o formulário selecionando perguntas do banco, define regras de exibição condicional e mapeia respostas para os campos do sistema.",
    subsecoes: [
      {
        titulo: "Perguntas Vinculadas",
        descricao: "Lista as perguntas adicionadas ao formulário, em ordem de exibição.",
        campos: [
          { nome: "Obrigatório (Switch)", descricao: "Se ativado, o usuário não pode enviar o formulário sem preencher esta pergunta." },
          { nome: "Ordem (Setas ↑↓)", descricao: "Move a pergunta para cima ou para baixo na lista." },
        ],
      },
      {
        titulo: "Condicionais de Exibição",
        descricao: "Define regras para exibir/ocultar uma pergunta com base na resposta de outra.",
        campos: [
          { nome: "Pergunta Condicionada", descricao: "Pergunta que será exibida ou ocultada conforme a regra.", obrigatorio: true },
          { nome: "Pergunta Pai", descricao: "Pergunta cuja resposta determina a exibição.", obrigatorio: true },
          { nome: "Operador", descricao: "'É igual a', 'É diferente de' ou 'Contém'.", obrigatorio: true },
          { nome: "Valor Gatilho", descricao: "Valor da resposta do pai que ativa a exibição.", obrigatorio: true },
        ],
      },
      {
        titulo: "Mapeamentos (CRÍTICO para não perder dados)",
        descricao: "Vincula a resposta de uma pergunta a um campo do sistema. Sem mapeamento, a resposta fica salva apenas no registro bruto do formulário e NÃO aparece nos campos padrão da solicitação.",
        campos: [
          { nome: "Pergunta", descricao: "Pergunta cujo valor será mapeado.", obrigatorio: true },
          { nome: "Tipo de Destino", descricao: "'Campo fixo da solicitação' OU 'Campo dinâmico de análise'.", obrigatorio: true },
          { nome: "Campo Fixo", descricao: "Mapeia para uma coluna direta da solicitação (cliente_nome, cnpj, numero_conteiner, etc.)." },
          { nome: "Campo Dinâmico", descricao: "Mapeia para um campo de análise criado na aba 'Campos Dinâmicos'. Exibido na seção 'Campos de Análise'." },
        ],
        acoes: [
          { nome: "Novo Mapeamento", descricao: "Cria vínculo entre pergunta e campo de destino." },
          { nome: "Criar Campo (+)", descricao: "Cria um novo campo dinâmico de análise diretamente do construtor." },
          { nome: "Excluir Mapeamento", descricao: "Remove o vínculo." },
        ],
      },
    ],
  },
  {
    titulo: "Aba: Perguntas (Banco de Perguntas)",
    descricao: "Repositório centralizado de perguntas reutilizáveis em múltiplos formulários.",
    campos: [
      { nome: "Rótulo", descricao: "Texto da pergunta exibido no formulário público.", obrigatorio: true },
      { nome: "Tipo", descricao: "Texto, Área de Texto, Seleção, Múltipla Escolha, Data, Upload, Informativo, Subtítulo, Condicional, Conjunta, Contêiner, CNPJ.", obrigatorio: true },
      { nome: "Placeholder", descricao: "Texto de exemplo exibido dentro do campo quando vazio." },
      { nome: "Opções", descricao: "Para tipos Seleção e Múltipla Escolha: lista de opções separadas por vírgula." },
      { nome: "Descrição", descricao: "Texto exibido abaixo do rótulo em fonte menor e itálica." },
      { nome: "Configurações (Config)", descricao: "Configurações avançadas em JSON: largura, aceite obrigatório, sub-perguntas, etc." },
    ],
  },
  {
    titulo: "Aba: Campos Dinâmicos",
    descricao: "Gerencia campos de análise customizáveis vinculados a perguntas via mapeamento.",
    campos: [
      { nome: "Nome", descricao: "Identificador do campo exibido na análise interna.", obrigatorio: true },
      { nome: "Tipo", descricao: "Tipo de dado: Texto, Número, Data, Checkbox, Seleção.", obrigatorio: true },
      { nome: "Serviços Vinculados", descricao: "Define para quais serviços este campo é exibido na análise." },
      { nome: "Obrigatório", descricao: "Se ativado, o campo deve ser preenchido na análise interna." },
      { nome: "Visível Externamente", descricao: "Se ativado, o valor aparece no portal de consulta externa." },
    ],
  },
  {
    titulo: "Aba: Estilos",
    descricao: "Gerencia os estilos visuais disponíveis para os formulários.",
    campos: [
      { nome: "Nome", descricao: "Nome do estilo exibido na seleção.", obrigatorio: true },
      { nome: "Chave", descricao: "Identificador interno do estilo (gerado automaticamente).", obrigatorio: true },
      { nome: "Features", descricao: "Lista de funcionalidades/características do estilo." },
      { nome: "Configuração", descricao: "JSON com cores, fontes e outros parâmetros visuais." },
    ],
  },
  {
    titulo: "⚠️ Guia de Mapeamento (Evitando Perda de Dados)",
    descricao: "RESUMO CRÍTICO: Para que as respostas do formulário apareçam corretamente na página interna:",
    campos: [
      { nome: "1. Vincular Serviço", descricao: "Edite o formulário e selecione o serviço correspondente." },
      { nome: "2. Mapear Campos Fixos", descricao: "No construtor, vincule perguntas como Nome, E-mail, CNPJ, Contêiner aos campos fixos." },
      { nome: "3. Mapear Campos Dinâmicos", descricao: "Para dados adicionais, crie campos dinâmicos e mapeie as perguntas. Valores aparecem em 'Campos de Análise'." },
      { nome: "4. Respostas Não Mapeadas", descricao: "Perguntas sem mapeamento são exibidas na seção 'Respostas do Formulário', mas NÃO preenchem campos padrão." },
      { nome: "5. Anexos", descricao: "Arquivos enviados via Upload são salvos automaticamente e exibidos na seção 'Anexos do Formulário'." },
    ],
  },
];

const FormulariosManual = () => (
  <ScrollArea className="h-[calc(100vh-220px)]">
    <div className="space-y-6 pb-10 pr-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <HelpCircle className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Manual de Formulários</h2>
          <p className="text-sm text-muted-foreground">Documentação de todas as funcionalidades de criação e gestão de formulários.</p>
        </div>
      </div>

      {FORMULARIOS_MANUAL.map((secao, idx) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle className="text-lg">{secao.titulo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">{secao.descricao}</p>

            {secao.campos && secao.campos.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <List className="h-4 w-4 text-primary" />
                  Campos Disponíveis
                </h4>
                <div className="space-y-3">
                  {secao.campos.map((campo, cIdx) => (
                    <div key={cIdx} className="border-l-2 border-muted pl-3 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{campo.nome}</span>
                        {campo.obrigatorio && <Badge variant="secondary" className="text-[10px]">Obrigatório</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{campo.descricao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {secao.acoes && secao.acoes.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  Ações Disponíveis
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  {secao.acoes.map((acao, aIdx) => (
                    <div key={aIdx} className="bg-muted/30 p-3 rounded-md">
                      <span className="font-semibold text-sm block mb-1">{acao.nome}</span>
                      <p className="text-xs text-muted-foreground">{acao.descricao}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {secao.subsecoes && secao.subsecoes.map((sub, sIdx) => (
              <div key={sIdx} className="mt-6 pt-6 border-t">
                <h4 className="font-semibold text-base mb-2">{sub.titulo}</h4>
                <p className="text-sm text-muted-foreground mb-4">{sub.descricao}</p>
                {sub.campos && (
                  <div className="space-y-2">
                    {sub.campos.map((campo, scIdx) => (
                      <div key={scIdx} className="border-l-2 border-muted pl-3 py-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{campo.nome}</span>
                          {campo.obrigatorio && <Badge variant="secondary" className="text-[10px]">Obrigatório</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{campo.descricao}</p>
                      </div>
                    ))}
                  </div>
                )}
                {sub.acoes && (
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    {sub.acoes.map((acao, aIdx) => (
                      <div key={aIdx} className="bg-muted/30 p-3 rounded-md">
                        <span className="font-semibold text-sm block mb-1">{acao.nome}</span>
                        <p className="text-xs text-muted-foreground">{acao.descricao}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  </ScrollArea>
);

const AdminFormularios = () => {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { isAdmin: isCurrentUserAdmin } = useAdminCheck(currentUserId);
  const { isGestor } = useGestorCheck(currentUserId);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  const [loading, setLoading] = useState(true);
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [perguntasExportacao, setPerguntasExportacao] = useState<PerguntaExportavel[]>([]);
  const [campos, setCampos] = useState<PerguntaExportavel[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [formStyles, setFormStyles] = useState<FormStyle[]>([]);

  // Form dialog
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingForm, setEditingForm] = useState<Formulario | null>(null);
  const [formData, setFormData] = useState({ titulo: "", descricao: "", estilo: "jbs", servico_id: "" });
  const [selectedStyle, setSelectedStyle] = useState("jbs");
  const [servicos, setServicos] = useState<{ id: string; nome: string }[]>([]);

  // Builder dialog
  const [showBuilderDialog, setShowBuilderDialog] = useState(false);
  const [builderFormId, setBuilderFormId] = useState<string | null>(null);

  // Responses dialog
  const [showResponsesDialog, setShowResponsesDialog] = useState(false);
  const [selectedFormForResponses, setSelectedFormForResponses] = useState<string | null>(null);

  useEffect(() => { fetchFormularios(); fetchStyles(); fetchServicos(); }, []);

  const fetchServicos = async () => {
    const { data } = await supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome");
    setServicos(data || []);
  };

  const fetchFormularios = async () => {
    setLoading(true);
    const { data } = await supabase.from("formularios").select("*").order("created_at", { ascending: false });
    setFormularios(data || []);
    setLoading(false);
  };

  const fetchStyles = async () => {
    const { data } = await supabase.from("estilos_formulario").select("*").eq("ativo", true).order("ordem");
    setFormStyles((data as FormStyle[]) || []);
  };

  const fetchPerguntasExportacao = async (formularioId: string) => {
    const { data } = await supabase
      .from("formulario_perguntas")
      .select("ordem, pergunta_id, banco_perguntas(id, rotulo)")
      .eq("formulario_id", formularioId)
      .order("ordem");

    const perguntas = (data || [])
      .map((fp: any) => ({
        id: fp.pergunta_id || fp.banco_perguntas?.id,
        rotulo: fp.banco_perguntas?.rotulo || fp.pergunta_id || "Pergunta sem rótulo",
        ordem: fp.ordem || 0,
      }))
      .filter((p: any) => !!p.id);

    setPerguntasExportacao(perguntas as any);
  };

  const fetchRespostas = async (formularioId: string) => {
    const { data } = await supabase.from("formulario_respostas").select("*").eq("formulario_id", formularioId).order("created_at", { ascending: false });
    setRespostas(data || []);
  };

  // Form CRUD
  const openFormDialog = (form?: any) => {
    if (form) {
      setEditingForm(form);
      const estilo = form.estilo || "jbs";
      setFormData({ titulo: form.titulo, descricao: form.descricao || "", estilo, servico_id: form.servico_id || "" });
      setSelectedStyle(estilo);
    } else {
      setEditingForm(null);
      setFormData({ titulo: "", descricao: "", estilo: "jbs", servico_id: "" });
      setSelectedStyle("jbs");
    }
    setShowFormDialog(true);
  };

  const saveForm = async () => {
    if (!formData.titulo.trim()) { toast.error("Título é obrigatório"); return; }
    if (!formData.servico_id) {
      toast.error("Selecione um serviço válido para salvar o formulário.");
      return;
    }
    if (!servicos.some((servico) => servico.id === formData.servico_id)) {
      toast.error("O serviço selecionado é inválido ou está inativo. Escolha outro serviço.");
      return;
    }

    if (editingForm) {
      const { error } = await supabase.from("formularios").update({
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        estilo: formData.estilo,
        servico_id: formData.servico_id,
        updated_at: new Date().toISOString(),
      }).eq("id", editingForm.id);
      if (error) { toast.error("Erro ao atualizar formulário"); return; }
      toast.success("Formulário atualizado!");
    } else {
      const { error } = await supabase.from("formularios").insert({
        titulo: formData.titulo,
        descricao: formData.descricao || null,
        estilo: formData.estilo,
        servico_id: formData.servico_id,
      });
      if (error) { toast.error("Erro ao criar formulário"); return; }
      toast.success("Formulário criado!");
    }
    setShowFormDialog(false);
    fetchFormularios();
  };

  const toggleFormActive = async (form: Formulario) => {
    const { error } = await supabase.from("formularios").update({ ativo: !form.ativo, updated_at: new Date().toISOString() }).eq("id", form.id);
    if (error) { toast.error("Erro ao atualizar status"); return; }
    toast.success(form.ativo ? "Formulário desativado" : "Formulário ativado");
    fetchFormularios();
  };

  const deleteForm = async (form: Formulario) => {
    const { error } = await supabase.from("formularios").delete().eq("id", form.id);
    if (error) { toast.error("Erro ao excluir formulário"); return; }
    toast.success("Formulário excluído!");
    fetchFormularios();
  };

  // Builder
  const openBuilder = (formularioId: string) => {
    setBuilderFormId(formularioId);
    setShowBuilderDialog(true);
  };

  // Responses
  const openResponsesDialog = async (formularioId: string) => {
    setSelectedFormForResponses(formularioId);
    await fetchPerguntasExportacao(formularioId);
    await fetchRespostas(formularioId);
    setShowResponsesDialog(true);
  };

  const exportXLSX = async () => {
    if (perguntasExportacao.length === 0 || respostas.length === 0) return;
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Respostas");

    // Headers
    const headers = ["Data", ...perguntasExportacao.map((p) => p.rotulo)];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } };
    });

    // Data rows
    for (const r of respostas) {
      const respostasObj = r.respostas as Record<string, unknown>;
      const row = [
        new Date(r.created_at).toLocaleString("pt-BR"),
        ...perguntasExportacao.map((p) => {
          const val = respostasObj[p.id];
          return normalizeFormValue(val, { nullishFallback: "", preserveObjects: true });
        }),
      ];
      sheet.addRow(row);
    }

    // Auto-width columns
    sheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = String(cell.value || "").length;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 2, 50);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `respostas_${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><p className="text-muted-foreground">Carregando...</p></div>;
  }

  // Access guard: only admin or gestor
  if (!loading && !isCurrentUserAdmin && !isGestor) {
    navigate("/interno/dashboard");
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/interno/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Formulários</h1>
          </div>
        </div>
      </div>

      <Tabs defaultValue="formularios" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 max-w-3xl">
          <TabsTrigger value="formularios" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Formulários
          </TabsTrigger>
          <TabsTrigger value="perguntas" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Perguntas
          </TabsTrigger>
          <TabsTrigger value="campos_dinamicos" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Campos Dinâmicos
          </TabsTrigger>
          <TabsTrigger value="estilos" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Estilos
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Manual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formularios">
          <div className="flex justify-end mb-4">
            <Button onClick={() => openFormDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Formulário
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Formulários Cadastrados ({formularios.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Serviço Vinculado</TableHead>
                    <TableHead>Estilo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formularios.map((form) => (
                    <TableRow key={form.id} className={!form.ativo ? "opacity-50" : ""}>
                      <TableCell className="font-medium">{form.titulo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{form.descricao || "—"}</TableCell>
                      <TableCell>
                        {form.servico_id ? (
                          <Badge variant="secondary" className="text-xs">{servicos.find(s => s.id === form.servico_id)?.nome || "—"}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Nenhum</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {formStyles.find((s) => s.chave === (form.estilo || "jbs"))?.nome || form.estilo || "JBS"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch checked={form.ativo} onCheckedChange={() => toggleFormActive(form)} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openBuilder(form.id)} title="Construtor de perguntas">
                            <Settings2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openResponsesDialog(form.id)} title="Ver respostas">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openFormDialog(form)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteForm(form)} className="text-destructive hover:text-destructive" title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {formularios.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum formulário cadastrado</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perguntas">
          <BancoPerguntasManager />
        </TabsContent>

        <TabsContent value="campos_dinamicos">
          <CamposDinamicosManager />
        </TabsContent>

        <TabsContent value="estilos">
          <EstilosFormularioManager />
        </TabsContent>

        <TabsContent value="manual">
          <FormulariosManual />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editingForm ? "Editar Formulário" : "Novo Formulário"}</DialogTitle>
            <DialogDescription>Configure as informações básicas e o estilo do formulário</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label>Título</Label>
              <Input value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} placeholder="Nome do formulário" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} placeholder="Descrição opcional" />
            </div>
            <div>
              <Label>Serviço Vinculado</Label>
              <p className="text-xs text-muted-foreground mb-1">Vincule este formulário ao serviço correspondente para geração correta do protocolo e mapeamento automático do "Serviço Adicional".</p>
              <Select value={formData.servico_id} onValueChange={(v) => setFormData({ ...formData, servico_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
                <SelectContent>
                  {servicos.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-3 block">Estilo do Formulário</Label>
              <p className="text-sm text-muted-foreground mb-4">Escolha o estilo visual e funcional do formulário.</p>
              <div className="grid grid-cols-1 gap-3">
                {formStyles.map((style) => (
                  <div
                    key={style.chave}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedStyle === style.chave ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-muted-foreground"
                    }`}
                    onClick={() => { setSelectedStyle(style.chave); setFormData({ ...formData, estilo: style.chave }); }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${selectedStyle === style.chave ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                        {selectedStyle === style.chave && <div className="w-full h-full flex items-center justify-center"><div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" /></div>}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{style.nome}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{style.descricao}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {style.features.map((f, i) => <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowFormDialog(false)}>Cancelar</Button>
            <Button onClick={saveForm}><Save className="h-4 w-4 mr-2" />Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Builder Dialog */}
      <Dialog open={showBuilderDialog} onOpenChange={setShowBuilderDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Construtor do Formulário
            </DialogTitle>
            <DialogDescription>Selecione perguntas do banco, configure condicionais e mapeamentos</DialogDescription>
          </DialogHeader>
          {builderFormId && (
            <FormularioBuilder
              formularioId={builderFormId}
              onClose={() => setShowBuilderDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Responses Dialog */}
      <Dialog open={showResponsesDialog} onOpenChange={setShowResponsesDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Respostas ({respostas.length})
              {respostas.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportXLSX}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>Visualize as respostas enviadas para este formulário</DialogDescription>
          </DialogHeader>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  {perguntasExportacao.map((p) => <TableHead key={p.id}>{p.rotulo}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {respostas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                    {perguntasExportacao.map((p) => {
                      const respostasObj = r.respostas as Record<string, unknown>;
                      const val = respostasObj[p.id];
                      const arquivosArr = r.arquivos as { pergunta_id?: string; campo_id?: string; file_url: string; file_name: string }[] | null;
                      const arquivo = arquivosArr?.find((a) => (a.pergunta_id || a.campo_id) === p.id);
                      if (arquivo) {
                        return <TableCell key={p.id}><a href={arquivo.file_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">{arquivo.file_name}</a></TableCell>;
                      }
                      return <TableCell key={p.id} className="text-sm">{normalizeFormValue(val, { nullishFallback: "—", preserveObjects: true })}</TableCell>;
                    })}
                  </TableRow>
                ))}
                {respostas.length === 0 && (
                  <TableRow><TableCell colSpan={perguntasExportacao.length + 1} className="text-center text-muted-foreground py-8">Nenhuma resposta recebida</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFormularios;
