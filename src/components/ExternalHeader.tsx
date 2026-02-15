import { useState, useEffect } from "react";
import { UserCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoginOverlay from "@/components/LoginOverlay";
import jbsLogo from "@/assets/jbs-terminais-logo.png";
import { supabase } from "@/integrations/supabase/client";

const ExternalHeader = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("page_config")
      .select("config_value, is_active")
      .eq("config_key", "portal_cliente_url")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.is_active && data?.config_value) {
          setPortalUrl(data.config_value);
        }
      });
  }, []);

  return (
    <>
      <header className="jbs-header">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white rounded-lg p-1.5 sm:p-2">
              <img 
                src={jbsLogo} 
                alt="JBS Terminais" 
                className="h-8 sm:h-10 w-auto"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {portalUrl && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(portalUrl, "_blank", "noopener,noreferrer")}
                className="text-xs sm:text-sm font-semibold gap-1.5"
              >
                <ExternalLink className="h-4 w-4" />
                Portal do Cliente
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLogin(true)}
              className="text-primary-foreground hover:bg-primary-foreground/10"
              title="Acesso Interno"
            >
              <UserCircle className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>
      <LoginOverlay open={showLogin} onOpenChange={setShowLogin} />
    </>
  );
};

export default ExternalHeader;
