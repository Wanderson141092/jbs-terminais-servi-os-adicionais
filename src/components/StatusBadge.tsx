import { useStatusProcesso } from "@/hooks/useStatusProcesso";

// Fallback labels for initial render before dynamic data loads
const FALLBACK_LABELS: Record<string, string> = {
  aguardando_confirmacao: "Aguardando Confirmação",
  cancelado: "Cancelado",
  recusado: "Recusado",
  confirmado_aguardando_vistoria: "Aguardando conclusão do serviço",
  vistoria_finalizada: "Vistoriado",
  vistoriado_com_pendencia: "Vistoriado com Pendência",
  nao_vistoriado: "Não Vistoriado",
};

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { statusLabels } = useStatusProcesso();

  // Dynamic labels take priority, fallback for instant render
  const label = statusLabels[status] || FALLBACK_LABELS[status] || status;

  return (
    <span className={`status-badge status-${status}`}>
      {label}
    </span>
  );
};

// Export dynamic hook for consumers that need the labels map
export { FALLBACK_LABELS as STATUS_LABELS };
export default StatusBadge;
