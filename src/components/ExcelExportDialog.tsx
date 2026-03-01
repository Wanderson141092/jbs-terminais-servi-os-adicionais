import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, FileSpreadsheet } from "lucide-react";
import { STATUS_LABELS } from "@/components/StatusBadge";
import { formatTipoCarga } from "@/lib/tipoCarga";
import ExcelJS from "exceljs";

interface ExcelExportDialogProps {
  open: boolean;
  onClose: () => void;
}

const AVAILABLE_COLUMNS = [
  { key: "protocolo", label: "Protocolo" },
  { key: "cliente_nome", label: "Cliente" },
  { key: "cliente_email", label: "E-mail" },
  { key: "tipo_operacao", label: "Serviço Adicional" },
  { key: "categoria", label: "Categoria" },
  { key: "numero_conteiner", label: "Contêiner" },
  { key: "lpco", label: "LPCO" },
  { key: "tipo_carga", label: "Tipo Carga" },
  { key: "data_posicionamento", label: "Data Posicionamento" },
  { key: "data_agendamento", label: "Data Agendamento" },
  { key: "status", label: "Status" },
  { key: "status_vistoria", label: "Status Vistoria" },
  { key: "observacoes", label: "Observações" },
  { key: "comex_aprovado", label: "Administrativo" },
  { key: "armazem_aprovado", label: "Operacional" },
  { key: "lancamento_confirmado", label: "Lançamento" },
  { key: "created_at", label: "Data Solicitação" },
];

const ExcelExportDialog = ({ open, onClose }: ExcelExportDialogProps) => {
  const [servicos, setServicos] = useState<{ id: string; nome: string }[]>([]);
  const [selectedServico, setSelectedServico] = useState("todos");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(Object.keys(STATUS_LABELS));
  const [dateType, setDateType] = useState<"posicionamento" | "agendamento" | "solicitacao">("posicionamento");
  const [dateMode, setDateMode] = useState<"specific" | "range">("range");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateSpecific, setDateSpecific] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome")
        .then(({ data }) => setServicos(data || []));
    }
  }, [open]);

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const selectAllColumns = () => {
    if (selectedColumns.length === AVAILABLE_COLUMNS.length) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(AVAILABLE_COLUMNS.map(c => c.key));
    }
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast.error("Selecione pelo menos uma coluna");
      return;
    }

    setExporting(true);
    try {
      let query = supabase.from("solicitacoes_v" as any).select("*").order("created_at", { ascending: false });

      if (selectedServico !== "todos") {
        query = query.eq("tipo_operacao", selectedServico);
      }

      if (selectedStatuses.length < Object.keys(STATUS_LABELS).length) {
        query = query.in("status", selectedStatuses as any);
      }

      const dateCol = dateType === "posicionamento" ? "data_posicionamento" 
        : dateType === "agendamento" ? "data_agendamento" : "created_at";

      if (dateMode === "specific" && dateSpecific) {
        if (dateType === "solicitacao") {
          query = query.gte(dateCol, dateSpecific + "T00:00:00").lte(dateCol, dateSpecific + "T23:59:59");
        } else {
          query = query.eq(dateCol, dateSpecific);
        }
      } else if (dateMode === "range") {
        if (dateFrom) {
          if (dateType === "solicitacao") {
            query = query.gte(dateCol, dateFrom + "T00:00:00");
          } else {
            query = query.gte(dateCol, dateFrom);
          }
        }
        if (dateTo) {
          if (dateType === "solicitacao") {
            query = query.lte(dateCol, dateTo + "T23:59:59");
          } else {
            query = query.lte(dateCol, dateTo);
          }
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Nenhum registro encontrado com os filtros aplicados");
        setExporting(false);
        return;
      }

      // Build workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Solicitações");

      // Add headers
      const colDefs = selectedColumns.map(colKey => {
        const colDef = AVAILABLE_COLUMNS.find(c => c.key === colKey);
        return { header: colDef?.label || colKey, key: colKey, width: 20 };
      });
      ws.columns = colDefs;

      // Add rows
      data.forEach(row => {
        const formatted: Record<string, any> = {};
        selectedColumns.forEach(colKey => {
          let value = (row as any)[colKey];
          
          if (colKey === "tipo_carga") value = formatTipoCarga(value);
          else if (colKey === "status") value = STATUS_LABELS[value] || value;
          else if (colKey === "comex_aprovado" || colKey === "armazem_aprovado") {
            value = value === true ? "Aprovado" : value === false ? "Recusado" : "Pendente";
          } else if (colKey === "lancamento_confirmado") {
            value = value === true ? "Confirmado" : "Pendente";
          } else if (colKey === "created_at" || colKey === "data_agendamento") {
            value = value ? new Date(value).toLocaleString("pt-BR") : "";
          } else if (colKey === "data_posicionamento") {
            value = value ? new Date(value + "T00:00:00").toLocaleDateString("pt-BR") : "";
          }
          
          formatted[colKey] = value ?? "";
        });
        ws.addRow(formatted);
      });

      // Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `solicitacoes_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success(`${data.length} registros exportados`);
      onClose();
    } catch (err: any) {
      toast.error("Erro na exportação: " + err.message);
    }
    setExporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Exportar Solicitações para Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Serviço */}
          <div>
            <Label>Serviço Adicional</Label>
            <Select value={selectedServico} onValueChange={setSelectedServico}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {servicos.map(s => <SelectItem key={s.id} value={s.nome}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Status */}
          <div>
            <Label className="mb-2 block">Status (todos selecionados por padrão)</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox checked={selectedStatuses.includes(key)} onCheckedChange={() => toggleStatus(key)} id={`st-${key}`} />
                  <label htmlFor={`st-${key}`} className="text-sm cursor-pointer">{label}</label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Data */}
          <div>
            <Label className="mb-2 block">Filtro de Data</Label>
            <div className="flex gap-3 mb-3">
              <Select value={dateType} onValueChange={(v: any) => setDateType(v)}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="posicionamento">Data Posicionamento</SelectItem>
                  <SelectItem value="agendamento">Data Agendamento</SelectItem>
                  <SelectItem value="solicitacao">Data Solicitação</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateMode} onValueChange={(v: any) => setDateMode(v)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="specific">Data específica</SelectItem>
                  <SelectItem value="range">Período</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateMode === "specific" ? (
              <Input type="date" value={dateSpecific} onChange={(e) => setDateSpecific(e.target.value)} />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">De</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Até</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Colunas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Colunas para Exportação</Label>
              <Button variant="ghost" size="sm" onClick={selectAllColumns}>
                {selectedColumns.length === AVAILABLE_COLUMNS.length ? "Desmarcar todas" : "Selecionar todas"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto border rounded p-3">
              {AVAILABLE_COLUMNS.map(col => (
                <div key={col.key} className="flex items-center space-x-2">
                  <Checkbox checked={selectedColumns.includes(col.key)} onCheckedChange={() => toggleColumn(col.key)} id={`col-${col.key}`} />
                  <label htmlFor={`col-${col.key}`} className="text-sm cursor-pointer">{col.label}</label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{selectedColumns.length} coluna(s) selecionada(s)</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleExport} disabled={exporting || selectedColumns.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? "Exportando..." : "Exportar Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExcelExportDialog;
