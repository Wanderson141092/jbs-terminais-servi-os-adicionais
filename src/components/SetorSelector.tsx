import { useState } from "react";
import { Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SetorSelectorProps {
  userId: string;
  onComplete: () => void;
}

const SetorSelector = ({ userId, onComplete }: SetorSelectorProps) => {
  const [setor, setSetor] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!setor) {
      toast.error("Selecione um setor.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ setor: setor as any })
      .eq("id", userId);

    if (error) {
      toast.error("Erro ao salvar setor: " + error.message);
    } else {
      toast.success("Setor configurado!");
      onComplete();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-secondary rounded-xl p-3">
              <Ship className="h-8 w-8 text-secondary-foreground" />
            </div>
          </div>
          <CardTitle className="text-xl">Configuração Inicial</CardTitle>
          <CardDescription>
            Selecione o setor ao qual você pertence. Esta informação é necessária para o fluxo de aprovação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Setor</Label>
            <Select value={setor} onValueChange={setSetor}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione seu setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMEX">COMEX</SelectItem>
                <SelectItem value="ARMAZEM">ARMAZÉM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSave} disabled={loading} className="w-full jbs-btn-primary">
            {loading ? "Salvando..." : "Confirmar Setor"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetorSelector;
