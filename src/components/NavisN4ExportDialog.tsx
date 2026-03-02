import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, Ship } from "lucide-react";
import ExcelJS from "exceljs";
import { useStatusProcesso } from "@/hooks/useStatusProcesso";

interface NavisN4ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

const NavisN4ExportDialog = ({ open, onClose }: NavisN4ExportDialogProps) => {
  const [dataPosicionamento, setDataPosicionamento] = useState("");
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [camposMap, setCamposMap] = useState<Record<string, string>>({});
  const [servicos, setServicos] = useState<{ id: string; nome: string }[]>([]);
  const [servicoFilter, setServicoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const { statusOptions } = useStatusProcesso();

  // Load campos_analise IDs for N4 fields and services
  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      const [camposRes, servicosRes] = await Promise.all([
        supabase
          .from("campos_analise")
          .select("id, nome")
          .in("nome", [
            "Motivo Posicionamento",
            "Tipo de Inspeção",
            "Nível de Inspeção",
            "Doca Refrigerada",
            "Temperatura Doca",
            "Informações Adicionais N4",
          ]),
        supabase.from("servicos").select("id, nome").eq("ativo", true).order("nome"),
      ]);
      if (camposRes.data) {
        const map: Record<string, string> = {};
        camposRes.data.forEach((c) => (map[c.nome] = c.id));
        setCamposMap(map);
      }
      if (servicosRes.data) setServicos(servicosRes.data);
    };
    fetchData();
  }, [open]);

  const handleSearch = async () => {
    if (!dataPosicionamento) {
      toast.error("Selecione a data do posicionamento");
      return;
    }

    setExporting(true);
    try {
      // Get solicitations for the date with filters
      let query = supabase
        .from("solicitacoes")
        .select("id, numero_conteiner, categoria, protocolo, tipo_operacao, status")
        .eq("data_posicionamento", dataPosicionamento)
        .order("created_at", { ascending: true });

      if (servicoFilter !== "todos") {
        query = query.eq("tipo_operacao", servicoFilter);
      }
      if (statusFilter !== "todos") {
        query = query.eq("status", statusFilter as any);
      }

      const { data: solicitacoes, error } = await query;

      if (error) throw error;
      if (!solicitacoes || solicitacoes.length === 0) {
        toast.warning("Nenhuma solicitação encontrada para esta data com status confirmado");
        setPreview([]);
        setExporting(false);
        return;
      }

      // Get dynamic field values for these solicitations
      const solIds = solicitacoes.map((s) => s.id);
      const campoIds = Object.values(camposMap);
      
      let valoresData: any[] = [];
      if (campoIds.length > 0 && solIds.length > 0) {
        const { data } = await supabase
          .from("campos_analise_valores")
          .select("solicitacao_id, campo_id, valor")
          .in("solicitacao_id", solIds)
          .in("campo_id", campoIds);
        valoresData = data || [];
      }

      // Build enriched data
      const enriched = solicitacoes.map((s, idx) => {
        const getValor = (campoNome: string) => {
          const campoId = camposMap[campoNome];
          if (!campoId) return "";
          const found = valoresData.find(
            (v: any) => v.solicitacao_id === s.id && v.campo_id === campoId
          );
          return found?.valor || "";
        };

        return {
          ordem: idx + 1,
          conteiner: s.numero_conteiner || "",
          categoria: s.categoria || "",
          motivo: getValor("Motivo Posicionamento"),
          tipoInspecao: getValor("Tipo de Inspeção"),
          nivel: getValor("Nível de Inspeção"),
          docaRefrigerada: getValor("Doca Refrigerada"),
          temperatura: getValor("Temperatura Doca"),
          informacoes: getValor("Informações Adicionais N4"),
        };
      });

      setPreview(enriched);
    } catch (err: any) {
      toast.error("Erro na consulta: " + err.message);
    }
    setExporting(false);
  };

  const handleExport = async () => {
    if (!preview || preview.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Programação N4");

      ws.columns = [
        { header: "Ordem", key: "ordem", width: 8 },
        { header: "Contêiner", key: "conteiner", width: 16 },
        { header: "Categoria", key: "categoria", width: 15 },
        { header: "Motivo Posicionamento", key: "motivo", width: 22 },
        { header: "Tipo de Inspeção", key: "tipoInspecao", width: 18 },
        { header: "Nível", key: "nivel", width: 12 },
        { header: "Doca Refrigerada", key: "docaRefrigerada", width: 16 },
        { header: "Temperatura", key: "temperatura", width: 14 },
        { header: "Informações Adicionais", key: "informacoes", width: 30 },
        { header: "Lançar no N4", key: "lancarN4", width: 20 },
      ];

      // Style header
      ws.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF0B1B4D" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });

      preview.forEach((row, idx) => {
        const isLast = idx === preview.length - 1;
        ws.addRow({
          ...row,
          lancarN4: isLast ? row.conteiner : `${row.conteiner} ,`,
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `programacao_n4_${dataPosicionamento}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${preview.length} contêiner(es) exportado(s)`);
      onClose();
    } catch (err: any) {
      toast.error("Erro na exportação: " + err.message);
    }
    setExporting(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => { setPreview(null); onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Programação de Posicionamento - Navis N4
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label>Data do Posicionamento</Label>
              <Input
                type="date"
                value={dataPosicionamento}
                onChange={(e) => { setDataPosicionamento(e.target.value); setPreview(null); }}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Serviço</Label>
              <select value={servicoFilter} onChange={(e) => { setServicoFilter(e.target.value); setPreview(null); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                <option value="todos">Todos</option>
                {servicos.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPreview(null); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1">
                <option value="todos">Todos</option>
                {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={exporting || !dataPosicionamento} className="w-full">
                Consultar
              </Button>
            </div>
          </div>

          {preview !== null && (
            <div>
              {preview.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Nenhuma solicitação confirmada encontrada para esta data.
                </p>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary text-primary-foreground">
                        <th className="px-2 py-2 text-left">#</th>
                        <th className="px-2 py-2 text-left">Contêiner</th>
                        <th className="px-2 py-2 text-left">Categoria</th>
                        <th className="px-2 py-2 text-left">Motivo</th>
                        <th className="px-2 py-2 text-left">Tipo Inspeção</th>
                        <th className="px-2 py-2 text-left">Nível</th>
                        <th className="px-2 py-2 text-left">Doca Refrig.</th>
                        <th className="px-2 py-2 text-left">Temp.</th>
                        <th className="px-2 py-2 text-left">Info. Adicionais</th>
                        <th className="px-2 py-2 text-left">Lançar N4</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, idx) => {
                        const isLast = idx === preview.length - 1;
                        return (
                          <tr key={idx} className="border-t hover:bg-muted/30">
                            <td className="px-2 py-1.5">{row.ordem}</td>
                            <td className="px-2 py-1.5 font-mono text-xs">{row.conteiner}</td>
                            <td className="px-2 py-1.5">{row.categoria}</td>
                            <td className="px-2 py-1.5">{row.motivo}</td>
                            <td className="px-2 py-1.5">{row.tipoInspecao}</td>
                            <td className="px-2 py-1.5">{row.nivel}</td>
                            <td className="px-2 py-1.5">{row.docaRefrigerada}</td>
                            <td className="px-2 py-1.5">{row.temperatura}</td>
                            <td className="px-2 py-1.5 max-w-[150px] truncate">{row.informacoes}</td>
                            <td className="px-2 py-1.5 font-mono text-xs">
                              {isLast ? row.conteiner : `${row.conteiner} ,`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setPreview(null); onClose(); }}>
            Fechar
          </Button>
          {preview && preview.length > 0 && (
            <Button onClick={handleExport} disabled={exporting}>
              <Download className="h-4 w-4 mr-2" />
              {exporting ? "Exportando..." : "Exportar Excel"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NavisN4ExportDialog;
