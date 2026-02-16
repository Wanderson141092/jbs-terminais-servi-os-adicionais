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
const JBS_GRAY_MED: RGB = [120, 120, 120];
const JBS_GRAY_LIGHT: RGB = [245, 247, 250];
const JBS_BLUE_SOFT: RGB = [230, 235, 248];

interface PdfOptions {
  includeChecklist?: boolean;
  aprovacaoAtivada?: boolean;
  deferimentoStatus?: "recebido" | "recusado" | "aguardando" | null;
}

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

const getStatusColor = (status: string): RGB => {
  switch (status) {
    case "vistoria_finalizada": return JBS_GREEN;
    case "confirmado_aguardando_vistoria": return [37, 99, 235];
    case "vistoriado_com_pendencia": return [234, 138, 0];
    case "recusado":
    case "cancelado": return [200, 40, 40];
    case "nao_vistoriado": return [100, 100, 100];
    default: return [200, 160, 30];
  }
};

// ─── Shared: Corporate header ───
const drawCorporateHeader = (
  doc: jsPDF,
  logoBase64: string | null,
  title: string,
  subtitle: string,
  confidential = false
) => {
  const pageW = doc.internal.pageSize.getWidth();

  // Top bar – solid dark blue
  doc.setFillColor(...JBS_BLUE);
  doc.rect(0, 0, pageW, 38, "F");

  // Thin green accent below
  doc.setFillColor(...JBS_GREEN);
  doc.rect(0, 38, pageW, 1.5, "F");

  // Logo on white pill
  if (logoBase64) {
    doc.setFillColor(...JBS_WHITE);
    doc.roundedRect(12, 6, 46, 26, 3, 3, "F");
    doc.addImage(logoBase64, "PNG", 14, 8, 42, 22);
  }

  // Title
  doc.setTextColor(...JBS_WHITE);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(title, 66, 18);

  // Subtitle
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 210, 230);
  doc.text(subtitle, 66, 26);

  // Confidential tag
  if (confidential) {
    doc.setFillColor(180, 30, 30);
    const cLabel = "CONFIDENCIAL";
    const cw = doc.getTextWidth(cLabel) + 10;
    doc.roundedRect(pageW - 14 - cw, 8, cw, 12, 2, 2, "F");
    doc.setTextColor(...JBS_WHITE);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(cLabel, pageW - 14 - cw + 5, 15.5);
  }
};

// ─── Shared: Corporate footer ───
const drawCorporateFooter = (doc: jsPDF) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Separator line
  doc.setDrawColor(...JBS_GREEN);
  doc.setLineWidth(0.8);
  doc.line(14, pageH - 18, pageW - 14, pageH - 18);

  // Footer text
  doc.setTextColor(...JBS_GRAY_MED);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("JBS Terminais  ·  Sistema de Gestão de Processos", 14, pageH - 12);
  doc.text(
    `Emitido em ${new Date().toLocaleString("pt-BR")}  |  Pág. ${doc.getCurrentPageInfo().pageNumber}`,
    pageW - 14,
    pageH - 12,
    { align: "right" }
  );
};

// ─── Shared: Protocol banner ───
const drawProtocolBanner = (doc: jsPDF, protocolo: string, status: string, y: number): number => {
  const pageW = doc.internal.pageSize.getWidth();

  // Protocol card
  doc.setFillColor(...JBS_BLUE_SOFT);
  doc.roundedRect(14, y, pageW - 28, 22, 3, 3, "F");

  // Left border accent
  doc.setFillColor(...JBS_BLUE);
  doc.rect(14, y, 3, 22, "F");

  doc.setTextColor(...JBS_BLUE);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PROTOCOLO", 24, y + 8);
  doc.setFontSize(12);
  doc.text(protocolo, 24, y + 17);

  // Status badge
  const statusText = getStatusLabel(status).toUpperCase();
  const statusColor = getStatusColor(status);
  doc.setFillColor(...statusColor);
  const sw = doc.getTextWidth(statusText) * 0.65 + 16;
  doc.roundedRect(pageW - 18 - sw, y + 5, sw, 12, 2, 2, "F");
  doc.setTextColor(...JBS_WHITE);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(statusText, pageW - 18 - sw + 8, y + 13);

  return y + 30;
};

// ─── Shared: Section header ───
const drawSectionHeader = (doc: jsPDF, label: string, y: number): number => {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...JBS_BLUE);
  doc.roundedRect(14, y, pageW - 28, 9, 2, 2, "F");
  doc.setTextColor(...JBS_WHITE);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(label, 20, y + 6.2);
  return y + 14;
};

// ─── Shared: Key-value table ───
const drawFieldsTable = (doc: jsPDF, fields: string[][], startY: number): number => {
  autoTable(doc, {
    startY,
    body: fields,
    theme: "plain",
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 8, right: 8 },
      lineWidth: 0,
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: JBS_BLUE as any, cellWidth: 52 },
      1: { textColor: JBS_GRAY as any },
    },
    alternateRowStyles: { fillColor: JBS_GRAY_LIGHT as any },
    didDrawPage: () => drawCorporateFooter(doc),
    margin: { left: 14, right: 14 },
  });
  return (doc as any).lastAutoTable.finalY + 6;
};

// ─── Shared: Status pill ───
const drawStatusPill = (doc: jsPDF, label: string, color: RGB, x: number, y: number): number => {
  doc.setFillColor(...color);
  const pw = doc.getTextWidth(label) + 14;
  doc.roundedRect(x, y, pw, 11, 2, 2, "F");
  doc.setTextColor(...JBS_WHITE);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text(label, x + 7, y + 7.5);
  return pw;
};

// ═══════════════════════════════════════════════
// EXTERNAL PDF (public consultation comprovante)
// ═══════════════════════════════════════════════
const generateExternalPdf = async (solicitacao: any, options: PdfOptions = {}): Promise<jsPDF> => {
  const doc = new jsPDF();
  const { deferimentoStatus } = options;
  let logoBase64: string | null = null;
  try { logoBase64 = await loadLogoBase64(); } catch { /* fallback */ }

  drawCorporateHeader(doc, logoBase64, "Comprovante de Solicitação", "Documento gerado para acompanhamento do cliente");

  let y = 48;
  y = drawProtocolBanner(doc, solicitacao.protocolo, solicitacao.status, y);

  // Data fields
  const fields = [
    ["Serviço", solicitacao.tipo_operacao || "—"],
    ["Contêiner", solicitacao.numero_conteiner || "—"],
    ["LPCO", solicitacao.lpco || "—"],
    ["Tipo de Carga", formatTipoCarga(solicitacao.tipo_carga)],
    ["Data Posicionamento", solicitacao.data_posicionamento
      ? new Date(solicitacao.data_posicionamento + "T00:00:00").toLocaleDateString("pt-BR") : "—"],
  ].filter(([, v]) => v !== "—");

  y = drawFieldsTable(doc, fields, y);

  // Deferimento
  if (solicitacao.solicitar_deferimento && deferimentoStatus) {
    y = drawSectionHeader(doc, "DEFERIMENTO", y);
    const defLabel = deferimentoStatus === "recebido" ? "RECEBIDO" : deferimentoStatus === "recusado" ? "RECUSADO" : "AGUARDANDO";
    const defColor: RGB = deferimentoStatus === "recebido" ? JBS_GREEN : deferimentoStatus === "recusado" ? [200, 40, 40] : [200, 160, 30];
    drawStatusPill(doc, defLabel, defColor, 20, y);
    y += 18;
  }

  // Pendências
  if (solicitacao.status === "vistoriado_com_pendencia" && solicitacao.pendencias_selecionadas?.length > 0) {
    y = drawSectionHeader(doc, "PENDÊNCIAS", y);
    doc.setTextColor(...JBS_GRAY);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    solicitacao.pendencias_selecionadas.forEach((p: string) => {
      doc.text(`•  ${p}`, 22, y + 4);
      y += 9;
    });
    y += 4;
  }

  drawCorporateFooter(doc);
  return doc;
};

// ═══════════════════════════════════════════════
// INTERNAL PDF (admin dashboard report)
// ═══════════════════════════════════════════════
const generateInternalPdf = async (solicitacao: any, options: PdfOptions = {}): Promise<jsPDF> => {
  const doc = new jsPDF();
  const { aprovacaoAtivada = false, deferimentoStatus } = options;
  let logoBase64: string | null = null;
  try { logoBase64 = await loadLogoBase64(); } catch { /* fallback */ }

  drawCorporateHeader(doc, logoBase64, "Relatório Interno de Processo", `Gerado em ${new Date().toLocaleString("pt-BR")}  |  Uso interno`, true);

  let y = 48;
  y = drawProtocolBanner(doc, solicitacao.protocolo, solicitacao.status, y);

  // Full data table
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

  y = drawFieldsTable(doc, allFields, y);

  // Approvals
  if (aprovacaoAtivada) {
    y = drawSectionHeader(doc, "APROVAÇÕES", y);

    const approvals = [
      { label: "Administrativo", approved: solicitacao.comex_aprovado, justificativa: solicitacao.comex_justificativa, data: solicitacao.comex_data },
      { label: "Operacional", approved: solicitacao.armazem_aprovado, justificativa: solicitacao.armazem_justificativa, data: solicitacao.armazem_data },
    ];

    for (const ap of approvals) {
      const statusLabel = ap.approved === true ? "APROVADO" : ap.approved === false ? "RECUSADO" : "PENDENTE";
      const statusBg: RGB = ap.approved === true ? JBS_GREEN : ap.approved === false ? [200, 40, 40] : [200, 160, 30];

      doc.setTextColor(...JBS_GRAY);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text(ap.label, 22, y + 7);

      const pw = drawStatusPill(doc, statusLabel, statusBg, 72, y + 1);

      if (ap.justificativa) {
        doc.setTextColor(...JBS_GRAY_MED);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "italic");
        doc.text(ap.justificativa.substring(0, 70), 72 + pw + 6, y + 7);
      }
      y += 16;
    }
  }

  // Deferimento
  if (solicitacao.solicitar_deferimento && deferimentoStatus) {
    y = drawSectionHeader(doc, "DEFERIMENTO", y);
    const defLabel = deferimentoStatus === "recebido" ? "RECEBIDO" : deferimentoStatus === "recusado" ? "RECUSADO" : "AGUARDANDO";
    const defColor: RGB = deferimentoStatus === "recebido" ? JBS_GREEN : deferimentoStatus === "recusado" ? [200, 40, 40] : [200, 160, 30];
    drawStatusPill(doc, defLabel, defColor, 22, y);
    y += 18;
  }

  // Lançamento
  if (solicitacao.lancamento_confirmado !== undefined && solicitacao.lancamento_confirmado !== null) {
    y = drawSectionHeader(doc, "LANÇAMENTO", y);
    const lancLabel = solicitacao.lancamento_confirmado ? "CONFIRMADO" : "PENDENTE";
    const lancColor: RGB = solicitacao.lancamento_confirmado ? JBS_GREEN : [200, 160, 30];
    drawStatusPill(doc, lancLabel, lancColor, 22, y);
    y += 18;
  }

  drawCorporateFooter(doc);
  return doc;
};

// ── Public API ──

export const generateProcessoPdf = (solicitacao: any, options: PdfOptions = {}): jsPDF => {
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
