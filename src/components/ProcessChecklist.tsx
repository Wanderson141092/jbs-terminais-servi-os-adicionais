import { Check, X, Clock, Circle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EtapaConfigItem {
  chave: string;
  titulo: string;
  tipo: string;
  grupo: string;
  ordem: number;
  etapa_equivalente: string | null;
  status_gatilho: string[];
}

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
    tipo_operacao?: string | null;
    categoria?: string | null;
    observacoes?: string | null;
  };
  aprovacaoAtivada?: boolean;
  aprovacaoAdministrativo?: boolean;
  aprovacaoOperacional?: boolean;
  deferimentoStatus?: "recebido" | "recusado" | "aguardando" | null;
  compact?: boolean;
  hideInternal?: boolean;
  serviceName?: string;
  etapasConfig?: EtapaConfigItem[];
}

interface CheckItem {
  label: string;
  status: "done" | "pending" | "error" | "waiting" | "warning";
  detail?: string;
}

const isPosicionamento = (tipoOperacao?: string | null): boolean => {
  return (tipoOperacao || "").toLowerCase().includes("posicionamento");
};

const getCheckItems = (props: ProcessChecklistProps): CheckItem[] => {
  const { solicitacao: s, aprovacaoAdministrativo = false, aprovacaoOperacional = false, deferimentoStatus, hideInternal = false, serviceName } = props;
  const items: CheckItem[] = [];
  const isPosic = isPosicionamento(s.tipo_operacao);

  // 1. Solicitação registrada
  items.push({ label: "Solicitação registrada", status: "done" });

  // 2. Internal approvals as sub-items (only show internally)
  if (!hideInternal) {
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
  }

  // Show rejection reason in checklist (even externally) when status is recusado
  if (s.status === "recusado" || s.status === "cancelado") {
    const motivoRecusa = s.armazem_aprovado === false
      ? s.armazem_justificativa
      : s.comex_justificativa;
    items.push({
      label: s.status === "recusado" ? "Recusado" : "Cancelado",
      status: "error",
      detail: motivoRecusa || undefined,
    });
    return items;
  }

  if (isPosic) {
    // Posicionamento: vistoria-based items
    const vistoriaStatuses = ["vistoria_finalizada", "vistoriado_com_pendencia", "nao_vistoriado"];
    
    if (s.status === "vistoria_finalizada") {
      items.push({ label: "Vistoriado sem pendência", status: "done" });
    } else if (s.status === "vistoriado_com_pendencia") {
      const pendDetail = s.pendencias_selecionadas?.length
        ? s.pendencias_selecionadas.join(", ")
        : undefined;
      items.push({
        label: "Vistoriado com pendência",
        status: "error",
        detail: pendDetail,
      });
      if (s.observacoes) {
        items.push({
          label: "Observação do processo",
          status: "error",
          detail: s.observacoes,
        });
      }
    } else if (s.status === "nao_vistoriado") {
      items.push({
        label: "Não vistoriado",
        status: "error",
        detail: s.observacoes || undefined,
      });
    } else if (s.status === "confirmado_aguardando_vistoria") {
      items.push({ label: "Aguardando conclusão do serviço", status: "pending" });
    }
  } else {
    // Non-Posicionamento: show intermediate or final stage
    if (s.status === "confirmado_aguardando_vistoria") {
      items.push({ label: "Aguardando conclusão do serviço", status: "pending" });
    } else if (s.status === "nao_vistoriado") {
      items.push({
        label: "Não vistoriado",
        status: "error",
        detail: s.observacoes || undefined,
      });
    } else {
      const finishedStatuses = ["vistoria_finalizada", "vistoriado_com_pendencia"];
      if (finishedStatuses.includes(s.status)) {
        const name = serviceName || s.tipo_operacao || "Serviço";
        items.push({
          label: `Serviço "${name}" executado e finalizado.`,
          status: "done",
        });
      }
    }
  }

  // Deferimento (only if showDeferimento is true)
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

  // Lançamento (internal only)
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
  warning: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    className: "text-amber-600 bg-amber-50 border-amber-200",
    iconBg: "bg-amber-500 text-white",
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
              {item.detail && (!compact || item.status === "error") && (
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
