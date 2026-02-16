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
  custoposicionamento?: boolean | null;
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
    custoposicionamento,
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
  
  // For terminal states, determine the effective order based on where in the flow it happened
  // rather than using STATUS_ORDER (which assigns 99 to terminal states)
  let currentOrder = STATUS_ORDER[status] ?? 0;
  if (isTerminal && (isCancelled || isRecusado)) {
    // Check if process was confirmed before terminal (approvals exist or custo_posicionamento was answered)
    const wasConfirmed = (custoposicionamento !== null && custoposicionamento !== undefined) ||
      (props.comexAprovado === true || props.armazemAprovado === true);
    currentOrder = wasConfirmed ? 2 : 1;
  }

  // For terminal states at late stage (order>=2), all completed stages become "error" (red X)
  // For terminal states at early stage (order<=1), terminal replaces aguardando_confirmacao
  // For em_pendencia states, completed stages revert to "pending" (gray with ✓)
  const completedState = isTerminal ? "error" as const : isEmPendencia ? "pending" as const : "completed" as const;

  // Determine icon override for special states (only for terminal/error)
  const stateIcon = isTerminal ? <X className="h-4 w-4" /> : null;

  // Stage 1: Solicitação Recebida (always completed once exists)
  // For em_pendencia, prior stages get gray styling ("pending") but keep ✓ icon
  const priorIcon = isEmPendencia ? <Check className="h-4 w-4" /> : null;
  stages.push({
    key: "recebida",
    label: getTitle("recebida", "Solicitação Recebida"),
    icon: stateIcon || priorIcon || <FileCheck className="h-4 w-4" />,
    state: completedState,
  });

  // For Posicionamento cancellations, determine if it was early (before confirmation) or late (after confirmation)
  const isPosicCancelled = isPosic && isCancelled;
  // Late cancel: custo_posicionamento is not null (was answered), OR approvals exist
  const isLateCancellation = isPosicCancelled && (custoposicionamento !== null && custoposicionamento !== undefined);
  // Early cancel: cancelled but no custo_posicionamento answer
  const isEarlyCancellation = isPosicCancelled && !isLateCancellation;

  // Stage 2: Aguardando Confirmação
  // If terminal happened at this stage, terminal REPLACES aguardando_confirmacao
  if (isTerminal && currentOrder <= 1 && !isLateCancellation) {
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
    let label = getTitle("aguardando_confirmacao", "Aguardando Confirmação");
    if (status === "aguardando_confirmacao") {
      state = "current";
    } else if (currentOrder > 1) {
      state = completedState;
      // Once past this stage, show resolved label
      if (isTerminal) {
        label = terminalLabel; // "Cancelado" or "Recusado"
      } else if (isEmPendencia) {
        label = currentStatusLabel?.valor || "Em Pendência";
      } else {
        label = "Confirmado";
      }
    }
    stages.push({
      key: "aguardando_confirmacao",
      label,
      icon: stateIcon || (state === "pending" && isEmPendencia ? <Check className="h-4 w-4" /> : null) || <Clock className="h-4 w-4" />,
      state,
    });
  }

  if (isPosic) {
    if (isServico) {
      // Branch: Aguardando Serviço → Serviço Concluído
      if (isTerminal && currentOrder <= 2 && !isEarlyCancellation) {
        // Terminal at confirmado_aguardando_vistoria stage — show stage as error, then terminal
        if (currentOrder >= 2 || isLateCancellation) {
          stages.push({
            key: "aguardando_servico",
            label: getTitle("aguardando_servico", "Aguardando Serviço"),
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
        let label = getTitle("aguardando_servico", "Aguardando Serviço");
        if (status === "confirmado_aguardando_vistoria") {
          state = "current";
        } else if (currentOrder > 2) {
          state = completedState;
          // Substitution: replace neutral label with result
          if (status === "vistoria_finalizada") {
            label = getTitle("servico_finalizado", "Serviço Concluído");
          } else if (status === "vistoriado_com_pendencia") {
            label = getTitle("servico_finalizado", "Serviço Concluído");
          } else if (status === "nao_vistoriado") {
            label = getTitle("nao_vistoriado", "Não Vistoriado");
          }
        }
        if (currentOrder >= 2 || status === "confirmado_aguardando_vistoria") {
          const isFinalResult = currentOrder > 2;
          stages.push({
            key: "aguardando_servico",
            label,
            icon: isFinalResult
              ? (isEmPendencia ? <AlertTriangle className="h-4 w-4" /> : stateIcon || <Check className="h-4 w-4" />)
              : (stateIcon || (state === "pending" && isEmPendencia ? <Check className="h-4 w-4" /> : null) || <Clock className="h-4 w-4" />),
            state: isFinalResult && isEmPendencia ? "warning" : state,
          });
        }
      }
    } else {
      // Branch: Confirmado - Aguardando Vistoria → Vistoria result
      if (isTerminal && currentOrder <= 2 && !isEarlyCancellation) {
        if (currentOrder >= 2 || isLateCancellation) {
          stages.push({
            key: "aguardando_vistoria",
            label: getTitle("aguardando_vistoria", "Aguardando Vistoria"),
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
        let label = getTitle("aguardando_vistoria", "Aguardando Vistoria");
        let icon: React.ReactNode = <Clock className="h-4 w-4" />;
        let detail: string | undefined;

        if (status === "confirmado_aguardando_vistoria") {
          state = "current";
        } else if (currentOrder > 2) {
          // Substitution logic: replace neutral "Aguardando Vistoria" with the result
          if (status === "vistoria_finalizada") {
            state = completedState;
            label = getTitle("vistoria_finalizada", "Vistoriado");
            icon = isEmPendencia ? <AlertTriangle className="h-4 w-4" /> : stateIcon || <Check className="h-4 w-4" />;
            if (isEmPendencia) state = "warning";
          } else if (status === "vistoriado_com_pendencia") {
            state = "warning";
            label = getTitle("vistoriado_com_pendencia", "Vistoriado");
            icon = <AlertTriangle className="h-4 w-4" />;
            const pendDetail = pendenciasSelecionadas?.length
              ? `Pendências: ${pendenciasSelecionadas.join(", ")}`
              : undefined;
            const obsDetail = observacoes?.length ? observacoes[0] : undefined;
            detail = [pendDetail, obsDetail].filter(Boolean).join(" — ");
          } else if (status === "nao_vistoriado") {
            state = isEmPendencia ? "warning" : "error";
            label = getTitle("nao_vistoriado", "Não Vistoriado");
            icon = isEmPendencia ? <AlertTriangle className="h-4 w-4" /> : <X className="h-4 w-4" />;
          } else {
            state = completedState;
            icon = stateIcon || <Check className="h-4 w-4" />;
          }
        }

        if (currentOrder >= 2 || status === "confirmado_aguardando_vistoria") {
          if (state === "pending" && isEmPendencia) {
            icon = <Check className="h-4 w-4" />;
          }
          stages.push({
            key: "aguardando_vistoria",
            label,
            icon: state === "current" || state === "pending" ? (stateIcon || icon) : icon,
            state,
            detail,
          });
        }
      }

      // "Pendência Concluída" branch: show when vistoriado_com_pendencia or when vistoria_finalizada with prior pendências
      if (status === "vistoriado_com_pendencia") {
        stages.push({
          key: "pendencia_concluida",
          label: getTitle("pendencia_concluida", "Pendência Concluída"),
          icon: <Clock className="h-4 w-4" />,
          state: "pending",
        });
      } else if (status === "vistoria_finalizada" && pendenciasSelecionadas?.length) {
        stages.push({
          key: "pendencia_concluida",
          label: getTitle("pendencia_concluida", "Pendência Concluída"),
          icon: <Check className="h-4 w-4" />,
          state: "completed",
        });
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
        state = isEmPendencia ? "warning" : completedState;
      }
      if (currentOrder >= 2 || finishedStatuses.includes(status)) {
        // Show resolved label based on tipo_resultado
        let resolvedLabel = getTitle("servico_concluido", "Serviço Concluído");
        if (isEmPendencia) {
          resolvedLabel = currentStatusLabel?.valor || "Em Pendência";
        } else if (state === "completed") {
          resolvedLabel = currentStatusLabel?.valor || "Serviço Concluído";
        }
        stages.push({
          key: "servico_concluido",
          label: resolvedLabel,
          icon: isEmPendencia && state === "warning" ? <AlertTriangle className="h-4 w-4" /> : stateIcon || <Check className="h-4 w-4" />,
          state,
        });
      }
    }
  }

  // Se deferimento está ativo e não está "recebido", a etapa atual/última fica em âmbar
  if (solicitarDeferimento && deferimentoStatus !== "recebido" && !isTerminal) {
    // Encontrar a última etapa que está "current" ou "completed" e transformar em warning
    const lastActiveIdx = stages.length - 1;
    if (lastActiveIdx >= 0 && (stages[lastActiveIdx].state === "current" || stages[lastActiveIdx].state === "completed")) {
      stages[lastActiveIdx] = {
        ...stages[lastActiveIdx],
        state: "warning",
        icon: <AlertTriangle className="h-4 w-4" />,
        detail: "Aguardando conclusão de deferimento",
      };
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

  // Determine uniform theme based on overall deferimento status
  // recusado → all gray except "Recusado" step which is red (error)
  // aguardando → all blue (current)
  // recebido → all green (completed)
  // null (falta enviar) → all yellow (warning)

  if (deferimentoStatus === "recusado") {
    // Arquivo já foi enviado → cinza, somente Recusado em vermelho
    stages.push({
      key: "arquivo_enviado",
      label: getTitle("arquivo_enviado", "Arquivo Enviado"),
      icon: <FileCheck className="h-4 w-4" />,
      state: "pending", // gray
    });
    stages.push({
      key: "documento_recusado",
      label: getTitle("documento_recusado", "Documento Recusado"),
      icon: <X className="h-4 w-4" />,
      state: "error", // red
    });
  } else if (deferimentoStatus === "recebido") {
    // Tudo verde: arquivo enviado + recebido/deferido
    stages.push({
      key: "arquivo_enviado",
      label: getTitle("arquivo_enviado", "Arquivo Enviado"),
      icon: <FileCheck className="h-4 w-4" />,
      state: "completed", // green
    });
    stages.push({
      key: "documento_recebido",
      label: getTitle("documento_recebido", "Recebido / Deferido"),
      icon: <Check className="h-4 w-4" />,
      state: "completed", // green
    });
  } else if (deferimentoStatus === "aguardando") {
    // Tudo azul: arquivo enviado + aguardando análise
    stages.push({
      key: "arquivo_enviado",
      label: getTitle("arquivo_enviado", "Arquivo Enviado"),
      icon: <FileCheck className="h-4 w-4" />,
      state: "current", // blue
    });
    stages.push({
      key: "aguardando_analise",
      label: getTitle("aguardando_analise", "Aguardando Análise"),
      icon: <Clock className="h-4 w-4" />,
      state: "current", // blue
    });
  } else {
    // null = falta enviar → amarelo
    stages.push({
      key: "aguardando_envio",
      label: getTitle("aguardando_envio", "Falta Enviar"),
      icon: <Upload className="h-4 w-4" />,
      state: "warning", // yellow
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
    circle: "bg-blue-500 text-white border-blue-500 ring-4 ring-blue-100",
    line: "bg-muted",
    label: "text-blue-700 font-semibold",
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
        <div className={cn(
          "ml-4 pl-4 border-l-2",
          deferimentoStatus === "recusado" ? "border-red-300" :
          deferimentoStatus === "recebido" ? "border-green-300" :
          deferimentoStatus === "aguardando" ? "border-blue-300" :
          "border-yellow-300"
        )}>
          <p className={cn(
            "text-[10px] font-semibold mb-2 uppercase tracking-wide",
            deferimentoStatus === "recusado" ? "text-red-700" :
            deferimentoStatus === "recebido" ? "text-green-700" :
            deferimentoStatus === "aguardando" ? "text-blue-700" :
            "text-yellow-700"
          )}>Deferimento</p>
          <TimelineStepper stages={deferimentoStages} compact={compact} />
        </div>
      )}
    </div>
  );
};

export { getStages, getDeferimentoStages };
export type { Stage, ProcessStageStepperProps };
export default ProcessStageStepper;
