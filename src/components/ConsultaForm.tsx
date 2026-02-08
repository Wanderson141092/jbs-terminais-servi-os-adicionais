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

// Detecta automaticamente o tipo de busca baseado no formato do valor
const detectarTipoBusca = (valor: string): string => {
  const valorLimpo = valor.trim().toUpperCase();
  
  // LPCO: formato A9999999999 (letra + 10 números = 11 caracteres)
  const lpcoRegex = /^[A-Z]\d{10}$/;
  if (lpcoRegex.test(valorLimpo)) {
    return "lpco";
  }
  
  // Protocolo: formato JBSA999999 (JBS + letra + números)
  const protocoloRegex = /^JBS[A-Z]\d+$/;
  if (protocoloRegex.test(valorLimpo)) {
    return "protocolo";
  }
  
  // Contêiner: formato padrão de contêiner (4 letras + 7 números)
  const conteinerRegex = /^[A-Z]{4}\d{7}$/;
  if (conteinerRegex.test(valorLimpo)) {
    return "conteiner";
  }
  
  // Se não detectar, tenta buscar por todos (fallback)
  return "todos";
};

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
    if (valor.trim()) {
      const tipo = detectarTipoBusca(valor);
      onSearch(tipo, valor.trim().toUpperCase());
    }
  };

  const tipoDetectado = valor.trim() ? detectarTipoBusca(valor) : null;
  
  const getTipoLabel = (tipo: string | null) => {
    switch (tipo) {
      case "lpco": return "LPCO";
      case "protocolo": return "Protocolo";
      case "conteiner": return "Contêiner";
      case "todos": return "Busca geral";
      default: return null;
    }
  };

  // Verifica se o serviço selecionado é "Posicionamento"
  const isPosicionamento = servicos.find(s => s.id === servicoSelecionado)?.nome === "Posicionamento";

  const getDescricao = () => {
    if (!servicoSelecionado) {
      return "Selecione o serviço para continuar";
    }
    if (isPosicionamento) {
      return "Informe o Contêiner, LPCO ou Protocolo";
    }
    return "Informe o Contêiner ou Protocolo";
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
        <div className="flex-1 relative">
          <Input
            value={valor}
            onChange={(e) => setValor(e.target.value.toUpperCase())}
            placeholder={isPosicionamento ? "Ex: JBSP000001, A1234567890, ABCD1234567" : "Ex: JBSP000001, ABCD1234567"}
            disabled={!servicoSelecionado}
            className="pr-24"
          />
          {tipoDetectado && valor.trim() && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              {getTipoLabel(tipoDetectado)}
            </span>
          )}
        </div>
        <Button type="submit" disabled={isLoading || !valor.trim() || !servicoSelecionado} className="jbs-btn-primary px-6">
          <Search className="h-4 w-4 mr-2" />
          Consultar
        </Button>
      </div>
    </form>
  );
};

export default ConsultaForm;
