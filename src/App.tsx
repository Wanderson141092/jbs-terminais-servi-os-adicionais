import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import InternoLogin from "./pages/InternoLogin";
import RecuperarSenha from "./pages/RecuperarSenha";
import InternoDashboard from "./pages/InternoDashboard";
import AdminParametros from "./pages/admin/AdminParametros";
import AdminUsuarios from "./pages/admin/AdminUsuarios";
import AdminSetores from "./pages/admin/AdminSetores";
import AdminServicos from "./pages/admin/AdminServicos";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminIntegracoes from "./pages/admin/AdminIntegracoes";

import AdminHistoricoIntegracoes from "./pages/admin/AdminHistoricoIntegracoes";
import AdminFormularios from "./pages/admin/AdminFormularios";
import GestorRegras from "./pages/GestorRegras";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/servicos-adicionais" element={<Index />} />
          <Route path="/interno" element={<InternoLogin />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/interno/dashboard" element={<InternoDashboard />} />
          <Route path="/interno/admin/parametros" element={<AdminParametros />} />
          <Route path="/interno/admin/usuarios" element={<AdminUsuarios />} />
          <Route path="/interno/admin/setores" element={<AdminSetores />} />
          <Route path="/interno/admin/servicos" element={<AdminServicos />} />
          <Route path="/interno/admin/logs" element={<AdminLogs />} />
          <Route path="/interno/admin/integracoes" element={<AdminIntegracoes />} />
          
          <Route path="/interno/admin/historico-integracoes" element={<AdminHistoricoIntegracoes />} />
           <Route path="/interno/admin/formularios" element={<AdminFormularios />} />
          <Route path="/interno/gestor/regras" element={<GestorRegras />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
