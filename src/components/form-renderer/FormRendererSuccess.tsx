import { CheckCircle, Mail, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import jbsLogo from "@/assets/jbs-terminais-logo.png";

interface FormRendererSuccessProps {
  protocolo: string;
  chaveConsulta?: string;
  emailParaNotificacao: string;
  emailSalvo: boolean;
  showEmailField?: boolean;
  onEmailChange: (email: string) => void;
  onSaveEmail: () => void;
}

const FormRendererSuccess = ({
  protocolo,
  chaveConsulta,
  emailParaNotificacao,
  emailSalvo,
  showEmailField = true,
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

    <div className="bg-primary/5 border-2 border-primary rounded-xl p-4 mb-4">
      <p className="text-sm text-muted-foreground mb-1">Número do Protocolo</p>
      <p className="text-2xl font-bold text-primary tracking-wider">{protocolo}</p>
    </div>

    {chaveConsulta && (
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Key className="h-4 w-4 text-blue-600" />
          <p className="text-sm text-blue-600 font-medium">Chave de Consulta</p>
        </div>
        <p className="text-2xl font-mono font-bold text-blue-800 tracking-[0.3em]">{chaveConsulta}</p>
        <p className="text-xs text-blue-500 mt-2">
          Guarde esta chave! Ela é necessária para consultar o status da sua solicitação.
        </p>
      </div>
    )}

    {showEmailField && !emailSalvo ? (
      <div className="space-y-3 text-left">
        <p className="text-sm text-muted-foreground text-center">
          Informe seu e-mail para receber atualizações e a chave de consulta:
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
    ) : showEmailField && emailSalvo ? (
      <div className="bg-secondary/10 rounded-lg p-3">
        <p className="text-sm text-secondary font-medium">
          ✓ E-mail registrado! Você receberá notificações em {emailParaNotificacao}
        </p>
      </div>
    ) : null}
  </div>
);

export default FormRendererSuccess;
