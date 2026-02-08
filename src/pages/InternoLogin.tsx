import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import jbsLogo from "@/assets/jbs-terminais-logo.png";

// Login with Microsoft (corpo) or Admin
const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(1, "Senha é obrigatória").max(100),
});

const InternoLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("microsoft");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Check domain for non-admin users
        const userEmail = session.user.email || "";
        if (!userEmail.endsWith("@jbsterminais.com.br") && userEmail !== "admin@jbsterminais.internal") {
          toast.error("Acesso restrito ao domínio @jbsterminais.com.br");
          supabase.auth.signOut();
          return;
        }
        navigate("/interno/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const userEmail = session.user.email || "";
        if (userEmail.endsWith("@jbsterminais.com.br") || userEmail === "admin@jbsterminais.internal") {
          navigate("/interno/dashboard");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        scopes: 'email profile',
        redirectTo: `${window.location.origin}/interno/dashboard`,
      }
    });
    
    if (error) {
      // Fallback to email/password for testing
      toast.info("Login Microsoft não configurado. Use o formulário abaixo.");
    }
    setLoading(false);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }

    // Validate domain
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
    const adminUser = email.toLowerCase().trim();
    const adminPass = password;

    // Admin default credentials
    if (adminUser === "admin" && adminPass === "Admin") {
      setLoading(true);
      // Sign in with special admin account
      const { error } = await supabase.auth.signInWithPassword({
        email: "admin@jbsterminais.internal",
        password: "Admin123!@#",
      });

      if (error) {
        // Try to create admin user if not exists
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: "admin@jbsterminais.internal",
          password: "Admin123!@#",
        });

        if (signUpError) {
          toast.error("Erro ao acessar conta admin: " + signUpError.message);
          setLoading(false);
          return;
        }

        if (signUpData.user) {
          await supabase.from("profiles").insert({
            id: signUpData.user.id,
            email: "admin@jbsterminais.internal",
            nome: "Administrador",
            setor: "COMEX" as any, // Admin has full access
          });
          toast.success("Conta admin criada com sucesso!");
        }
      }
      setLoading(false);
    } else {
      toast.error("Credenciais de admin inválidas.");
    }
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
          <CardTitle className="text-xl font-bold">Acesso Interno</CardTitle>
          <CardDescription>
            Painel de Gestão de Posicionamento
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                  <Label htmlFor="email">E-mail corporativo</Label>
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
                <div>
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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

          <div className="mt-6 text-center">
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Voltar ao portal externo
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InternoLogin;
