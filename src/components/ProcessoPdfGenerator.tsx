import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatTipoCarga } from "@/lib/tipoCarga";
import { STATUS_LABELS } from "@/components/StatusBadge";
import { getStages, getDeferimentoStages } from "@/components/ProcessStageStepper";
import { getCheckItems } from "@/components/ProcessChecklist";
import logoSrc from "@/assets/jbs-terminais-logo.png";

type RGB = [number, number, number];

const JBS_BLUE: RGB = [11, 27, 77];
const JBS_GREEN: RGB = [122, 193, 67];
const JBS_WHITE: RGB = [255, 255, 255];
const JBS_GRAY: RGB = [51, 51, 51];
const JBS_GRAY_MED: RGB = [120, 120, 120];
const JBS_GRAY_LIGHT: RGB = [245, 247, 250];
const JBS_BLUE_SOFT: RGB = [230, 235, 248];

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

// ─── Shared drawing helpers ───

const drawCorporateHeader = (doc: jsPDF, logoBase64: string | null, title: string, subtitle: string, confidential = false) => {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...JBS_BLUE);
  doc.rect(0, 0, pageW, 38, "F");
  doc.setFillColor(...JBS_GREEN);
  doc.rect(0, 38, pageW, 1.5, "F");
  if (logoBase64) {
    doc.setFillColor(...JBS_WHITE);
    doc.roundedRect(12, 6, 46, 26, 3, 3, "F");
    doc.addImage(logoBase64, "PNG", 14, 8, 42, 22);
  }
  doc.setTextColor(...JBS_WHITE);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(title, 66, 18);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 210, 230);
  doc.text(subtitle, 66, 26);
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

const drawCorporateFooter = (doc: jsPDF) => {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...JBS_GREEN);
  doc.setLineWidth(0.8);
  doc.line(14, pageH - 18, pageW - 14, pageH - 18);
  doc.setTextColor(...JBS_GRAY_MED);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.text("JBS Terminais  ·  Sistema de Gestão de Processos", 14, pageH - 12);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}  |  Pág. ${doc.getCurrentPageInfo().pageNumber}`, pageW - 14, pageH - 12, { align: "right" });
};

const drawProtocolBanner = (doc: jsPDF, protocolo: string, status: string, y: number): number => {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...JBS_BLUE_SOFT);
  doc.roundedRect(14, y, pageW - 28, 22, 3, 3, "F");
  doc.setFillColor(...JBS_BLUE);
  doc.rect(14, y, 3, 22, "F");
  doc.setTextColor(...JBS_BLUE);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("PROTOCOLO", 24, y + 8);
  doc.setFontSize(12);
  doc.text(protocolo, 24, y + 17);
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

const ensureSpace = (doc: jsPDF, y: number, needed: number): number => {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - 25) {
    doc.addPage();
    drawCorporateFooter(doc);
    return 20;
  }
  return y;
};

const drawFieldsTable = (doc: jsPDF, fields: string[][], startY: number): number => {
  autoTable(doc, {
    startY,
    body: fields,
    theme: "plain",
    styles: { fontSize: 8.5, cellPadding: { top: 3.5, bottom: 3.5, left: 8, right: 8 }, lineWidth: 0 },
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

// ─── Draw timeline stages as horizontal pills ───
const drawTimelineStages = (doc: jsPDF, stages: { label: string; state: string; detail?: string }[], y: number, indent = 0): number => {
  const pageW = doc.internal.pageSize.getWidth();
  const startX = 20 + indent;
  let x = startX;
  const maxX = pageW - 20;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const color = getStateColor(stage.state);
    const label = stage.label;

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const tw = doc.getTextWidth(label) + 12;
    const arrowW = i < stages.length - 1 ? 8 : 0;

    // Wrap to next line if needed
    if (x + tw + arrowW > maxX) {
      x = startX;
      y += 14;
      y = ensureSpace(doc, y, 14);
    }

    // Draw pill
    doc.setFillColor(...color);
    doc.roundedRect(x, y, tw, 10, 2, 2, "F");
    doc.setTextColor(...JBS_WHITE);
    doc.text(label, x + 6, y + 7);
    x += tw;

    // Arrow
    if (i < stages.length - 1) {
      doc.setTextColor(...JBS_GRAY_MED);
      doc.setFontSize(8);
      doc.text("→", x + 2, y + 7);
      x += arrowW;
    }
  }

  y += 14;

  // Draw details
  for (const stage of stages) {
    if (stage.detail) {
      y = ensureSpace(doc, y, 10);
      doc.setTextColor(...JBS_GRAY_MED);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      const lines = doc.splitTextToSize(stage.detail, pageW - 40 - indent);
      doc.text(lines, 20 + indent, y);
      y += lines.length * 5 + 2;
    }
  }

  return y;
};

// ─── Draw checklist items ───
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

    // Circle
    doc.setFillColor(...color);
    doc.circle(24, y + 4, 3, "F");
    doc.setTextColor(...JBS_WHITE);
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    const icon = item.status === "done" ? "✓" : item.status === "error" ? "✗" : item.status === "warning" ? "!" : "○";
    doc.text(icon, 22.5, y + 5.5);

    // Label
    doc.setTextColor(...JBS_GRAY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, 30, y + 5.5);

    y += 10;

    if (item.detail) {
      y = ensureSpace(doc, y, 8);
      doc.setTextColor(...JBS_GRAY_MED);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      const lines = doc.splitTextToSize(item.detail, pageW - 50);
      doc.text(lines, 30, y);
      y += lines.length * 5 + 2;
    }
  }

  return y;
};

// ─── Lacre armador sub-timeline for PDF ───
const getLacreStagesForPdf = (lacreStatus: string) => {
  const statusOrder = ["aguardando_preenchimento", "aguardando_confirmacao", "posicionamento_confirmado", "aguardando_lacre", "servico_concluido"];
  const currentIdx = statusOrder.indexOf(lacreStatus);
  const isRecusado = lacreStatus === "recusado";

  // Build steps with replacement logic (same as UI):
  // - "aguardando_confirmacao" replaced by "posicionamento_confirmado" once reached
  // - "aguardando_lacre" replaced by "Lacre Armador Inserido" when servico_concluido
  const steps = [
    { key: "aguardando_preenchimento", label: "Preencher Dados", logicalIdx: 0 },
    currentIdx >= statusOrder.indexOf("posicionamento_confirmado")
      ? { key: "posicionamento_confirmado", label: "Posicionamento Confirmado", logicalIdx: 2 }
      : { key: "aguardando_confirmacao", label: "Aguardando Confirmação", logicalIdx: 1 },
    currentIdx >= statusOrder.indexOf("servico_concluido")
      ? { key: "lacre_inserido", label: "Lacre Armador Inserido", logicalIdx: 4 }
      : currentIdx >= statusOrder.indexOf("aguardando_lacre")
        ? { key: "aguardando_lacre", label: "Aguardando Lacre", logicalIdx: 3 }
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
// EXTERNAL PDF – mirrors the consultation page
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

  drawCorporateHeader(doc, logoBase64, "Comprovante de Solicitação", "Documento gerado para acompanhamento do cliente");
  let y = 48;

  // ─── Protocol + Status ───
  y = drawProtocolBanner(doc, solicitacao.protocolo, solicitacao.status, y);

  // ─── Pendências inline ───
  if (solicitacao.status === "vistoriado_com_pendencia" && solicitacao.pendencias_selecionadas?.length > 0) {
    doc.setFillColor(255, 250, 230);
    doc.roundedRect(14, y, pageW - 28, 12, 2, 2, "F");
    doc.setTextColor(180, 120, 0);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("Pendências: " + solicitacao.pendencias_selecionadas.join(", "), 20, y + 8);
    y += 16;
  }

  // ─── 1. Progresso do Processo (Timeline Stepper) ───
  y = ensureSpace(doc, y, 30);
  y = drawSectionHeader(doc, "PROGRESSO DO PROCESSO", y);

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

  // Deferimento sub-timeline
  if (showDeferimento) {
    const defStages = getDeferimentoStages(deferimentoStatus ?? null, etapasConfig);
    if (defStages.length > 0) {
      y = ensureSpace(doc, y, 20);
      const defColor: RGB = deferimentoStatus === "recusado" ? COLOR_RED : deferimentoStatus === "recebido" ? JBS_GREEN : deferimentoStatus === "aguardando" ? COLOR_BLUE_LIGHT : COLOR_AMBER;
      doc.setTextColor(...defColor);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.text("DEFERIMENTO", 26, y + 4);
      y += 8;
      // Draw left border accent
      doc.setDrawColor(...defColor);
      doc.setLineWidth(1.5);
      doc.line(22, y - 12, 22, y + 12);
      y = drawTimelineStages(doc, defStages, y, 10);
    }
  }

  // ─── 2. Checklist ───
  y = ensureSpace(doc, y, 20);
  y = drawSectionHeader(doc, "CHECKLIST DO PROCESSO", y);

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

  // ─── 3. Informações da Solicitação ───
  y = ensureSpace(doc, y, 20);
  y = drawSectionHeader(doc, "INFORMAÇÕES DA SOLICITAÇÃO", y);

  const isPosic = (solicitacao.tipo_operacao || "").toLowerCase().includes("posicionamento");
  const isAgendamento = servicoConfig?.tipo_agendamento === "data_horario";

  const dateLabel = isPosic ? "Posicionar dia" : isAgendamento ? "Agendar para" : "Data do serviço";
  let dateValue = "—";
  if (isAgendamento && solicitacao.data_agendamento) {
    dateValue = new Date(solicitacao.data_agendamento).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } else if (solicitacao.data_posicionamento) {
    dateValue = new Date(solicitacao.data_posicionamento + "T00:00:00").toLocaleDateString("pt-BR");
  }

  const fields = [
    solicitacao.tipo_operacao ? ["Serviço solicitado", solicitacao.tipo_operacao] : null,
    solicitacao.numero_conteiner ? ["Contêiner", solicitacao.numero_conteiner] : null,
    solicitacao.lpco ? ["LPCO", solicitacao.lpco] : null,
    solicitacao.tipo_carga ? ["Tipo de Carga", formatTipoCarga(solicitacao.tipo_carga)] : null,
    dateValue !== "—" ? [dateLabel, dateValue] : null,
    ...camposDinamicosExternos.map(c => [c.campo_nome, c.valor]),
  ].filter(Boolean) as string[][];

  if (fields.length > 0) {
    y = drawFieldsTable(doc, fields, y);
  }

  // ─── 4. Acompanhamento (Observações) ───
  if (observacoes.length > 0) {
    y = ensureSpace(doc, y, 20);
    y = drawSectionHeader(doc, "ACOMPANHAMENTO", y);

    for (const obs of observacoes) {
      y = ensureSpace(doc, y, 16);
      doc.setFillColor(...JBS_GRAY_LIGHT);
      const obsLines = doc.splitTextToSize(obs.observacao, pageW - 50);
      const obsH = obsLines.length * 5 + 12;
      doc.roundedRect(20, y, pageW - 40, obsH, 2, 2, "F");

      doc.setTextColor(...JBS_GRAY);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(obsLines, 26, y + 8);

      doc.setTextColor(...JBS_GRAY_MED);
      doc.setFontSize(6.5);
      doc.text(new Date(obs.created_at).toLocaleString("pt-BR"), pageW - 26, y + 8, { align: "right" });

      y += obsH + 4;
    }
  }

  // ─── 5. Lacre Armador ───
  if (showLacreArmador && lacreArmadorDados) {
    y = ensureSpace(doc, y, 30);
    y = drawSectionHeader(doc, lacreArmadorConfig?.titulo_externo?.toUpperCase() || "REGULARIZAÇÃO DE LACRE ARMADOR", y);

    const lacreStatus = lacreArmadorDados.lacre_status || "aguardando_preenchimento";
    const lacreStages = getLacreStagesForPdf(lacreStatus);
    y = drawTimelineStages(doc, lacreStages, y);

    // Status messages
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
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(msg.label, 20, y + 4);
      y += 10;
    }

    if (lacreStatus === "recusado" && lacreArmadorDados.motivo_recusa) {
      y = ensureSpace(doc, y, 12);
      doc.setTextColor(...COLOR_RED);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Solicitação recusada — Motivo: " + lacreArmadorDados.motivo_recusa, 20, y + 4);
      y += 10;
    }

    // Submitted data (excluding personal info)
    if (lacreStatus !== "aguardando_preenchimento") {
      y = ensureSpace(doc, y, 20);
      const lacreFields: string[][] = [];
      lacreFields.push(["Lacre coletado", lacreArmadorDados.lacre_coletado ? "Sim" : "Não"]);
      if (lacreArmadorDados.data_posicionamento_lacre) {
        const periodo = lacreArmadorDados.periodo_lacre === "manha" ? "Manhã" : "Tarde";
        lacreFields.push(["Data / Período", `${new Date(lacreArmadorDados.data_posicionamento_lacre + "T00:00:00").toLocaleDateString("pt-BR")} — ${periodo}`]);
      }
      // Personal info (nome, telefone, email) excluded per requirement
      if (lacreFields.length > 0) {
        y = drawFieldsTable(doc, lacreFields, y);
      }
    }
  }

  // ─── 6. Deferimento Status Detail ───
  if (showDeferimento && deferimentoStatus) {
    y = ensureSpace(doc, y, 20);
    y = drawSectionHeader(doc, "STATUS DO DEFERIMENTO", y);

    if (deferimentoStatus === "recebido") {
      doc.setTextColor(...JBS_GREEN);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("Deferimento Recebido — Todos os documentos foram aprovados.", 20, y + 5);
      y += 12;
    } else if (deferimentoStatus === "aguardando") {
      doc.setTextColor(...COLOR_BLUE_LIGHT);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("Aguardando Atendimento — Documento(s) enviado(s), em análise.", 20, y + 5);
      y += 12;
    } else if (deferimentoStatus === "recusado") {
      doc.setTextColor(...COLOR_RED);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("Documento Recusado — Reenvio necessário.", 20, y + 5);
      y += 12;
    } else {
      doc.setTextColor(...COLOR_AMBER);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("Aguardando envio do deferimento.", 20, y + 5);
      y += 12;
    }
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

  if (aprovacaoAtivada) {
    y = drawSectionHeader(doc, "APROVAÇÕES", y);
    const approvals = [
      { label: "Administrativo", approved: solicitacao.comex_aprovado, justificativa: solicitacao.comex_justificativa },
      { label: "Operacional", approved: solicitacao.armazem_aprovado, justificativa: solicitacao.armazem_justificativa },
    ];
    for (const ap of approvals) {
      const statusLabel = ap.approved === true ? "APROVADO" : ap.approved === false ? "RECUSADO" : "PENDENTE";
      const statusBg: RGB = ap.approved === true ? JBS_GREEN : ap.approved === false ? COLOR_RED : COLOR_AMBER;
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

  if (solicitacao.solicitar_deferimento && deferimentoStatus) {
    y = drawSectionHeader(doc, "DEFERIMENTO", y);
    const defLabel = deferimentoStatus === "recebido" ? "RECEBIDO" : deferimentoStatus === "recusado" ? "RECUSADO" : "AGUARDANDO";
    const defColor: RGB = deferimentoStatus === "recebido" ? JBS_GREEN : deferimentoStatus === "recusado" ? COLOR_RED : COLOR_AMBER;
    drawStatusPill(doc, defLabel, defColor, 22, y);
    y += 18;
  }

  if (solicitacao.lancamento_confirmado !== undefined && solicitacao.lancamento_confirmado !== null) {
    y = drawSectionHeader(doc, "LANÇAMENTO", y);
    const lancLabel = solicitacao.lancamento_confirmado ? "CONFIRMADO" : "PENDENTE";
    const lancColor: RGB = solicitacao.lancamento_confirmado ? JBS_GREEN : COLOR_AMBER;
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
