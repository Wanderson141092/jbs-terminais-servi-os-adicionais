import { useStatusProcesso } from "@/hooks/useStatusProcesso";

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const { getLabel } = useStatusProcesso();

  return (
    <span className={`status-badge status-${status}`}>
      {getLabel(status)}
    </span>
  );
};

export { StatusBadge };
export default StatusBadge;
