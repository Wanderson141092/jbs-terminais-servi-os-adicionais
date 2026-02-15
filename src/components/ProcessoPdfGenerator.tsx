import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatTipoCarga } from "@/lib/tipoCarga";
import { STATUS_LABELS } from "@/components/StatusBadge";
import logoSrc from "@/assets/jbs-terminais-logo.png";

type RGB = [number, number, number];

// Brand colors
const JBS_BLUE: RGB = [11, 27, 77];
const JBS_GREEN: RGB = [122, 193, 67];
const JBS_WHITE: RGB = [255, 255, 255];
const JBS_GRAY: RGB = [51, 51, 51];
const JBS_GRAY_MED: RGB = [102, 102, 102];
const JBS_GRAY_LIGHT: RGB = [244, 246, 248];

interface PdfOptions {
  includeChecklist?: boolean;
  aprovacaoAtivada?: boolean;
  deferimentoStatus?: "recebido" | "recusado" | "aguardando" | null;
}

// Load logo as base64 for PDF embedding
const loadLogoBase64 = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject("No canvas"); return; }
      // White background for PNG transparency
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = logoSrc;
  });
};

const getStatusLabel = (status: string) => STATUS_LABELS[status] || status;

const drawRoundedRect = (doc: jsPDF, x: number, y: number, w: number, h: number, r: number) => {
  doc.roundedRect(x, y, w, h, r, r, "F");
};

// ── EXTERNAL PDF (for public consultation page) ──
const generateExternalPdf = async (solicitacao: any, options: PdfOptions = {}): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const { deferimentoStatus } = options;
  let logoBase64: string | null = null;

  try { logoBase64 = await loadLogoBase64(); } catch { /* fallback text */ }

  // ─── Header bar ───
  doc.setFillColor(...JBS_BLUE);
  doc.rect(0, 0, pageW, 44, "F");

  // Green accent line
  doc.setFillColor(...JBS_GREEN);
  doc.rect(0, 44, pageW, 3, "F");

  // Logo
  if (logoBase64) {
    doc.setFillColor(...JBS_WHITE);
    drawRoundedRect(doc, 14, 7, 52, 30, 3);
    doc.addImage(logoBase64, "PNG", 16, 9, 48, 26);
  }

  // Title text
  doc.setTextColor(...JBS_WHITE);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Comprovante de Solicitação", 74, 22);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, 74, 30);

  let y = 56;

  // ─── Protocol & Status highlight ───
  doc.setFillColor(...JBS_GRAY_LIGHT);
  drawRoundedRect(doc, 14, y, pageW - 28, 26, 4);

  doc.setTextColor(...JBS_BLUE);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(`Protocolo: ${solicitacao.protocolo}`, 20, y + 11);

  const statusText = getStatusLabel(solicitacao.status);
  const statusColor = getStatusColor(solicitacao.status);
  doc.setFillColor(...statusColor);
  const statusW = doc.getTextWidth(statusText) + 16;
  drawRoundedRect(doc, pageW - 20 - statusW, y + 4, statusW, 18, 3);
  doc.setTextColor(...JBS_WHITE);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(statusText.toUpperCase(), pageW - 20 - statusW + 8, y + 15);

  y += 34;

  // ─── Data fields (simplified for external – no client name/email) ───
  const fields = [
    ["Serviço", solicitacao.tipo_operacao || "—"],
    ["Contêiner", solicitacao.numero_conteiner || "—"],
    ["LPCO", solicitacao.lpco || "—"],
    ["Tipo de Carga", formatTipoCarga(solicitacao.tipo_carga)],
    ["Data Posicionamento", solicitacao.data_posicionamento
      ? new Date(solicitacao.data_posicionamento + "T00:00:00").toLocaleDateString("pt-BR") : "—"],
  ].filter(([, v]) => v !== "—");

  // Draw as card-style rows
  for (let i = 0; i < fields.length; i++) {
    const rowY = y + i * 14;
    if (i % 2 === 0) {
      doc.setFillColor(...JBS_GRAY_LIGHT);
      doc.rect(14, rowY - 4, pageW - 28, 14, "F");
    }
    doc.setTextColor(...JBS_GRAY_MED);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(fields[i][0], 20, rowY + 5);
    doc.setTextColor(...JBS_GRAY);
    doc.setFont("helvetica", "bold");
    doc.text(fields[i][1], 80, rowY + 5);
  }

  y += fields.length * 14 + 10;

  // ─── Deferimento status if applicable ───
  if (solicitacao.solicitar_deferimento && deferimentoStatus) {
    doc.setFillColor(...JBS_GRAY_LIGHT);
    drawRoundedRect(doc, 14, y, pageW - 28, 22, 4);
    doc.setTextColor(...JBS_BLUE);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Deferimento", 20, y + 9);

    const defLabel = deferimentoStatus === "recebido" ? "RECEBIDO" : deferimentoStatus === "recusado" ? "RECUSADO" : "AGUARDANDO";
    const defColor: RGB = deferimentoStatus === "recebido" ? JBS_GREEN : deferimentoStatus === "recusado" ? [220, 38, 38] : [217, 170, 30];
    doc.setFillColor(...defColor);
    const defW = doc.getTextWidth(defLabel) + 16;
    drawRoundedRect(doc, pageW - 20 - defW, y + 3, defW, 16, 3);
    doc.setTextColor(...JBS_WHITE);
    doc.setFontSize(8);
    doc.text(defLabel, pageW - 20 - defW + 8, y + 13);
    y += 30;
  }

  // ─── Pendências ───
  if (solicitacao.status === "vistoriado_com_pendencia" && solicitacao.pendencias_selecionadas?.length > 0) {
    doc.setTextColor(...JBS_BLUE);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Pendências", 20, y + 5);
    y += 10;
    doc.setTextColor(...JBS_GRAY);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    solicitacao.pendencias_selecionadas.forEach((p: string) => {
      doc.text(`• ${p}`, 24, y + 5);
      y += 8;
    });
    y += 6;
  }

  // ─── Footer ───
  drawFooter(doc);

  return doc;
};

// ── INTERNAL PDF (for admin dashboard) ──
const generateInternalPdf = async (solicitacao: any, options: PdfOptions = {}): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const { aprovacaoAtivada = false, deferimentoStatus } = options;
  let logoBase64: string | null = null;

  try { logoBase64 = await loadLogoBase64(); } catch { /* fallback */ }

  // ─── Header ───
  doc.setFillColor(...JBS_BLUE);
  doc.rect(0, 0, pageW, 40, "F");
  doc.setFillColor(...JBS_GREEN);
  doc.rect(0, 40, pageW, 2.5, "F");

  if (logoBase64) {
    doc.setFillColor(...JBS_WHITE);
    drawRoundedRect(doc, 14, 6, 44, 28, 3);
    doc.addImage(logoBase64, "PNG", 16, 8, 40, 24);
  }

  doc.setTextColor(...JBS_WHITE);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório Interno de Processo", 66, 18);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}  |  Uso interno`, 66, 26);
  doc.text("CONFIDENCIAL", pageW - 14, 10, { align: "right" });

  let y = 50;

  // ─── Protocol card ───
  doc.setFillColor(...JBS_BLUE);
  drawRoundedRect(doc, 14, y, pageW - 28, 20, 4);
  doc.setTextColor(...JBS_WHITE);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(solicitacao.protocolo, 20, y + 13);

  const statusText = getStatusLabel(solicitacao.status);
  const statusColor = getStatusColor(solicitacao.status);
  doc.setFillColor(...statusColor);
  const sw = doc.getTextWidth(statusText.toUpperCase()) + 16;
  drawRoundedRect(doc, pageW - 20 - sw, y + 3, sw, 14, 3);
  doc.setTextColor(...JBS_WHITE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(statusText.toUpperCase(), pageW - 20 - sw + 8, y + 12);

  y += 28;

  // ─── Data table (full internal data) ───
  const allFields = [
    ["Cliente", solicitacao.cliente_nome || "—"],
    ["E-mail", solicitacao.cliente_email || "—"],
    ["CNPJ", solicitacao.cnpj || "—"],
    ["Serviço", solicitacao.tipo_operacao || "—"],
    ["Categoria", solicitacao.categoria || "—"],
    ["Contêiner", solicitacao.numero_conteiner || "—"],
    ["LPCO", solicitacao.lpco || "—"],
    ["Tipo de Carga", formatTipoCarga(solicitacao.tipo_carga)],
    ["Data Posicionamento", solicitacao.data_posicionamento
      ? new Date(solicitacao.data_posicionamento + "T00:00:00").toLocaleDateString("pt-BR") : "—"],
    ["Status Vistoria", solicitacao.status_vistoria || "—"],
    ["Observações", solicitacao.observacoes || "—"],
    ["Data Solicitação", new Date(solicitacao.created_at).toLocaleString("pt-BR")],
  ];

  autoTable(doc, {
    startY: y,
    body: allFields,
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 6, right: 6 } },
    columnStyles: {
      0: { fontStyle: "bold", textColor: JBS_BLUE as any, cellWidth: 48 },
      1: { textColor: JBS_GRAY as any },
    },
    alternateRowStyles: { fillColor: JBS_GRAY_LIGHT as any },
    didDrawPage: () => drawFooter(doc),
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // ─── Approval section ───
  if (aprovacaoAtivada) {
    doc.setFillColor(...JBS_BLUE);
    drawRoundedRect(doc, 14, y, pageW - 28, 8, 2);
    doc.setTextColor(...JBS_WHITE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("APROVAÇÕES", 20, y + 5.5);
    y += 14;

    const approvals = [
      {
        label: "Administrativo",
        approved: solicitacao.comex_aprovado,
        justificativa: solicitacao.comex_justificativa,
        data: solicitacao.comex_data,
      },
      {
        label: "Operacional",
        approved: solicitacao.armazem_aprovado,
        justificativa: solicitacao.armazem_justificativa,
        data: solicitacao.armazem_data,
      },
    ];

    for (const ap of approvals) {
      const statusBg: RGB = ap.approved === true ? JBS_GREEN : ap.approved === false ? [220, 38, 38] : [217, 170, 30];
      const statusLabel = ap.approved === true ? "APROVADO" : ap.approved === false ? "RECUSADO" : "PENDENTE";

      doc.setTextColor(...JBS_GRAY);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(ap.label, 20, y + 4);

      doc.setFillColor(...statusBg);
      const bw = doc.getTextWidth(statusLabel) + 12;
      drawRoundedRect(doc, 70, y - 1, bw, 10, 2);
      doc.setTextColor(...JBS_WHITE);
      doc.setFontSize(7.5);
      doc.text(statusLabel, 76, y + 5);

      if (ap.justificativa) {
        doc.setTextColor(...JBS_GRAY_MED);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "italic");
        doc.text(ap.justificativa.substring(0, 80), 70 + bw + 4, y + 5);
      }

      y += 14;
    }
  }

  // ─── Deferimento ───
  if (solicitacao.solicitar_deferimento && deferimentoStatus) {
    doc.setFillColor(...JBS_BLUE);
    drawRoundedRect(doc, 14, y, pageW - 28, 8, 2);
    doc.setTextColor(...JBS_WHITE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("DEFERIMENTO", 20, y + 5.5);
    y += 14;

    const defLabel = deferimentoStatus === "recebido" ? "RECEBIDO" : deferimentoStatus === "recusado" ? "RECUSADO" : "AGUARDANDO";
    const defColor: RGB = deferimentoStatus === "recebido" ? JBS_GREEN : deferimentoStatus === "recusado" ? [220, 38, 38] : [217, 170, 30];

    doc.setFillColor(...defColor);
    const dw = doc.getTextWidth(defLabel) + 12;
    drawRoundedRect(doc, 20, y - 1, dw, 10, 2);
    doc.setTextColor(...JBS_WHITE);
    doc.setFontSize(7.5);
    doc.text(defLabel, 26, y + 5);
    y += 14;
  }

  // ─── Lançamento ───
  if (solicitacao.lancamento_confirmado !== undefined && solicitacao.lancamento_confirmado !== null) {
    doc.setFillColor(...JBS_BLUE);
    drawRoundedRect(doc, 14, y, pageW - 28, 8, 2);
    doc.setTextColor(...JBS_WHITE);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("LANÇAMENTO", 20, y + 5.5);
    y += 14;

    const lancLabel = solicitacao.lancamento_confirmado ? "CONFIRMADO" : "PENDENTE";
    const lancColor: RGB = solicitacao.lancamento_confirmado ? JBS_GREEN : [217, 170, 30];

    doc.setFillColor(...lancColor);
    const lw = doc.getTextWidth(lancLabel) + 12;
    drawRoundedRect(doc, 20, y - 1, lw, 10, 2);
    doc.setTextColor(...JBS_WHITE);
    doc.setFontSize(7.5);
    doc.text(lancLabel, 26, y + 5);
  }

  drawFooter(doc);
  return doc;
};

// ── Shared helpers ──

const getStatusColor = (status: string): RGB => {
  switch (status) {
    case "vistoria_finalizada": return JBS_GREEN;
    case "confirmado_aguardando_vistoria": return [37, 99, 235]; // blue
    case "vistoriado_com_pendencia": return [234, 138, 0]; // amber
    case "recusado":
    case "cancelado": return [220, 38, 38]; // red
    case "nao_vistoriado": return [100, 100, 100]; // gray
    default: return [217, 170, 30]; // yellow
  }
};

const drawFooter = (doc: jsPDF) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Green line
  doc.setFillColor(...JBS_GREEN);
  doc.rect(0, pageH - 14, pageW, 2, "F");

  // Footer text
  doc.setTextColor(...JBS_GRAY_MED);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("JBS Terminais  •  Sistema de Gestão de Processos", 14, pageH - 6);
  doc.text(`Página ${doc.getCurrentPageInfo().pageNumber}`, pageW - 14, pageH - 6, { align: "right" });
};

// ── Public API (keep backward-compatible) ──

export const generateProcessoPdf = (solicitacao: any, options: PdfOptions = {}): jsPDF => {
  // Synchronous fallback - not used directly anymore
  const doc = new jsPDF();
  doc.text("Use downloadProcessoPdf for branded PDF.", 14, 20);
  return doc;
};

export const downloadExternalPdf = async (solicitacao: any, options: PdfOptions = {}) => {
  const doc = await generateExternalPdf(solicitacao, options);
  doc.save(`${solicitacao.protocolo}-comprovante.pdf`);
};

export const downloadInternalPdf = async (solicitacao: any, options: PdfOptions = {}) => {
  const doc = await generateInternalPdf(solicitacao, options);
  doc.save(`${solicitacao.protocolo}-relatorio.pdf`);
};

// Default download (backward compat) - uses external layout
export const downloadProcessoPdf = async (solicitacao: any, options: PdfOptions = {}) => {
  await downloadExternalPdf(solicitacao, options);
};

export const downloadBatchPdfs = async (solicitacoes: any[], options: PdfOptions = {}) => {
  const limit = Math.min(solicitacoes.length, 10);
  for (let i = 0; i < limit; i++) {
    await downloadInternalPdf(solicitacoes[i], options);
    if (i < limit - 1) await new Promise(r => setTimeout(r, 300));
  }
};
