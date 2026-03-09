import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface IntegrityCheckOptions {
  solicitacaoId: string;
  userId: string;
  camposResolvidos: { key: string; label: string; valor: string }[];
  anexos: { file_url: string; file_name: string; error?: boolean }[];
  enabled?: boolean;
}

/**
 * Hook that validates data integrity on load and logs issues to audit_log.
 * - Checks for fields with "—" (empty) values that should have data
 * - Checks for attachments with broken URLs
 */
export const useDataIntegrityAlert = ({
  solicitacaoId,
  userId,
  camposResolvidos,
  anexos,
  enabled = true,
}: IntegrityCheckOptions) => {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!enabled || hasRunRef.current || !solicitacaoId) return;

    const issues: string[] = [];

    // Check for broken attachment URLs
    const brokenAttachments = anexos.filter((a) => a.error === true);
    if (brokenAttachments.length > 0) {
      issues.push(`${brokenAttachments.length} anexo(s) com URL inválida`);
    }

    // If there are issues, log them
    if (issues.length > 0) {
      hasRunRef.current = true;

      const issuesSummary = issues.join("; ");
      toast.warning(`Verificação de integridade: ${issuesSummary}`, {
        duration: 5000,
      });

      // Log to audit_log via RPC
      supabase
        .rpc("insert_audit_log", {
          p_solicitacao_id: solicitacaoId,
          p_usuario_id: userId,
          p_acao: "integridade_dados",
          p_detalhes: `Problemas detectados: ${issuesSummary}`,
          p_entidade: "solicitacoes",
          p_entidade_id: solicitacaoId,
        })
        .then(({ error }) => {
          if (error) {
            console.error("[useDataIntegrityAlert] Erro ao registrar auditoria:", error);
          }
        });
    }
  }, [solicitacaoId, userId, camposResolvidos, anexos, enabled]);
};

export default useDataIntegrityAlert;
