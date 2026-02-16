import { useState, useCallback, useEffect } from "react";
import {
  FileText, ExternalLink, Layout, Send, Search, Settings,
  Ship, Anchor, Container, Warehouse, Package, Box, Truck,
  Construction, ArrowUpFromLine, Layers,
} from "lucide-react";
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
  FileText, ExternalLink, Layout, Send, Search, Settings,
  Ship, Anchor, Container, Warehouse, Package, Box, Truck,
  Construction, ArrowUpFromLine, Layers,
};

// URL validation - only allow http/https protocols
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const Index = () => {
  const [resultado, setResultado] = useState<any>(null);
  const [deferimentoDocs, setDeferimentoDocs] = useState<any[]>([]);
  const [servicoConfig, setServicoConfig] = useState<any>(null);
  const [observacoes, setObservacoes] = useState<any[]>([]);
  const [statusLabels, setStatusLabels] = useState<any[]>([]);
  const [etapasConfig, setEtapasConfig] = useState<any[]>([]);
  const [lacreArmadorConfig, setLacreArmadorConfig] = useState<any>(null);
  const [lacreArmadorDados, setLacreArmadorDados] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [buttons, setButtons] = useState<ExternalButton[]>([]);
  const [activeDialog, setActiveDialog] = useState<{ type: "iframe" | "form"; data: ExternalButton } | null>(null);
  const [lastSearchValor, setLastSearchValor] = useState<string>("");
  const [lastSearchChave, setLastSearchChave] = useState<string>("");

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

  // Secure consultation via edge function (no direct DB access)
  const handleSearch = useCallback(async (valor: string, chave: string) => {
    setIsLoading(true);
    setHasSearched(true);
    setLastSearchValor(valor);
    setLastSearchChave(chave);
    try {
      const { data: response, error } = await supabase.functions.invoke("consulta-publica", {
        body: { valor, chave },
      });

      if (error) {
        toast.error("Erro na consulta.");
        setResultado(null);
        setDeferimentoDocs([]);
        setServicoConfig(null);
        setObservacoes([]);
        setStatusLabels([]);
        setIsLoading(false);
        return;
      }

      if (response?.error) {
        toast.error(response.error);
        setResultado(null);
        setDeferimentoDocs([]);
        setServicoConfig(null);
        setObservacoes([]);
        setStatusLabels([]);
        setIsLoading(false);
        return;
      }

      setResultado(response?.solicitacao || null);
      setDeferimentoDocs(response?.deferimento_docs || []);
      setServicoConfig(response?.servico_config || null);
      setObservacoes(response?.observacoes || []);
      setStatusLabels(response?.status_labels || []);
      setEtapasConfig(response?.etapas_config || []);
      setLacreArmadorConfig(response?.lacre_armador_config || null);
      setLacreArmadorDados(response?.lacre_armador_dados || null);

      if (!response?.solicitacao) {
        toast.warning("Nenhuma solicitação encontrada para este serviço com os dados informados.");
      }
    } catch (err: any) {
      toast.error("Erro na consulta: " + err.message);
      setResultado(null);
      setDeferimentoDocs([]);
      setServicoConfig(null);
      setObservacoes([]);
      setStatusLabels([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleButtonClick = (button: ExternalButton) => {
    if (button.tipo === "link" && button.url) {
      // Validate URL before navigation
      if (!isValidUrl(button.url)) {
        toast.error("URL inválida ou não permitida.");
        return;
      }
      if (button.abrir_nova_aba) {
        window.open(button.url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = button.url;
      }
    } else if (button.tipo === "iframe") {
      // Validate URL for iframe
      if (button.url && !isValidUrl(button.url)) {
        toast.error("URL inválida ou não permitida.");
        return;
      }
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

      <main className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground mb-2">
            Serviços Adicionais
          </h1>
          
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Left Panel - Action Buttons */}
          <div className="bg-card rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8">
            <h2 className="text-lg font-semibold text-primary mb-4 pb-3 border-b-4 border-secondary">
              Solicitação de Serviço
            </h2>
            <div className="grid gap-4">
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
          </div>

          {/* Right Panel - Consultation */}
          <div className="bg-card rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8">
            <h2 className="text-lg font-semibold text-primary mb-4 pb-3 border-b-4 border-secondary">
              Consulta de Status
            </h2>
            <div className="space-y-6">
              <div className="bg-muted/30 rounded-xl p-4 sm:p-6">
                <ConsultaForm onSearch={handleSearch} isLoading={isLoading} />
              </div>

              {isLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                  <p className="text-sm text-muted-foreground mt-3">Consultando...</p>
                </div>
              )}

              {!isLoading && resultado && (
                <ConsultaResultado
                  solicitacao={resultado}
                  deferimentoDocs={deferimentoDocs}
                  servicoConfig={servicoConfig}
                  observacoes={observacoes}
                  statusLabels={statusLabels}
                  etapasConfig={etapasConfig}
                  lacreArmadorConfig={lacreArmadorConfig}
                  lacreArmadorDados={lacreArmadorDados}
                  onRefresh={() => handleSearch(lastSearchValor, lastSearchChave)}
                />
              )}

              {!isLoading && hasSearched && !resultado && (
                <Card className="border-0 bg-transparent shadow-none">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Nenhuma solicitação encontrada.</p>
                  </CardContent>
                </Card>
              )}
            </div>
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
            {activeDialog?.type === "iframe" && activeDialog.data.url && isValidUrl(activeDialog.data.url) ? (
              <iframe 
                src={activeDialog.data.url}
                className="w-full min-h-[500px] rounded-lg border"
                title={activeDialog.data.titulo}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
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
