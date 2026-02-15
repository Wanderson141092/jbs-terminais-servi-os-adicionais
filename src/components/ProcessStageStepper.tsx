import { Check, Clock, X, CircleDot, FileCheck, Upload, AlertTriangle } from "lucide-react";
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

interface ProcessStageStepperProps {
  status: string;
  comexAprovado?: boolean | null;
  armazemAprovado?: boolean | null;
  aprovacaoAtivada?: boolean;
  aprovacaoAdministrativo?: boolean;
  aprovacaoOperacional?: boolean;
  solicitarDeferimento?: boolean;
  deferimentoStatus?: "recebido" | "recusado" | "aguardando" | null;
  statusLabels?: { sigla: string | null; valor: string; ordem: number; tipo_resultado?: string | null }[];
  compact?: boolean;
  categoria?: string | null;
  tipoOperacao?: string | null;
  pendenciasSelecionadas?: string[] | null;
  observacoes?: string[];
  etapasConfig?: EtapaConfigItem[];
}

interface Stage {
  key: string;
  label: string;
  icon: React.ReactNode;
  state: "completed" | "current" | "pending" | "error" | "warning";
  detail?: string;
}

// Motivos that route to "Aguardando Serviço" instead of "Aguardando Vistoria"
const MOTIVOS_SERVICO = [
  "fumigação / expurgo",
  "fumigacao / expurgo",
  "laudo técnico | rfb",
  "laudo tecnico | rfb",
  "lacre armador pendente",
  "pendência de lacre armador",
  "pendencia de lacre armador",
];

const isMotivosServico = (categoria?: string | null): boolean => {
  if (!categoria) return false;
  const lower = categoria.toLowerCase().trim();
  return MOTIVOS_SERVICO.some(m => lower.includes(m) || m.includes(lower));
};

const isPosicionamento = (tipoOperacao?: string | null): boolean => {
  return (tipoOperacao || "").toLowerCase().includes("posicionamento");
};

// Status ordering for determining progression
const STATUS_ORDER: Record<string, number> = {
  aguardando_confirmacao: 1,
  confirmado_aguardando_vistoria: 2,
  vistoria_finalizada: 3,
  vistoriado_com_pendencia: 3,
  nao_vistoriado: 3,
  cancelado: 99,
  recusado: 99,
};

const getStages = (props: ProcessStageStepperProps): Stage[] => {
  const {
    status,
    solicitarDeferimento = false,
    deferimentoStatus,
    categoria,
    tipoOperacao,
    pendenciasSelecionadas,
    observacoes,
    etapasConfig = [],
    statusLabels = [],
  } = props;

  // Helper to get configured title, falling back to default
  const getTitle = (chave: string, fallback: string): string => {
    const cfg = etapasConfig.find(e => e.chave === chave);
    return cfg?.titulo || fallback;
  };

  // Determine if terminal based on tipo_resultado from statusLabels
  const currentStatusLabel = statusLabels.find(sl => sl.sigla === status);
  const isNaoConforme = currentStatusLabel?.tipo_resultado === "nao_conforme";
  const isEmPendencia = currentStatusLabel?.tipo_resultado === "em_pendencia";
  
  // Fallback for hardcoded terminal states if no tipo_resultado available
  const isCancelled = status === "cancelado";
  const isRecusado = status === "recusado";
  const isTerminal = isNaoConforme || isCancelled || isRecusado;
  
  // Get the display label for terminal status
  const terminalLabel = isTerminal ? (currentStatusLabel?.valor || (isCancelled ? "Cancelado" : isRecusado ? "Recusado" : status)) : "";
  
  const isPosic = isPosicionamento(tipoOperacao);
  const isServico = isPosic && isMotivosServico(categoria);

  const stages: Stage[] = [];
  const currentOrder = STATUS_ORDER[status] ?? 0;

  // For terminal states, all completed stages become "error" to paint the whole line red
  // For em_pendencia states, use "warning" state
  const completedState = isTerminal ? "error" as const : isEmPendencia ? "warning" as const : "completed" as const;

  // Stage 1: Solicitação Recebida (always completed once exists)
  stages.push({
    key: "recebida",
    label: getTitle("recebida", "Solicitação Recebida"),
    icon: isTerminal ? <X className="h-4 w-4" /> : <FileCheck className="h-4 w-4" />,
    state: completedState,
  });

  // Stage 2: Aguardando Confirmação
  // If terminal happened at this stage, show it as completed (red) then terminal replaces next
  if (isTerminal && currentOrder <= 1) {
    // Was at aguardando_confirmacao when cancelled/refused — show it as error
    stages.push({
      key: "aguardando_confirmacao",
      label: getTitle("aguardando_confirmacao", "Aguardando Confirmação"),
      icon: <X className="h-4 w-4" />,
      state: "error",
    });
    // Terminal replaces the next stage
    stages.push({
      key: status,
      label: terminalLabel,
      icon: <X className="h-4 w-4" />,
      state: "error",
    });
    return stages;
  }

  // Aguardando confirmação normal
  {
    let state: Stage["state"] = "pending";
    if (status === "aguardando_confirmacao") {
      state = "current";
    } else if (currentOrder > 1) {
      state = completedState;
    }
    stages.push({
      key: "aguardando_confirmacao",
      label: getTitle("aguardando_confirmacao", "Aguardando Confirmação"),
      icon: isTerminal ? <X className="h-4 w-4" /> : <Clock className="h-4 w-4" />,
      state,
    });
  }

  if (isPosic) {
    if (isServico) {
      // Branch: Confirmado - Aguardando Serviço → Serviço Finalizado
      if (isTerminal && currentOrder <= 2) {
        // Terminal at confirmado_aguardando_vistoria stage — show stage as error, then terminal
        if (currentOrder >= 2) {
          stages.push({
            key: "aguardando_servico",
            label: getTitle("aguardando_servico", "Confirmado - Aguardando Serviço"),
            icon: <X className="h-4 w-4" />,
            state: "error",
          });
        }
        stages.push({
          key: status,
          label: terminalLabel,
          icon: <X className="h-4 w-4" />,
          state: "error",
        });
        return stages;
      }

      {
        let state: Stage["state"] = "pending";
        if (status === "confirmado_aguardando_vistoria") {
          state = "current";
        } else if (currentOrder > 2) {
          state = "completed";
        }
        if (currentOrder >= 2 || status === "confirmado_aguardando_vistoria") {
          stages.push({
            key: "aguardando_servico",
            label: getTitle("aguardando_servico", "Confirmado - Aguardando Serviço"),
            icon: <Clock className="h-4 w-4" />,
            state,
          });
        }
      }

      // Serviço Finalizado
      {
        let state: Stage["state"] = "pending";
        if (status === "vistoria_finalizada" || status === "vistoriado_com_pendencia" || status === "nao_vistoriado") {
          state = "completed";
        }
        if (currentOrder >= 2 || ["vistoria_finalizada", "vistoriado_com_pendencia", "nao_vistoriado"].includes(status)) {
          stages.push({
            key: "servico_finalizado",
            label: getTitle("servico_finalizado", "Serviço Finalizado"),
            icon: <Check className="h-4 w-4" />,
            state,
          });
        }
      }
    } else {
      // Branch: Confirmado - Aguardando Vistoria → Vistoria result
      if (isTerminal && currentOrder <= 2) {
        if (currentOrder >= 2) {
          stages.push({
            key: "aguardando_vistoria",
            label: getTitle("aguardando_vistoria", "Confirmado - Aguardando Vistoria"),
            icon: <X className="h-4 w-4" />,
            state: "error",
          });
        }
        stages.push({
          key: status,
          label: terminalLabel,
          icon: <X className="h-4 w-4" />,
          state: "error",
        });
        return stages;
      }

      {
        let state: Stage["state"] = "pending";
        if (status === "confirmado_aguardando_vistoria") {
          state = "current";
        } else if (currentOrder > 2) {
          state = "completed";
        }
        if (currentOrder >= 2 || status === "confirmado_aguardando_vistoria") {
          stages.push({
            key: "aguardando_vistoria",
            label: getTitle("aguardando_vistoria", "Confirmado - Aguardando Vistoria"),
            icon: <Clock className="h-4 w-4" />,
            state,
          });
        }
      }

      // Vistoria result (only show when reached)
      if (["vistoria_finalizada", "vistoriado_com_pendencia", "nao_vistoriado"].includes(status)) {
        if (status === "vistoria_finalizada") {
          stages.push({
            key: "vistoria_finalizada",
            label: getTitle("vistoria_finalizada", "Vistoria Finalizada"),
            icon: <Check className="h-4 w-4" />,
            state: "completed",
          });
        } else if (status === "vistoriado_com_pendencia") {
          const pendDetail = pendenciasSelecionadas?.length
            ? `Pendências: ${pendenciasSelecionadas.join(", ")}`
            : undefined;
          const obsDetail = observacoes?.length ? observacoes[0] : undefined;
          const detail = [pendDetail, obsDetail].filter(Boolean).join(" — ");
          stages.push({
            key: "vistoriado_com_pendencia",
            label: getTitle("vistoriado_com_pendencia", "Vistoriado com Pendência"),
            icon: <X className="h-4 w-4" />,
            state: "error",
            detail,
          });
        } else if (status === "nao_vistoriado") {
          stages.push({
            key: "nao_vistoriado",
            label: getTitle("nao_vistoriado", "Não Vistoriado"),
            icon: <X className="h-4 w-4" />,
            state: "error",
          });
        }
      }
    }
  } else {
    // Non-Posicionamento services: → Serviço Concluído
    if (isTerminal) {
      // Terminal replaces Serviço Concluído
      stages.push({
        key: status,
        label: terminalLabel,
        icon: <X className="h-4 w-4" />,
        state: "error",
      });
      return stages;
    }

    {
      let state: Stage["state"] = "pending";
      const finishedStatuses = ["vistoria_finalizada", "vistoriado_com_pendencia", "nao_vistoriado", "confirmado_aguardando_vistoria"];
      if (finishedStatuses.includes(status)) {
        state = "completed";
      }
      if (currentOrder >= 2 || finishedStatuses.includes(status)) {
        stages.push({
          key: "servico_concluido",
          label: getTitle("servico_concluido", "Serviço Concluído"),
          icon: <Check className="h-4 w-4" />,
          state,
        });
      }
    }
  }

  return stages;
};

// Deferimento sub-timeline stages
interface DeferimentoStage {
  key: string;
  label: string;
  state: "completed" | "current" | "pending" | "error" | "warning";
  icon: React.ReactNode;
}

const getDeferimentoStages = (deferimentoStatus: "recebido" | "recusado" | "aguardando" | null, etapasConfig: EtapaConfigItem[] = []): DeferimentoStage[] => {
  const getTitle = (chave: string, fallback: string): string => {
    const cfg = etapasConfig.find(e => e.chave === chave);
    return cfg?.titulo || fallback;
  };

  const stages: DeferimentoStage[] = [];

  let envioState: DeferimentoStage["state"] = "current";
  if (deferimentoStatus === "aguardando" || deferimentoStatus === "recebido" || deferimentoStatus === "recusado") {
    envioState = "completed";
  }
  stages.push({
    key: "aguardando_envio",
    label: getTitle("aguardando_envio", "Aguardando Envio do Arquivo"),
    icon: <Upload className="h-4 w-4" />,
    state: envioState,
  });

  if (deferimentoStatus === "recebido") {
    stages.push({
      key: "documento_recebido",
      label: getTitle("documento_recebido", "Documento Recebido"),
      icon: <Check className="h-4 w-4" />,
      state: "completed",
    });
  } else if (deferimentoStatus === "recusado") {
    stages.push({
      key: "documento_recusado",
      label: getTitle("documento_recusado", "Documento Recusado"),
      icon: <X className="h-4 w-4" />,
      state: "error",
    });
  } else if (deferimentoStatus === "aguardando") {
    stages.push({
      key: "aguardando_analise",
      label: getTitle("aguardando_analise", "Aguardando Análise"),
      icon: <Clock className="h-4 w-4" />,
      state: "current",
    });
  }

  return stages;
};

const stateStyles = {
  completed: {
    circle: "bg-green-500 text-white border-green-500",
    line: "bg-green-500",
    label: "text-green-700 font-medium",
  },
  current: {
    circle: "bg-yellow-500 text-white border-yellow-500 ring-4 ring-yellow-100",
    line: "bg-muted",
    label: "text-yellow-700 font-semibold",
  },
  pending: {
    circle: "bg-muted text-muted-foreground border-muted",
    line: "bg-muted",
    label: "text-muted-foreground",
  },
  error: {
    circle: "bg-red-500 text-white border-red-500",
    line: "bg-red-300",
    label: "text-red-700 font-medium",
  },
  warning: {
    circle: "bg-amber-500 text-white border-amber-500",
    line: "bg-amber-300",
    label: "text-amber-700 font-medium",
  },
};

const stateIcons: Record<string, React.ReactNode> = {
  completed: <Check className="h-3.5 w-3.5" />,
  error: <X className="h-3.5 w-3.5" />,
  current: <CircleDot className="h-3.5 w-3.5" />,
  warning: <AlertTriangle className="h-3.5 w-3.5" />,
};

const TimelineStepper = ({ stages, compact = false }: { stages: { key: string; label: string; state: "completed" | "current" | "pending" | "error" | "warning"; icon: React.ReactNode; detail?: string }[]; compact?: boolean }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {stages.map((stage, i) => (
          <div key={stage.key} className="flex items-center gap-1">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0",
                stateStyles[stage.state].circle
              )}
              title={stage.label}
            >
              {stateIcons[stage.state] || stage.icon}
            </div>
            {i < stages.length - 1 && (
              <div className={cn("w-4 h-0.5 rounded", stateStyles[stage.state].line)} />
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-start justify-between relative">
        {stages.map((stage, i) => (
          <div
            key={stage.key}
            className="flex flex-col items-center relative z-10"
            style={{ width: `${100 / stages.length}%` }}
          >
            {i < stages.length - 1 && (
              <div
                className={cn("absolute top-4 h-0.5 rounded", stateStyles[stage.state].line)}
                style={{ left: "50%", right: "-50%", width: "100%" }}
              />
            )}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 relative z-10",
                stateStyles[stage.state].circle
              )}
            >
              {stateIcons[stage.state] || stage.icon}
            </div>
            <span className={cn("text-xs mt-2 text-center leading-tight", stateStyles[stage.state].label)}>
              {stage.label}
            </span>
            {stage.detail && (
              <span className="text-[10px] mt-1 text-center leading-tight text-muted-foreground max-w-[120px]">
                {stage.detail}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ProcessStageStepper = (props: ProcessStageStepperProps) => {
  const stages = getStages(props);
  const { compact = false, solicitarDeferimento = false, deferimentoStatus } = props;

  const deferimentoStages = solicitarDeferimento ? getDeferimentoStages(deferimentoStatus ?? null, props.etapasConfig) : [];

  return (
    <div className="space-y-4">
      <TimelineStepper stages={stages} compact={compact} />

      {/* Deferimento sub-timeline */}
      {solicitarDeferimento && deferimentoStages.length > 0 && (
        <div className="ml-4 pl-4 border-l-2 border-yellow-300">
          <p className="text-[10px] font-semibold text-yellow-700 mb-2 uppercase tracking-wide">Deferimento</p>
          <TimelineStepper stages={deferimentoStages} compact={compact} />
        </div>
      )}
    </div>
  );
};

export { getStages, getDeferimentoStages };
export type { Stage, ProcessStageStepperProps };
export default ProcessStageStepper;
