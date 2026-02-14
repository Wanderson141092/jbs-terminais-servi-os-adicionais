import { CheckCircle, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import jbsLogo from "@/assets/jbs-terminais-logo.png";

interface FormRendererSuccessProps {
  protocolo: string;
  emailParaNotificacao: string;
  emailSalvo: boolean;
  onEmailChange: (email: string) => void;
  onSaveEmail: () => void;
}

const FormRendererSuccess = ({
  protocolo,
  emailParaNotificacao,
  emailSalvo,
  onEmailChange,
  onSaveEmail,
}: FormRendererSuccessProps) => (
  <div className="text-center py-8 max-w-md mx-auto">
    <div className="flex justify-center mb-4">
      <div className="bg-white rounded-lg p-2">
        <img src={jbsLogo} alt="JBS Terminais" className="h-10 w-auto" />
      </div>
    </div>

    <CheckCircle className="h-16 w-16 text-secondary mx-auto mb-4" />
    <h2 className="text-2xl font-bold text-foreground mb-2">Solicitação Recebida!</h2>
    <p className="text-muted-foreground mb-4">Sua solicitação foi registrada com sucesso.</p>

    <div className="bg-primary/5 border-2 border-primary rounded-xl p-4 mb-6">
      <p className="text-sm text-muted-foreground mb-1">Número do Protocolo</p>
      <p className="text-2xl font-bold text-primary tracking-wider">{protocolo}</p>
    </div>

    {!emailSalvo ? (
      <div className="space-y-3 text-left">
        <p className="text-sm text-muted-foreground text-center">
          Informe seu e-mail para receber atualizações sobre sua solicitação:
        </p>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="seu@email.com"
            value={emailParaNotificacao}
            onChange={(e) => onEmailChange(e.target.value)}
          />
          <Button onClick={onSaveEmail} className="shrink-0">
            <Mail className="h-4 w-4 mr-1" />
            Salvar
          </Button>
        </div>
      </div>
    ) : (
      <div className="bg-secondary/10 rounded-lg p-3">
        <p className="text-sm text-secondary font-medium">
          ✓ E-mail registrado! Você receberá notificações em {emailParaNotificacao}
        </p>
      </div>
    )}
  </div>
);

export default FormRendererSuccess;
