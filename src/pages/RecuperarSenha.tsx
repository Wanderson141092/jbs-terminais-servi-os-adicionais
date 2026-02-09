import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { KeyRound, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jbsLogo from "@/assets/jbs-terminais-logo.png";

const RecuperarSenha = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Check if we're in reset mode (coming from email link)
  const isResetMode = searchParams.get("type") === "recovery";

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.endsWith("@jbsterminais.com.br")) {
      toast.error("Apenas e-mails do domínio @jbsterminais.com.br");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar-senha?type=recovery`,
    });

    if (error) {
      toast.error("Erro ao enviar e-mail: " + error.message);
    } else {
      setEmailSent(true);
      toast.success("E-mail de recuperação enviado!");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (novaSenha.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: novaSenha,
    });

    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setTimeout(() => navigate("/interno"), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img 
              src={jbsLogo} 
              alt="JBS Terminais" 
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <KeyRound className="h-5 w-5" />
            {isResetMode ? "Nova Senha" : "Recuperar Senha"}
          </CardTitle>
          <CardDescription>
            {isResetMode 
              ? "Digite sua nova senha abaixo" 
              : "Informe seu e-mail para receber o link de recuperação"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailSent && !isResetMode ? (
            <div className="text-center py-6">
              <Check className="h-12 w-12 text-secondary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Um e-mail foi enviado para <strong>{email}</strong> com instruções para redefinir sua senha.
              </p>
              <Button variant="outline" onClick={() => navigate("/interno")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao login
              </Button>
            </div>
          ) : isResetMode ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label htmlFor="novaSenha">Nova Senha</Label>
                <Input
                  id="novaSenha"
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
                <Input
                  id="confirmarSenha"
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Confirme a senha"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full jbs-btn-primary">
                {loading ? "Alterando..." : "Alterar Senha"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@jbsterminais.com.br"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas domínio @jbsterminais.com.br
                </p>
              </div>
              <Button type="submit" disabled={loading} className="w-full jbs-btn-primary">
                {loading ? "Enviando..." : "Enviar Link de Recuperação"}
              </Button>
            </form>
          )}

          {!emailSent && (
            <div className="mt-6 text-center">
              <a href="/interno" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-3 w-3 inline mr-1" />
                Voltar ao login
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecuperarSenha;
