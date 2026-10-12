"use client";

import { useRef, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { computeFinancialRatios } from "@/lib/financial-ratios";

type AssessmentResult = {
  financialHealthScore: number;
  dataCompletenessScore: number;
  revenueHealthScore: number;
  profitabilityHealthScore: number;
  costControlScore: number;
  cashFlowScore: number;
  internalControlScore: number;
  revenueIntegrityScore: number;
  executiveSummary: string;
  revenueAnalysis: string;
  costAnalysis: string;
  profitAnalysis: string;
  comparativeAnalysis: string;
  ratioAnalysis: string;
  varianceAnalysis: string;
  auditFindings: string[];
  risks: string[];
  recommendations: string[];
  actionPlan: string[];
  dataLimitations: string[];
  conclusion: string;
  extractedFigures: { label: string; value: string; period: string }[];
};

export default function FinancialAssessmentPage() {
  const inputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [reportId, setReportId] = useState("");
  const [pdfBase64, setPdfBase64] = useState("");

  async function handleFile(selected?: File) {
    if (!selected) return;
    setError("");
    setResult(null);
    setReportId("");
    setPdfBase64("");

    const selectedName = selected.name.toLowerCase();
    const isPdf = selected.type === "application/pdf" || selectedName.endsWith(".pdf");
    const isExcel = selectedName.endsWith(".xlsx") || selectedName.endsWith(".xls") ||
      selected.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      selected.type === "application/vnd.ms-excel";
    if (!isPdf && !isExcel) {
      setError("Silakan upload laporan dalam format PDF atau Excel (.xlsx, .xls).");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    setFile(selected);
    setFileName(selected.name);
    setLoading(true);

    try {
      if (selected.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran file maksimal 5 MB.");
      }

      const uploadForm = new FormData();
      uploadForm.append("file", selected);

      const uploadResponse = await fetch("/api/assessment/financial/upload", {
        method: "POST",
        ...(session ? { headers: { Authorization: `Bearer ${session.access_token}` } } : {}),
        body: uploadForm,
      });

      const uploadRaw = await uploadResponse.text();
      let uploadData: { pathname?: string; error?: string } = {};
      try { uploadData = uploadRaw ? JSON.parse(uploadRaw) : {}; }
      catch { throw new Error(`Server upload mengembalikan respons tidak valid (HTTP ${uploadResponse.status}).`); }

      if (!uploadResponse.ok || !uploadData.pathname) {
        throw new Error(uploadData.error || `Upload gagal (HTTP ${uploadResponse.status}).`);
      }

      setLoading(false);
      setAnalyzing(true);

      const formData = new FormData();
      formData.append("action", "analyze");
      formData.append("blobPath", uploadData.pathname);
      formData.append("fileName", selected.name);

      const response = await fetch("/api/assessment/financial", {
        method: "POST",
        ...(session ? { headers: { Authorization: `Bearer ${session.access_token}` } } : {}),
        body: formData,
      });

      const raw = await response.text();
      let data: { result?: AssessmentResult; reportId?: string; pdfBase64?: string; error?: string } = {};
      try { data = raw ? JSON.parse(raw) : {}; }
      catch { throw new Error(`Server mengembalikan respons tidak valid (HTTP ${response.status}).`); }

      if (!response.ok) throw new Error(data.error || `Analisa gagal (HTTP ${response.status}).`);
      if (!data.result) throw new Error("Hasil analisa tidak tersedia.");

      setResult(data.result);
      setReportId(data.reportId || "");
      setPdfBase64(data.pdfBase64 || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF gagal diproses.");
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  }

  async function deleteAssessment() {
    const confirmed = window.confirm(
      reportId
        ? "Hapus hasil assessment ini? Data hasil assessment dan PDF tersimpan akan dihapus permanen."
        : "Hapus hasil assessment yang sedang tampil?"
    );
    if (!confirmed) return;

    // Anonymous results are only held in the current page and are not stored
    // in Hasil Assessment. Clearing them requires no login.
    if (!reportId) {
      setResult(null);
      setPdfBase64("");
      setFile(null);
      setFileName("");
      setError("");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Silakan login untuk menghapus laporan yang tersimpan.");
      return;
    }

    try {
      const response = await fetch(`/api/assessment/financial/report/${reportId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Cache-Control": "no-store",
        },
        cache: "no-store",
      });

      const raw = await response.text();
      let data: { success?: boolean; error?: string; message?: string } = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch {}

      if (!response.ok || data.success !== true) {
        throw new Error(data.error || data.message || `Penghapusan gagal (HTTP ${response.status}).`);
      }

      // Clear the rendered report only after the server confirms the database
      // row was actually deleted.
      setResult(null);
      setReportId("");
      setFile(null);
      setFileName("");
      setText("");
      setError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data assessment tidak dapat dihapus.");
    }
  }

  async function downloadPdf() {
    // Prefer the PDF generated alongside the currently displayed report.
    // This ensures the latest embedded charts are included even when the report
    // has also been saved to the user's account.
    if (pdfBase64) {
      const binary = atob(pdfBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "CoreStay-Financial-Assessment.pdf";
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Fallback for reports opened without a fresh PDF payload.
    if (!reportId) {
      setError("PDF tidak tersedia. Jalankan ulang assessment untuk membuat PDF terbaru.");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError("Silakan login untuk membuka laporan yang tersimpan.");
      return;
    }

    const response = await fetch(`/api/assessment/financial/report/${reportId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      setError("PDF tidak dapat diunduh.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "CoreStay-Financial-Assessment.pdf";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#e0f2fe] text-[#17243d] lg:pl-[250px]">
<div className="w-full max-w-7xl px-6 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mb-4 flex w-full items-center justify-center bg-transparent px-0 pt-2"><img src="/logo-corestay.png" alt="Brand logo" width="280" height="112" className="block h-[88px] w-[280px] max-w-full bg-transparent object-contain object-center" /></div>
        <h1 className="mt-3 ml-0 w-full pl-0 text-left text-3xl font-bold tracking-tight sm:text-5xl">Financial Check</h1>
        <p className="mt-4 ml-0 max-w-3xl pl-0 text-left text-base leading-7 text-slate-500">
          <b>Upload laporan keuangan → Analisis → Hasil Assessment.</b> Dapatkan gambaran kondisi keuangan hotel, kinerja pendapatan dan biaya, profitabilitas, risiko keuangan, serta area yang perlu diperbaiki.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          <b>Hasil Assessment:</b> ringkasan kondisi keuangan, indikator utama, temuan penting, risiko, rekomendasi prioritas, dan rencana tindakan 90 hari.
        </p>

        <section className="relative mt-5 overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-violet-50 px-5 py-5 shadow-sm sm:px-6">
          <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-sky-500 via-indigo-500 to-violet-500" />
          <div className="flex items-start gap-4 pl-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-2xl shadow-md shadow-indigo-200" aria-hidden="true">🔐</div>
            <div>
              <p className="text-base font-bold text-[#172a4d]">Kerahasiaan Data, Prioritas Kami</p>
              <p className="mt-1.5 text-sm leading-6 text-slate-600">
                Gunakan Financial Check tanpa perlu login. Dokumen Anda dipakai untuk menyusun analisis kondisi keuangan hotel, lalu file sumber dihapus setelah proses pemrosesan selesai. Untuk menjaga pengelolaan informasi tetap bijak, unggah hanya dokumen yang relevan dengan evaluasi.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">✓ Tanpa login</span>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">✓ File sumber dihapus setelah diproses</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading || analyzing}
            className="w-full rounded-3xl border-2 border-dashed border-[#203b68]/25 bg-[#203b68]/[0.03] p-8 text-center transition hover:border-[#203b68]/50 disabled:opacity-60 sm:p-12"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#203b68] text-2xl text-white">
              {loading || analyzing ? "…" : "↑"}
            </div>
            <h2 className="mt-5 text-xl font-bold">{loading ? "Mengupload laporan…" : analyzing ? "Menganalisis laporan…" : "Upload Laporan Keuangan PDF / Excel"}</h2>
            <p className="mt-2 text-sm text-slate-500">PDF, Excel (.xlsx, .xls) • Maksimal 5 MB • Upload langsung ke secure storage</p>
            {fileName && <p className="mx-auto mt-5 max-w-full truncate rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ {fileName}</p>}
          </button>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </section>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {result && (
          <section className="mt-8 space-y-6">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={deleteAssessment}
                className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
              >
                🗑 Hapus Data
              </button>
            </div>
            <ReportHeader result={result} />
            <FinancialOverview result={result} />

            <ReportCard eyebrow="01" title="Executive Financial Summary" subtitle="Overall Financial Condition">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-bold uppercase tracking-wider text-[#9b7439]">Financial Condition</p>
                <p className="mt-3 text-lg font-semibold text-[#172a4d]">{financialStatus(result.financialHealthScore)}</p>
                <ReportText text={result.executiveSummary} />
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <MetricBox label="Assessment Score" value={`${result.financialHealthScore} / 100`} />
                <MetricBox label="Financial Status" value={financialStatus(result.financialHealthScore)} />
              </div>
            </ReportCard>

            <ReportCard eyebrow="02" title="Key Financial Indicators" subtitle="Management Snapshot">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Revenue", ["Revenue"], result.revenueHealthScore],
                  ["GOP", ["GOP", "Gross Operating Profit"], result.profitabilityHealthScore],
                  ["GOP Margin", ["GOP Margin", "GOP %", "GOP Margin %"], result.profitabilityHealthScore],
                  ["Operating Cost", ["Operating Cost", "Operating Costs", "Total Operating Cost"], result.costControlScore],
                  ["Net Profit", ["Net Profit", "Net Profit/Loss", "Net Income"], result.profitabilityHealthScore],
                  ["Cash Flow", ["Cash Flow", "Operating Cash Flow", "Net Cash Flow"], result.cashFlowScore],
                ].map(([label, labels, score], index) => {
                  const figure = getFigure(result.extractedFigures, labels as string[]);
                  const status = scoreStatus(Number(score));
                  return <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="mt-3 break-words text-xl font-bold text-[#172a4d]">{figure.value}</p>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>{status.icon} {status.label}</span>
                      <span className="text-xs text-slate-400">{figure.period}</span>
                    </div>
                  </div>;
                })}
              </div>
            </ReportCard>

            <ReportCard eyebrow="03" title="Revenue Performance" subtitle="Assessment">
              <ReportText text={result.revenueAnalysis} />
            </ReportCard>

            <ReportCard eyebrow="04" title="Cost & Expense Analysis" subtitle="Overall Assessment: Attention Required">
              <ReportText text={result.costAnalysis} />
            </ReportCard>

            <ReportCard eyebrow="05" title="Profitability Analysis" subtitle="Profit Performance">
              <ReportText text={result.profitAnalysis} />
              <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#9b7439]">Margin Analysis</p>
                {hasUsableFinancialValue(getFigure(result.extractedFigures, ["GOP Margin", "GOP %", "GOP Margin %"]).value) && <p className="mt-2 text-2xl font-bold text-[#172a4d]">{getFigure(result.extractedFigures, ["GOP Margin", "GOP %", "GOP Margin %"]).value}</p>}
                <ReportText text={result.ratioAnalysis} />
              </div>
            </ReportCard>

            <ReportCard eyebrow="06" title="Cash Flow & Liquidity" subtitle={`Assessment: ${scoreStatus(result.cashFlowScore).icon} ${scoreStatus(result.cashFlowScore).label}`}>
              <ReportText text={result.varianceAnalysis} />
              <div className="mt-5 rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-[#9b7439]">Areas to Monitor</p>
                <BulletList items={["Operating cash flow", "Account receivable", "Account payable", "Cash reserve", "Debt/payment obligations"]} />
              </div>
            </ReportCard>

            <ReportCard eyebrow="07" title="Financial Risk Assessment" subtitle="Risk Level">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Risk Area</th><th className="px-4 py-3">Level</th><th className="px-4 py-3">Comment</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ["Cost Control", result.costControlScore, "Expense growth needs monitoring"],
                      ["Cash Flow", result.cashFlowScore, "Requires closer monitoring"],
                      ["Revenue Dependency", result.revenueHealthScore, "Revenue mix can be improved"],
                      ["Payroll", result.costControlScore, "Productivity should be reviewed"],
                      ["Profit Margin", result.profitabilityHealthScore, "Margin improvement opportunity"],
                    ].map(([area, score, comment], index) => {
                      const s = scoreStatus(Number(score));
                      return <tr key={index}><td className="px-4 py-4 font-semibold text-slate-800">{area}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${s.className}`}>{s.icon} {s.label}</span></td><td className="px-4 py-4 text-slate-600">{comment}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <ResultList title="Supporting Risk Findings" items={result.risks} danger compact />
            </ReportCard>

            <ReportCard eyebrow="08" title="Key Findings" subtitle="Management Findings">
              <ResultList title="" items={result.auditFindings} compact />
            </ReportCard>

            <ReportCard eyebrow="09" title="Priority Recommendations" subtitle="Management Priorities">
              <PriorityList items={result.recommendations} />
            </ReportCard>

            <ReportCard eyebrow="10" title="90-Day Action Plan" subtitle="Execution Roadmap">
              <ActionPlan items={result.actionPlan} />
            </ReportCard>

            <ReportCard eyebrow="11" title="Final Assessment" subtitle="Overall Assessment">
              <div className="rounded-2xl border border-[#d8b985]/40 bg-[#fbf8f2] p-6">
                <p className="text-lg font-semibold leading-8 text-[#172a4d]">{financialStatus(result.financialHealthScore)}</p>
                <ReportText text={result.conclusion} />
                <p className="mt-5 text-sm font-semibold text-[#172a4d]">Management should prioritize <span className="text-[#9b7439]">cost control, revenue optimization, and disciplined financial monitoring</span> over the next 90 days.</p>
              </div>
            </ReportCard>

            <div className="rounded-3xl bg-[#172a4d] p-7 text-center text-white shadow-lg sm:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d8b985]">12. Assessment Score</p>
              <p className="mt-4 text-sm uppercase tracking-widest text-white/60">Financial Health Score</p>
              <p className="mt-2 text-6xl font-bold sm:text-7xl">{result.financialHealthScore}<span className="text-2xl text-white/40"> / 100</span></p>
              <p className="mt-4 text-sm font-bold uppercase tracking-[0.18em] text-[#d8b985]">Status: {financialStatus(result.financialHealthScore)}</p>
              <button type="button" onClick={downloadPdf} className="mt-7 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[#172a4d]">Download Financial Assessment PDF</button>
            </div>

            <ReportCard eyebrow="13" title="Detailed Financial Ratios" subtitle="Hotel Performance & Financial Health">
              <p className="mb-5 text-sm leading-6 text-slate-600">Rasio dihitung otomatis dari angka yang berhasil diekstrak dari dokumen. Jika data pembilang atau penyebut tidak tersedia, nilainya ditandai agar tidak ada angka yang diasumsikan.</p>
              <div className="space-y-6">
                {computeFinancialRatios(result.extractedFigures).map((group) => {
                  const availableRows = group.rows.filter((row) => hasUsableFinancialValue(row.value));
                  if (!availableRows.length) return null;
                  return <div key={group.title}>
                    <h3 className="mb-3 text-sm font-extrabold tracking-wide text-[#172a4d]">{group.title}</h3>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full min-w-[680px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Indikator</th><th className="px-4 py-3">Hasil</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {availableRows.map((row) => <tr key={row.name}>
                            <td className="px-4 py-3 font-semibold text-slate-800">{row.name}</td>
                            <td className="px-4 py-3 font-bold text-[#172a4d]">{row.value}</td>
                          </tr>)}
                        </tbody>
                      </table>
                    </div>
                  </div>;
                })}
              </div>
            </ReportCard>

            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 shadow-sm" role="status" aria-label="Automated validation passed">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xl font-bold text-white" aria-hidden="true">✓</div>
                <div>
                  <p className="text-sm font-extrabold uppercase tracking-wide text-emerald-900">Lolos Validasi Otomatis CoreStay</p>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">Laporan ini telah melewati pemeriksaan server sebelum diterbitkan: struktur dan bagian wajib, rentang skor, serta nilai indikator yang tidak valid.</p>
                  <p className="mt-2 text-xs leading-5 text-emerald-800/80">Catatan: status ini mengonfirmasi pemeriksaan otomatis tersebut, bukan sertifikasi kebenaran seluruh angka sumber atau pengganti audit keuangan independen.</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
      <footer className="mt-12 border-t border-[#d8b985]/30 bg-[#10284b]">
        <div className="mx-0 flex w-full max-w-none flex-col items-center justify-center gap-3 px-3 py-6 text-center sm:px-5 lg:px-6">
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <img src="/logo-corestay.png" alt="CoreStay Advisory" width="132" height="50" className="h-8 w-[132px] object-contain object-center" />
            
          </div>
          <p className="text-xs text-white/70">© {new Date().getFullYear()} CoreStay Advisory. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-3 break-words text-xl font-bold text-[#172a4d]">{value}</p>
    </div>
  );
}

function financialStatus(score: number) {
  if (score >= 80) return "Good";
  if (score >= 60) return "Needs Improvement";
  return "Needs Attention";
}

function getFigure(figures: AssessmentResult["extractedFigures"], labels: string[]) {
  const found = figures.find((item) => labels.some((label) => item.label.toLowerCase().trim() === label.toLowerCase().trim()));
  return found || { label: labels[0], value: "Tidak tersedia – indikator tidak dapat dihitung secara valid.", period: "—" };
}

function hasUsableFinancialValue(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  return !/^(?:-|—|–|n\/?a|na|not available|undefined|null|nan|tidak tersedia|tidak dapat dihitung(?: secara valid)?)(?:\b|\s|[-–—])/i.test(text);
}

function scoreStatus(score: number) {
  if (score >= 80) return { icon: "🟢", label: "Good", className: "text-emerald-700 bg-emerald-50" };
  if (score >= 60) return { icon: "🟡", label: "Moderate", className: "text-amber-700 bg-amber-50" };
  return { icon: "🔴", label: "High", className: "text-red-700 bg-red-50" };
}

function FinancialOverview({ result }: { result: AssessmentResult }) {
  const score = Math.max(0, Math.min(100, Number(result.financialHealthScore) || 0));
  const revenue = Math.max(0, Math.min(100, Number(result.revenueHealthScore) || 0));
  const profitability = Math.max(0, Math.min(100, Number(result.profitabilityHealthScore) || 0));
  const costs = Math.max(0, Math.min(100, Number(result.costControlScore) || 0));
  const cash = Math.max(0, Math.min(100, Number(result.cashFlowScore) || 0));
  const controls = Math.max(0, Math.min(100, Number(result.internalControlScore) || 0));
  const data = Math.max(0, Math.min(100, Number(result.dataCompletenessScore) || 0));
  const indicators = [
    { label: "Pendapatan", score: revenue, color: "#2583d8" },
    { label: "Profitabilitas", score: profitability, color: "#169b62" },
    { label: "Pengendalian Biaya", score: costs, color: "#e5a326" },
    { label: "Arus Kas", score: cash, color: "#16a6b3" },
    { label: "Kelengkapan Data", score: data, color: "#8b5bd6" },
    { label: "Kontrol Internal", score: controls, color: "#64748b" },
  ];
  const figures = [
    { label: "Pendapatan", labels: ["Revenue", "Total Revenue"], score: revenue, color: "#2583d8" },
    { label: "Biaya Operasional", labels: ["Operating Cost", "Operating Costs", "Total Operating Cost"], score: costs, color: "#e5a326" },
    { label: "Profitabilitas", labels: ["GOP Margin", "GOP %", "GOP Margin %", "GOP", "Gross Operating Profit"], score: profitability, color: "#169b62" },
  ];
  const status = score >= 80 ? "BAIK" : score >= 60 ? "PERLU PERBAIKAN" : "PERLU PERHATIAN";
  const risk = score >= 80 ? "Rendah" : score >= 60 ? "Sedang" : "Tinggi";
  const priorities = (result.recommendations || []).slice(0, 3);
  const actions = (result.actionPlan || []).slice(0, 3);
  const donutStops = indicators.reduce<{ stops: string[]; cursor: number }>((acc, item) => {
    const portion = 100 / indicators.length;
    acc.stops.push(`${item.color} ${acc.cursor}% ${acc.cursor + portion}%`);
    acc.cursor += portion;
    return acc;
  }, { stops: [], cursor: 0 }).stops.join(", ");

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-[#f5f8fc] shadow-sm">
      <div className="border-b border-slate-200 bg-white px-5 py-6 sm:px-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#203b68]">Financial Assessment Dashboard</p>
        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-extrabold text-[#172a4d] sm:text-3xl">Hasil Assessment Keuangan Hotel</h2>
            <p className="mt-2 text-sm text-slate-500">Ringkasan kondisi keuangan dan rekomendasi berdasarkan data laporan yang berhasil dianalisis.</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <p className="font-bold text-[#172a4d]">CoreStay Financial Check</p>
            <p className="mt-1 text-slate-500">Status: {status}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
        {figures.map((item) => {
          const figure = getFigure(result.extractedFigures, item.labels);
          const s = scoreStatus(item.score);
          return <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white" style={{ backgroundColor: item.color }} aria-hidden="true">{item.label === "Pendapatan" ? "↗" : item.label === "Biaya Operasional" ? "▤" : "◩"}</span>
              <p className="text-sm font-bold text-[#172a4d]">{item.label}</p>
            </div>
            <p className="mt-4 break-words text-2xl font-extrabold text-[#172a4d]">{figure.value}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.className}`}>{s.label}</span>
              <span className="text-xs text-slate-500">Skor {item.score}/100</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">{figure.period || "Periode tidak tersedia"}</p>
          </div>;
        })}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-lg text-white" aria-hidden="true">!</span>
            <p className="text-sm font-bold text-[#172a4d]">Risiko Keuangan</p>
          </div>
          <p className="mt-4 text-2xl font-extrabold text-[#172a4d]">{risk}</p>
          <p className="mt-2 text-sm text-slate-500">{score < 60 ? "Perlu perhatian dan tindak lanjut prioritas." : score < 80 ? "Pantau indikator yang belum kuat." : "Pertahankan kontrol dan evaluasi berkala."}</p>
        </div>
      </div>

      <div className="grid gap-5 px-4 pb-5 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-extrabold text-[#172a4d]">Profil Skor Keuangan</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Perbandingan indikator hasil assessment. Ini adalah skor kondisi, bukan tren bulanan.</p>
          <div className="mt-6 space-y-5">
            {indicators.map((item) => <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-600">{item.label}</span>
                <span className="text-sm font-extrabold tabular-nums text-[#172a4d]">{item.score}/100</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full transition-all" style={{ width: `${item.score}%`, backgroundColor: item.color }} />
              </div>
            </div>)}
          </div>
          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">Skor bersumber dari hasil analisis dokumen yang diunggah. Nilai pendapatan dan biaya tidak dibuat dari asumsi apabila angka tidak ditemukan pada dokumen.</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-extrabold text-[#172a4d]">Komposisi Indikator</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">Visual enam dimensi yang dinilai dalam assessment.</p>
          <div className="mt-6 flex flex-col items-center gap-6">
            <div className="relative flex h-52 w-52 items-center justify-center rounded-full" style={{ background: `conic-gradient(${donutStops})` }}>
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border border-slate-100 bg-white text-center shadow-inner">
                <span className="text-3xl font-extrabold text-[#172a4d]">{score}</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Health Score</span>
              </div>
            </div>
            <div className="w-full space-y-3">
              {indicators.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-slate-600"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>
                <span className="font-bold tabular-nums text-[#172a4d]">{item.score}</span>
              </div>)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 px-4 pb-6 sm:px-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-extrabold text-[#172a4d]">Prioritas Perbaikan</h3>
          <div className="mt-4 space-y-3">
            {(priorities.length ? priorities : result.risks || []).slice(0, 3).map((item, index) => <div key={index} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white ${index === 0 ? "bg-amber-500" : index === 1 ? "bg-yellow-600" : "bg-emerald-600"}`}>{index + 1}</span>
              <p className="pt-1 text-sm leading-6 text-slate-600">{item}</p>
            </div>)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold text-[#172a4d]">Rencana Aksi 90 Hari</h3>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">90 Hari</span>
          </div>
          <div className="mt-4 space-y-3">
            {(actions.length ? actions : result.recommendations || []).slice(0, 3).map((item, index) => <div key={index} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">✓</span>
              <p className="pt-1 text-sm leading-6 text-slate-600">{item}</p>
            </div>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportHeader({ result }: { result: AssessmentResult }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
    <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#9b7439]">FINANCIAL REPORT ASSESSMENT</p>
    <h2 className="mt-3 text-3xl font-bold text-[#172a4d] sm:text-4xl">Hospitality Financial Performance Review</h2>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-5 border-t border-slate-100 pt-6">
      <div><p className="text-xs uppercase tracking-wider text-slate-400">Assessment Score</p><p className="mt-1 text-4xl font-bold text-[#172a4d]">{result.financialHealthScore} / 100</p></div>
      <div className="rounded-full bg-slate-50 px-4 py-2 text-sm font-bold text-[#172a4d]">Status: {financialStatus(result.financialHealthScore)}</div>
    </div>
  </div>;
}

function ReportCard({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle: string; children: ReactNode }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9b7439]">{eyebrow} · {subtitle}</p>
    <h2 className="mt-2 text-2xl font-bold text-[#172a4d]">{title}</h2>
    <div className="mt-6 border-t border-slate-100 pt-6">{children}</div>
  </div>;
}

function ReportText({ text }: { text: string }) {
  const normalized = (text || "")
    .replace(/\\n/g, "\n")
    .replace(/\\\s*\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  // Split inline numbered findings into separate, readable blocks even when
  // the source report contains them in one long paragraph.
  const numbered = normalized
    .replace(/[ \t]+(?=\d{1,2}[.)]\s+[A-ZÀ-Ý])/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks: { number?: string; text: string; bullet: boolean; heading: boolean }[] = [];
  for (const line of numbered) {
    const item = line.match(/^(\d{1,2})[.)]\s+(.+)$/);
    const bullet = /^[-•*]\s+/.test(line);
    const content = (item ? item[2] : line)
      .replace(/^[-•*]\s*/, "")
      .replace(/^#+\s*/, "")
      .trim();
    if (!content) continue;

    const headingPattern = /^(financial condition|needs attention|assessment|overall assessment|key findings|financial impact|management concern|areas to monitor|main profit drivers|payroll & manpower|operational expenses|utility cost|gross operating profit|margin analysis|potential saving|recommendation|expected impact|0[-–]30 days|31[-–]60 days|61[-–]90 days)$/i;
    blocks.push({
      number: item?.[1],
      text: content,
      bullet,
      heading: !item && !bullet && headingPattern.test(content),
    });
  }

  return (
    <div className="space-y-3 text-[15px] leading-7 text-slate-600">
      {blocks.map((block, index) => {
        if (block.heading) {
          return <h3 key={index} className="pt-3 text-sm font-extrabold uppercase tracking-wider text-[#172a4d]">{block.text}</h3>;
        }

        if (block.number) {
          const colon = block.text.indexOf(":");
          const hasLead = colon > 0 && colon < 90;
          return (
            <div key={index} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#172a4d] text-xs font-bold text-white">{block.number}</span>
              <p className="min-w-0 flex-1">
                {hasLead ? <><strong className="font-bold text-[#172a4d]">{block.text.slice(0, colon + 1)}</strong>{block.text.slice(colon + 1)}</> : block.text}
              </p>
            </div>
          );
        }

        if (block.bullet) {
          return <div key={index} className="flex items-start gap-3"><span className="font-bold text-[#9b7439]">•</span><p>{block.text}</p></div>;
        }

        return <p key={index}>{block.text}</p>;
      })}
    </div>
  );
}
function BulletList({ items }: { items: string[] }) {
  return <ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-slate-600">{items.map((item, i) => <li key={i} className="list-disc">{item}</li>)}</ul>;
}

function ResultList({ title, items, danger = false, compact = false }: { title: string; items: string[]; danger?: boolean; compact?: boolean }) {
  return <div className={compact ? "mt-5" : "mt-6"}>
    {title && <h3 className="text-sm font-bold uppercase tracking-wider text-[#172a4d]">{title}</h3>}
    <div className="mt-3 space-y-3">
      {items.map((item, index) => <div key={index} className={`rounded-2xl p-4 text-sm leading-6 ${danger ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-700"}`}><span className="mr-2 font-bold">{String(index + 1).padStart(2, "0")} —</span>{item}</div>)}
    </div>
  </div>;
}

function PriorityList({ items }: { items: string[] }) {
  const labels = ["🔴 Priority 1 — Strengthen Cost Control", "🟠 Priority 2 — Improve Revenue Quality", "🟡 Priority 3 — Improve Financial Monitoring"];
  return <div className="space-y-4">{items.slice(0, 3).map((item, index) => <div key={index} className="rounded-2xl border border-slate-200 p-5"><h3 className="font-bold text-[#172a4d]">{labels[index]}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{item}</p><p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#9b7439]">Expected Impact</p><p className="mt-1 text-sm text-slate-600">{index === 0 ? "Improve operating margin and reduce unnecessary expenses." : index === 1 ? "Increase revenue without relying solely on occupancy growth." : "Identify financial deviations earlier and take corrective action."}</p></div>)}</div>;
}

function ActionPlan({ items }: { items: string[] }) {
  const buckets = ["0–30 Days", "31–60 Days", "61–90 Days"];
  return <div className="grid gap-4 lg:grid-cols-3">{buckets.map((bucket, index) => <div key={bucket} className="rounded-2xl bg-slate-50 p-5"><h3 className="font-bold text-[#172a4d]">{bucket}</h3><div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{items.filter((_, i) => i % 3 === index).slice(0, 4).map((item, i) => <p key={i}>• {item}</p>)}</div></div>)}</div>;
}
