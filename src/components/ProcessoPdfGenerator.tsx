import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatTipoCarga } from "@/lib/tipoCarga";
import { STATUS_LABELS } from "@/components/StatusBadge";

interface PdfOptions {
  includeChecklist?: boolean;
  aprovacaoAtivada?: boolean;
  deferimentoStatus?: "recebido" | "recusado" | "aguardando" | null;
}

const getChecklistItems = (solicitacao: any, options: PdfOptions = {}) => {
  const { aprovacaoAtivada = false, deferimentoStatus } = options;
  const items: { label: string; status: string }[] = [];

  items.push({ label: "Solicitação registrada", status: "✔ Concluído" });

  if (aprovacaoAtivada) {
    items.push({
      label: "Aprovação Administrativo",
      status: solicitacao.comex_aprovado === true ? "✔ Aprovado" : solicitacao.comex_aprovado === false ? "✘ Recusado" : "⏳ Pendente",
    });
    items.push({
      label: "Aprovação Operacional",
      status: solicitacao.armazem_aprovado === true ? "✔ Aprovado" : solicitacao.armazem_aprovado === false ? "✘ Recusado" : "⏳ Pendente",
    });
  }

  const vistoriaMap: Record<string, string> = {
    vistoria_finalizada: "✔ Finalizada",
    vistoriado_com_pendencia: "⚠ Com Pendência",
    nao_vistoriado: "✘ Não Vistoriado",
    confirmado_aguardando_vistoria: "⏳ Aguardando",
  };
  items.push({
    label: "Vistoria",
    status: vistoriaMap[solicitacao.status] || "⏳ Pendente",
  });

  if (solicitacao.solicitar_deferimento) {
    items.push({
      label: "Deferimento",
      status: deferimentoStatus === "recebido" ? "✔ Recebido" : deferimentoStatus === "recusado" ? "✘ Recusado" : deferimentoStatus === "aguardando" ? "⏳ Aguardando" : "⏳ Pendente",
    });
  }

  if (solicitacao.lancamento_confirmado !== undefined && solicitacao.lancamento_confirmado !== null) {
    items.push({
      label: "Lançamento",
      status: solicitacao.lancamento_confirmado ? "✔ Confirmado" : "⏳ Pendente",
    });
  }

  return items;
};

const getStageFlow = (solicitacao: any, options: PdfOptions = {}) => {
  const { aprovacaoAtivada = false, deferimentoStatus } = options;
  const stages: string[] = ["Solicitação Criada"];

  if (aprovacaoAtivada) stages.push("Aprovação");
  stages.push("Aguardando Vistoria");
  stages.push("Vistoria");
  if (solicitacao.solicitar_deferimento) stages.push("Deferimento");

  // Determine current stage index
  let currentIdx = 0;
  const status = solicitacao.status;
  if (status === "aguardando_confirmacao") currentIdx = aprovacaoAtivada ? 1 : 2;
  else if (status === "confirmado_aguardando_vistoria") currentIdx = aprovacaoAtivada ? 2 : 1;
  else if (["vistoria_finalizada", "vistoriado_com_pendencia", "nao_vistoriado"].includes(status)) currentIdx = aprovacaoAtivada ? 3 : 2;

  return { stages, currentIdx };
};

export const generateProcessoPdf = (solicitacao: any, options: PdfOptions = {}): jsPDF => {
  const doc = new jsPDF();
  const { includeChecklist = true } = options;
  
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

  if (includeChecklist) {
    const finalY = (doc as any).lastAutoTable?.finalY || 120;

    // Stage Flow
    const { stages, currentIdx } = getStageFlow(solicitacao, options);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Fluxo do Processo", 14, finalY + 12);

    const stageText = stages.map((s, i) => {
      if (i < currentIdx) return `✔ ${s}`;
      if (i === currentIdx) return `▶ ${s} (atual)`;
      return `○ ${s}`;
    }).join("  →  ");

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(stageText, 14, finalY + 20, { maxWidth: 180 });

    // Checklist
    const checkItems = getChecklistItems(solicitacao, options);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Checklist de Verificação", 14, finalY + 32);

    autoTable(doc, {
      startY: finalY + 36,
      head: [["Etapa", "Status"]],
      body: checkItems.map(item => [item.label, item.status]),
      theme: "striped",
      headStyles: { fillColor: [0, 100, 50] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 80 },
        1: { cellWidth: "auto" },
      },
    });
  }

  return doc;
};

export const downloadProcessoPdf = (solicitacao: any, options: PdfOptions = {}) => {
  const doc = generateProcessoPdf(solicitacao, options);
  doc.save(`${solicitacao.protocolo}.pdf`);
};

export const downloadBatchPdfs = async (solicitacoes: any[], options: PdfOptions = {}) => {
  const limit = Math.min(solicitacoes.length, 10);
  for (let i = 0; i < limit; i++) {
    const doc = generateProcessoPdf(solicitacoes[i], options);
    doc.save(`${solicitacoes[i].protocolo}.pdf`);
    if (i < limit - 1) await new Promise(r => setTimeout(r, 300));
  }
};
