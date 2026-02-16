import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatTipoCarga } from "@/lib/tipoCarga";
import { STATUS_LABELS } from "@/components/StatusBadge";
import { getStages, getDeferimentoStages } from "@/components/ProcessStageStepper";
import { getCheckItems } from "@/components/ProcessChecklist";
import logoSrc from "@/assets/jbs-terminais-logo.png";

type RGB = [number, number, number];

const JBS_BLUE: RGB = [31, 42, 124]; // #1F2A7C
const JBS_GREEN: RGB = [122, 193, 67];
const JBS_WHITE: RGB = [255, 255, 255];
const JBS_TEXT: RGB = [31, 41, 51]; // #1F2933
const JBS_LABEL: RGB = [107, 114, 128]; // #6B7280
const JBS_BORDER: RGB = [229, 231, 235]; // #E5E7EB
const JBS_FOOTER_BG: RGB = [244, 246, 248]; // #F4F6F8

const COLOR_RED: RGB = [200, 40, 40];
const COLOR_AMBER: RGB = [200, 160, 30];
const COLOR_BLUE_LIGHT: RGB = [37, 99, 235];

interface PdfOptions {
  includeChecklist?: boolean;
  aprovacaoAtivada?: boolean;
  aprovacaoAdministrativo?: boolean;
  aprovacaoOperacional?: boolean;
  deferimentoStatus?: "recebido" | "recusado" | "aguardando" | null;
  observacoes?: { observacao: string; status_no_momento: string; created_at: string }[];
  statusLabels?: { sigla: string | null; valor: string; ordem: number; tipo_resultado?: string | null }[];
  etapasConfig?: any[];
  servicoConfig?: any;
  lacreArmadorDados?: any;
  lacreArmadorConfig?: any;
  showDeferimento?: boolean;
  showLacreArmador?: boolean;
  deferimentoDocs?: any[];
  camposDinamicosExternos?: { campo_nome: string; valor: string }[];
}

// ─── Logo loader ───
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
    case "confirmado_aguardando_vistoria": return COLOR_BLUE_LIGHT;
    case "vistoriado_com_pendencia": return [234, 138, 0];
    case "recusado":
    case "cancelado": return COLOR_RED;
    case "nao_vistoriado": return [100, 100, 100];
    default: return COLOR_AMBER;
  }
};

const getStateColor = (state: string): RGB => {
  switch (state) {
    case "completed": return JBS_GREEN;
    case "current": return COLOR_BLUE_LIGHT;
    case "error": return COLOR_RED;
    case "warning": return [217, 140, 20];
    default: return [160, 160, 160];
  }
};

// ─── Drawing helpers matching HTML layout ───

const MARGIN = 20;

const drawHeader = (doc: jsPDF, logoBase64: string | null, title: string, subtitle: string, confidential = false) => {
  const pageW = doc.internal.pageSize.getWidth();
  const headerH = 32;

  // Blue background
  doc.setFillColor(...JBS_BLUE);
  doc.rect(0, 0, pageW, headerH, "F");

  // Logo on white background
  if (logoBase64) {
    doc.setFillColor(...JBS_WHITE);
    doc.roundedRect(MARGIN, 6, 40, 20, 2, 2, "F");
    doc.addImage(logoBase64, "PNG", MARGIN + 2, 7, 36, 18);
  }

  // Title + subtitle
  const textX = logoBase64 ? MARGIN + 48 : MARGIN;
  doc.setTextColor(...JBS_WHITE);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(title, textX, 16);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 225, 240);
  doc.text(subtitle, textX, 24);

  if (confidential) {
    doc.setFillColor(180, 30, 30);
    const cLabel = "CONFIDENCIAL";
    doc.setFontSize(6.5);
    const cw = doc.getTextWidth(cLabel) + 10;
    doc.roundedRect(pageW - MARGIN - cw, 10, cw, 12, 2, 2, "F");
    doc.setTextColor(...JBS_WHITE);
    doc.setFont("helvetica", "bold");
    doc.text(cLabel, pageW - MARGIN - cw + 5, 17.5);
  }

  return headerH + 8;
};

const drawFooter = (doc: jsPDF) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const footerH = 16;
  const footerY = pageH - footerH;

  doc.setFillColor(...JBS_FOOTER_BG);
  doc.rect(0, footerY, pageW, footerH, "F");
  doc.setDrawColor(...JBS_BORDER);
  doc.setLineWidth(0.3);
  doc.line(0, footerY, pageW, footerY);

  doc.setTextColor(...JBS_LABEL);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("JBS Terminais • Sistema de Gestão de Processos", MARGIN, footerY + 10);
  doc.text(
    `Emitido em ${new Date().toLocaleString("pt-BR")}  |  Pág. ${doc.getCurrentPageInfo().pageNumber}`,
    pageW - MARGIN, footerY + 10, { align: "right" }
  );
};

const drawSectionBorder = (doc: jsPDF, y: number): number => {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...JBS_BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  return y;
};

const ensureSpace = (doc: jsPDF, y: number, needed: number): number => {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 22) {
    doc.addPage();
    drawFooter(doc);
    return 16;
  }
  return y;
};

// Draw a field (label on top, value below) at a given position
const drawField = (doc: jsPDF, label: string, value: string, x: number, y: number, maxW: number) => {
  doc.setTextColor(...JBS_LABEL);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(label.toUpperCase(), x, y);

  doc.setTextColor(...JBS_TEXT);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const lines = doc.splitTextToSize(value || "—", maxW);
  doc.text(lines, x, y + 6);
  return lines.length * 5 + 10;
};

// Draw fields in a 3-column grid (matching .grid class in HTML)
const drawFieldsGrid = (doc: jsPDF, fields: [string, string][], startY: number, cols = 3): number => {
  const pageW = doc.internal.pageSize.getWidth();
  const usable = pageW - MARGIN * 2;
  const colW = usable / cols;
  let y = startY;

  for (let i = 0; i < fields.length; i += cols) {
    y = ensureSpace(doc, y, 20);
    let maxH = 0;
    for (let c = 0; c < cols && i + c < fields.length; c++) {
      const [label, value] = fields[i + c];
      const h = drawField(doc, label, value, MARGIN + c * colW, y, colW - 10);
      if (h > maxH) maxH = h;
    }
    y += maxH + 4;
  }
  return y;
};

// Section title (simple text, not a filled bar)
const drawSectionTitle = (doc: jsPDF, label: string, y: number): number => {
  y = ensureSpace(doc, y, 16);
  doc.setTextColor(...JBS_TEXT);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(label, MARGIN, y + 4);
  return y + 10;
};

// Status pill
const drawStatusPill = (doc: jsPDF, label: string, color: RGB, x: number, y: number): number => {
  doc.setFillColor(...color);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  const pw = doc.getTextWidth(label) + 14;
  doc.roundedRect(x, y, pw, 11, 2, 2, "F");
  doc.setTextColor(...JBS_WHITE);
  doc.text(label, x + 7, y + 7.5);
  return pw;
};

// ─── Timeline stages (horizontal pills with arrows) ───
const drawTimelineStages = (doc: jsPDF, stages: { label: string; state: string; detail?: string }[], y: number, indent = 0): number => {
  const pageW = doc.internal.pageSize.getWidth();
  const startX = MARGIN + 4 + indent;
  let x = startX;
  const maxX = pageW - MARGIN;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const color = getStateColor(stage.state);
    const label = stage.label;

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const tw = doc.getTextWidth(label) + 12;
    const arrowW = i < stages.length - 1 ? 8 : 0;

    if (x + tw + arrowW > maxX) {
      x = startX;
      y += 14;
      y = ensureSpace(doc, y, 14);
    }

    doc.setFillColor(...color);
    doc.roundedRect(x, y, tw, 10, 2, 2, "F");
    doc.setTextColor(...JBS_WHITE);
    doc.text(label, x + 6, y + 7);
    x += tw;

    if (i < stages.length - 1) {
      doc.setTextColor(...JBS_LABEL);
      doc.setFontSize(8);
      doc.text("→", x + 2, y + 7);
      x += arrowW;
    }
  }

  y += 14;

  for (const stage of stages) {
    if (stage.detail) {
      y = ensureSpace(doc, y, 10);
      doc.setTextColor(...JBS_LABEL);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      const lines = doc.splitTextToSize(stage.detail, pageW - 40 - indent);
      doc.text(lines, MARGIN + 4 + indent, y);
      y += lines.length * 5 + 2;
    }
  }

  return y;
};

// ─── Checklist items ───
const drawChecklistItems = (doc: jsPDF, items: { label: string; status: string; detail?: string }[], y: number): number => {
  const pageW = doc.internal.pageSize.getWidth();

  for (const item of items) {
    y = ensureSpace(doc, y, 12);

    const color = getStateColor(
      item.status === "done" ? "completed" :
      item.status === "error" ? "error" :
      item.status === "warning" ? "warning" :
      item.status === "pending" ? "current" : "pending"
    );

    doc.setFillColor(...color);
    doc.circle(MARGIN + 6, y + 4, 3, "F");
    doc.setTextColor(...JBS_WHITE);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    const icon = item.status === "done" ? "✓" : item.status === "error" ? "✗" : item.status === "warning" ? "!" : "○";
    doc.text(icon, MARGIN + 4.5, y + 5.5);

    doc.setTextColor(...JBS_TEXT);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, MARGIN + 14, y + 5.5);
    y += 10;

    if (item.detail) {
      y = ensureSpace(doc, y, 8);
      doc.setTextColor(...JBS_LABEL);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      const lines = doc.splitTextToSize(item.detail, pageW - 50);
      doc.text(lines, MARGIN + 14, y);
      y += lines.length * 5 + 2;
    }
  }

  return y;
};

// ─── Lacre armador sub-timeline ───
const getLacreStagesForPdf = (lacreStatus: string) => {
  const statusOrder = ["aguardando_preenchimento", "aguardando_confirmacao", "posicionamento_confirmado", "aguardando_lacre", "servico_concluido"];
  const currentIdx = statusOrder.indexOf(lacreStatus);
  const isRecusado = lacreStatus === "recusado";

  const steps = [
    { key: "aguardando_preenchimento", label: "Preencher Dados", logicalIdx: 0 },
    currentIdx >= statusOrder.indexOf("posicionamento_confirmado")
      ? { key: "posicionamento_confirmado", label: "Posicionamento Confirmado", logicalIdx: 2 }
      : { key: "aguardando_confirmacao", label: "Aguardando Confirmação", logicalIdx: 1 },
    currentIdx >= statusOrder.indexOf("servico_concluido")
      ? { key: "lacre_inserido", label: "Lacre Armador Inserido", logicalIdx: 4 }
      : { key: "aguardando_lacre", label: "Aguardando Lacre", logicalIdx: 3 },
    { key: "servico_concluido", label: "Serviço Concluído", logicalIdx: 4 },
  ];

  return steps.map((step) => {
    const logicalIdx = step.logicalIdx;
    let state = "pending";
    if (isRecusado && step.key === "aguardando_preenchimento") {
      state = "error";
    } else if (logicalIdx < currentIdx) {
      state = "completed";
    } else if (logicalIdx === currentIdx) {
      if (step.key === "servico_concluido" || step.key === "posicionamento_confirmado" || step.key === "lacre_inserido") state = "completed";
      else if (step.key === "aguardando_confirmacao") state = "current";
      else state = "warning";
    }
    return { label: step.label, state };
  });
};

// ═══════════════════════════════════════════════
// EXTERNAL PDF
// ═══════════════════════════════════════════════
const generateExternalPdf = async (solicitacao: any, options: PdfOptions = {}): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const {
    deferimentoStatus,
    observacoes = [],
    statusLabels = [],
    etapasConfig = [],
    servicoConfig,
    lacreArmadorDados,
    lacreArmadorConfig,
    showDeferimento = false,
    showLacreArmador = false,
    aprovacaoAdministrativo = false,
    aprovacaoOperacional = false,
    camposDinamicosExternos = [],
  } = options;

  let logoBase64: string | null = null;
  try { logoBase64 = await loadLogoBase64(); } catch { /* fallback */ }

  let y = drawHeader(doc, logoBase64, "Comprovante de Solicitação", new Date().toLocaleString("pt-BR"));

  // ─── Protocol + Status section ───
  y = ensureSpace(doc, y, 24);
  const halfW = (pageW - MARGIN * 2) / 2;
  drawField(doc, "Protocolo", solicitacao.protocolo, MARGIN, y, halfW - 10);
  drawField(doc, "Status", getStatusLabel(solicitacao.status), MARGIN + halfW, y, halfW - 10);
  y += 22;
  y = drawSectionBorder(doc, y);
  y += 6;

  // ─── Pendências ───
  if (solicitacao.status === "vistoriado_com_pendencia" && solicitacao.pendencias_selecionadas?.length > 0) {
    doc.setFillColor(255, 250, 230);
    doc.roundedRect(MARGIN, y, pageW - MARGIN * 2, 12, 2, 2, "F");
    doc.setTextColor(180, 120, 0);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("Pendências: " + solicitacao.pendencias_selecionadas.join(", "), MARGIN + 6, y + 8);
    y += 16;
  }

  // ─── Informações da Solicitação (3-col grid) ───
  const isPosic = (solicitacao.tipo_operacao || "").toLowerCase().includes("posicionamento");
  const isAgendamento = servicoConfig?.tipo_agendamento === "data_horario";
  const dateLabel = isPosic ? "Posicionar dia" : isAgendamento ? "Agendar para" : "Data do serviço";
  let dateValue = "—";
  if (isAgendamento && solicitacao.data_agendamento) {
    dateValue = new Date(solicitacao.data_agendamento).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } else if (solicitacao.data_posicionamento) {
    dateValue = new Date(solicitacao.data_posicionamento + "T00:00:00").toLocaleDateString("pt-BR");
  }

  const infoFields: [string, string][] = [
    solicitacao.tipo_operacao ? ["Serviço", solicitacao.tipo_operacao] : null,
    solicitacao.categoria ? ["Categoria", solicitacao.categoria] : null,
    solicitacao.tipo_carga ? ["Tipo de Carga", formatTipoCarga(solicitacao.tipo_carga)] : null,
    solicitacao.numero_conteiner ? ["Contêiner", solicitacao.numero_conteiner] : null,
    solicitacao.lpco ? ["LPCO", solicitacao.lpco] : null,
    dateValue !== "—" ? [dateLabel, dateValue] : null,
    ...camposDinamicosExternos.map(c => [c.campo_nome, c.valor] as [string, string]),
  ].filter(Boolean) as [string, string][];

  if (infoFields.length > 0) {
    y = drawFieldsGrid(doc, infoFields, y, 3);
  }
  y = drawSectionBorder(doc, y);
  y += 6;

  // ─── Progresso do Processo ───
  y = drawSectionTitle(doc, "Progresso do Processo", y);

  const stages = getStages({
    status: solicitacao.status,
    comexAprovado: solicitacao.comex_aprovado,
    armazemAprovado: solicitacao.armazem_aprovado,
    aprovacaoAtivada: aprovacaoAdministrativo || aprovacaoOperacional,
    aprovacaoAdministrativo,
    aprovacaoOperacional,
    solicitarDeferimento: showDeferimento,
    deferimentoStatus: showDeferimento ? deferimentoStatus : undefined,
    statusLabels,
    categoria: solicitacao.categoria,
    tipoOperacao: solicitacao.tipo_operacao,
    pendenciasSelecionadas: solicitacao.pendencias_selecionadas,
    observacoes: observacoes.map(o => o.observacao),
    etapasConfig,
    custoposicionamento: solicitacao.custo_posicionamento ?? null,
  });

  y = drawTimelineStages(doc, stages, y);

  if (showDeferimento) {
    const defStages = getDeferimentoStages(deferimentoStatus ?? null, etapasConfig);
    if (defStages.length > 0) {
      y = ensureSpace(doc, y, 20);
      const defColor: RGB = deferimentoStatus === "recusado" ? COLOR_RED : deferimentoStatus === "recebido" ? JBS_GREEN : deferimentoStatus === "aguardando" ? COLOR_BLUE_LIGHT : COLOR_AMBER;
      doc.setTextColor(...defColor);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("DEFERIMENTO", MARGIN + 10, y + 4);
      y += 8;
      doc.setDrawColor(...defColor);
      doc.setLineWidth(1.5);
      doc.line(MARGIN + 6, y - 12, MARGIN + 6, y + 12);
      y = drawTimelineStages(doc, defStages, y, 10);
    }
  }

  y = drawSectionBorder(doc, y);
  y += 6;

  // ─── Checklist ───
  y = drawSectionTitle(doc, "Checklist do Processo", y);

  const checkItems = getCheckItems({
    solicitacao: {
      ...solicitacao,
      solicitar_deferimento: showDeferimento,
      observacoes: observacoes?.[0]?.observacao || null,
    },
    aprovacaoAtivada: aprovacaoAdministrativo || aprovacaoOperacional,
    aprovacaoAdministrativo,
    aprovacaoOperacional,
    deferimentoStatus: showDeferimento ? deferimentoStatus : null,
    hideInternal: true,
    serviceName: solicitacao.tipo_operacao || undefined,
    etapasConfig,
  });

  y = drawChecklistItems(doc, checkItems, y);
  y = drawSectionBorder(doc, y);
  y += 6;

  // ─── Acompanhamento (Observações) ───
  if (observacoes.length > 0) {
    y = drawSectionTitle(doc, "Acompanhamento", y);

    for (const obs of observacoes) {
      y = ensureSpace(doc, y, 16);
      doc.setFillColor(...JBS_FOOTER_BG);
      const obsLines = doc.splitTextToSize(obs.observacao, pageW - MARGIN * 2 - 20);
      const obsH = obsLines.length * 5 + 12;
      doc.roundedRect(MARGIN + 4, y, pageW - MARGIN * 2 - 8, obsH, 2, 2, "F");

      doc.setTextColor(...JBS_TEXT);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text(obsLines, MARGIN + 10, y + 8);

      doc.setTextColor(...JBS_LABEL);
      doc.setFontSize(6.5);
      doc.text(new Date(obs.created_at).toLocaleString("pt-BR"), pageW - MARGIN - 6, y + 8, { align: "right" });

      y += obsH + 4;
    }
    y = drawSectionBorder(doc, y);
    y += 6;
  }

  // ─── Lacre Armador ───
  if (showLacreArmador && lacreArmadorDados) {
    y = drawSectionTitle(doc, lacreArmadorConfig?.titulo_externo || "Regularização de Lacre Armador", y);

    const lacreStatus = lacreArmadorDados.lacre_status || "aguardando_preenchimento";
    const lacreStages = getLacreStagesForPdf(lacreStatus);
    y = drawTimelineStages(doc, lacreStages, y);

    const lacreMessages: Record<string, { label: string; color: RGB }> = {
      aguardando_confirmacao: { label: "Aguardando confirmação do posicionamento pela equipe.", color: COLOR_BLUE_LIGHT },
      posicionamento_confirmado: { label: "O posicionamento para inclusão do lacre foi confirmado.", color: JBS_GREEN },
      aguardando_lacre: { label: "Aguardando a inclusão do lacre armador no contêiner.", color: COLOR_AMBER },
      servico_concluido: { label: "Lacre armador incluído com sucesso.", color: JBS_GREEN },
    };

    const msg = lacreMessages[lacreStatus];
    if (msg) {
      y = ensureSpace(doc, y, 12);
      doc.setTextColor(...msg.color);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text(msg.label, MARGIN + 4, y + 4);
      y += 10;
    }

    if (lacreStatus === "recusado" && lacreArmadorDados.motivo_recusa) {
      y = ensureSpace(doc, y, 12);
      doc.setTextColor(...COLOR_RED);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("Solicitação recusada — Motivo: " + lacreArmadorDados.motivo_recusa, MARGIN + 4, y + 4);
      y += 10;
    }

    if (lacreStatus !== "aguardando_preenchimento") {
      const lacreFields: [string, string][] = [
        ["Lacre coletado", lacreArmadorDados.lacre_coletado ? "Sim" : "Não"],
      ];
      if (lacreArmadorDados.data_posicionamento_lacre) {
        const periodo = lacreArmadorDados.periodo_lacre === "manha" ? "Manhã" : "Tarde";
        lacreFields.push(["Data / Período", `${new Date(lacreArmadorDados.data_posicionamento_lacre + "T00:00:00").toLocaleDateString("pt-BR")} — ${periodo}`]);
      }
      if (lacreFields.length > 0) {
        y = drawFieldsGrid(doc, lacreFields, y, 2);
      }
    }
    y = drawSectionBorder(doc, y);
    y += 6;
  }

  // ─── Deferimento Status Detail ───
  if (showDeferimento && deferimentoStatus) {
    y = drawSectionTitle(doc, "Status do Deferimento", y);

    const defMessages: Record<string, { text: string; color: RGB }> = {
      recebido: { text: "Deferimento Recebido — Todos os documentos foram aprovados.", color: JBS_GREEN },
      aguardando: { text: "Aguardando Atendimento — Documento(s) enviado(s), em análise.", color: COLOR_BLUE_LIGHT },
      recusado: { text: "Documento Recusado — Reenvio necessário.", color: COLOR_RED },
    };
    const defMsg = defMessages[deferimentoStatus] || { text: "Aguardando envio do deferimento.", color: COLOR_AMBER };
    doc.setTextColor(...defMsg.color);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(defMsg.text, MARGIN + 4, y + 4);
    y += 12;
  }

  drawFooter(doc);
  return doc;
};

// ═══════════════════════════════════════════════
// INTERNAL PDF
// ═══════════════════════════════════════════════
const generateInternalPdf = async (solicitacao: any, options: PdfOptions = {}): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const { aprovacaoAtivada = false, deferimentoStatus } = options;
  let logoBase64: string | null = null;
  try { logoBase64 = await loadLogoBase64(); } catch { /* fallback */ }

  let y = drawHeader(doc, logoBase64, "Relatório Interno de Processo", new Date().toLocaleString("pt-BR"), true);

  // ─── Protocol + Status ───
  const halfW = (pageW - MARGIN * 2) / 2;
  drawField(doc, "Protocolo", solicitacao.protocolo, MARGIN, y, halfW - 10);
  drawField(doc, "Status", getStatusLabel(solicitacao.status), MARGIN + halfW, y, halfW - 10);
  y += 22;
  y = drawSectionBorder(doc, y);
  y += 6;

  // ─── All fields in 3-col grid ───
  const allFields: [string, string][] = [
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
    ["Data Solicitação", new Date(solicitacao.created_at).toLocaleString("pt-BR")],
  ];

  y = drawFieldsGrid(doc, allFields, y, 3);

  // Observações as full-width
  if (solicitacao.observacoes) {
    y = ensureSpace(doc, y, 16);
    doc.setTextColor(...JBS_LABEL);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("OBSERVAÇÕES", MARGIN, y);
    doc.setTextColor(...JBS_TEXT);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    const obsLines = doc.splitTextToSize(solicitacao.observacoes, pageW - MARGIN * 2);
    doc.text(obsLines, MARGIN, y + 6);
    y += obsLines.length * 5 + 12;
  }

  y = drawSectionBorder(doc, y);
  y += 6;

  // ─── Aprovações ───
  if (aprovacaoAtivada) {
    y = drawSectionTitle(doc, "Aprovações", y);
    const approvals = [
      { label: "Administrativo", approved: solicitacao.comex_aprovado, justificativa: solicitacao.comex_justificativa },
      { label: "Operacional", approved: solicitacao.armazem_aprovado, justificativa: solicitacao.armazem_justificativa },
    ];
    for (const ap of approvals) {
      y = ensureSpace(doc, y, 14);
      const statusLabel = ap.approved === true ? "APROVADO" : ap.approved === false ? "RECUSADO" : "PENDENTE";
      const statusBg: RGB = ap.approved === true ? JBS_GREEN : ap.approved === false ? COLOR_RED : COLOR_AMBER;
      doc.setTextColor(...JBS_TEXT);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(ap.label, MARGIN + 4, y + 7);
      const pw = drawStatusPill(doc, statusLabel, statusBg, MARGIN + 56, y + 1);
      if (ap.justificativa) {
        doc.setTextColor(...JBS_LABEL);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "italic");
        doc.text(ap.justificativa.substring(0, 70), MARGIN + 56 + pw + 6, y + 7);
      }
      y += 16;
    }
    y = drawSectionBorder(doc, y);
    y += 6;
  }

  // ─── Deferimento ───
  if (solicitacao.solicitar_deferimento && deferimentoStatus) {
    y = drawSectionTitle(doc, "Deferimento", y);
    const defLabel = deferimentoStatus === "recebido" ? "RECEBIDO" : deferimentoStatus === "recusado" ? "RECUSADO" : "AGUARDANDO";
    const defColor: RGB = deferimentoStatus === "recebido" ? JBS_GREEN : deferimentoStatus === "recusado" ? COLOR_RED : COLOR_AMBER;
    drawStatusPill(doc, defLabel, defColor, MARGIN + 4, y);
    y += 18;
    y = drawSectionBorder(doc, y);
    y += 6;
  }

  // ─── Lançamento ───
  if (solicitacao.lancamento_confirmado !== undefined && solicitacao.lancamento_confirmado !== null) {
    y = drawSectionTitle(doc, "Lançamento", y);
    const lancLabel = solicitacao.lancamento_confirmado ? "CONFIRMADO" : "PENDENTE";
    const lancColor: RGB = solicitacao.lancamento_confirmado ? JBS_GREEN : COLOR_AMBER;
    drawStatusPill(doc, lancLabel, lancColor, MARGIN + 4, y);
    y += 18;
  }

  drawFooter(doc);
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
