import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface ProtocolCountProps {
  servicos: { id: string; nome: string }[];
}

const ProtocolCountByService = ({ servicos }: ProtocolCountProps) => {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      const newCounts: Record<string, number> = {};
      
      // Fetch counts for each service
      await Promise.all(servicos.map(async (s) => {
        const { count } = await supabase
          .from("solicitacoes")
          .select("*", { count: "exact", head: true })
          .eq("tipo_operacao", s.nome);
        
        newCounts[s.id] = count || 0;
      }));
      
      setCounts(newCounts);
      setLoading(false);
    };

    if (servicos.length > 0) {
      fetchCounts();
    }
  }, [servicos]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Protocolos por Serviço
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {servicos.map((s) => (
          <div key={s.id} className="flex items-center justify-between border rounded p-3 bg-muted/20">
            <span className="text-sm font-medium">{s.nome}</span>
            <Badge variant="secondary" className="font-mono">
              {loading ? "..." : (counts[s.id] || 0)}
            </Badge>
          </div>
        ))}
        {servicos.length === 0 && (
          <p className="text-xs text-muted-foreground col-span-2">Nenhum serviço cadastrado.</p>
        )}
      </div>
    </div>
  );
};

export default ProtocolCountByService;
