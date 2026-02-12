import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
    const url = `https://zdradwiudsuzavsexytt.supabase.co/auth/v1/authorize?provider=azure&redirect_to=${encodeURIComponent(window.location.origin + '/interno/dashboard')}&scopes=${encodeURIComponent('openid email profile')}`;
    window.location.href = url;
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={jbsLogo} alt="JBS Terminais" className="h-14 w-auto" />
          </div>
          <SheetTitle className="text-xl font-bold">Acesso Interno</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Painel de Gestão de Posicionamento
          </p>
        </SheetHeader>

        <div className="mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="microsoft">Corporativo</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="microsoft" className="space-y-4">
              <Button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={loading}
                className="w-full bg-[#0078d4] hover:bg-[#106ebe] text-white"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 21 21">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
                {loading ? "Aguarde..." : "Entrar com Microsoft"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    ou use e-mail corporativo
                  </span>
                </div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <Label htmlFor="overlay-email">E-mail corporativo</Label>
                  <Input
                    id="overlay-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@jbsterminais.com.br"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Apenas domínio @jbsterminais.com.br
                  </p>
                </div>
                <div>
                  <Label htmlFor="overlay-password">Senha</Label>
                  <Input
                    id="overlay-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full jbs-btn-primary">
                  <LogIn className="h-4 w-4 mr-2" />
                  {loading ? "Aguarde..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="admin" className="space-y-4">
              <div className="text-center mb-4">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Acesso administrativo do sistema
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <Label htmlFor="admin-user">Usuário</Label>
                  <Input
                    id="admin-user"
                    type="text"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    placeholder="Admin"
                  />
                </div>
                <div>
                  <Label htmlFor="admin-pass">Senha</Label>
                  <Input
                    id="admin-pass"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full jbs-btn-primary">
                  <Shield className="h-4 w-4 mr-2" />
                  {loading ? "Aguarde..." : "Acessar como Admin"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LoginOverlay;
