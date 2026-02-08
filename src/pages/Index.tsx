import { useState, useCallback } from "react";
import { ExternalLink, Search, FileText } from "lucide-react";
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

  const handleSearch = useCallback(async (tipo: string, valor: string) => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      let query = supabase.from("solicitacoes").select("*");

      if (tipo === "protocolo") {
        query = query.eq("protocolo", valor);
      } else if (tipo === "lpco") {
        query = query.eq("lpco", valor);
      } else {
        query = query.eq("numero_conteiner", valor);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      setResultado(data);

      if (!data) {
        toast.info("Nenhuma solicitação encontrada com os dados informados.");
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
              Serviço de Posicionamento
            </h1>
            <p className="text-muted-foreground">Status da solicitação</p>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Consultar Card */}
            <Card className="border-2 border-primary/10 hover:border-primary/30 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Consultar Solicitação</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Consulte por protocolo, LPCO ou número do contêiner
                </p>
              </CardContent>
            </Card>

            {/* Solicitar/Cancelar Card */}
            <Dialog>
              <DialogTrigger asChild>
                <Card className="border-2 border-secondary/30 hover:border-secondary transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mb-2">
                      <FileText className="h-6 w-6 text-secondary" />
                    </div>
                    <CardTitle className="text-lg">Solicite ou Cancele aqui</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Acesse o formulário para nova solicitação ou cancelamento
                    </p>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Formulário de Solicitação / Cancelamento</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  {/* Hashdata iframe will go here */}
                  <div className="bg-muted/50 rounded-lg p-8 text-center min-h-[400px] flex items-center justify-center">
                    <div>
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        Integração com formulário Hashdata
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        O formulário será carregado aqui
                      </p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                onRefresh={() => handleSearch("protocolo", resultado.protocolo)}
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
          © {new Date().getFullYear()} JBS Terminais — Serviço de Posicionamento de Contêiner
        </p>
      </footer>
    </div>
  );
};

export default Index;
