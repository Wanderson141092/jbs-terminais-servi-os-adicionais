import { useState, useEffect } from "react";
import { Upload, FileText, Calendar, Package, User, Check, X, Clock, Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import StatusBadge from "./StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Solicitacao {
  id: string;
  protocolo: string;
  lpco: string | null;
  numero_conteiner: string | null;
  cliente_nome: string;
  cliente_email: string;
  data_posicionamento: string | null;
  tipo_carga: string | null;
  tipo_operacao: string | null;
  observacoes: string | null;
  status: string;
  status_vistoria: string | null;
  created_at: string;
}

interface DeferimentoDocument {
  id: string;
  file_name: string;
  file_url: string;
  status: string | null;
  motivo_recusa: string | null;
  created_at: string;
}

interface ConsultaResultadoProps {
  solicitacao: Solicitacao;
  onRefresh: () => void;
}

const ConsultaResultado = ({ solicitacao, onRefresh }: ConsultaResultadoProps) => {
  const [uploading, setUploading] = useState(false);
  const [existingDoc, setExistingDoc] = useState<DeferimentoDocument | null>(null);
  const [previewFile, setPreviewFile] = useState<{ file: File; url: string } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // Verificar se já existe um documento de deferimento
  useEffect(() => {
    const fetchExistingDoc = async () => {
      setLoadingDocs(true);
      const { data } = await supabase
        .from("deferimento_documents")
        .select("*")
        .eq("solicitacao_id", solicitacao.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setExistingDoc(data[0]);
      } else {
        setExistingDoc(null);
      }
      setLoadingDocs(false);
    };

    fetchExistingDoc();
  }, [solicitacao.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato não permitido. Use PDF, JPG ou PNG.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 10MB.");
      return;
    }

    // Criar URL para preview
    const url = URL.createObjectURL(file);
    setPreviewFile({ file, url });
    setShowConfirmDialog(true);
  };

  const handleConfirmUpload = async () => {
    if (!previewFile) return;

    setUploading(true);
    try {
      const fileName = `${solicitacao.protocolo}/${Date.now()}_${previewFile.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("deferimento")
        .upload(fileName, previewFile.file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("deferimento")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from("deferimento_documents")
        .insert({
          solicitacao_id: solicitacao.id,
          file_name: previewFile.file.name,
          file_url: urlData.publicUrl,
          status: 'pendente'
        });

      if (dbError) throw dbError;

      toast.success("Deferimento enviado com sucesso! Aguardando confirmação.");
      setShowConfirmDialog(false);
      setPreviewFile(null);
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao enviar arquivo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelUpload = () => {
    if (previewFile) {
      URL.revokeObjectURL(previewFile.url);
    }
    setPreviewFile(null);
    setShowConfirmDialog(false);
  };

  // Verificar se pode enviar deferimento
  const vistoriaFinalizada = solicitacao.status_vistoria === "Vistoria Finalizada";
  const docPendente = existingDoc?.status === 'pendente';
  const docAceito = existingDoc?.status === 'aceito';
  const docRecusado = existingDoc?.status === 'recusado';
  
  // Pode enviar se: vistoria finalizada E (não tem doc OU doc foi recusado)
  const canUpload = vistoriaFinalizada && (!existingDoc || docRecusado);

  // Status do deferimento com cores
  const getDeferimentoStatusSection = () => {
    if (loadingDocs) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          Verificando documentos...
        </div>
      );
    }

    if (docAceito) {
      return (
        <Alert className="border-green-500 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="ml-2">
            <span className="font-semibold text-green-700">Deferimento Aceito</span>
            <p className="text-sm text-green-600 mt-1">
              Documento recebido e aprovado.
            </p>
          </AlertDescription>
        </Alert>
      );
    }

    if (docPendente) {
      return (
        <Alert className="border-yellow-500 bg-yellow-50">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="ml-2">
            <span className="font-semibold text-yellow-700">Aguardando Confirmação</span>
            <p className="text-sm text-yellow-600 mt-1">
              Documento enviado em {new Date(existingDoc!.created_at).toLocaleDateString("pt-BR")}. 
              Aguardando análise.
            </p>
            {existingDoc && (
              <Button variant="link" size="sm" className="p-0 h-auto mt-2 text-yellow-700" asChild>
                <a href={existingDoc.file_url} target="_blank" rel="noopener noreferrer">
                  <Eye className="h-3 w-3 mr-1" />
                  Visualizar documento enviado
                </a>
              </Button>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    if (docRecusado) {
      return (
        <div className="space-y-3">
          <Alert className="border-red-500 bg-red-50">
            <X className="h-4 w-4 text-red-600" />
            <AlertDescription className="ml-2">
              <span className="font-semibold text-red-700">Deferimento Recusado - Reenviar Anexo</span>
              {existingDoc?.motivo_recusa && (
                <p className="text-sm text-red-600 mt-1">
                  <strong>Motivo:</strong> {existingDoc.motivo_recusa}
                </p>
              )}
            </AlertDescription>
          </Alert>
          
          <div className="bg-muted/30 border rounded-lg p-4">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              Reenviar Deferimento
            </p>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              disabled={uploading}
              className="text-sm"
            />
          </div>
        </div>
      );
    }

    if (canUpload) {
      return (
        <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-4">
          <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Upload className="h-4 w-4 text-secondary" />
            Upload de Deferimento de Liberação
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Envie o deferimento de liberação do órgão (PDF, JPG ou PNG).
          </p>
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            disabled={uploading}
            className="text-sm"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-primary/5 rounded-t-lg">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-lg font-bold text-foreground">
              Protocolo: {solicitacao.protocolo}
            </CardTitle>
            <StatusBadge status={solicitacao.status} />
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoItem icon={<User className="h-4 w-4" />} label="Cliente" value={solicitacao.cliente_nome} />
            <InfoItem icon={<FileText className="h-4 w-4" />} label="LPCO" value={solicitacao.lpco || "—"} />
            <InfoItem icon={<Package className="h-4 w-4" />} label="Contêiner" value={solicitacao.numero_conteiner || "—"} />
            <InfoItem icon={<Calendar className="h-4 w-4" />} label="Data Posicionamento" value={solicitacao.data_posicionamento || "—"} />
          </div>

          {solicitacao.tipo_carga && (
            <InfoItem icon={<Package className="h-4 w-4" />} label="Tipo de Carga" value={solicitacao.tipo_carga} />
          )}

          {solicitacao.tipo_operacao && (
            <InfoItem icon={<FileText className="h-4 w-4" />} label="Tipo de Operação" value={solicitacao.tipo_operacao} />
          )}

          {solicitacao.observacoes && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Observações</p>
                <p className="text-sm">{solicitacao.observacoes}</p>
              </div>
            </>
          )}

          {solicitacao.status_vistoria && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Status da Vistoria</p>
                <p className="text-sm font-medium">{solicitacao.status_vistoria}</p>
              </div>
            </>
          )}

          {/* Seção de Deferimento - Só aparece com vistoria finalizada */}
          {vistoriaFinalizada && (
            <>
              <Separator />
              {getDeferimentoStatusSection()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmação com preview */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Confirmar Envio do Deferimento
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Verifique se o arquivo abaixo está correto antes de enviar:
            </p>
            
            {previewFile && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-sm font-medium mb-3">{previewFile.file.name}</p>
                {previewFile.file.type === "application/pdf" ? (
                  <iframe 
                    src={previewFile.url} 
                    className="w-full h-[300px] rounded border" 
                    title="Preview do PDF"
                  />
                ) : (
                  <img 
                    src={previewFile.url} 
                    alt="Preview" 
                    className="max-w-full max-h-[300px] mx-auto rounded border"
                  />
                )}
              </div>
            )}

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Certifique-se de que este é o documento correto. Após o envio, o arquivo será 
                analisado pela equipe.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelUpload} disabled={uploading}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleConfirmUpload} disabled={uploading} className="jbs-btn-primary">
              {uploading ? (
                "Enviando..."
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirmar e Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <span className="text-muted-foreground mt-0.5">{icon}</span>
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  </div>
);

export default ConsultaResultado;
