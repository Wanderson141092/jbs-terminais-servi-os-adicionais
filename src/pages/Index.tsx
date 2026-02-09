import { useState, useCallback, useEffect } from "react";
import { FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ExternalHeader from "@/components/ExternalHeader";
import ConsultaForm from "@/components/ConsultaForm";
import ConsultaResultado from "@/components/ConsultaResultado";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const [resultado, setResultado] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hashdataUrl, setHashdataUrl] = useState<string | null>(null);
  const [showIframe, setShowIframe] = useState(false);

  // Carregar URL do iframe do Hashdata
  useEffect(() => {
    const fetchHashdataUrl = async () => {
      const { data } = await supabase
        .from("page_config")
        .select("config_value")
        .eq("config_key", "hashdata_iframe_url")
        .single();
      
      if (data?.config_value) {
        setHashdataUrl(data.config_value);
      }
    };
    fetchHashdataUrl();
  }, []);

  // Recebe servicoId (id do serviço) e valor (protocolo/conteiner/lpco)
  const handleSearch = useCallback(async (servicoId: string, valor: string) => {
    setIsLoading(true);
    setHasSearched(true);
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

          {/* Action Card - Solicitar/Cancelar */}
          <Dialog open={showIframe} onOpenChange={setShowIframe}>
            <DialogTrigger asChild>
              <Card className="border-2 border-secondary/30 hover:border-secondary transition-colors cursor-pointer mb-8">
                <CardHeader className="pb-2 text-center">
                  <div className="w-14 h-14 rounded-xl bg-secondary/20 flex items-center justify-center mb-3 mx-auto">
                    <FileText className="h-7 w-7 text-secondary" />
                  </div>
                  <CardTitle className="text-xl text-primary font-bold">Serviço Adicional</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Solicitar ou Cancelar</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground text-center">
                    Acesse o formulário para nova solicitação ou cancelamento
                  </p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Serviço Adicional - Solicitação ou Cancelamento</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {hashdataUrl ? (
                  <iframe 
                    src={hashdataUrl}
                    className="w-full min-h-[500px] rounded-lg border"
                    title="Formulário Hashdata"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="bg-muted/50 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
                    <div>
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        URL do formulário Hashdata não configurada
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Configure em Parâmetros → Página Externa
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

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
                onRefresh={() => handleSearch(resultado.tipo_operacao, resultado.protocolo)}
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
    </div>
  );
};

export default Index;
