import { useState, useEffect } from "react";
import { Lock, Check, X, Clock, User, Phone, Mail, Calendar, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LacreArmadorDialogProps {
  solicitacao: any;
  userId: string;
  onClose: () => void;
}

interface LacreData {
  id: string;
  lacre_coletado: boolean | null;
  foto_lacre_url: string | null;
  foto_lacre_path: string | null;
  data_posicionamento_lacre: string | null;
  periodo_lacre: string | null;
  responsavel_nome: string | null;
  responsavel_telefone: string | null;
  responsavel_email: string | null;
  lacre_status: string;
  motivo_recusa: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  aguardando_preenchimento: { label: "Aguardando Preenchimento", color: "bg-amber-100 text-amber-700 border-amber-300" },
  aguardando_confirmacao: { label: "Aguardando Confirmação", color: "bg-blue-100 text-blue-700 border-blue-300" },
  posicionamento_confirmado: { label: "Posicionamento Confirmado", color: "bg-green-100 text-green-700 border-green-300" },
  aguardando_lacre: { label: "Aguardando Lacre", color: "bg-amber-100 text-amber-700 border-amber-300" },
  servico_concluido: { label: "Serviço Concluído", color: "bg-green-100 text-green-700 border-green-300" },
  recusado: { label: "Recusado", color: "bg-red-100 text-red-700 border-red-300" },
};

const LacreArmadorDialog = ({ solicitacao, userId, onClose }: LacreArmadorDialogProps) => {
  const [lacreData, setLacreData] = useState<LacreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRecusaDialog, setShowRecusaDialog] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [fotoSignedUrl, setFotoSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchLacreData();
  }, [solicitacao.id]);

  const fetchLacreData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lacre_armador_dados")
      .select("*")
      .eq("solicitacao_id", solicitacao.id)
      .maybeSingle();

    if (data) {
      setLacreData(data as LacreData);
      // Generate signed URL for photo
      if (data.foto_lacre_path) {
        const { data: signedData } = await supabase.storage
          .from("deferimento")
          .createSignedUrl(data.foto_lacre_path, 3600);
        if (signedData) setFotoSignedUrl(signedData.signedUrl);
      }
    }
    setLoading(false);
  };

  const handleConfirmar = async () => {
    if (!lacreData) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("lacre_armador_dados")
      .update({ lacre_status: "posicionamento_confirmado", motivo_recusa: null, confirmado_por: userId, confirmado_data: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", lacreData.id);

    if (error) {
      toast.error("Erro ao confirmar posicionamento");
    } else {
      await logAudit("lacre_posicionamento_confirmado", `Posicionamento confirmado para lacre armador. Responsável: ${lacreData.responsavel_nome || "—"}`);
      await createNotification(`Posicionamento de lacre confirmado para ${solicitacao.protocolo}`, "lacre_armador");
      toast.success("Posicionamento confirmado!");
      fetchLacreData();
    }
    setActionLoading(false);
  };

  const handleRecusar = async () => {
    if (!lacreData || !motivoRecusa.trim()) {
      toast.error("Informe o motivo da recusa");
      return;
    }
    setActionLoading(true);
    const { error } = await supabase
      .from("lacre_armador_dados")
      .update({ lacre_status: "recusado", motivo_recusa: motivoRecusa, updated_at: new Date().toISOString() })
      .eq("id", lacreData.id);

    if (error) {
      toast.error("Erro ao recusar solicitação");
    } else {
      await logAudit("lacre_posicionamento_recusado", `Posicionamento recusado para lacre armador. Motivo: ${motivoRecusa}`);
      await createNotification(`Posicionamento de lacre recusado para ${solicitacao.protocolo}`, "lacre_armador");
      toast.success("Solicitação recusada!");
      setShowRecusaDialog(false);
      setMotivoRecusa("");
      fetchLacreData();
    }
    setActionLoading(false);
  };

  const handleAvancarStatus = async (novoStatus: string) => {
    if (!lacreData) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("lacre_armador_dados")
      .update({ lacre_status: novoStatus, updated_at: new Date().toISOString() })
      .eq("id", lacreData.id);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      await logAudit(`lacre_status_${novoStatus}`, `Status do lacre armador atualizado para: ${STATUS_LABELS[novoStatus]?.label || novoStatus}`);
      toast.success(`Status atualizado: ${STATUS_LABELS[novoStatus]?.label || novoStatus}`);
      
      // When lacre service is concluded, auto-resolve lacre pendency
      if (novoStatus === "servico_concluido") {
        await autoResolveLacrePendency();
      }
      
      fetchLacreData();
    }
    setActionLoading(false);
  };

  const autoResolveLacrePendency = async () => {
    // Fetch current solicitation data
    const { data: sol } = await supabase
      .from("solicitacoes")
      .select("pendencias_selecionadas, status, solicitar_deferimento")
      .eq("id", solicitacao.id)
      .maybeSingle();
    
    if (!sol) return;
    
    const pendencias = (sol.pendencias_selecionadas || []) as string[];
    const updatedPendencias = pendencias.filter(
      (p: string) => !p.toLowerCase().includes("lacre")
    );
    
    const updatePayload: any = {
      pendencias_selecionadas: updatedPendencias,
      updated_at: new Date().toISOString(),
    };
    
    // If no remaining pendencies and status is vistoriado_com_pendencia, auto-advance
    if (updatedPendencias.length === 0 && sol.status === "vistoriado_com_pendencia") {
      // Check if deferimento is blocking
      let deferimentoBlocking = false;
      if (sol.solicitar_deferimento) {
        const { data: defDocs } = await supabase
          .from("deferimento_documents")
          .select("status")
          .eq("solicitacao_id", solicitacao.id)
          .eq("document_type", "deferimento");
        
        const allAceitos = defDocs && defDocs.length > 0 && defDocs.every(d => d.status === "aceito");
        if (!allAceitos) deferimentoBlocking = true;
      }
      
      if (!deferimentoBlocking) {
        updatePayload.status = "vistoria_finalizada";
        updatePayload.status_vistoria = "Vistoriado";
        await logAudit("status_atualizado", "Status atualizado automaticamente para Vistoriado após conclusão do lacre armador e resolução de todas as pendências.");
        await createNotification(`Solicitação ${solicitacao.protocolo} finalizada automaticamente após conclusão do lacre.`, "status");
        toast.success("Pendências resolvidas — status avançado para Vistoriado!");
      } else {
        await logAudit("pendencia_lacre_resolvida", "Pendência de lacre armador removida automaticamente. Aguardando deferimento para finalizar.");
      }
    } else {
      await logAudit("pendencia_lacre_resolvida", `Pendência de lacre armador removida automaticamente. Pendências restantes: ${updatedPendencias.length > 0 ? updatedPendencias.join(", ") : "nenhuma"}`);
    }
    
    await supabase
      .from("solicitacoes")
      .update(updatePayload)
      .eq("id", solicitacao.id);
  };

  const logAudit = async (acao: string, detalhes: string) => {
    await supabase.rpc("insert_audit_log", {
      p_solicitacao_id: solicitacao.id,
      p_usuario_id: userId,
      p_acao: acao,
      p_detalhes: detalhes,
    });
  };

  const createNotification = async (mensagem: string, tipo: string) => {
    await supabase.rpc("create_notifications_for_others", {
      p_solicitacao_id: solicitacao.id,
      p_mensagem: mensagem,
      p_tipo: tipo,
      p_exclude_user_id: userId,
    });
  };

  const currentStatus = lacreData?.lacre_status || "aguardando_preenchimento";
  const statusInfo = STATUS_LABELS[currentStatus] || STATUS_LABELS.aguardando_preenchimento;

  return (
    <>
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Lock className="h-5 w-5" />
              Regularização de Lacre Armador — {solicitacao.protocolo}
            </DialogTitle>
            <DialogDescription>
              Gestão do posicionamento e lacre armador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Info básica */}
            <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 rounded-lg p-4">
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-medium">{solicitacao.cliente_nome}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contêiner</p>
                <p className="font-medium">{solicitacao.numero_conteiner || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Custo de Serviço</p>
                <p className="font-medium">
                  {(() => {
                    // Derivar do campo "Há cobrança de novo serviço (Posicionamento — Pendência de Lacre armador)?"
                    const custoLacre = solicitacao.lacre_armador_aceite_custo;
                    if (custoLacre === true) return "Sim";
                    if (custoLacre === false) return "Não";
                    return "—";
                  })()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ciente do custo de novo posicionamento</p>
                <p className="font-medium">
                  {solicitacao.lacre_armador_aceite_custo === true ? "Sim — Cliente ciente" : solicitacao.lacre_armador_aceite_custo === false ? "Não" : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="outline" className={statusInfo.color}>{statusInfo.label}</Badge>
              </div>
            </div>

            <Separator />

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Carregando dados...</p>
              </div>
            ) : !lacreData ? (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-6 text-center">
                <Clock className="h-6 w-6 text-amber-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-amber-700">Aguardando Preenchimento pelo Cliente</p>
                <p className="text-xs text-amber-600 mt-1">O cliente ainda não enviou os dados de posicionamento.</p>
              </div>
            ) : (
              <>
                {/* Dados preenchidos */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold flex items-center gap-2">Dados do Posicionamento</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm border rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Lacre Coletado</p>
                        <p className="font-medium">{lacreData.lacre_coletado === true ? "Sim" : lacreData.lacre_coletado === false ? "Não" : "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Data / Período</p>
                        <p className="font-medium">
                          {lacreData.data_posicionamento_lacre ? new Date(lacreData.data_posicionamento_lacre + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                          {lacreData.periodo_lacre && ` — ${lacreData.periodo_lacre === "manha" ? "Manhã" : "Tarde"}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Responsável</p>
                        <p className="font-medium">{lacreData.responsavel_nome || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Telefone</p>
                        <p className="font-medium">{lacreData.responsavel_telefone || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 sm:col-span-2">
                      <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">E-mail</p>
                        <p className="font-medium">{lacreData.responsavel_email || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* RIC do novo lacre */}
                  {fotoSignedUrl && (
                    <div className="border rounded-lg p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> RIC do novo lacre com imagem do novo lacre</p>
                      <img src={fotoSignedUrl} alt="RIC do novo lacre" className="max-w-full max-h-[300px] rounded border mx-auto" />
                    </div>
                  )}
                </div>

                <Separator />

                {/* Actions based on status */}
                {currentStatus === "aguardando_confirmacao" && (
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleConfirmar} disabled={actionLoading}>
                      <Check className="h-4 w-4 mr-2" /> Confirmar Posicionamento
                    </Button>
                    <Button variant="outline" className="flex-1 text-red-600 border-red-300 hover:bg-red-50" onClick={() => setShowRecusaDialog(true)} disabled={actionLoading}>
                      <X className="h-4 w-4 mr-2" /> Recusar
                    </Button>
                  </div>
                )}

                {currentStatus === "posicionamento_confirmado" && (
                  <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleAvancarStatus("aguardando_lacre")} disabled={actionLoading}>
                    <Lock className="h-4 w-4 mr-2" /> Avançar para "Aguardando Lacre"
                  </Button>
                )}

                {currentStatus === "aguardando_lacre" && (
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAvancarStatus("servico_concluido")} disabled={actionLoading}>
                    <Check className="h-4 w-4 mr-2" /> Concluir Serviço de Lacre
                  </Button>
                )}

                {currentStatus === "servico_concluido" && (
                  <div className="bg-green-50 border border-green-300 rounded-lg p-4 text-center">
                    <Check className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-green-700">Serviço de Lacre Concluído</p>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recusa dialog */}
      <Dialog open={showRecusaDialog} onOpenChange={setShowRecusaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Solicitação de Posicionamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Motivo da recusa</Label>
            <Textarea value={motivoRecusa} onChange={(e) => setMotivoRecusa(e.target.value)} placeholder="Informe o motivo da recusa..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecusaDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleRecusar} disabled={!motivoRecusa.trim() || actionLoading}>
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LacreArmadorDialog;
