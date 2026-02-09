import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatTipoCarga } from "@/lib/tipoCarga";
import { STATUS_LABELS } from "@/components/StatusBadge";

export const generateProcessoPdf = (solicitacao: any): jsPDF => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("JBS Terminais - Comprovante de Solicitação", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 28);
  
  doc.setDrawColor(0, 74, 152);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  // Process data
  const fields = [
    ["Protocolo", solicitacao.protocolo],
    ["Status", STATUS_LABELS[solicitacao.status] || solicitacao.status],
    ["Cliente", solicitacao.cliente_nome],
    ["E-mail", solicitacao.cliente_email],
    ["Serviço Adicional", solicitacao.tipo_operacao || "—"],
    ["Categoria", solicitacao.categoria || "—"],
    ["Contêiner", solicitacao.numero_conteiner || "—"],
    ["LPCO", solicitacao.lpco || "—"],
    ["Tipo Carga", formatTipoCarga(solicitacao.tipo_carga)],
    ["Data Posicionamento", solicitacao.data_posicionamento 
      ? new Date(solicitacao.data_posicionamento + "T00:00:00").toLocaleDateString("pt-BR") : "—"],
    ["Status Vistoria", solicitacao.status_vistoria || "—"],
    ["Observações", solicitacao.observacoes || "—"],
    ["Administrativo", solicitacao.comex_aprovado === true ? "Aprovado" : solicitacao.comex_aprovado === false ? "Recusado" : "Pendente"],
    ["Operacional", solicitacao.armazem_aprovado === true ? "Aprovado" : solicitacao.armazem_aprovado === false ? "Recusado" : "Pendente"],
    ["Data Solicitação", new Date(solicitacao.created_at).toLocaleString("pt-BR")],
  ].filter(([, value]) => value !== "—" && value !== "");

  autoTable(doc, {
    startY: 38,
    head: [["Campo", "Valor"]],
    body: fields,
    theme: "striped",
    headStyles: { fillColor: [0, 74, 152] },
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50 },
      1: { cellWidth: "auto" },
    },
  });

  return doc;
};

export const downloadProcessoPdf = (solicitacao: any) => {
  const doc = generateProcessoPdf(solicitacao);
  doc.save(`${solicitacao.protocolo}.pdf`);
};

export const downloadBatchPdfs = async (solicitacoes: any[]) => {
  const limit = Math.min(solicitacoes.length, 10);
  for (let i = 0; i < limit; i++) {
    const doc = generateProcessoPdf(solicitacoes[i]);
    doc.save(`${solicitacoes[i].protocolo}.pdf`);
    // Small delay between downloads to avoid browser blocking
    if (i < limit - 1) await new Promise(r => setTimeout(r, 300));
  }
};
