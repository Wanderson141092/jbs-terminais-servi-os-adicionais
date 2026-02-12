import jbsLogo from "@/assets/jbs-terminais-logo.png";

const ExternalHeader = () => {
  return (
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
        <a
          href="/interno"
          className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors font-medium"
        >
          Entrar
        </a>
      </div>
    </header>
  );
};

export default ExternalHeader;
