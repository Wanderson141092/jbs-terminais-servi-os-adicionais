import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface ConsultaFormProps {
  onSearch: (tipo: string, valor: string) => void;
  isLoading: boolean;
}

interface Servico {
  id: string;
  nome: string;
  codigo_prefixo: string;
}

const ConsultaForm = ({ onSearch, isLoading }: ConsultaFormProps) => {
  const [valor, setValor] = useState("");
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
    if (valor.trim() && servicoSelecionado) {
      // Envia o valor bruto - a identificação do tipo será feita no backend/busca
      onSearch("auto", valor.trim().toUpperCase());
    }
  };

  // Verifica se o serviço selecionado é "Posicionamento"
  const servicoNome = servicos.find(s => s.id === servicoSelecionado)?.nome || "";
  const isPosicionamento = servicoNome.toLowerCase().includes("posicionamento");

  const getDescricao = () => {
    if (!servicoSelecionado) {
      return "Selecione o serviço para continuar";
    }
    if (isPosicionamento) {
      return "Informe o Contêiner, LPCO ou Protocolo";
    }
    return "Informe o Contêiner ou Protocolo";
  };

  const getPlaceholder = () => {
    if (isPosicionamento) {
      return "Ex: ABCD1234567, A1234567890, JBSP000001";
    }
    return "Ex: ABCD1234567, JBSP000001";
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
          {getDescricao()}
        </p>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <Input
            value={valor}
            onChange={(e) => setValor(e.target.value.toUpperCase())}
            placeholder={getPlaceholder()}
            disabled={!servicoSelecionado}
            maxLength={15}
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !valor.trim() || !servicoSelecionado} 
          className="jbs-btn-primary px-6"
        >
          <Search className="h-4 w-4 mr-2" />
          Consultar
        </Button>
      </div>

      {/* Legenda dos formatos aceitos */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <p><strong>Formatos aceitos:</strong></p>
        <p>• Contêiner: 4 letras + 7 números (Ex: ABCD1234567)</p>
        <p>• Protocolo: JBS + letra + números (Ex: JBSP000001)</p>
        {isPosicionamento && (
          <p>• LPCO: 1 letra + 10 números (Ex: A1234567890)</p>
        )}
      </div>
    </form>
  );
};

export default ConsultaForm;
