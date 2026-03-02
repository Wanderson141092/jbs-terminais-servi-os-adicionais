import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart3, Download, Loader2 } from "lucide-react";
import ReportDownloadDialog from "@/components/admin/ReportDownloadDialog";

interface ModeloRelatorio {
  id: string;
  nome: string;
  descricao: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  tipo: string;
  ativo: boolean;
  created_at: string;
}

const FILE_TYPE_ICONS: Record<string, string> = {
  excel: "📊",
  pdf: "📄",
  word: "📝",
  outro: "📁",
};

interface ExtrairRelatorioDialogProps {
  open: boolean;
  onClose: () => void;
}

const ExtrairRelatorioDialog = ({ open, onClose }: ExtrairRelatorioDialogProps) => {
  const [modelos, setModelos] = useState<ModeloRelatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [modeloMappingCounts, setModeloMappingCounts] = useState<Record<string, number>>({});
  const [downloadModelo, setDownloadModelo] = useState<ModeloRelatorio | null>(null);
  const [filterDeferimento, setFilterDeferimento] = useState(false);
  const [filterCobranca, setFilterCobranca] = useState(false);

  const fetchModelos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("modelos_relatorio")
      .select("*")
      .eq("ativo", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar modelos");
    } else {
      const models = (data || []) as ModeloRelatorio[];
      setModelos(models);

      if (models.length > 0) {
        const { data: mappings } = await supabase
          .from("modelo_relatorio_colunas")
          .select("modelo_id, campo_sistema")
          .in("modelo_id", models.map(m => m.id));

        const counts: Record<string, number> = {};
        (mappings || []).forEach((m: any) => {
          if (m.campo_sistema) {
            counts[m.modelo_id] = (counts[m.modelo_id] || 0) + 1;
          }
        });
        setModeloMappingCounts(counts);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchModelos();
  }, [open, fetchModelos]);

  const modelosComMapeamento = modelos.filter(m => (modeloMappingCounts[m.id] || 0) > 0);

  return (
    <>
      <Dialog open={open && !downloadModelo} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Extrair Relatório
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Selecione um modelo para exportar os dados do sistema.
          </p>

          <div className="flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={filterDeferimento} onChange={e => setFilterDeferimento(e.target.checked)} className="accent-primary" />
              Apenas com Deferimento
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={filterCobranca} onChange={e => setFilterCobranca(e.target.checked)} className="accent-primary" />
              Apenas com Lançamento de Cobrança
            </label>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Carregando...</span>
            </div>
          ) : modelosComMapeamento.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              Nenhum modelo com colunas mapeadas. Importe um modelo e configure o mapeamento em "Modelos Excel".
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modelosComMapeamento.map(modelo => (
                <Card key={modelo.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDownloadModelo(modelo)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{FILE_TYPE_ICONS[modelo.tipo] || "📁"}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{modelo.nome}</h3>
                        <p className="text-xs text-muted-foreground truncate">{modelo.descricao || "Sem descrição"}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {modeloMappingCounts[modelo.id] || 0} colunas mapeadas
                          </Badge>
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {downloadModelo && (
        <ReportDownloadDialog
          modeloId={downloadModelo.id}
          modeloNome={downloadModelo.nome}
          modeloFileName={downloadModelo.file_name}
          open={!!downloadModelo}
          onClose={() => setDownloadModelo(null)}
          extraFilters={{ deferimento: filterDeferimento, cobranca: filterCobranca }}
        />
      )}
    </>
  );
};

export default ExtrairRelatorioDialog;
