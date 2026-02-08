import { useState, useCallback } from "react";
import { ExternalLink } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <ExternalHeader />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Consultation Card */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">
              Consulta de Posicionamento
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Consulte o status da sua solicitação informando o Protocolo, LPCO ou Número do Contêiner.
            </p>
          </CardHeader>
          <CardContent>
            <ConsultaForm onSearch={handleSearch} isLoading={isLoading} />
          </CardContent>
        </Card>

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
          <Card className="border-0 shadow-md">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhuma solicitação encontrada.</p>
            </CardContent>
          </Card>
        )}

        {/* Hashdata Modal Button */}
        <div className="mt-8 text-center">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" className="jbs-btn-secondary font-semibold px-8 py-3">
                <ExternalLink className="h-4 w-4 mr-2" />
                Solicitar ou Cancelar Posicionamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Formulário de Solicitação / Cancelamento</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-muted-foreground text-center py-12">
                  Integração com formulário Hashdata será exibida aqui.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-primary/5 border-t mt-16">
        <div className="container mx-auto px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} JBS Terminais — Serviço de Posicionamento de Contêiner
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
