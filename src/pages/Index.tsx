import { useState, useCallback, useEffect } from "react";
import { FileText, ExternalLink, Layout, Send, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExternalHeader from "@/components/ExternalHeader";
import ConsultaForm from "@/components/ConsultaForm";
import ConsultaResultado from "@/components/ConsultaResultado";
import FormRenderer from "@/components/FormRenderer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExternalButton {
  id: string;
  titulo: string;
  descricao: string | null;
  icone: string | null;
  tipo: string;
  url: string | null;
  formulario_id: string | null;
  ordem: number;
  ativo: boolean;
  abrir_nova_aba: boolean | null;
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  ExternalLink,
  Layout,
  Send,
  Search,
  Settings,
};

const Index = () => {
  const [resultado, setResultado] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [buttons, setButtons] = useState<ExternalButton[]>([]);
  const [activeDialog, setActiveDialog] = useState<{ type: "iframe" | "form"; data: ExternalButton } | null>(null);
  const [lastSearchServicoId, setLastSearchServicoId] = useState<string>("");

  // Carregar botões externos
  useEffect(() => {
    const fetchButtons = async () => {
      const { data } = await supabase
        .from("external_buttons")
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      
      if (data) {
        setButtons(data);
      }
    };
    fetchButtons();
  }, []);

  // Recebe servicoId (id do serviço) e valor (protocolo/conteiner/lpco)
  const handleSearch = useCallback(async (servicoId: string, valor: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setLastSearchServicoId(servicoId);
    try {
      // Primeiro buscar o nome do serviço para filtrar tipo_operacao
      const { data: servicoData } = await supabase
        .from("servicos")
        .select("nome")
        .eq("id", servicoId)
        .single();

      if (!servicoData) {
        toast.error("Serviço não encontrado.");
        setResultado(null);
        setIsLoading(false);
        return;
      }

      const tipoOperacao = servicoData.nome;
      const valorUpper = valor.toUpperCase().trim();

      // Tentar buscar por protocolo
      let { data, error } = await supabase
        .from("solicitacoes")
        .select("*")
        .eq("protocolo", valorUpper)
        .eq("tipo_operacao", tipoOperacao)
        .maybeSingle();

      if (!data && !error) {
        // Tentar por número de contêiner
        const resultContainer = await supabase
          .from("solicitacoes")
          .select("*")
          .eq("numero_conteiner", valorUpper)
          .eq("tipo_operacao", tipoOperacao)
          .maybeSingle();
        
        data = resultContainer.data;
        error = resultContainer.error;
      }

      if (!data && !error) {
        // Tentar por LPCO
        const resultLpco = await supabase
          .from("solicitacoes")
          .select("*")
          .eq("lpco", valorUpper)
          .eq("tipo_operacao", tipoOperacao)
          .maybeSingle();
        
        data = resultLpco.data;
        error = resultLpco.error;
      }

      if (error) throw error;
      setResultado(data);

      if (!data) {
        toast.info("Nenhuma solicitação encontrada para este serviço com os dados informados.");
      }
    } catch (err: any) {
      toast.error("Erro na consulta: " + err.message);
      setResultado(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleButtonClick = (button: ExternalButton) => {
    if (button.tipo === "link" && button.url) {
      if (button.abrir_nova_aba) {
        window.open(button.url, "_blank");
      } else {
        window.location.href = button.url;
      }
    } else if (button.tipo === "iframe") {
      setActiveDialog({ type: "iframe", data: button });
    } else if (button.tipo === "formulario") {
      setActiveDialog({ type: "form", data: button });
    }
  };

  const getIcon = (iconName: string | null) => {
    const IconComponent = ICONS[iconName || "FileText"] || FileText;
    return <IconComponent className="h-7 w-7 text-secondary" />;
  };

  return (
    <div className="min-h-screen bg-primary">
      <ExternalHeader />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Main Container */}
        <div className="bg-card rounded-2xl shadow-2xl p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8 pb-6 border-b-4 border-secondary">
            <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
              Serviços Adicionais
            </h1>
            <p className="text-muted-foreground">Status da solicitação</p>
          </div>

          {/* Action Buttons - Dynamic */}
          <div className="grid gap-4 mb-8">
            {buttons.map((button) => (
              <Card
                key={button.id}
                className="border-2 border-secondary/30 hover:border-secondary transition-colors cursor-pointer"
                onClick={() => handleButtonClick(button)}
              >
                <CardHeader className="pb-2 text-center">
                  <div className="w-14 h-14 rounded-xl bg-secondary/20 flex items-center justify-center mb-3 mx-auto">
                    {getIcon(button.icone)}
                  </div>
                  <CardTitle className="text-xl text-primary font-bold">{button.titulo}</CardTitle>
                  {button.descricao && (
                    <p className="text-sm text-muted-foreground mt-1">{button.descricao}</p>
                  )}
                </CardHeader>
              </Card>
            ))}

            {buttons.length === 0 && (
              <Card className="border-2 border-dashed border-muted">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    Nenhum botão configurado. Configure em Parâmetros → Página Externa.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Consultation Section */}
          <div className="space-y-6">
            <div className="bg-muted/30 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Consulta de Status</h2>
              <ConsultaForm onSearch={handleSearch} isLoading={isLoading} />
            </div>

            {/* Results */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground mt-3">Consultando...</p>
              </div>
            )}

            {!isLoading && resultado && (
              <ConsultaResultado
                solicitacao={resultado}
                onRefresh={() => handleSearch(lastSearchServicoId, resultado.protocolo)}
              />
            )}

            {!isLoading && hasSearched && !resultado && (
              <Card className="border-0 bg-muted/30">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Nenhuma solicitação encontrada.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} JBS Terminais — Serviços Adicionais
        </p>
      </footer>

      {/* Dialog for iframe/form */}
      <Dialog open={!!activeDialog} onOpenChange={() => setActiveDialog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{activeDialog?.data.titulo}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {activeDialog?.type === "iframe" && activeDialog.data.url ? (
              <iframe 
                src={activeDialog.data.url}
                className="w-full min-h-[500px] rounded-lg border"
                title={activeDialog.data.titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : activeDialog?.type === "form" && activeDialog.data.formulario_id ? (
              <FormRenderer 
                formularioId={activeDialog.data.formulario_id} 
                onSuccess={() => setActiveDialog(null)}
              />
            ) : (
              <div className="bg-muted/50 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
                <div>
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Conteúdo não configurado
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
