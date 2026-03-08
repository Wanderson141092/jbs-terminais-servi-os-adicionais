import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import jbsLogo from "@/assets/jbs-terminais-logo.png";

interface LoginOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LoginOverlay = React.forwardRef<HTMLDivElement, LoginOverlayProps>(({ open, onOpenChange }, _ref) => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        onOpenChange(false);
        navigate("/interno/dashboard");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, onOpenChange]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = identifier.trim();
    if (!trimmed || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }

    setLoading(true);

    // If it looks like an email, do normal email login
    if (trimmed.includes("@")) {
      if (!trimmed.endsWith("@jbsterminais.com.br")) {
        toast.error("Acesso restrito ao domínio @jbsterminais.com.br");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: trimmed, password });
      setLoading(false);
      if (error) {
        toast.error(error.message.includes("Invalid login") ? "E-mail ou senha incorretos." : error.message);
      }
      return;
    }

    // Otherwise treat as admin username
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ username: trimmed, password }),
      });
      const data = await res.json();
      if (data?.error) {
        toast.error("Acesso incorreto. Verifique seu usuário e senha e tente novamente.");
        setLoading(false);
        return;
      }
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        toast.success(`Bem-vindo, ${data.adminNome || "Administrador"}!`);
      } else {
        toast.error("Usuário ou senha incorretos.");
      }
    } catch {
      toast.error("Erro ao conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] max-h-[90vh] overflow-y-auto p-0 rounded-xl border-none shadow-2xl">
        <div className="bg-primary rounded-t-xl px-6 pt-6 pb-5">
          <div className="flex justify-center mb-3">
            <div className="bg-white rounded-lg p-2.5 shadow-md" style={{ minHeight: 52, minWidth: 52 }}>
              <img src={jbsLogo} alt="JBS Terminais" className="h-10 w-auto" loading="eager" decoding="sync" />
            </div>
          </div>
          <DialogHeader className="text-center">
            <DialogTitle className="text-lg font-bold text-primary-foreground">Acesso Interno</DialogTitle>
            <p className="text-xs text-primary-foreground/70 mt-1">Painel de Gestão | Serviços Adicionais</p>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 pt-4">
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="overlay-id" className="text-sm font-medium text-foreground">
                Usuário
              </Label>
              <Input
                id="overlay-id"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="E-mail corporativo"
                className="h-10 rounded-lg border-input focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[11px] text-muted-foreground">Informe o seu email.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="overlay-password" className="text-sm font-medium text-foreground">
                Senha
              </Label>
              <PasswordInput
                id="overlay-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-10 rounded-lg border-input focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full jbs-btn-primary h-11 rounded-lg font-medium mt-2"
            >
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? "Aguarde..." : "Entrar"}
            </Button>
            <div className="text-center mt-3">
              <a
                href="/recuperar-senha"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Esqueci minha senha
              </a>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
});

LoginOverlay.displayName = "LoginOverlay";

export default LoginOverlay;
