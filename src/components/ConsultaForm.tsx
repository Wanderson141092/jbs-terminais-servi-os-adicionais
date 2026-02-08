import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ConsultaFormProps {
  onSearch: (tipo: string, valor: string) => void;
  isLoading: boolean;
}

const ConsultaForm = ({ onSearch, isLoading }: ConsultaFormProps) => {
  const [tipo, setTipo] = useState("protocolo");
  const [valor, setValor] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (valor.trim()) {
      onSearch(tipo, valor.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label className="text-sm font-semibold text-foreground mb-3 block">
          Consultar por:
        </Label>
        <RadioGroup value={tipo} onValueChange={setTipo} className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <RadioGroupItem value="protocolo" id="protocolo" />
            <Label htmlFor="protocolo" className="text-sm cursor-pointer">Protocolo</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="lpco" id="lpco" />
            <Label htmlFor="lpco" className="text-sm cursor-pointer">LPCO</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="conteiner" id="conteiner" />
            <Label htmlFor="conteiner" className="text-sm cursor-pointer">Número do Contêiner</Label>
          </div>
        </RadioGroup>
      </div>

      <div className="flex gap-3">
        <Input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={
            tipo === "protocolo"
              ? "Digite o número do protocolo"
              : tipo === "lpco"
              ? "Digite o LPCO"
              : "Digite o número do contêiner"
          }
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !valor.trim()} className="jbs-btn-primary px-6">
          <Search className="h-4 w-4 mr-2" />
          Consultar
        </Button>
      </div>
    </form>
  );
};

export default ConsultaForm;
