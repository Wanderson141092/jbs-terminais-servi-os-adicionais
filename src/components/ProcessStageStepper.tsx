import { Check, Clock, X, CircleDot, FileCheck, Shield, Eye, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessStageStepperProps {
  status: string;
  comexAprovado?: boolean | null;
  armazemAprovado?: boolean | null;
  aprovacaoAtivada?: boolean;
  aprovacaoAdministrativo?: boolean;
  aprovacaoOperacional?: boolean;
  solicitarDeferimento?: boolean;
  deferimentoStatus?: "recebido" | "recusado" | "aguardando" | null;
  compact?: boolean;
}

interface Stage {
  key: string;
  label: string;
  icon: React.ReactNode;
  state: "completed" | "current" | "pending" | "error";
}

const getStages = (props: ProcessStageStepperProps): Stage[] => {
  const {
    status,
    comexAprovado,
    armazemAprovado,
    aprovacaoAtivada = false,
    aprovacaoAdministrativo = false,
    aprovacaoOperacional = false,
    solicitarDeferimento = false,
    deferimentoStatus,
  } = props;

  const isCancelled = status === "cancelado";
  const isRecusado = status === "recusado";
  const isTerminal = isCancelled || isRecusado;

  const stages: Stage[] = [];

  // Stage 1: Solicitação criada (always completed unless cancelled at start)
  stages.push({
    key: "criada",
    label: "Solicitação Criada",
    icon: <FileCheck className="h-4 w-4" />,
    state: "completed",
  });

  // Stage 2: Aprovação Administrativo (only if enabled)
  if (aprovacaoAdministrativo) {
    let approvalState: Stage["state"] = "pending";
    if (isRecusado && comexAprovado === false) {
      approvalState = "error";
    } else if (comexAprovado === true) {
      approvalState = "completed";
    } else if (status === "aguardando_confirmacao") {
      approvalState = "current";
    } else if (comexAprovado !== null && comexAprovado !== undefined) {
      approvalState = "current";
    }
    stages.push({
      key: "aprovacao_admin",
      label: "Aprovação Administrativo",
      icon: <Shield className="h-4 w-4" />,
      state: approvalState,
    });
  }

  // Stage 2b: Aprovação Operacional (only if enabled)
  if (aprovacaoOperacional) {
    let approvalState: Stage["state"] = "pending";
    if (isRecusado && armazemAprovado === false) {
      approvalState = "error";
    } else if (armazemAprovado === true) {
      approvalState = "completed";
    } else if (status === "aguardando_confirmacao") {
      approvalState = "current";
    } else if (armazemAprovado !== null && armazemAprovado !== undefined) {
      approvalState = "current";
    }
    stages.push({
      key: "aprovacao_oper",
      label: "Aprovação Operacional",
      icon: <Shield className="h-4 w-4" />,
      state: approvalState,
    });
  }

  // Stage 3: Aguardando Vistoria
  {
    let state: Stage["state"] = "pending";
    if (isTerminal) {
      state = isRecusado ? "error" : "pending";
    } else if (status === "confirmado_aguardando_vistoria") {
      state = "current";
    } else if (["vistoria_finalizada", "vistoriado_com_pendencia", "nao_vistoriado"].includes(status)) {
      state = "completed";
    } else if (!aprovacaoAtivada && status === "aguardando_confirmacao") {
      state = "current";
    }
    stages.push({
      key: "aguardando_vistoria",
      label: "Aguardando Vistoria",
      icon: <Clock className="h-4 w-4" />,
      state: isTerminal && !["confirmado_aguardando_vistoria", "vistoria_finalizada", "vistoriado_com_pendencia", "nao_vistoriado"].includes(status) ? "pending" : state,
    });
  }

  // Stage 4: Vistoria
  {
    let state: Stage["state"] = "pending";
    if (status === "vistoria_finalizada") {
      state = "completed";
    } else if (status === "vistoriado_com_pendencia") {
      state = "error";
    } else if (status === "nao_vistoriado") {
      state = "error";
    }
    stages.push({
      key: "vistoria",
      label: "Vistoria",
      icon: <Eye className="h-4 w-4" />,
      state,
    });
  }

  // Stage 5: Deferimento (only if applicable)
  if (solicitarDeferimento) {
    let state: Stage["state"] = "pending";
    if (deferimentoStatus === "recebido") state = "completed";
    else if (deferimentoStatus === "recusado") state = "error";
    else if (deferimentoStatus === "aguardando") state = "current";
    else if (status === "vistoria_finalizada") state = "current";

    stages.push({
      key: "deferimento",
      label: "Deferimento",
      icon: <FileCheck className="h-4 w-4" />,
      state,
    });
  }

  // Terminal state override
  if (isCancelled) {
    // Mark all pending as pending, add cancelled stage
    stages.push({
      key: "cancelado",
      label: "Cancelado",
      icon: <X className="h-4 w-4" />,
      state: "error",
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
};

const stateIcons: Record<string, React.ReactNode> = {
  completed: <Check className="h-3.5 w-3.5" />,
  error: <X className="h-3.5 w-3.5" />,
  current: <CircleDot className="h-3.5 w-3.5" />,
};

const ProcessStageStepper = (props: ProcessStageStepperProps) => {
  const stages = getStages(props);
  const { compact = false } = props;

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
            {/* Connector line */}
            {i < stages.length - 1 && (
              <div
                className={cn(
                  "absolute top-4 h-0.5 rounded",
                  stateStyles[stage.state].line
                )}
                style={{ left: "50%", right: `-50%`, width: "100%" }}
              />
            )}
            {/* Circle */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 relative z-10",
                stateStyles[stage.state].circle
              )}
            >
              {stateIcons[stage.state] || stage.icon}
            </div>
            {/* Label */}
            <span
              className={cn(
                "text-xs mt-2 text-center leading-tight",
                stateStyles[stage.state].label
              )}
            >
              {stage.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export { getStages };
export type { Stage };
export default ProcessStageStepper;
