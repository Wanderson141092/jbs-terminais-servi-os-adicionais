import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import jbsLogo from "@/assets/jbs-terminais-logo.png";

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(1, "Senha é obrigatória").max(100),
});

interface LoginOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LoginOverlay = ({ open, onOpenChange }: LoginOverlayProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminUser, setAdminUser] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("microsoft");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        onOpenChange(false);
        navigate("/interno/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, onOpenChange]);

  const handleMicrosoftLogin = () => {
    toast.info("Autenticação Microsoft será disponibilizada em breve.");
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    if (!email.endsWith("@jbsterminais.com.br")) {
      toast.error("Acesso restrito ao domínio @jbsterminais.com.br");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      if (error.message.includes("Invalid login")) {
        toast.error("E-mail ou senha incorretos.");
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUser.trim() || !password.trim()) {
      toast.error("Usuário e senha são obrigatórios.");
      return;
    }
    setLoading(true);

    try {
      const response = await supabase.functions.invoke("admin-login", {
        body: { username: adminUser.trim(), password },
      });

      const data = response.data;

      if (response.error || data?.error) {
        toast.error(data?.error || "Login ou senha incorretos.");
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
        toast.error("Credenciais inválidas.");
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
        {/* Header com faixa azul institucional */}
        <div className="bg-primary rounded-t-xl px-6 pt-6 pb-5">
          <div className="flex justify-center mb-3">
            <div className="bg-white rounded-lg p-2.5 shadow-md">
              <img src={jbsLogo} alt="JBS Terminais" className="h-10 w-auto" />
            </div>
          </div>
          <DialogHeader className="text-center">
            <DialogTitle className="text-lg font-bold text-primary-foreground">
              Acesso Interno
            </DialogTitle>
            <p className="text-xs text-primary-foreground/70 mt-1">
              Painel de Gestão de Posicionamento
            </p>
          </DialogHeader>
        </div>

        {/* Conteúdo do formulário */}
        <div className="px-6 pb-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-5 bg-muted/60 rounded-lg p-1">
              <TabsTrigger
                value="microsoft"
                className="rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Corporativo
              </TabsTrigger>
              <TabsTrigger
                value="admin"
                className="rounded-md text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
              >
                Admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="microsoft" className="space-y-4 mt-0">
              <Button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={loading}
                className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white h-11 rounded-lg font-medium shadow-sm"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                {loading ? "Aguarde..." : "Entrar com Microsoft"}
              </Button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground font-medium">
                    ou use e-mail corporativo
                  </span>
                </div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="overlay-email" className="text-sm font-medium text-foreground">E-mail corporativo</Label>
                  <Input
                    id="overlay-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@jbsterminais.com.br"
                    className="h-10 rounded-lg border-input focus:ring-2 focus:ring-primary/20"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Apenas domínio @jbsterminais.com.br
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="overlay-password" className="text-sm font-medium text-foreground">Senha</Label>
                  <Input
                    id="overlay-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 rounded-lg border-input focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full jbs-btn-primary h-11 rounded-lg font-medium mt-2">
                  <LogIn className="h-4 w-4 mr-2" />
                  {loading ? "Aguarde..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin" className="space-y-4 mt-0">
              <div className="text-center mb-3">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-2">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Acesso administrativo do sistema
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-user" className="text-sm font-medium text-foreground">Usuário</Label>
                  <Input
                    id="admin-user"
                    type="text"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    placeholder="Admin"
                    className="h-10 rounded-lg border-input focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="admin-pass" className="text-sm font-medium text-foreground">Senha</Label>
                  <Input
                    id="admin-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 rounded-lg border-input focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full jbs-btn-primary h-11 rounded-lg font-medium mt-2">
                  <Shield className="h-4 w-4 mr-2" />
                  {loading ? "Aguarde..." : "Acessar como Admin"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginOverlay;
