import jbsLogo from "@/assets/jbs-terminais-logo.png";

interface FormRendererHeaderProps {
  titulo: string;
  descricao: string | null;
  estilo: string;
  headerClass: string;
}

const FormRendererHeader = ({ titulo, descricao, estilo, headerClass }: FormRendererHeaderProps) => (
  <div className={headerClass}>
    {estilo === "jbs" && (
      <div className="flex justify-center mb-4">
        <div className="bg-white rounded-lg p-2">
          <img src={jbsLogo} alt="JBS Terminais" className="h-12 w-auto" />
        </div>
      </div>
    )}
    <h1 className="text-2xl font-bold text-primary mb-2">{titulo}</h1>
    {descricao && <p className="text-muted-foreground">{descricao}</p>}
  </div>
);

export default FormRendererHeader;
