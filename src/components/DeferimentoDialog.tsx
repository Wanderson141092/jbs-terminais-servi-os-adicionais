import { useState, useEffect } from "react";
import { FileText, Check, X, Download, Eye, RefreshCw, Clock } from "lucide-react";
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

interface DeferimentoDialogProps {
  solicitacao: any;
  userId: string;
  onClose: () => void;
}

interface DeferimentoDoc {
  id: string;
  file_name: string;
  file_url: string;
  status: string | null;
  motivo_recusa: string | null;
  created_at: string;
  document_type: string;
}

interface ServicoConfig {
  deferimento_embutidos: boolean | null;
}

const DeferimentoDialog = ({ solicitacao, userId, onClose }: DeferimentoDialogProps) => {
  const [documents, setDocuments] = useState<DeferimentoDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRecusaDialog, setShowRecusaDialog] = useState<string | null>(null);
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [servicoConfig, setServicoConfig] = useState<ServicoConfig | null>(null);

  useEffect(() => {
    fetchDocuments();
    fetchServicoConfig();
  }, [solicitacao.id]);

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from("deferimento_documents")
      .select("*")
      .eq("solicitacao_id", solicitacao.id)
      .eq("document_type", "deferimento")
      .order("created_at", { ascending: false });
    
    // Generate signed URLs for private bucket files
    const docsWithSignedUrls: DeferimentoDoc[] = [];
    if (data) {
      for (const doc of data) {
        let signedUrl = doc.file_url;
        
        if (doc.file_url && doc.file_url.includes("/storage/v1/object/public/deferimento/")) {
          const pathMatch = doc.file_url.split("/storage/v1/object/public/deferimento/");
          if (pathMatch.length === 2) {
            const storagePath = decodeURIComponent(pathMatch[1]);
            const { data: signedData } = await supabase.storage
              .from("deferimento")
              .createSignedUrl(storagePath, 3600);
            if (signedData) {
              signedUrl = signedData.signedUrl;
            }
          }
        } else if (doc.file_url && !doc.file_url.startsWith("http")) {
          const { data: signedData } = await supabase.storage
            .from("deferimento")
            .createSignedUrl(doc.file_url, 3600);
          if (signedData) {
            signedUrl = signedData.signedUrl;
          }
        }
        
        docsWithSignedUrls.push({ ...doc, file_url: signedUrl });
      }
    }
    
    setDocuments(docsWithSignedUrls);
  };

  const fetchServicoConfig = async () => {
    const tipoOperacao = solicitacao.tipo_operacao || "Posicionamento";
    const { data } = await supabase
      .from("servicos")
      .select("deferimento_embutidos")
      .eq("nome", tipoOperacao)
      .maybeSingle();
    setServicoConfig(data);
  };

  const showEmbeddedPreview = servicoConfig?.deferimento_embutidos ?? true;

  // Calcula o status geral do deferimento baseado em todos os documentos
  const calculateGeneralStatus = (docs: DeferimentoDoc[]): "recebido" | "recusado" | "aguardando" => {
    if (docs.length === 0) return "aguardando";
    
    const hasRecusado = docs.some(d => d.status === "recusado");
    const allAceitos = docs.every(d => d.status === "aceito");
    
    if (hasRecusado) return "recusado";
    if (allAceitos) return "recebido";
    return "aguardando";
  };

  const handleAceitar = async (docId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from("deferimento_documents")
      .update({ status: "aceito" })
      .eq("id", docId);

    if (error) {
      toast.error("Erro ao aceitar deferimento");
      setLoading(false);
      return;
    }

    // Recalcula status geral após aceitar
    const updatedDocs = documents.map(d => d.id === docId ? { ...d, status: "aceito" } : d);
    const generalStatus = calculateGeneralStatus(updatedDocs);
    
    await logAudit("deferimento_aceito", `Deferimento aceito. Arquivo: ${documents.find(d => d.id === docId)?.file_name || docId}. Status geral: ${generalStatus}`);
    await createNotification(`Deferimento aceito para ${solicitacao.protocolo}`, "deferimento");
    toast.success("Deferimento aceito! Status: Recebido");
    setLoading(false);
    fetchDocuments();
  };

  const handleRecusar = async (docId: string) => {
    if (!motivoRecusa.trim()) {
      toast.error("Informe o motivo da recusa");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("deferimento_documents")
      .update({ status: "recusado", motivo_recusa: motivoRecusa })
      .eq("id", docId);

    if (error) {
      toast.error("Erro ao recusar deferimento");
      setLoading(false);
      return;
    }

    await logAudit("deferimento_recusado", `Deferimento recusado. Arquivo: ${documents.find(d => d.id === docId)?.file_name || docId}. Motivo: ${motivoRecusa}`);
    await createNotification(`Deferimento recusado para ${solicitacao.protocolo}`, "deferimento");
    toast.success("Deferimento recusado!");
    setShowRecusaDialog(null);
    setMotivoRecusa("");
    setLoading(false);
    fetchDocuments();
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

  const getStatusBadge = (status: string | null) => {
    if (!status || status === "pendente") {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">Aguardando análise</Badge>;
    }
    if (status === "aceito") {
      return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">Recebido</Badge>;
    }
    return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">Recusado</Badge>;
  };

  return (
    <>
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <FileText className="h-5 w-5" />
              Deferimento — {solicitacao.protocolo}
            </DialogTitle>
            <DialogDescription>
              Análise de documentos de deferimento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações do Processo */}
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
                <p className="text-xs text-muted-foreground">LPCO</p>
                <p className="font-medium">{solicitacao.lpco || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Serviço Adicional</p>
                <p className="font-medium">{solicitacao.tipo_operacao || "Posicionamento"}</p>
              </div>
            </div>

            <Separator />

            {/* Documentos de Deferimento */}
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos de Deferimento
              </p>

              {documents.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-center">
                  <Clock className="h-5 w-5 text-yellow-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-yellow-700">Aguardando confirmação do deferimento</p>
                  <p className="text-xs text-yellow-600 mt-1">Nenhum documento de deferimento enviado pelo cliente.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{doc.file_name}</span>
                          {getStatusBadge(doc.status)}
                        </div>
                        <div className="flex gap-2">
                          {(!doc.status || doc.status === "pendente") && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-300 hover:bg-green-50"
                                onClick={() => handleAceitar(doc.id)}
                                disabled={loading}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Aceitar
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => setShowRecusaDialog(doc.id)}
                                disabled={loading}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Recusar
                              </Button>
                            </>
                          )}
                          {doc.status === "aceito" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              onClick={() => setShowRecusaDialog(doc.id)}
                              disabled={loading}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Alterar para Recusado
                            </Button>
                          )}
                          {doc.status === "recusado" && !documents.some(d => d.id !== doc.id && new Date(d.created_at) > new Date(doc.created_at)) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => handleAceitar(doc.id)}
                              disabled={loading}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Alterar para Recebido
                            </Button>
                          )}
                          {!showEmbeddedPreview && (
                            <Button variant="outline" size="sm" onClick={() => setPreviewUrl(doc.file_url)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Visualizar
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <a href={doc.file_url} download target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>

                      {/* Preview embutido */}
                      {showEmbeddedPreview && (
                        <div className="bg-muted/30 rounded overflow-hidden">
                          {doc.file_url.toLowerCase().endsWith(".pdf") ? (
                            <iframe
                              src={doc.file_url}
                              className="w-full h-[300px]"
                              title={doc.file_name}
                            />
                          ) : (
                            <img
                              src={doc.file_url}
                              alt={doc.file_name}
                              className="max-w-full max-h-[300px] mx-auto"
                            />
                          )}
                        </div>
                      )}

                      {/* Motivo de recusa */}
                      {doc.status === "recusado" && doc.motivo_recusa && (
                        <div className="bg-red-50 rounded p-3 text-sm text-red-600">
                          <strong>Motivo da recusa:</strong> {doc.motivo_recusa}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Enviado em: {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para recusar */}
      <Dialog open={!!showRecusaDialog} onOpenChange={() => setShowRecusaDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Deferimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Motivo da recusa</Label>
            <Textarea
              value={motivoRecusa}
              onChange={(e) => setMotivoRecusa(e.target.value)}
              placeholder="Informe o motivo da recusa..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecusaDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => showRecusaDialog && handleRecusar(showRecusaDialog)}
              disabled={!motivoRecusa.trim() || loading}
            >
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewUrl && (
        <Dialog open onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Visualizar Documento</DialogTitle>
            </DialogHeader>
            <div className="flex-1 min-h-[60vh]">
              {previewUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe src={previewUrl} className="w-full h-[60vh]" title="Preview" />
              ) : (
                <img src={previewUrl} alt="Preview" className="max-w-full max-h-[60vh] mx-auto" />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewUrl(null)}>
                Fechar
              </Button>
              <Button asChild>
                <a href={previewUrl} download target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default DeferimentoDialog;
