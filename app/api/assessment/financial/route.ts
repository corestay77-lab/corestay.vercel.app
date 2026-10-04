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
  const NAVY = rgb(0.09, 0.16, 0.30);
  const GOLD = rgb(0.61, 0.46, 0.22);
  const TEXT = rgb(0.20, 0.25, 0.34);
  const MUTED = rgb(0.40, 0.45, 0.52);
  const LIGHT = rgb(0.96, 0.97, 0.98);
  const CREAM = rgb(0.985, 0.975, 0.95);
  const BORDER = rgb(0.86, 0.88, 0.91);
  const WHITE = rgb(1, 1, 1);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 42;

  function ensure(height: number) {
    if (y - height < 42) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - 42;
    }
  }

  function wrap(text: string, size = 9.5, maxWidth = CONTENT_W, font = regular) {
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

  function textBlock(text: string, size = 9.5, color = TEXT, gap = 4) {
    const normalized = String(text || "").replace(/\\n/g, "\n").replace(/\\r\\n/g, "\n");
    const paragraphs = normalized.split("\n").map((x) => x.trim()).filter(Boolean);
    for (const paragraph of paragraphs) {
      const bullet = /^[-•*]\\s+/.test(paragraph) || /^\\d+[.)]\\s+/.test(paragraph);
      const clean = paragraph.replace(/^[-•*]\\s+/, "").replace(/^\\d+[.)]\\s+/, "");
      const lines = wrap(clean, size, bullet ? CONTENT_W - 16 : CONTENT_W, bullet ? regular : regular);
      ensure(lines.length * (size + 3) + gap);
      if (bullet) {
        page.drawText("•", { x: MARGIN, y, size: size + 1, font: bold, color: GOLD });
      }
      for (const line of lines) {
        page.drawText(line, { x: MARGIN + (bullet ? 14 : 0), y, size, font: regular, color });
        y -= size + 3;
      }
      y -= gap;
    }
  }

  function section(number: string, title: string, subtitle?: string) {
    ensure(58);
    page.drawText(number + " · " + (subtitle || "").toUpperCase(), { x: MARGIN, y, size: 7.5, font: bold, color: GOLD });
    y -= 15;
    page.drawText(title, { x: MARGIN, y, size: 16, font: bold, color: NAVY });
    y -= 10;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.7, color: BORDER });
    y -= 16;
  }

  function card(title: string, value: string, status?: string) {
    const h = 66;
    ensure(h + 8);
    page.drawRectangle({ x: MARGIN, y: y - h, width: CONTENT_W, height: h, color: WHITE, borderColor: BORDER, borderWidth: 0.7 });
    page.drawText(title.toUpperCase(), { x: MARGIN + 12, y: y - 17, size: 7, font: bold, color: MUTED });
    for (const line of wrap(value, 11, CONTENT_W - 24, bold).slice(0, 2)) {
      page.drawText(line, { x: MARGIN + 12, y: y - 34, size: 11, font: bold, color: NAVY });
      break;
    }
    if (status) page.drawText(status, { x: MARGIN + 12, y: y - 52, size: 7.5, font: bold, color: GOLD });
    y -= h + 8;
  }

  function twoColumnCards(items: Array<[string, string, string?]>) {
    const gap = 10;
    const w = (CONTENT_W - gap) / 2;
    const h = 70;
    ensure(h + 10);
    for (let i = 0; i < items.length; i += 2) {
      const row = items.slice(i, i + 2);
      for (let col = 0; col < row.length; col++) {
        const [title, value, status] = row[col];
        const x = MARGIN + col * (w + gap);
        page.drawRectangle({ x, y: y - h, width: w, height: h, color: WHITE, borderColor: BORDER, borderWidth: 0.7 });
        page.drawText(title.toUpperCase(), { x: x + 10, y: y - 16, size: 6.8, font: bold, color: MUTED });
        const valueLines = wrap(value, 9.5, w - 20, bold).slice(0, 2);
        valueLines.forEach((line, n) => page.drawText(line, { x: x + 10, y: y - 32 - n * 11, size: 9.5, font: bold, color: NAVY }));
        if (status) page.drawText(status, { x: x + 10, y: y - 56, size: 7, font: bold, color: GOLD });
      }
      y -= h + 8;
    }
  }

  function listBlock(items: string[], numbered = false) {
    items.forEach((item, i) => textBlock((numbered ? String(i + 1).padStart(2, "0") + " — " : "- ") + item, 9.2, TEXT, 3));
  }

  // Cover/header — intentionally mirrors the light CoreStay preview.
  page.drawText("CORESTAY ADVISORY", { x: MARGIN, y, size: 9, font: bold, color: GOLD });
  y -= 20;
  page.drawText("FINANCIAL REPORT ASSESSMENT", { x: MARGIN, y, size: 20, font: bold, color: NAVY });
  y -= 17;
  page.drawText("Hospitality Financial Performance Review", { x: MARGIN, y, size: 10.5, font: regular, color: MUTED });
  y -= 20;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: BORDER });
  y -= 18;
  textBlock("Source: " + fileName, 8.5, MUTED, 2);
  card("Assessment Score", result.financialHealthScore + " / 100", "STATUS: " + (result.financialHealthScore >= 80 ? "GOOD" : result.financialHealthScore >= 60 ? "NEEDS IMPROVEMENT" : "NEEDS ATTENTION"));

  section("01", "Executive Financial Summary", "Overall Financial Condition");
  card("Financial Condition", result.financialHealthScore >= 80 ? "Good" : result.financialHealthScore >= 60 ? "Needs Improvement" : "Needs Attention");
  textBlock(result.executiveSummary);

  section("02", "Key Financial Indicators", "Management Snapshot");
  const figure = (labels: string[]) => getFigureForPdf(result.extractedFigures, labels);
  twoColumnCards([
    ["Revenue", figure(["Revenue"]).value, scoreLabel(result.revenueHealthScore)],
    ["GOP", figure(["GOP", "Gross Operating Profit"]).value, scoreLabel(result.profitabilityHealthScore)],
    ["GOP Margin", figure(["GOP Margin", "GOP %", "GOP Margin %"]).value, scoreLabel(result.profitabilityHealthScore)],
    ["Operating Cost", figure(["Operating Cost", "Operating Costs", "Total Operating Cost"]).value, scoreLabel(result.costControlScore)],
    ["Net Profit", figure(["Net Profit", "Net Profit/Loss", "Net Income"]).value, scoreLabel(result.profitabilityHealthScore)],
    ["Cash Flow", figure(["Cash Flow", "Operating Cash Flow", "Net Cash Flow"]).value, scoreLabel(result.cashFlowScore)],
  ]);

  section("03", "Revenue Performance", "Assessment");
  textBlock(result.revenueAnalysis);
  section("04", "Cost & Expense Analysis", "Overall Assessment: Attention Required");
  textBlock(result.costAnalysis);
  section("05", "Profitability Analysis", "Profit Performance");
  textBlock(result.profitAnalysis);
  textBlock("GOP Margin: " + figure(["GOP Margin", "GOP %", "GOP Margin %"]).value, 10, NAVY, 3);
  textBlock(result.ratioAnalysis);

  section("06", "Cash Flow & Liquidity", "Assessment");
  textBlock(result.varianceAnalysis);
  textBlock("Areas to Monitor", 10, NAVY, 3);
  listBlock(["Operating cash flow", "Account receivable", "Account payable", "Cash reserve", "Debt/payment obligations"]);

  section("07", "Financial Risk Assessment", "Risk Level");
  const risks: Array<[string, number, string]> = [
    ["Cost Control", result.costControlScore, "Expense growth needs monitoring"],
    ["Cash Flow", result.cashFlowScore, "Requires closer monitoring"],
    ["Revenue Dependency", result.revenueHealthScore, "Revenue mix can be improved"],
    ["Payroll", result.costControlScore, "Productivity should be reviewed"],
    ["Profit Margin", result.profitabilityHealthScore, "Margin improvement opportunity"],
  ];
  risks.forEach(([area, score, comment]) => {
    const h = 38; ensure(h + 4);
    page.drawRectangle({ x: MARGIN, y: y - h, width: CONTENT_W, height: h, color: LIGHT, borderColor: BORDER, borderWidth: 0.5 });
    page.drawText(area, { x: MARGIN + 9, y: y - 15, size: 8.5, font: bold, color: NAVY });
    page.drawText(scoreLabel(score), { x: MARGIN + 150, y: y - 15, size: 7.5, font: bold, color: GOLD });
    page.drawText(comment, { x: MARGIN + 235, y: y - 15, size: 7.5, font: regular, color: TEXT });
    y -= h + 4;
  });
  textBlock("Supporting Risk Findings", 10, NAVY, 3);
  listBlock(result.risks, true);

  section("08", "Key Findings", "Management Findings");
  listBlock(result.auditFindings, true);

  section("09", "Priority Recommendations", "Management Priorities");
  const priorityTitles = ["Priority 1 — Strengthen Cost Control", "Priority 2 — Improve Revenue Quality", "Priority 3 — Improve Financial Monitoring"];
  result.recommendations.slice(0, 3).forEach((item, i) => {
    textBlock(priorityTitles[i], 10, NAVY, 2);
    textBlock(item);
    textBlock("Expected Impact: " + (i === 0 ? "Improve operating margin and reduce unnecessary expenses." : i === 1 ? "Increase revenue without relying solely on occupancy growth." : "Identify financial deviations earlier and take corrective action."), 8.5, GOLD, 5);
  });

  section("10", "90-Day Action Plan", "Execution Roadmap");
  textBlock("0–30 Days", 10, NAVY, 2);
  listBlock(result.actionPlan.filter((_, i) => i % 3 === 0).slice(0, 4));
  textBlock("31–60 Days", 10, NAVY, 5);
  listBlock(result.actionPlan.filter((_, i) => i % 3 === 1).slice(0, 4));
  textBlock("61–90 Days", 10, NAVY, 5);
  listBlock(result.actionPlan.filter((_, i) => i % 3 === 2).slice(0, 4));

  section("11", "Final Assessment", "Overall Assessment");
  page.drawRectangle({ x: MARGIN, y: y - 86, width: CONTENT_W, height: 86, color: CREAM, borderColor: rgb(0.85, 0.77, 0.62), borderWidth: 0.7 });
  page.drawText(result.financialHealthScore >= 80 ? "Good" : result.financialHealthScore >= 60 ? "Needs Improvement" : "Needs Attention", { x: MARGIN + 14, y: y - 20, size: 11, font: bold, color: NAVY });
  y -= 34;
  textBlock(result.conclusion, 9.2, TEXT, 3);
  textBlock("Management should prioritize cost control, revenue optimization, and disciplined financial monitoring over the next 90 days.", 9.2, NAVY, 8);

  section("12", "Assessment Score", "Financial Health Score");
  ensure(120);
  page.drawRectangle({ x: MARGIN, y: y - 105, width: CONTENT_W, height: 105, color: NAVY });
  page.drawText("FINANCIAL HEALTH SCORE", { x: MARGIN + 18, y: y - 23, size: 8, font: bold, color: rgb(0.85, 0.73, 0.52) });
  page.drawText(result.financialHealthScore + " / 100", { x: MARGIN + 18, y: y - 59, size: 28, font: bold, color: WHITE });
  page.drawText("STATUS: " + (result.financialHealthScore >= 80 ? "GOOD" : result.financialHealthScore >= 60 ? "NEEDS IMPROVEMENT" : "NEEDS ATTENTION"), { x: MARGIN + 18, y: y - 82, size: 8, font: bold, color: rgb(0.85, 0.73, 0.52) });
  y -= 120;
  textBlock("Generated by CoreStay Financial Assessment Engine", 7.5, MUTED, 0);

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

function isRetryableAiError(error: unknown) {
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
    const prompt = "Lakukan FINANCIAL REPORT AUDIT terhadap file berikut. Nama file: " + (file?.name || submittedFileName) + "\n\n" + text + "\n\nWAJIB: validasi file dan data terlebih dahulu; identifikasi nama laporan, periode, mata uang, Actual, Budget, Forecast, Previous Period, MTD/YTD, room nights, revenue, expense, profit, cash flow, dan data yang hilang; analisis revenue, room revenue, occupancy, ADR, RevPAR, F&B, other operating revenue, departmental expenses, undistributed expenses, payroll, utilities, S&M, A&G, R&M, GOP, GOP margin, EBITDA/operating profit, net profit/loss, cash flow, budget vs actual, forecast vs actual, cost efficiency, internal control, revenue leakage, cost leakage, dan anomali; hitung KPI dan rasio hanya jika data valid; analisis hubungan KPI; cari red flags dan indikasi leakage tanpa menyatakan fraud sebagai fakta; gunakan DATA -> CALCULATION -> FINDING -> FINANCIAL IMPACT -> RISK -> ACTION dan source traceability untuk temuan material. Output wajib mencakup Overall Financial Health Score, Data Completeness Score, enam component scores, Executive Summary maksimal 10 poin, Financial Scorecard, Top 5 Financial Findings, Financial Red Flags, Potential Saving/Recovery, Management Action Plan, 30-Day Action Plan, 90-Day Action Plan, dan Management Conclusion. Karena schema menyimpan beberapa bagian sebagai string, tuliskan Financial Scorecard di comparativeAnalysis, KPI relationships di comparativeAnalysis, variance di varianceAnalysis, Top 5 di auditFindings, Red Flags di risks, Potential Saving/Recovery di recommendations, dan Management Action Plan + 30/90 day actions di actionPlan. Jangan memaksakan lima temuan; maksimal 5 yang didukung data. Jika data tidak cukup, tulis 'Tidak tersedia – indikator tidak dapat dihitung secara valid.' Jika target saving tidak tersedia, jangan mengarang target. Jangan membuat tren palsu bila hanya satu periode. Gunakan bahasa Indonesia profesional, ringkas, tajam, terukur. FORMAT LAPORAN WAJIB mengikuti struktur final CoreStay: 1 Executive Financial Summary (Overall Financial Condition, Assessment Score, Financial Status); 2 Key Financial Indicators; 3 Revenue Performance (Assessment, Key Findings, Financial Impact); 4 Cost & Expense Analysis (Overall Assessment, Payroll & Manpower, Operational Expenses, Utility Cost); 5 Profitability Analysis (Gross Operating Profit, Margin Analysis, Main Profit Drivers); 6 Cash Flow & Liquidity (Assessment, Areas to Monitor, Management Concern); 7 Financial Risk Assessment (Risk Area, Level, Comment); 8 Key Findings (maksimal 5, format singkat bernomor); 9 Priority Recommendations (Priority 1 Cost Control, Priority 2 Revenue Quality, Priority 3 Financial Monitoring, masing-masing Expected Impact); 10 90-Day Action Plan (0–30, 31–60, 61–90); 11 Final Assessment; 12 Assessment Score. Jangan menulis laporan sebagai satu paragraf panjang. Setiap subbagian harus dipisahkan dengan blank line dan gunakan bullet/list untuk findings, risks, recommendations, serta action plan. Gunakan angka hanya dari file. extractedFigures WAJIB mengupayakan enam baris Financial Scorecard dengan label persis: Revenue, GOP, GOP Margin, Operating Cost, Net Profit, Cash Flow. Untuk setiap indikator, gunakan angka asli dari file jika tersedia, sertakan periodenya, dan jangan mengarang; bila tidak tersedia gunakan value 'Tidak tersedia – indikator tidak dapat dihitung secara valid.'. Cash Flow wajib dicari secara eksplisit dari laporan (cash flow statement, operating cash flow, net cash flow, atau istilah setara) dan tetap dimasukkan ke extractedFigures bila tersedia.";

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
