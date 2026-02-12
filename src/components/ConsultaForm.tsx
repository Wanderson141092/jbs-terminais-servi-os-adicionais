import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatContainerInput, isValidContainer } from "@/lib/containerValidation";

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
      const valorUpper = valor.trim().toUpperCase();
      
      const containerRegex = /^[A-Z]{3}U\d{7}$/;
      const protocoloRegex = /^JBS[A-Z]\d{6,}$/;
      const lpcoRegex = /^[A-Z]\d{10}$/;
      
      // Se parece contêiner (começa com letras + dígitos), validar rigorosamente
      if (/^[A-Z]{3,4}/.test(valorUpper) && !protocoloRegex.test(valorUpper) && !lpcoRegex.test(valorUpper)) {
        if (!containerRegex.test(valorUpper)) {
          if (valorUpper.length >= 4 && valorUpper[3] !== 'U') {
            toast.error("A 4ª letra do contêiner deve ser obrigatoriamente 'U'");
          } else {
            toast.error("Formato de contêiner inválido. Use: 3 letras + U + 7 números (ex: ABCU1234567)");
          }
          return;
        }
      }
      
      onSearch(servicoSelecionado, valorUpper);
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
      return "Ex: ABCU1234567, A1234567890, JBSP000001";
    }
    return "Ex: ABCU1234567, JBSP000001";
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            value={valor}
            onChange={(e) => {
              const raw = e.target.value.toUpperCase();
              if (/^[A-Z]{0,4}/.test(raw) && !raw.startsWith("JBS") && !/^[A-Z]\d/.test(raw)) {
                setValor(formatContainerInput(raw));
              } else {
                setValor(raw.slice(0, 15));
              }
            }}
            placeholder={getPlaceholder()}
            disabled={!servicoSelecionado}
            maxLength={15}
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !valor.trim() || !servicoSelecionado} 
          className="jbs-btn-primary px-6 w-full sm:w-auto"
        >
          <Search className="h-4 w-4 mr-2" />
          Consultar
        </Button>
      </div>

      {/* Legenda dinâmica baseada no serviço */}
      <div className="text-xs text-muted-foreground pt-2 border-t">
        {isPosicionamento ? (
          <p>Informe o contêiner, o LPCO ou o protocolo JBS do serviço adicional que deseja consultar.</p>
        ) : (
          <p>Informe o contêiner ou protocolo JBS do serviço adicional que deseja consultar.</p>
        )}
      </div>
    </form>
  );
};

export default ConsultaForm;
