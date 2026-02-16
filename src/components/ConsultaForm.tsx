import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface ConsultaFormProps {
  onSearch: (valor: string, chave: string) => void;
  isLoading: boolean;
}

const ConsultaForm = ({ onSearch, isLoading }: ConsultaFormProps) => {
  const [valor, setValor] = useState("");
  const [chave, setChave] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (valor.trim() && chave.trim()) {
      const valorUpper = valor.trim().toUpperCase();
      const chaveUpper = chave.trim().toUpperCase();
      
      if (chaveUpper.length !== 6) {
        toast.error("A chave de validação deve ter exatamente 6 caracteres.");
        return;
      }
      
      onSearch(valorUpper, chaveUpper);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label className="text-sm font-semibold text-foreground mb-2 block">
          Consulta de Solicitação
        </Label>
        <p className="text-xs text-muted-foreground mb-3">
          Informe o Protocolo, Contêiner ou LPCO + Chave de Validação
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Protocolo, Contêiner ou LPCO</Label>
          <Input
            value={valor}
            onChange={(e) => setValor(e.target.value.toUpperCase().slice(0, 15))}
            placeholder="Ex: ABCU1234567"
            maxLength={15}
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Chave de Validação</Label>
          <Input
            value={chave}
            onChange={(e) => setChave(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            placeholder="6 caracteres"
            maxLength={6}
            className="text-center tracking-widest font-mono"
          />
        </div>
      </div>
      <Button 
        type="submit" 
        disabled={isLoading || !valor.trim() || chave.trim().length !== 6} 
        className="jbs-btn-primary w-full"
      >
        <Search className="h-4 w-4 mr-2" />
        Consultar
      </Button>

      <div className="text-xs text-muted-foreground pt-2 border-t">
        <p>Informe o Protocolo, Contêiner ou LPCO junto com a chave de validação recebida na solicitação.</p>
      </div>
    </form>
  );
};

export default ConsultaForm;
