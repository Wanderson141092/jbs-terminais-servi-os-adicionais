import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jbsLogo from "@/assets/jbs-terminais-logo.png";

interface SetorSelectorProps {
  userId: string;
  onComplete: () => void;
}

const SetorSelector = ({ userId, onComplete }: SetorSelectorProps) => {
  const [emailSetor, setEmailSetor] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!emailSetor.trim()) {
      toast.error("Informe o e-mail do setor.");
      return;
    }

    const emailLower = emailSetor.toLowerCase().trim();

    // Validate email format
    if (!emailLower.endsWith("@jbsterminais.com.br")) {
      toast.error("E-mail deve ser do domínio @jbsterminais.com.br");
      return;
    }

    setLoading(true);

    // Check if this sector email exists in the mapping table
    const { data: setorData, error: setorError } = await supabase
      .from("setor_emails")
      .select("setor")
      .eq("email_setor", emailLower)
      .maybeSingle();

    if (setorError) {
      toast.error("Erro ao verificar setor: " + setorError.message);
      setLoading(false);
      return;
    }

    if (!setorData) {
      toast.error("E-mail de setor não reconhecido. Contate o administrador.");
      setLoading(false);
      return;
    }

    // Update profile with sector
    const { error } = await supabase
      .from("profiles")
      .update({ 
        setor: setorData.setor as any,
        email_setor: emailLower 
      })
      .eq("id", userId);

    if (error) {
      toast.error("Erro ao salvar setor: " + error.message);
    } else {
      toast.success(`Setor ${setorData.setor} configurado com sucesso!`);
      onComplete();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={jbsLogo} 
              alt="JBS Terminais" 
              className="h-14 w-auto"
            />
          </div>
          <CardTitle className="text-xl">Configuração Inicial</CardTitle>
          <CardDescription>
            Para completar seu cadastro, informe o e-mail do seu setor. Esta informação é necessária para o fluxo de aprovação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email-setor">E-mail do Setor</Label>
            <Input
              id="email-setor"
              type="email"
              value={emailSetor}
              onChange={(e) => setEmailSetor(e.target.value)}
              placeholder="setor@jbsterminais.com.br"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Exemplos: comex@jbsterminais.com.br, armazem@jbsterminais.com.br
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p className="font-medium mb-1">Setores disponíveis:</p>
            <ul className="text-xs space-y-1">
              <li>• comex@jbsterminais.com.br (COMEX)</li>
              <li>• exportacao@jbsterminais.com.br (COMEX)</li>
              <li>• importacao@jbsterminais.com.br (COMEX)</li>
              <li>• armazem@jbsterminais.com.br (ARMAZÉM)</li>
            </ul>
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full jbs-btn-primary">
            {loading ? "Verificando..." : "Confirmar Setor"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetorSelector;
