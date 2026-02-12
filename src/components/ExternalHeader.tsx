import { useState } from "react";
import { UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import LoginOverlay from "@/components/LoginOverlay";
import jbsLogo from "@/assets/jbs-terminais-logo.png";

const ExternalHeader = () => {
  const [showLogin, setShowLogin] = useState(false);

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
      </header>
      <LoginOverlay open={showLogin} onOpenChange={setShowLogin} />
    </>
  );
};

export default ExternalHeader;
