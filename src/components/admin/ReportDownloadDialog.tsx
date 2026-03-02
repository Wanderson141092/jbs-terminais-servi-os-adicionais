import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Filter, FileSpreadsheet, Loader2 } from "lucide-react";

interface ColumnMapping {
  coluna_modelo: string;
  campo_sistema: string | null;
}

interface Servico {
  id: string;
  nome: string;
}

interface ReportDownloadDialogProps {
  modeloId: string;
  modeloNome: string;
  modeloFileName: string;
  open: boolean;
  onClose: () => void;
  extraFilters?: { deferimento?: boolean; cobranca?: boolean };
}

const ReportDownloadDialog = ({ modeloId, modeloNome, modeloFileName, open, onClose, extraFilters }: ReportDownloadDialogProps) => {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [filters, setFilters] = useState({
    servico: "todos",
    dataInicio: "",
    dataFim: "",
    status: "todos",
  });
  const [statusOptions, setStatusOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    loadData();
  }, [open, modeloId]);

  const loadData = async () => {
    setLoading(true);
    const [mappingsRes, servicosRes, statusRes] = await Promise.all([
      supabase.from("modelo_relatorio_colunas").select("coluna_modelo, campo_sistema").eq("modelo_id", modeloId).order("ordem"),
      supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("parametros_campos").select("valor, sigla").eq("grupo", "status_processo").eq("ativo", true).order("ordem"),
    ]);
    setMappings((mappingsRes.data || []) as ColumnMapping[]);
    setServicos(servicosRes.data || []);
    setStatusOptions((statusRes.data || []).map((s: any) => ({
      value: s.sigla || s.valor.toLowerCase().replace(/ /g, "_").normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      label: s.valor,
    })));
    setLoading(false);
  };

  const handleDownload = async () => {
    const activeMappings = mappings.filter(m => m.campo_sistema);
    if (activeMappings.length === 0) {
      toast.error("Nenhuma coluna mapeada. Configure o mapeamento primeiro.");
      return;
    }

    setDownloading(true);
    try {
      // Build query
      let query = supabase.from("solicitacoes_v" as any).select("*").order("created_at", { ascending: false });

      if (filters.servico !== "todos") {
        query = query.eq("tipo_operacao", filters.servico);
      }
      if (filters.status !== "todos") {
        query = query.eq("status", filters.status as any);
      }
      if (filters.dataInicio) {
        query = query.gte("created_at", new Date(filters.dataInicio).toISOString());
      }
      if (filters.dataFim) {
        const endDate = new Date(filters.dataFim);
        endDate.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endDate.toISOString());
      }
      if (extraFilters?.deferimento) {
        query = query.eq("solicitar_deferimento", true);
      }

      const { data: rawData, error } = await query.limit(1000);
      if (error) { toast.error("Erro ao buscar dados"); setDownloading(false); return; }
      
      let data = rawData || [];
      
      // Filter by cobranca (requires a second query)
      if (extraFilters?.cobranca && data.length > 0) {
        const ids = data.map((d: any) => d.id);
        const { data: cobrancaRegs } = await supabase
          .from("lancamento_cobranca_registros")
          .select("solicitacao_id")
          .in("solicitacao_id", ids);
        const cobrancaIds = new Set((cobrancaRegs || []).map((r: any) => r.solicitacao_id));
        data = data.filter((d: any) => cobrancaIds.has(d.id));
      }
      
      if (data.length === 0) { toast.info("Nenhum dado encontrado para os filtros selecionados."); setDownloading(false); return; }

      // Generate Excel with mapped columns
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Dados");

      // Headers
      const headers = activeMappings.map(m => m.coluna_modelo);
      sheet.addRow(headers);

      // Style headers
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };

      // Data rows
      data.forEach(row => {
        const values = activeMappings.map(m => {
          const field = m.campo_sistema!;
          let val = (row as any)[field];
          if (val === null || val === undefined) return "";
          if (typeof val === "boolean") return val ? "Sim" : "Não";
          if (Array.isArray(val)) return val.join(", ");
          if (field.includes("created_at") || field.includes("updated_at") || field.includes("data")) {
            if (typeof val === "string" && (val.includes("T") || val.includes("-"))) {
              try { return new Date(val).toLocaleString("pt-BR"); } catch { return val; }
            }
          }
          return String(val);
        });
        sheet.addRow(values);
      });

      // Auto width
      sheet.columns.forEach(col => {
        let maxLen = 10;
        col.eachCell?.({ includeEmpty: true }, cell => {
          const len = cell.value?.toString().length || 0;
          if (len > maxLen) maxLen = Math.min(len, 50);
        });
        col.width = maxLen + 2;
      });

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${modeloNome.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${data.length} registros exportados!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar relatório.");
    }
    setDownloading(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Relatório — {modeloNome}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : mappings.filter(m => m.campo_sistema).length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhuma coluna mapeada. Configure o mapeamento primeiro.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                <FileSpreadsheet className="h-3 w-3" /> Colunas mapeadas
              </p>
              <div className="flex flex-wrap gap-1">
                {mappings.filter(m => m.campo_sistema).map((m, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">{m.coluna_modelo}</Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-1">
                <Filter className="h-4 w-4" /> Filtros
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Serviço Adicional</Label>
                  <Select value={filters.servico} onValueChange={v => setFilters(p => ({ ...p, servico: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {servicos.map(s => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={filters.status} onValueChange={v => setFilters(p => ({ ...p, status: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Data Início</Label>
                  <Input type="date" value={filters.dataInicio} onChange={e => setFilters(p => ({ ...p, dataInicio: e.target.value }))} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Data Fim</Label>
                  <Input type="date" value={filters.dataFim} onChange={e => setFilters(p => ({ ...p, dataFim: e.target.value }))} className="h-9" />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleDownload} disabled={downloading || loading || mappings.filter(m => m.campo_sistema).length === 0}>
            <Download className="h-4 w-4 mr-2" /> {downloading ? "Exportando..." : "Exportar Dados"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDownloadDialog;
