import { NextResponse } from "next/server";
import { get, del } from "@vercel/blob";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { extractText, getDocumentProxy } from "unpdf";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 300;

const FinancialAssessment = z.object({
  financialHealthScore: z.number().min(0).max(100),
  dataCompletenessScore: z.number().min(0).max(100),
  revenueHealthScore: z.number().min(0).max(100),
  profitabilityHealthScore: z.number().min(0).max(100),
  costControlScore: z.number().min(0).max(100),
  cashFlowScore: z.number().min(0).max(100),
  internalControlScore: z.number().min(0).max(100),
  revenueIntegrityScore: z.number().min(0).max(100),
  executiveSummary: z.string(),
  revenueAnalysis: z.string(),
  costAnalysis: z.string(),
  profitAnalysis: z.string(),
  comparativeAnalysis: z.string(),
  ratioAnalysis: z.string(),
  varianceAnalysis: z.string(),
  auditFindings: z.array(z.string()).max(8),
  risks: z.array(z.string()).max(8),
  recommendations: z.array(z.string()).max(8),
  actionPlan: z.array(z.string()).max(8),
  dataLimitations: z.array(z.string()).max(6),
  conclusion: z.string(),
  extractedFigures: z.array(z.object({ label: z.string(), value: z.string(), period: z.string() })).max(40),
});

function wrap(text: string, max = 92) {
  const words = text.replace(/\s+/g, " ").split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = (line + " " + w).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function makePdf(fileName: string, result: z.infer<typeof FinancialAssessment>) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN = 42;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  const NAVY = rgb(0.075, 0.13, 0.25);
  const NAVY_2 = rgb(0.12, 0.20, 0.34);
  const GOLD = rgb(0.67, 0.50, 0.22);
  const GOLD_SOFT = rgb(0.96, 0.92, 0.84);
  const TEXT = rgb(0.20, 0.25, 0.33);
  const MUTED = rgb(0.43, 0.47, 0.54);
  const LIGHT = rgb(0.965, 0.972, 0.982);
  const LIGHT_BLUE = rgb(0.93, 0.95, 0.98);
  const CREAM = rgb(0.985, 0.975, 0.95);
  const BORDER = rgb(0.86, 0.88, 0.92);
  const WHITE = rgb(1, 1, 1);
  const GREEN = rgb(0.12, 0.48, 0.31);
  const GREEN_BG = rgb(0.91, 0.97, 0.93);
  const AMBER = rgb(0.66, 0.43, 0.08);
  const AMBER_BG = rgb(0.99, 0.95, 0.84);
  const RED = rgb(0.66, 0.18, 0.18);
  const RED_BG = rgb(0.99, 0.92, 0.92);

  const statusFor = (score: number) => score >= 80
    ? { label: "GOOD", color: GREEN, bg: GREEN_BG }
    : score >= 60
      ? { label: "NEEDS IMPROVEMENT", color: AMBER, bg: AMBER_BG }
      : { label: "NEEDS ATTENTION", color: RED, bg: RED_BG };

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 48;
  let pageNumber = 1;

  function ensure(height: number) {
    if (y - height < 58) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      pageNumber += 1;
      y = PAGE_H - 48;
    }
  }

  function wrap(text: string, size = 9.2, maxWidth = CONTENT_W, font = regular) {
    const words = String(text || "").replace(/\\s+/g, " ").trim().split(" ").filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function textBlock(text: string, size = 9.2, color = TEXT, gap = 5) {
    const normalized = String(text || "").replace(/\\n/g, "\n").replace(/\\r\\n/g, "\n");
    const paragraphs = normalized.split("\n").map((x) => x.trim()).filter(Boolean);
    for (const paragraph of paragraphs) {
      const bullet = /^[-•*]\\s+/.test(paragraph) || /^\\d+[.)]\\s+/.test(paragraph);
      const clean = paragraph.replace(/^[-•*]\\s+/, "").replace(/^\\d+[.)]\\s+/, "");
      const indent = bullet ? 16 : 0;
      const lines = wrap(clean, size, CONTENT_W - indent);
      ensure(lines.length * (size + 3.4) + gap + 10);
      if (bullet) page.drawText("•", { x: MARGIN, y, size: size + 1, font: bold, color: GOLD });
      for (const line of lines) {
        page.drawText(line, { x: MARGIN + indent, y, size, font: regular, color });
        y -= size + 3.4;
      }
      y -= gap;
    }
  }

  function label(text: string, color = GOLD) {
    page.drawText(text.toUpperCase(), { x: MARGIN, y, size: 7.2, font: bold, color });
    y -= 12;
  }

  function section(number: string, title: string, subtitle?: string) {
    // Keep section headers together and never let the header enter the footer zone.
    ensure(82);
    page.drawRectangle({ x: MARGIN, y: y - 4, width: 4, height: 30, color: GOLD });
    page.drawText(number, { x: MARGIN + 12, y: y + 8, size: 8, font: bold, color: GOLD });
    page.drawText(title, { x: MARGIN + 42, y: y + 6, size: 15, font: bold, color: NAVY });
    if (subtitle) page.drawText(subtitle, { x: MARGIN + 42, y: y - 8, size: 7.2, font: regular, color: MUTED });
    y -= 28;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.6, color: BORDER });
    y -= 14;
  }

  function pill(x: number, topY: number, text: string, bg: any, color: any, width = 92) {
    page.drawRectangle({ x, y: topY - 16, width, height: 16, color: bg });
    page.drawText(text, { x: x + 7, y: topY - 11.5, size: 6.3, font: bold, color });
  }

  function metricCards(items: Array<[string, string, string]>) {
    const gap = 9;
    const cols = 2;
    const w = (CONTENT_W - gap) / cols;
    const h = 72;
    for (let i = 0; i < items.length; i += cols) {
      ensure(h + 18);
      const row = items.slice(i, i + cols);
      row.forEach(([title, value, status], col) => {
        const x = MARGIN + col * (w + gap);
        page.drawRectangle({ x, y: y - h, width: w, height: h, color: WHITE, borderColor: BORDER, borderWidth: 0.7 });
        page.drawRectangle({ x, y: y - 4, width: w, height: 4, color: GOLD });
        page.drawText(title.toUpperCase(), { x: x + 11, y: y - 18, size: 6.7, font: bold, color: MUTED });
        const valueLines = wrap(value, 10.5, w - 22, bold).slice(0, 2);
        valueLines.forEach((line, n) => page.drawText(line, { x: x + 11, y: y - 36 - n * 12, size: 10.5, font: bold, color: NAVY }));
        if (status) page.drawText(status, { x: x + 11, y: y - 61, size: 6.8, font: bold, color: GOLD });
      });
      y -= h + 9;
    }
  }

  function scoreCard(score: number, compact = false) {
    const s = statusFor(score);
    const h = compact ? 70 : 108;
    ensure(h + 18);
    page.drawRectangle({ x: MARGIN, y: y - h, width: CONTENT_W, height: h, color: NAVY, borderColor: NAVY, borderWidth: 0.5 });
    page.drawText(compact ? "ASSESSMENT SCORE" : "FINANCIAL HEALTH SCORE", { x: MARGIN + 16, y: y - 20, size: 7.5, font: bold, color: GOLD_SOFT });
    page.drawText(score + " / 100", { x: MARGIN + 16, y: y - (compact ? 48 : 60), size: compact ? 20 : 28, font: bold, color: WHITE });
    pill(MARGIN + CONTENT_W - (compact ? 125 : 150), y - 12, s.label, s.bg, s.color, compact ? 109 : 134);
    y -= h + 10;
  }

  function listBlock(items: string[], numbered = false) {
    items.forEach((item, i) => {
      if (!numbered) {
        textBlock("- " + item, 9.1, TEXT, 3);
        return;
      }
      const size = 9.1;
      const number = String(i + 1).padStart(2, "0");
      const lines = wrap(String(item || ""), size, CONTENT_W - 30);
      ensure(lines.length * (size + 3.4) + 12);
      page.drawText(number, { x: MARGIN, y, size: 8, font: bold, color: GOLD });
      lines.forEach((line) => {
        page.drawText(line, { x: MARGIN + 30, y, size, font: regular, color: TEXT });
        y -= size + 3.4;
      });
      y -= 4;
    });
  }

  // Elegant cover / report header.
  page.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: GOLD });
  page.drawText("CORESTAY", { x: MARGIN, y, size: 10, font: bold, color: NAVY });
  page.drawText("ADVISORY", { x: MARGIN + 62, y, size: 10, font: regular, color: GOLD });
  y -= 24;
  page.drawText("FINANCIAL REPORT", { x: MARGIN, y, size: 24, font: bold, color: NAVY });
  y -= 21;
  page.drawText("Hospitality Financial Performance Assessment", { x: MARGIN, y, size: 10.5, font: regular, color: MUTED });
  y -= 20;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: BORDER });
  y -= 18;
  page.drawText("Prepared for management decision-making", { x: MARGIN, y, size: 8.2, font: regular, color: MUTED });
  page.drawText("CORESTAY ADVISORY", { x: PAGE_W - MARGIN - 105, y, size: 7.2, font: bold, color: GOLD });
  y -= 28;
  scoreCard(result.financialHealthScore);

  section("01", "Executive Financial Summary", "Overall Financial Condition");
  const condition = statusFor(result.financialHealthScore);
  page.drawRectangle({ x: MARGIN, y: y - 54, width: CONTENT_W, height: 54, color: condition.bg });
  page.drawText("FINANCIAL CONDITION", { x: MARGIN + 12, y: y - 17, size: 6.8, font: bold, color: condition.color });
  page.drawText(condition.label, { x: MARGIN + 12, y: y - 35, size: 12, font: bold, color: NAVY });
  y -= 66;
  textBlock(result.executiveSummary);

  section("02", "Key Financial Indicators", "Management Snapshot");
  const figure = (labels: string[]) => getFigureForPdf(result.extractedFigures, labels);
  metricCards([
    ["Revenue", figure(["Revenue"]).value, scoreLabel(result.revenueHealthScore)],
    ["GOP", figure(["GOP", "Gross Operating Profit"]).value, scoreLabel(result.profitabilityHealthScore)],
    ["GOP Margin", figure(["GOP Margin", "GOP %", "GOP Margin %"]).value, scoreLabel(result.profitabilityHealthScore)],
    ["Operating Cost", figure(["Operating Cost", "Operating Costs", "Total Operating Cost"]).value, scoreLabel(result.costControlScore)],
    ["Net Profit", figure(["Net Profit", "Net Profit/Loss", "Net Income"]).value, scoreLabel(result.profitabilityHealthScore)],
    ["Cash Flow", figure(["Cash Flow", "Operating Cash Flow", "Net Cash Flow"]).value, scoreLabel(result.cashFlowScore)],
  ]);

  section("03", "Revenue Performance", "Assessment & Financial Impact");
  textBlock(result.revenueAnalysis);
  label("Key Revenue Findings");
  listBlock(result.auditFindings.slice(0, 2), true);

  section("04", "Cost & Expense Analysis", "Cost Control & Efficiency");
  textBlock(result.costAnalysis);
  label("Management Focus");
  listBlock(["Payroll & manpower productivity", "Operational expense discipline", "Utility cost monitoring"], false);

  section("05", "Profitability Analysis", "Profit Performance");
  textBlock(result.profitAnalysis);
  textBlock("GOP Margin: " + figure(["GOP Margin", "GOP %", "GOP Margin %"]).value, 10, NAVY, 4);
  textBlock(result.ratioAnalysis);

  section("06", "Cash Flow & Liquidity", "Liquidity & Working Capital");
  textBlock(result.varianceAnalysis);
  label("Areas to Monitor");
  listBlock(["Operating cash flow", "Accounts receivable", "Accounts payable", "Cash reserve", "Debt and payment obligations"]);

  section("07", "Financial Risk Assessment", "Risk Areas & Management Attention");
  const risks: Array<[string, number, string]> = [
    ["Cost Control", result.costControlScore, "Expense growth needs monitoring"],
    ["Cash Flow", result.cashFlowScore, "Requires closer monitoring"],
    ["Revenue Dependency", result.revenueHealthScore, "Revenue mix can be improved"],
    ["Payroll", result.costControlScore, "Productivity should be reviewed"],
    ["Profit Margin", result.profitabilityHealthScore, "Margin improvement opportunity"],
  ];
  risks.forEach(([area, score, comment]) => {
    const h = 42;
    ensure(h + 18);
    const s = statusFor(score);
    page.drawRectangle({ x: MARGIN, y: y - h, width: CONTENT_W, height: h, color: LIGHT, borderColor: BORDER, borderWidth: 0.5 });
    page.drawText(area, { x: MARGIN + 10, y: y - 15, size: 8.4, font: bold, color: NAVY });
    page.drawText(comment, { x: MARGIN + 10, y: y - 29, size: 7.1, font: regular, color: MUTED });
    pill(MARGIN + CONTENT_W - 92, y - 12, s.label, s.bg, s.color, 82);
    y -= h + 5;
  });
  y -= 2;
  label("Supporting Risk Findings");
  listBlock(result.risks, true);

  section("08", "Key Findings", "Management Findings");
  listBlock(result.auditFindings.slice(0, 5), true);

  section("09", "Priority Recommendations", "Management Priorities");
  const priorityTitles = ["Priority 1 — Strengthen Cost Control", "Priority 2 — Improve Revenue Quality", "Priority 3 — Improve Financial Monitoring"];
  result.recommendations.slice(0, 3).forEach((item, i) => {
    ensure(76);
    page.drawRectangle({ x: MARGIN, y: y - 48, width: CONTENT_W, height: 48, color: i === 0 ? GOLD_SOFT : LIGHT_BLUE });
    page.drawText(priorityTitles[i], { x: MARGIN + 11, y: y - 16, size: 9.2, font: bold, color: NAVY });
    const impact = i === 0
      ? "Expected Impact: Improve operating margin and reduce unnecessary expenses."
      : i === 1
        ? "Expected Impact: Increase revenue quality without relying solely on occupancy growth."
        : "Expected Impact: Identify financial deviations earlier and take corrective action.";
    page.drawText(impact, { x: MARGIN + 11, y: y - 32, size: 7.2, font: regular, color: TEXT });
    y -= 58;
    textBlock(item, 8.8, TEXT, 7);
  });

  section("10", "90-Day Action Plan", "Execution Roadmap");
  const actionGroups: Array<[string, string[]]> = [
    ["0–30 DAYS", result.actionPlan.filter((_, i) => i % 3 === 0).slice(0, 4)],
    ["31–60 DAYS", result.actionPlan.filter((_, i) => i % 3 === 1).slice(0, 4)],
    ["61–90 DAYS", result.actionPlan.filter((_, i) => i % 3 === 2).slice(0, 4)],
  ];
  actionGroups.forEach(([period, items]) => {
    ensure(48);
    page.drawRectangle({ x: MARGIN, y: y - 20, width: 82, height: 20, color: NAVY });
    page.drawText(period, { x: MARGIN + 8, y: y - 14, size: 6.5, font: bold, color: WHITE });
    y -= 28;
    listBlock(items);
  });

  section("11", "Final Assessment", "Overall Management Conclusion");
  const finalStatus = statusFor(result.financialHealthScore);
  page.drawRectangle({ x: MARGIN, y: y - 72, width: CONTENT_W, height: 72, color: CREAM, borderColor: GOLD, borderWidth: 0.6 });
  page.drawText(finalStatus.label, { x: MARGIN + 14, y: y - 20, size: 11, font: bold, color: NAVY });
  page.drawText("Overall Financial Health Score", { x: MARGIN + 14, y: y - 34, size: 7.2, font: regular, color: MUTED });
  page.drawText(result.financialHealthScore + " / 100", { x: PAGE_W - MARGIN - 95, y: y - 31, size: 18, font: bold, color: GOLD });
  y -= 84;
  textBlock(result.conclusion, 9.2, TEXT, 4);
  textBlock("Management should prioritize cost control, revenue optimization, and disciplined financial monitoring over the next 90 days.", 9.1, NAVY, 8);

  section("12", "Assessment Score", "Financial Health Score");
  scoreCard(result.financialHealthScore, true);
  textBlock("This report is generated from the financial data successfully extracted from the submitted report. Where data is unavailable, the assessment does not invent or estimate figures.", 7.8, MUTED, 2);

  // Consistent footer on every page.
  const pages = doc.getPages();
  pages.forEach((p, index) => {
    p.drawLine({ start: { x: MARGIN, y: 34 }, end: { x: PAGE_W - MARGIN, y: 34 }, thickness: 0.5, color: BORDER });
    p.drawText("CORESTAY ADVISORY  •  FINANCIAL REPORT ASSESSMENT", { x: MARGIN, y: 22, size: 6.5, font: regular, color: MUTED });
    p.drawText("Page " + (index + 1) + " / " + pages.length, { x: PAGE_W - MARGIN - 55, y: 22, size: 6.5, font: regular, color: MUTED });
  });

  const bytes = await doc.save();
  return Buffer.from(bytes).toString("base64");
}
function getFigureForPdf(figures: { label: string; value: string; period: string }[], labels: string[]) {
  const found = figures.find((item) => labels.some((label) => item.label.toLowerCase().trim() === label.toLowerCase().trim()));
  return found || { label: labels[0], value: "Tidak tersedia – indikator tidak dapat dihitung secara valid.", period: "—" };
}

function scoreLabel(score: number) {
  return score >= 80 ? "GOOD" : score >= 60 ? "MODERATE" : "HIGH";
}

function stableSourceKey(text: string) {\n  let hash = 2166136261;\n  for (const char of text.normalize("NFKC").replace(/\\s+/g, " ").trim()) {\n    hash ^= char.charCodeAt(0);\n    hash = Math.imul(hash, 16777619);\n  }\n  return (hash >>> 0).toString(16);\n}\n\nfunction isRetryableAiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /high demand|overloaded|capacity|temporar|rate.?limit|429|503|service unavailable|internal server error/i.test(message);
}

export async function POST(request: Request) {
  let pdf: any = null;

  try {
    const auth = request.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });

    const supabase = createClient(
      "https://vkejwklhijophavlosze.supabase.co",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "missing",
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });

    const formData = await request.formData();
    const action = String(formData.get("action") || "analyze");
    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File ? fileEntry : null;
    const extractedText = String(formData.get("text") || "").trim();
    const blobPath = String(formData.get("blobPath") || "").trim();
    const submittedFileName = String(formData.get("fileName") || "Financial-Report.pdf");

    if (action === "analyze") {
      if (!blobPath && !extractedText) return NextResponse.json({ error: "File laporan belum tersedia." }, { status: 400 });
      if (blobPath && !blobPath.startsWith("financial-reports/")) return NextResponse.json({ error: "Lokasi file tidak valid." }, { status: 400 });
      if (extractedText && extractedText.length < 20) return NextResponse.json({ error: "Teks laporan terlalu pendek untuk dianalisa." }, { status: 422 });
    } else if (!(file instanceof File)) {
      return NextResponse.json({ error: "File PDF belum dipilih." }, { status: 400 });
    }
    if (action !== "analyze" && file instanceof File && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "File harus berformat PDF." }, { status: 400 });
    }
    if (action !== "analyze" && file instanceof File && file.size > 4 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran PDF maksimal 4 MB." }, { status: 400 });
    }
    if (action === "analyze" && !process.env.GEMINI_API_KEY) return NextResponse.json({ error: "Gemini API belum aktif pada deployment ini." }, { status: 503 });

    let text = extractedText;
    if (blobPath) {
      const blobResult = await get(blobPath, { access: "private" });
      if (!blobResult || blobResult.statusCode !== 200 || !blobResult.stream) {
        return NextResponse.json({ error: "File laporan tidak ditemukan atau tidak dapat dibaca." }, { status: 404 });
      }
      const buffer = await new Response(blobResult.stream).arrayBuffer();
      pdf = await getDocumentProxy(new Uint8Array(buffer));
      const parsed = await extractText(pdf, { mergePages: true });
      text = parsed.text.trim();
    } else if (action !== "analyze") {
      const buffer = await (file as File).arrayBuffer();
      pdf = await getDocumentProxy(new Uint8Array(buffer));
      const parsed = await extractText(pdf, { mergePages: true });
      text = parsed.text.trim();
    }

    if (!text) return NextResponse.json({ error: "PDF tidak memiliki teks yang dapat dibaca. OCR perlu ditambahkan untuk PDF scan." }, { status: 422 });
    if (action === "extract") return NextResponse.json({ success: true, fileName: (file as File).name, text });

    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite"];
    const system = "Anda adalah Senior Hotel Financial Auditor & Hospitality Finance Consultant untuk CoreStay. Anda wajib menganalisis FILE LAPORAN KEUANGAN YANG BENAR-BENAR DIUPLOAD pengguna, bukan membuat ringkasan generik. FILE PROCESSING RULE: file upload adalah sumber utama analisis. Jika file gagal dibaca, kosong, corrupt, tidak memiliki data yang dapat diekstrak, atau data penting tidak dapat diproses, JANGAN membuat Financial Audit Report; keluarkan dataLimitations yang menyatakan FILE/DATA PROCESSING ERROR dan jelaskan bagian yang gagal dibaca serta tindakan yang diperlukan. Jangan mengarang angka, transaksi, periode, mata uang, benchmark, budget, forecast, target, rasio, atau tren. Jika data tidak tersedia, tulis Tidak tersedia – indikator tidak dapat dihitung secara valid. Baca seluruh isi yang berhasil diekstrak dan analisis seluruh bagian yang relevan. Lakukan DATA EXTRACTION -> VALIDATION -> CALCULATION -> COMPARISON -> FINDING -> FINANCIAL IMPACT -> RISK -> ACTION. Periksa subtotal, total, duplikasi, missing data, inkonsistensi, perubahan ekstrem, dan angka negatif yang tidak wajar; tandai DATA INTEGRITY ISSUE. Hitung KPI hanya jika numerator dan denominator valid. Pisahkan FACT, CALCULATION, FINDING, INDICATION, dan ASSUMPTION. Score 0-100 harus dapat dijelaskan berdasarkan data yang tersedia; jika data tidak lengkap, turunkan dataCompletenessScore dan jelaskan keterbatasannya. Jangan membuat benchmark industri sendiri. Jangan menyatakan fraud/kecurangan sebagai fakta atau memberikan opini audit independen tanpa bukti memadai; gunakan 'indikasi yang perlu diperiksa lebih lanjut'. Gunakan prinsip evidence-based, materiality praktis, consistency, variance analysis, risk assessment, dan source traceability. Untuk temuan material, sebutkan sumber yang dapat ditelusuri dari file, minimal nama file, periode, sheet/bagian/akun bila tersedia. Prioritaskan MONEY LOST, MONEY AT RISK, MONEY THAT CAN BE SAVED, MONEY THAT CAN BE RECOVERED, dan MONEY THAT CAN BE GENERATED.";
    const prompt = "Lakukan FINANCIAL REPORT AUDIT terhadap file berikut. Nama file: " + (file?.name || submittedFileName) + "\n\n" + text + "\n\nWAJIB: validasi file dan data terlebih dahulu; identifikasi nama laporan, periode, mata uang, Actual, Budget, Forecast, Previous Period, MTD/YTD, room nights, revenue, expense, profit, cash flow, dan data yang hilang; analisis revenue, room revenue, occupancy, ADR, RevPAR, F&B, other operating revenue, departmental expenses, undistributed expenses, payroll, utilities, S&M, A&G, R&M, GOP, GOP margin, EBITDA/operating profit, net profit/loss, cash flow, budget vs actual, forecast vs actual, cost efficiency, internal control, revenue leakage, cost leakage, dan anomali; hitung KPI dan rasio hanya jika data valid; analisis hubungan KPI; cari red flags dan indikasi leakage tanpa menyatakan fraud sebagai fakta; gunakan DATA -> CALCULATION -> FINDING -> FINANCIAL IMPACT -> RISK -> ACTION dan source traceability untuk temuan material. Output wajib mencakup Overall Financial Health Score, Data Completeness Score, enam component scores, Executive Summary maksimal 10 poin, Financial Scorecard, Top 5 Financial Findings, Financial Red Flags, Potential Saving/Recovery, Management Action Plan, 30-Day Action Plan, 90-Day Action Plan, dan Management Conclusion. Karena schema menyimpan beberapa bagian sebagai string, tuliskan Financial Scorecard di comparativeAnalysis, KPI relationships di comparativeAnalysis, variance di varianceAnalysis, Top 5 di auditFindings, Red Flags di risks, Potential Saving/Recovery di recommendations, dan Management Action Plan + 30/90 day actions di actionPlan. Jangan memaksakan lima temuan; maksimal 5 yang didukung data. Jika data tidak cukup, tulis 'Tidak tersedia – indikator tidak dapat dihitung secara valid.' Jika target saving tidak tersedia, jangan mengarang target. Jangan membuat tren palsu bila hanya satu periode. Gunakan bahasa Indonesia profesional, ringkas, tajam, terukur. Nilai setiap skor harus konsisten: gunakan rubrik yang sama, jangan mengubah skor hanya karena pilihan kata atau gaya bahasa berbeda. FORMAT LAPORAN WAJIB mengikuti struktur final CoreStay: 1 Executive Financial Summary (Overall Financial Condition, Assessment Score, Financial Status); 2 Key Financial Indicators; 3 Revenue Performance (Assessment, Key Findings, Financial Impact); 4 Cost & Expense Analysis (Overall Assessment, Payroll & Manpower, Operational Expenses, Utility Cost); 5 Profitability Analysis (Gross Operating Profit, Margin Analysis, Main Profit Drivers); 6 Cash Flow & Liquidity (Assessment, Areas to Monitor, Management Concern); 7 Financial Risk Assessment (Risk Area, Level, Comment); 8 Key Findings (maksimal 5, format singkat bernomor); 9 Priority Recommendations (Priority 1 Cost Control, Priority 2 Revenue Quality, Priority 3 Financial Monitoring, masing-masing Expected Impact); 10 90-Day Action Plan (0–30, 31–60, 61–90); 11 Final Assessment; 12 Assessment Score. Jangan menulis laporan sebagai satu paragraf panjang. Setiap subbagian harus dipisahkan dengan blank line dan gunakan bullet/list untuk findings, risks, recommendations, serta action plan. Gunakan angka hanya dari file. extractedFigures WAJIB mengupayakan enam baris Financial Scorecard dengan label persis: Revenue, GOP, GOP Margin, Operating Cost, Net Profit, Cash Flow. Untuk setiap indikator, gunakan angka asli dari file jika tersedia, sertakan periodenya, dan jangan mengarang; bila tidak tersedia gunakan value 'Tidak tersedia – indikator tidak dapat dihitung secara valid.'. Cash Flow wajib dicari secara eksplisit dari laporan (cash flow statement, operating cash flow, net cash flow, atau istilah setara) dan tetap dimasukkan ke extractedFigures bila tersedia.";

    let result: Awaited<ReturnType<typeof generateObject<typeof FinancialAssessment>>> | null = null;
    let lastAiError: unknown = null;
    for (const modelId of models) {
      try {
        result = await generateObject({ model: google(modelId), schema: FinancialAssessment, system, prompt });
        break;
      } catch (error) {
        lastAiError = error;
        console.error("Financial assessment model failed:", modelId, error);
        if (!isRetryableAiError(error)) throw error;
      }
    }
    if (!result) return NextResponse.json({ error: "Layanan AI sedang penuh. CoreStay sudah mencoba beberapa model Gemini. Silakan ulangi beberapa saat lagi." }, { status: 503 });

    const pdfBase64 = await makePdf(action === "analyze" ? submittedFileName : (file as File).name, result.object);
    const { data: saved, error: saveError } = await supabase.from("assessment_reports").insert({
      user_id: user.id, assessment_type: "financial", file_name: action === "analyze" ? submittedFileName : (file as File).name,
      score: Math.round(result.object.financialHealthScore), report_json: result.object, pdf_base64: pdfBase64,
    }).select("id,created_at").single();

    if (saveError) return NextResponse.json({ error: "Hasil analisa berhasil dibuat tetapi gagal disimpan. Jalankan migration Supabase assessment_reports terlebih dahulu." }, { status: 500 });
    if (blobPath) {
      try { await del(blobPath, { token: process.env.BLOB_READ_WRITE_TOKEN }); } catch (cleanupError) { console.error("Financial source cleanup failed:", cleanupError); }
    }
    return NextResponse.json({ success: true, reportId: saved.id, createdAt: saved.created_at, fileName: file?.name || submittedFileName, result: result.object });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server gagal memproses PDF." }, { status: 500 });
  } finally {
    if (pdf) { try { pdf.cleanup(); } catch {} }
  }
}
