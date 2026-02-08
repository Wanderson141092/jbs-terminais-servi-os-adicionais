const STATUS_LABELS: Record<string, string> = {
  aguardando_confirmacao: "Aguardando Confirmação",
  cancelado: "Cancelado",
  recusado: "Recusado",
  confirmado_aguardando_vistoria: "Confirmado - Aguardando Vistoria",
  vistoria_finalizada: "Vistoria Finalizada",
  vistoriado_com_pendencia: "Vistoriado com Pendência",
  nao_vistoriado: "Não Vistoriado",
};

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  return (
    <span className={`status-badge status-${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
};

export { STATUS_LABELS };
export default StatusBadge;
