import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, FileSpreadsheet, Loader2 } from "lucide-react";

// All available system fields for mapping
const SYSTEM_FIELDS = [
  { value: "protocolo", label: "Protocolo" },
  { value: "cliente_nome", label: "Nome do Cliente" },
  { value: "cliente_email", label: "E-mail do Cliente" },
  { value: "cnpj", label: "CNPJ" },
  { value: "numero_conteiner", label: "Contêiner" },
  { value: "lpco", label: "LPCO" },
  { value: "tipo_operacao", label: "Serviço Adicional" },
  { value: "tipo_carga", label: "Tipo de Carga" },
  { value: "categoria", label: "Categoria" },
  { value: "status", label: "Status (sigla)" },
  { value: "status_vistoria", label: "Status (nome)" },
  { value: "data_posicionamento", label: "Data do Serviço" },
  { value: "data_agendamento", label: "Data de Agendamento" },
  { value: "created_at", label: "Data de Criação" },
  { value: "updated_at", label: "Última Atualização" },
  { value: "observacoes", label: "Observações" },
  { value: "chave_consulta", label: "Chave de Consulta" },
  { value: "lancamento_confirmado", label: "Lançamento Confirmado" },
  { value: "lancamento_confirmado_data", label: "Data Lanç. Confirmado" },
  { value: "custo_posicionamento", label: "Custo Posicionamento" },
  { value: "pendencias_selecionadas", label: "Pendências" },
  { value: "solicitar_deferimento", label: "Solicitar Deferimento" },
  { value: "solicitar_lacre_armador", label: "Lacre Armador" },
  { value: "comex_aprovado", label: "Aprovação Administrativo" },
  { value: "armazem_aprovado", label: "Aprovação Operacional" },
  { value: "", label: "— Não mapear —" },
];

interface ColumnMapping {
  coluna_modelo: string;
  campo_sistema: string;
}

interface ReportColumnMappingDialogProps {
  modeloId: string;
  modeloNome: string;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const ReportColumnMappingDialog = ({ modeloId, modeloNome, open, onClose, onSaved }: ReportColumnMappingDialogProps) => {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    if (!open || !modeloId) return;
    loadMappings();
  }, [open, modeloId]);

  const loadMappings = async () => {
    setLoading(true);
    // Load existing mappings
    const { data: existing } = await supabase
      .from("modelo_relatorio_colunas")
      .select("coluna_modelo, campo_sistema")
      .eq("modelo_id", modeloId)
      .order("ordem");

    if (existing && existing.length > 0) {
      setMappings(existing.map(e => ({ coluna_modelo: e.coluna_modelo, campo_sistema: e.campo_sistema || "" })));
    } else {
      // Try to extract columns from file
      await extractColumnsFromFile();
    }
    setLoading(false);
  };

  const extractColumnsFromFile = async () => {
    setExtracting(true);
    try {
      // Get model info
      const { data: modelo } = await supabase
        .from("modelos_relatorio")
        .select("file_path, file_name")
        .eq("id", modeloId)
        .single();

      if (!modelo) { setExtracting(false); return; }

      // Download file
      const { data: fileData } = await supabase.storage
        .from("modelos-relatorio")
        .download(modelo.file_path);

      if (!fileData) { setExtracting(false); return; }

      const ext = modelo.file_name.split(".").pop()?.toLowerCase();
      if (ext === "xlsx" || ext === "xls") {
        // Use ExcelJS to extract headers
        const ExcelJS = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        const arrayBuffer = await fileData.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);
        const sheet = workbook.worksheets[0];
        if (sheet) {
          const headers: string[] = [];
          const firstRow = sheet.getRow(1);
          firstRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const val = cell.value?.toString() || `Coluna ${colNumber}`;
            headers.push(val);
          });
          setMappings(headers.map(h => ({ coluna_modelo: h, campo_sistema: "" })));
        }
      } else if (ext === "csv") {
        const text = await fileData.text();
        const firstLine = text.split("\n")[0];
        const headers = firstLine.split(",").map(h => h.trim().replace(/^"|"$/g, ""));
        setMappings(headers.map(h => ({ coluna_modelo: h, campo_sistema: "" })));
      } else {
        // For non-spreadsheet files, create generic columns
        toast.info("Tipo de arquivo não suporta extração automática de colunas. Adicione manualmente.");
      }
    } catch (err) {
      console.error("Error extracting columns:", err);
      toast.error("Não foi possível extrair colunas do arquivo.");
    }
    setExtracting(false);
  };

  const updateMapping = (index: number, campo: string) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, campo_sistema: campo } : m));
  };

  const handleSave = async () => {
    setSaving(true);
    // Delete existing mappings
    await supabase.from("modelo_relatorio_colunas").delete().eq("modelo_id", modeloId);

    // Insert new
    const rows = mappings.map((m, i) => ({
      modelo_id: modeloId,
      coluna_modelo: m.coluna_modelo,
      campo_sistema: m.campo_sistema || null,
      ordem: i,
    }));

    if (rows.length > 0) {
      const { error } = await supabase.from("modelo_relatorio_colunas").insert(rows);
      if (error) { toast.error("Erro ao salvar mapeamento"); setSaving(false); return; }
    }

    toast.success("Mapeamento salvo!");
    setSaving(false);
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Mapeamento de Colunas — {modeloNome}
          </DialogTitle>
        </DialogHeader>

        {loading || extracting ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">{extracting ? "Extraindo colunas do arquivo..." : "Carregando..."}</span>
          </div>
        ) : mappings.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Nenhuma coluna encontrada no modelo. Verifique o arquivo importado.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Vincule cada coluna do modelo importado ao campo correspondente do sistema. Colunas sem vínculo serão ignoradas na exportação.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Coluna do Modelo</TableHead>
                  <TableHead>Campo do Sistema</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((m, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{m.coluna_modelo}</TableCell>
                    <TableCell>
                      <Select value={m.campo_sistema} onValueChange={v => updateMapping(idx, v)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione o campo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SYSTEM_FIELDS.map(f => (
                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || loading || mappings.length === 0}>
            <Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar Mapeamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportColumnMappingDialog;
