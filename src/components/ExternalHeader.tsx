import { Ship } from "lucide-react";

const ExternalHeader = () => {
  return (
    <header className="jbs-header">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-secondary rounded-lg p-2">
            <Ship className="h-6 w-6 text-secondary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">JBS Terminais</h1>
            <p className="text-xs text-primary-foreground/70">Serviço de Posicionamento de Contêiner</p>
          </div>
        </div>
        <a
          href="/interno"
          className="text-xs text-primary-foreground/60 hover:text-primary-foreground/90 transition-colors"
        >
          Acesso Interno
        </a>
      </div>
    </header>
  );
};

export default ExternalHeader;
