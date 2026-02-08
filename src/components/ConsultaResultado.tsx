import { useState } from "react";
import { Upload, FileText, Calendar, Package, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  observacoes: string | null;
  status: string;
  status_vistoria: string | null;
  created_at: string;
}

interface ConsultaResultadoProps {
  solicitacao: Solicitacao;
  onRefresh: () => void;
}

const ConsultaResultado = ({ solicitacao, onRefresh }: ConsultaResultadoProps) => {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);
    try {
      const fileName = `${solicitacao.protocolo}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("deferimento")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("deferimento")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from("deferimento_documents")
        .insert({
          solicitacao_id: solicitacao.id,
          file_name: file.name,
          file_url: urlData.publicUrl,
        });

      if (dbError) throw dbError;

      toast.success("Deferimento enviado com sucesso!");
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao enviar arquivo: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
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

        {solicitacao.status_vistoria === "Vistoria Finalizada" && (
          <>
            <Separator />
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
                onChange={handleUpload}
                disabled={uploading}
                className="text-sm"
              />
              {uploading && (
                <p className="text-xs text-muted-foreground mt-2">Enviando...</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
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
