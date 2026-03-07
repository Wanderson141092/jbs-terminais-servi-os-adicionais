import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Edit, Trash2, Lock, FileText, Plus, AlertTriangle, ExternalLink } from "lucide-react";

interface SystemConfig {
  id: string;
  config_key: string;
  config_value: string | null;
  config_type: string;
  description: string | null;
  is_active: boolean;
}

interface DeferimentoTitulo {
  id: string;
  titulo: string;
  servico_ids: string[];
  ativo: boolean;
}

interface Servico {
  id: string;
  nome: string;
}

const LACRE_CONFIGS = [
  { key: "lacre_armador_mensagem_custo", label: "Mensagem de Custo do Lacre", description: "Mensagem exibida na consulta externa quando há custo de serviço para o lacre armador" },
  { key: "lacre_armador_titulo_externo", label: "Título Externo do Lacre", description: "Título exibido na seção de lacre armador na consulta externa" },
  { key: "lacre_armador_tipo_aceite", label: "Tipo de Aceite do Lacre", description: "Tipo de aceite para custo: 'informativo' ou 'aceite'" },
  { key: "lacre_armador_anexo_ativo", label: "Anexo de Foto do Lacre", description: "Ativa ou desativa o campo de anexo 'RIC do novo lacre com imagem do novo lacre' no formulário externo" },
  { key: "lacre_armador_periodo_manha", label: "Período Manhã", description: "Ativa ou desativa a opção de período 'Manhã' no formulário de Lacre Armador" },
  { key: "lacre_armador_periodo_tarde", label: "Período Tarde", description: "Ativa ou desativa a opção de período 'Tarde' no formulário de Lacre Armador" },
];

const EMAIL_TOGGLE_KEY = "solicitar_email_acompanhamento";

const PaginaExternaConfigManager = () => {
  const [lacreConfigs, setLacreConfigs] = useState<SystemConfig[]>([]);
  const [deferimentoTitulos, setDeferimentoTitulos] = useState<DeferimentoTitulo[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);

  // Portal do Cliente
  const [portalUrl, setPortalUrl] = useState("");
  const [portalActive, setPortalActive] = useState(true);
  const [portalConfigId, setPortalConfigId] = useState<string | null>(null);
  const [savingPortal, setSavingPortal] = useState(false);

  // Email toggle
  const [emailToggle, setEmailToggle] = useState(true);
  const [emailToggleId, setEmailToggleId] = useState<string | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  // Edit states
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showConfigDialog, setShowConfigDialog] = useState(false);

  // Deferimento titulo dialog
  const [showTituloDialog, setShowTituloDialog] = useState(false);
  const [editingTitulo, setEditingTitulo] = useState<DeferimentoTitulo | null>(null);
  const [tituloForm, setTituloForm] = useState({ titulo: "", servico_ids: [] as string[] });

  // (Pendência management removed - managed in Pág. Interna only)

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [lacreRes, titulosRes, svcRes, portalRes, emailRes] = await Promise.all([
      supabase.from("system_config").select("*").in("config_key", LACRE_CONFIGS.map(c => c.key)).order("config_key"),
      supabase.from("deferimento_titulos").select("*").order("created_at"),
      supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("page_config").select("*").eq("config_key", "portal_cliente_url").maybeSingle(),
      supabase.from("page_config").select("*").eq("config_key", EMAIL_TOGGLE_KEY).maybeSingle(),
    ]);
    setLacreConfigs(lacreRes.data || []);
    setDeferimentoTitulos(titulosRes.data || []);
    setServicos(svcRes.data || []);
    if (portalRes.data) {
      setPortalUrl(portalRes.data.config_value || "");
      setPortalActive(portalRes.data.is_active ?? true);
      setPortalConfigId(portalRes.data.id);
    }
    if (emailRes.data) {
      setEmailToggle(emailRes.data.is_active ?? true);
      setEmailToggleId(emailRes.data.id);
    }
    setLoading(false);
  };

  const savePortalConfig = async () => {
    setSavingPortal(true);
    const payload = {
      config_key: "portal_cliente_url",
      config_value: portalUrl.trim(),
      config_type: "url",
      description: "Link do Portal do Cliente exibido na página externa",
      is_active: portalActive,
      updated_at: new Date().toISOString(),
    };
    if (portalConfigId) {
      const { error } = await supabase.from("page_config").update(payload).eq("id", portalConfigId);
      if (error) { toast.error("Erro ao salvar"); setSavingPortal(false); return; }
    } else {
      const { data, error } = await supabase.from("page_config").insert(payload).select("id").single();
      if (error) { toast.error("Erro ao criar configuração"); setSavingPortal(false); return; }
      setPortalConfigId(data.id);
    }
    toast.success("Link do Portal salvo!");
    setSavingPortal(false);
  };

  // ===== LACRE CONFIG =====
  const openConfigEdit = (config: SystemConfig) => {
    setEditingConfig(config);
    setEditValue(config.config_value || "");
    setShowConfigDialog(true);
  };

  const saveConfig = async () => {
    if (!editingConfig) return;
    const { error } = await supabase.from("system_config").update({
      config_value: editValue,
      updated_at: new Date().toISOString(),
    }).eq("id", editingConfig.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Configuração salva!");
    setShowConfigDialog(false);
    fetchAll();
  };

  const toggleConfigActive = async (config: SystemConfig) => {
    await supabase.from("system_config").update({ is_active: !config.is_active }).eq("id", config.id);
    fetchAll();
  };

  // ===== DEFERIMENTO TITULOS =====
  const openTituloDialog = (titulo?: DeferimentoTitulo) => {
    if (titulo) {
      setEditingTitulo(titulo);
      setTituloForm({ titulo: titulo.titulo, servico_ids: titulo.servico_ids || [] });
    } else {
      setEditingTitulo(null);
      setTituloForm({ titulo: "", servico_ids: [] });
    }
    setShowTituloDialog(true);
  };

  const saveTitulo = async () => {
    if (!tituloForm.titulo.trim()) { toast.error("Título obrigatório"); return; }
    const data = { titulo: tituloForm.titulo.trim(), servico_ids: tituloForm.servico_ids, updated_at: new Date().toISOString() };
    if (editingTitulo) {
      const { error } = await supabase.from("deferimento_titulos").update(data).eq("id", editingTitulo.id);
      if (error) { toast.error("Erro ao atualizar"); return; }
      toast.success("Título atualizado!");
    } else {
      const { error } = await supabase.from("deferimento_titulos").insert(data);
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Título criado!");
    }
    setShowTituloDialog(false);
    fetchAll();
  };

  const deleteTitulo = async (id: string) => {
    const { error } = await supabase.from("deferimento_titulos").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Título excluído!");
    fetchAll();
  };

  const toggleTituloAtivo = async (titulo: DeferimentoTitulo) => {
    await supabase.from("deferimento_titulos").update({ ativo: !titulo.ativo }).eq("id", titulo.id);
    fetchAll();
  };

  // Pendência management removed - managed exclusively in Pág. Interna

  const getServicoNome = (id: string) => servicos.find(s => s.id === id)?.nome || id.slice(0, 8);

  if (loading) return <p className="text-muted-foreground text-center py-8">Carregando...</p>;

  return (
    <div className="space-y-6">
      {/* Email Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-5 w-5 text-blue-600" />
            E-mail de Acompanhamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between border rounded-md p-3">
            <div>
              <Label className="font-medium">Solicitar e-mail para acompanhamento do processo</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Se ativado, o campo de e-mail será exibido na tela de confirmação após o envio do formulário externo.
              </p>
            </div>
            <Switch checked={emailToggle} onCheckedChange={async (checked) => {
              setEmailToggle(checked);
              setSavingEmail(true);
              const payload = {
                config_key: EMAIL_TOGGLE_KEY,
                config_value: checked ? "true" : "false",
                config_type: "boolean",
                description: "Solicitar e-mail para acompanhamento do processo na página externa",
                is_active: checked,
                updated_at: new Date().toISOString(),
              };
              if (emailToggleId) {
                await supabase.from("page_config").update(payload).eq("id", emailToggleId);
              } else {
                const { data } = await supabase.from("page_config").insert(payload).select("id").single();
                if (data) setEmailToggleId(data.id);
              }
              toast.success(checked ? "E-mail ativado!" : "E-mail desativado!");
              setSavingEmail(false);
            }} />
          </div>
        </CardContent>
      </Card>

      {/* Portal do Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ExternalLink className="h-5 w-5 text-secondary" />
            Portal do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={portalActive} onCheckedChange={setPortalActive} />
            <Label className="text-sm">{portalActive ? "Botão visível na página externa" : "Botão oculto"}</Label>
          </div>
          <div>
            <Label>Link do Portal</Label>
            <Input
              value={portalUrl}
              onChange={(e) => setPortalUrl(e.target.value)}
              placeholder="https://portal.exemplo.com.br"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">URL que será aberta ao clicar no botão "Portal do Cliente" no cabeçalho.</p>
          </div>
          <Button onClick={savePortalConfig} disabled={savingPortal} size="sm">
            <Save className="h-4 w-4 mr-1" /> {savingPortal ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Lacre Armador Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-5 w-5 text-amber-600" />
            Configurações do Lacre Armador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Configuração</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {LACRE_CONFIGS.map(cfg => {
                const dbConfig = lacreConfigs.find(c => c.config_key === cfg.key);
                if (!dbConfig) return (
                  <TableRow key={cfg.key}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{cfg.label}</p>
                        <p className="text-xs text-muted-foreground">{cfg.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm italic">Não configurado</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                  </TableRow>
                );
                return (
                  <TableRow key={cfg.key} className={!dbConfig.is_active ? "opacity-50" : ""}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{cfg.label}</p>
                        <p className="text-xs text-muted-foreground">{cfg.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{dbConfig.config_value || "—"}</TableCell>
                    <TableCell>
                      <Switch checked={dbConfig.is_active} onCheckedChange={() => toggleConfigActive(dbConfig)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openConfigEdit(dbConfig)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Deferimento Títulos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-blue-600" />
            Títulos de Deferimento ({deferimentoTitulos.length})
          </CardTitle>
          <Button size="sm" onClick={() => openTituloDialog()}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Serviços</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deferimentoTitulos.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">Nenhum título cadastrado.</TableCell></TableRow>
              ) : deferimentoTitulos.map(t => (
                <TableRow key={t.id} className={!t.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{t.titulo}</TableCell>
                  <TableCell className="text-xs">
                    {t.servico_ids?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {t.servico_ids.map(id => <Badge key={id} variant="outline" className="text-[10px]">{getServicoNome(id)}</Badge>)}
                      </div>
                    ) : <span className="text-muted-foreground">Todos</span>}
                  </TableCell>
                  <TableCell><Switch checked={t.ativo} onCheckedChange={() => toggleTituloAtivo(t)} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openTituloDialog(t)}><Edit className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Excluir "{t.titulo}"?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteTitulo(t.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pendência management moved to Pág. Interna */}

      {/* Config Edit Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Configuração</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{editingConfig?.description}</p>
            {editingConfig?.config_key === "lacre_armador_tipo_aceite" ? (
              <Select value={editValue} onValueChange={setEditValue}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="informativo">Informativo</SelectItem>
                  <SelectItem value="aceite">Aceite obrigatório</SelectItem>
                </SelectContent>
              </Select>
            ) : ["lacre_armador_anexo_ativo", "lacre_armador_periodo_manha", "lacre_armador_periodo_tarde"].includes(editingConfig?.config_key || "") ? (
              <Select value={editValue || "true"} onValueChange={setEditValue}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Desativado</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={3} />
            )}
          </div>
          <DialogFooter><Button onClick={saveConfig}><Save className="h-4 w-4 mr-1" /> Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Titulo Dialog */}
      <Dialog open={showTituloDialog} onOpenChange={setShowTituloDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingTitulo ? "Editar" : "Adicionar"} Título de Deferimento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título</Label>
              <Input value={tituloForm.titulo} onChange={(e) => setTituloForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Deferimento de Liberação" />
            </div>
            <div>
              <Label>Serviços (vazio = todos)</Label>
              <div className="space-y-1 max-h-32 overflow-auto border rounded p-2 mt-1">
                {servicos.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={tituloForm.servico_ids.includes(s.id)} onChange={() => setTituloForm(p => ({ ...p, servico_ids: p.servico_ids.includes(s.id) ? p.servico_ids.filter(x => x !== s.id) : [...p.servico_ids, s.id] }))} />
                    {s.nome}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={saveTitulo}><Save className="h-4 w-4 mr-1" /> Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pendência dialog removed - managed in Pág. Interna */}
    </div>
  );
};

export default PaginaExternaConfigManager;
