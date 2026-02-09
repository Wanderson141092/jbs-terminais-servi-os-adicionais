import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Check } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportRow {
  campo_interno: string;
  campo_externo: string;
  sistema: string;
  descricao: string;
}

interface ExcelImportMappingsProps {
  onImported: () => void;
}

const ExcelImportMappings = ({ onImported }: ExcelImportMappingsProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(ws);

        const rows: ImportRow[] = json.map((row: any) => ({
          campo_interno: (row["campo_interno"] || row["Campo Interno"] || "").toString().trim(),
          campo_externo: (row["campo_externo"] || row["Campo Externo"] || "").toString().trim(),
          sistema: (row["sistema"] || row["Sistema"] || "hashdata").toString().trim(),
          descricao: (row["descricao"] || row["Descrição"] || row["Descricao"] || "").toString().trim(),
        })).filter((r: ImportRow) => r.campo_interno && r.campo_externo);

        if (rows.length === 0) {
          toast.error("Nenhum dado válido encontrado. Use colunas: campo_interno, campo_externo, sistema, descricao");
          return;
        }
        setPreviewData(rows);
        setShowDialog(true);
      } catch {
        toast.error("Erro ao ler arquivo Excel");
      }
    };
    reader.readAsBinaryString(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    setImporting(true);
    const inserts = previewData.map(row => ({
      campo_interno: row.campo_interno,
      campo_externo: row.campo_externo,
      sistema: row.sistema || "hashdata",
      descricao: row.descricao || null,
    }));

    const { error } = await supabase.from("field_mappings").insert(inserts);
    if (error) {
      toast.error("Erro ao importar: " + error.message);
    } else {
      toast.success(`${inserts.length} mapeamentos importados!`);
      setShowDialog(false);
      setPreviewData([]);
      onImported();
    }
    setImporting(false);
  };

  const downloadTemplate = () => {
    const template = [
      { campo_interno: "data_solicitacao", campo_externo: "DATA_SOLICITACAO", sistema: "hashdata", descricao: "Data da solicitação" },
      { campo_interno: "numero_conteiner", campo_externo: "CONTEINER", sistema: "hashdata", descricao: "Número do contêiner" },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mapeamentos");
    XLSX.writeFile(wb, "modelo_mapeamento_campos.xlsx");
  };

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          Modelo Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4 mr-1" />
          Importar Excel
        </Button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pré-visualização da Importação ({previewData.length} registros)</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campo Interno</TableHead>
                <TableHead>Campo Externo</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewData.slice(0, 50).map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-sm">{row.campo_interno}</TableCell>
                  <TableCell className="font-mono text-sm">{row.campo_externo}</TableCell>
                  <TableCell>{row.sistema}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.descricao || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {previewData.length > 50 && <p className="text-sm text-muted-foreground text-center">...e mais {previewData.length - 50} registros</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleImport} disabled={importing}>
              <Check className="h-4 w-4 mr-1" />
              {importing ? "Importando..." : `Importar ${previewData.length} registros`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExcelImportMappings;
