import { Check, X, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessChecklistProps {
  solicitacao: {
    status: string;
    comex_aprovado?: boolean | null;
    armazem_aprovado?: boolean | null;
    comex_justificativa?: string | null;
    armazem_justificativa?: string | null;
    status_vistoria?: string | null;
    solicitar_deferimento?: boolean;
    lancamento_confirmado?: boolean | null;
    pendencias_selecionadas?: string[] | null;
  };
  aprovacaoAtivada?: boolean;
  aprovacaoAdministrativo?: boolean;
  aprovacaoOperacional?: boolean;
  deferimentoStatus?: "recebido" | "recusado" | "aguardando" | null;
  compact?: boolean;
  hideInternal?: boolean;
}

interface CheckItem {
  label: string;
  status: "done" | "pending" | "error" | "waiting";
  detail?: string;
}

const getCheckItems = (props: ProcessChecklistProps): CheckItem[] => {
  const { solicitacao: s, aprovacaoAtivada = false, aprovacaoAdministrativo = false, aprovacaoOperacional = false, deferimentoStatus, hideInternal = false } = props;
  const items: CheckItem[] = [];

  // 1. Solicitação registrada
  items.push({ label: "Solicitação registrada", status: "done" });

  // 2. Aprovações (individually)
  if (aprovacaoAdministrativo) {
    items.push({
      label: "Aprovação Administrativo",
      status: s.comex_aprovado === true ? "done" : s.comex_aprovado === false ? "error" : "waiting",
      detail: s.comex_justificativa || undefined,
    });
  }
  if (aprovacaoOperacional) {
    items.push({
      label: "Aprovação Operacional",
      status: s.armazem_aprovado === true ? "done" : s.armazem_aprovado === false ? "error" : "waiting",
      detail: s.armazem_justificativa || undefined,
    });
  }

  // 3. Vistoria
  const vistoriaStatuses = ["vistoria_finalizada", "vistoriado_com_pendencia", "nao_vistoriado"];
  const vistoriaConcluida = vistoriaStatuses.includes(s.status);
  items.push({
    label: "Vistoria realizada",
    status: s.status === "vistoria_finalizada"
      ? "done"
      : s.status === "vistoriado_com_pendencia"
        ? "error"
        : s.status === "nao_vistoriado"
          ? "error"
          : s.status === "confirmado_aguardando_vistoria"
            ? "pending"
            : "waiting",
    detail: s.status === "vistoriado_com_pendencia" && s.pendencias_selecionadas?.length
      ? `Pendências: ${s.pendencias_selecionadas.join(", ")}`
      : s.status === "nao_vistoriado"
        ? "Não vistoriado"
        : undefined,
  });

  // 4. Deferimento (only if showDeferimento is true - controlled by parent with 3 conditions)
  if (s.solicitar_deferimento) {
    items.push({
      label: "Deferimento enviado",
      status: deferimentoStatus === "recebido"
        ? "done"
        : deferimentoStatus === "recusado"
          ? "error"
          : deferimentoStatus === "aguardando"
            ? "pending"
            : "waiting",
      detail: deferimentoStatus === "recusado" ? "Documento recusado, reenvio necessário" : undefined,
    });
  }

  // 5. Confirmação de lançamento (internal only)
  if (!hideInternal) {
    const vistoriaStatuses2 = ["vistoria_finalizada", "vistoriado_com_pendencia", "nao_vistoriado"];
    const vistoriaConcluida2 = vistoriaStatuses2.includes(s.status);
    if (vistoriaConcluida2 || s.lancamento_confirmado !== null) {
      items.push({
        label: "Lançamento confirmado",
        status: s.lancamento_confirmado === true ? "done" : "waiting",
      });
    }
  }

  return items;
};

const statusConfig = {
  done: {
    icon: <Check className="h-3.5 w-3.5" />,
    className: "text-green-600 bg-green-50 border-green-200",
    iconBg: "bg-green-500 text-white",
  },
  pending: {
    icon: <Clock className="h-3.5 w-3.5" />,
    className: "text-blue-600 bg-blue-50 border-blue-200",
    iconBg: "bg-blue-500 text-white",
  },
  error: {
    icon: <X className="h-3.5 w-3.5" />,
    className: "text-red-600 bg-red-50 border-red-200",
    iconBg: "bg-red-500 text-white",
  },
  waiting: {
    icon: <Circle className="h-3.5 w-3.5" />,
    className: "text-muted-foreground bg-muted/50 border-muted",
    iconBg: "bg-muted text-muted-foreground",
  },
};

const ProcessChecklist = (props: ProcessChecklistProps) => {
  const items = getCheckItems(props);
  const { compact = false } = props;

  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      {items.map((item, i) => {
        const config = statusConfig[item.status];
        return (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 px-3 py-2 rounded-lg border",
              config.className,
              compact && "px-2 py-1.5"
            )}
          >
            <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5", config.iconBg)}>
              {config.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", compact && "text-xs")}>
                {item.label}
              </p>
              {item.detail && !compact && (
                <p className="text-xs opacity-80 mt-0.5">{item.detail}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export { getCheckItems };
export type { CheckItem };
export default ProcessChecklist;
