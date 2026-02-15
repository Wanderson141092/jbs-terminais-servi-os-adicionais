import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConsultaFormProps {
  onSearch: (tipo: string, valor: string, chave: string) => void;
  isLoading: boolean;
}

interface Servico {
  id: string;
  nome: string;
  codigo_prefixo: string;
}

const ConsultaForm = ({ onSearch, isLoading }: ConsultaFormProps) => {
  const [valor, setValor] = useState("");
  const [chave, setChave] = useState("");
  const [servicoSelecionado, setServicoSelecionado] = useState<string>("");
  const [servicos, setServicos] = useState<Servico[]>([]);

  useEffect(() => {
    const fetchServicos = async () => {
      const { data } = await supabase
        .from("servicos")
        .select("id, nome, codigo_prefixo")
        .eq("ativo", true)
        .order("nome");
      
      if (data) setServicos(data);
    };
    fetchServicos();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (valor.trim() && servicoSelecionado && chave.trim()) {
      const valorUpper = valor.trim().toUpperCase();
      const chaveUpper = chave.trim().toUpperCase();
      
      if (chaveUpper.length !== 6) {
        toast.error("A chave de validação deve ter exatamente 6 caracteres.");
        return;
      }
      
      onSearch(servicoSelecionado, valorUpper, chaveUpper);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-sm font-semibold text-foreground mb-2 block">
          Tipo de Serviço
        </Label>
        <Select value={servicoSelecionado} onValueChange={setServicoSelecionado}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione o serviço" />
          </SelectTrigger>
          <SelectContent>
            {servicos.map((servico) => (
              <SelectItem key={servico.id} value={servico.id}>
                {servico.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-semibold text-foreground mb-2 block">
          Identificador
        </Label>
        <p className="text-xs text-muted-foreground mb-3">
          Informe o Contêiner, LPCO, Protocolo ou Chave de Consulta + Chave de Validação
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            value={valor}
            onChange={(e) => setValor(e.target.value.toUpperCase().slice(0, 15))}
            placeholder="Ex: ABCU1234567, JBSP000001, A1234567890"
            disabled={!servicoSelecionado}
            maxLength={15}
          />
        </div>
        <div className="w-full sm:w-32">
          <Input
            value={chave}
            onChange={(e) => setChave(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            placeholder="Chave"
            disabled={!servicoSelecionado}
            maxLength={6}
            className="text-center tracking-widest font-mono"
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !valor.trim() || !servicoSelecionado || chave.trim().length !== 6} 
          className="jbs-btn-primary px-6 w-full sm:w-auto"
        >
          <Search className="h-4 w-4 mr-2" />
          Consultar
        </Button>
      </div>

      <div className="text-xs text-muted-foreground pt-2 border-t">
        <p>Informe o contêiner, LPCO, protocolo ou chave de consulta + a chave de validação recebida na solicitação.</p>
      </div>
    </form>
  );
};

export default ConsultaForm;
