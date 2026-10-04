"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [reportId, setReportId] = useState("");

  async function getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace("/login?next=/assessment/financial");
      return null;
    }
    return session;
  }

  async function handleFile(selected?: File) {
    if (!selected) return;
    setError("");
    setResult(null);
    setReportId("");

    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Silakan upload laporan dalam format PDF.");
      return;
    }

    const session = await getSession();
    if (!session) return;

    setFile(selected);
    setFileName(selected.name);
    setLoading(true);

    try {
      if (selected.size > 4 * 1024 * 1024) {
        throw new Error("Ukuran PDF maksimal 4 MB.");
      }

      const uploadForm = new FormData();
      uploadForm.append("file", selected);

      const uploadResponse = await fetch("/api/assessment/financial/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
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
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const raw = await response.text();
      let data: { result?: AssessmentResult; reportId?: string; error?: string } = {};
      try { data = raw ? JSON.parse(raw) : {}; }
      catch { throw new Error(`Server mengembalikan respons tidak valid (HTTP ${response.status}).`); }

      if (!response.ok) throw new Error(data.error || `Analisa gagal (HTTP ${response.status}).`);
      if (!data.result) throw new Error("Hasil analisa tidak tersedia.");

      setResult(data.result);
      setReportId(data.reportId || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF gagal diproses.");
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  }

  async function downloadPdf() {
    if (!reportId) return;
    const session = await getSession();
    if (!session) return;

    const response = await fetch(`/api/assessment/financial/report/${reportId}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
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
    <main className="min-h-screen bg-[#f4f7fb] text-[#17243d] lg:pl-[250px]">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#203b68]">Assessment 3</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Financial Report Assessment</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-500">
          <b>Upload PDF → Analysis → Hasil</b>. Analisis laporan keuangan hotel secara cepat dan terstruktur untuk melihat kondisi, performa, dan area yang perlu diperhatikan.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          <b>Hasil:</b> audit berbasis file dengan validasi data, KPI, variance, red flags, potensi saving/recovery, dan action plan. <b>Rule:</b> file yang gagal dibaca tidak akan menghasilkan audit seolah-olah valid.
        </p>

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
            <h2 className="mt-5 text-xl font-bold">{loading ? "Mengupload PDF…" : analyzing ? "Menganalisa PDF…" : "Upload Laporan Keuangan PDF"}</h2>
            <p className="mt-2 text-sm text-slate-500">PDF saja • Upload langsung ke secure storage</p>
            {fileName && <p className="mx-auto mt-5 max-w-full truncate rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ {fileName}</p>}
          </button>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </section>

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {result && (
          <section className="mt-8 space-y-5">
            <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8b985]">Financial Health Score</p>
              <div className="mt-3 text-6xl font-bold">{result.financialHealthScore}<span className="text-2xl text-white/40">/100</span></div>
              <p className="mt-2 text-sm text-white/55">Data Completeness: {result.dataCompletenessScore}/100</p>
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-white/75 sm:grid-cols-3">
                <span>Revenue {result.revenueHealthScore}/100</span><span>Profitability {result.profitabilityHealthScore}/100</span><span>Cost Control {result.costControlScore}/100</span>
                <span>Cash Flow {result.cashFlowScore}/100</span><span>Internal Control {result.internalControlScore}/100</span><span>Revenue Integrity {result.revenueIntegrityScore}/100</span>
              </div>
              <p className="mt-5 max-w-3xl leading-7 text-white/75">{result.executiveSummary}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9b7439]">Management Snapshot</p>
              <h2 className="mt-2 text-2xl font-bold text-[#172a4d]">Key Financial Indicators</h2>
              <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Indicator</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">Assessment</th><th className="px-4 py-3">Period</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
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
                      return <tr key={index}><td className="px-4 py-4 font-semibold text-slate-800">{label}</td><td className="px-4 py-4 font-medium text-slate-700">{figure.value}</td><td className="px-4 py-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${status.className}`}>{status.icon} {status.label}</span></td><td className="px-4 py-4 text-slate-500">{figure.period}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-400">Nilai hanya berasal dari angka yang berhasil diekstrak dari laporan.</p>
            </div>
            <ReportSection title="01. Revenue Performance" subtitle="Revenue Analysis" text={result.revenueAnalysis} />
            <ReportSection title="02. Cost & Expense Analysis" subtitle="Cost Analysis" text={result.costAnalysis} />
            <ReportSection title="03. Profitability Analysis" subtitle="Profit Analysis" text={result.profitAnalysis} />
            <ReportSection title="04. Comparative Analysis" subtitle="Financial Comparison" text={result.comparativeAnalysis} />
            <ReportSection title="05. Ratio & Margin Analysis" subtitle="Financial Ratios" text={result.ratioAnalysis} />
            <ReportSection title="06. Variance Analysis" subtitle="Budget vs Actual / Period Comparison" text={result.varianceAnalysis} />
            <ResultList title="Auditor-Style Findings" items={result.auditFindings} danger />
            <ResultList title="Risk / Red Flags" items={result.risks} danger />
            <ResultList title="Recommendations" items={result.recommendations} />
            <ResultList title="Action Plan" items={result.actionPlan} />
            <ResultList title="Data Limitations" items={result.dataLimitations} />
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">Overall Conclusion</h2>
              <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">{result.conclusion}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">Angka Keuangan</h2>
              <div className="mt-5 space-y-2">
                {result.extractedFigures.map((item, index) => (
                  <div key={index} className="grid gap-1 rounded-xl bg-slate-50 p-4 sm:grid-cols-[1fr_auto_auto] sm:gap-4">
                    <span className="font-medium">{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                    <span className="text-sm text-slate-500">{item.period}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
              <p className="font-bold text-emerald-900">✓ Analisa selesai & laporan tersimpan</p>
              <p className="mt-2 text-sm text-emerald-800">Hasil tersedia di Laporan.</p>
              <button type="button" onClick={downloadPdf} className="mt-4 rounded-xl bg-[#203b68] px-5 py-3 text-sm font-bold text-white">
                Download Financial Assessment PDF
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function getFigure(figures: AssessmentResult["extractedFigures"], labels: string[]) {\n  const found = figures.find((item) => labels.some((label) => item.label.toLowerCase().trim() === label.toLowerCase().trim()));\n  return found || { label: labels[0], value: "Tidak tersedia", period: "—" };\n}\n\nfunction scoreStatus(score: number) {\n  if (score >= 80) return { icon: "🟢", label: "Good", className: "text-emerald-700 bg-emerald-50" };\n  if (score >= 60) return { icon: "🟡", label: "Moderate", className: "text-amber-700 bg-amber-50" };\n  return { icon: "🔴", label: "Needs Attention", className: "text-red-700 bg-red-50" };\n}\n\nfunction getFigure(figures: AssessmentResult["extractedFigures"], labels: string[]) {
  const found = figures.find((item) => labels.some((label) => item.label.toLowerCase().trim() === label.toLowerCase().trim()));
  return found || { label: labels[0], value: "Tidak tersedia", period: "—" };
}

function scoreStatus(score: number) {
  if (score >= 80) return { icon: "🟢", label: "Good", className: "text-emerald-700 bg-emerald-50" };
  if (score >= 60) return { icon: "🟡", label: "Moderate", className: "text-amber-700 bg-amber-50" };
  return { icon: "🔴", label: "Needs Attention", className: "text-red-700 bg-red-50" };
}

function ReportSection({ title, subtitle, text }: { title: string; subtitle: string; text: string }) {
  const blocks = (text || "").split(/\\n\\s*\\n/).map((x) => x.trim()).filter(Boolean);
  const paragraphs = blocks.length ? blocks : (text || "").split(/\\n/).map((x) => x.trim()).filter(Boolean);
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9b7439]">{subtitle}</p>
      <h2 className="mt-2 text-2xl font-bold text-[#172a4d]">{title}</h2>
      <div className="mt-6 border-t border-slate-100 pt-6 space-y-4 text-[15px] leading-7 text-slate-600">
        {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
    </div>
  );
}

function ResultList({ title, items, danger = false }: { title: string; items: string[]; danger?: boolean }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-5 space-y-3">
        {items.map((item, index) => (
          <div key={index} className={`rounded-xl p-4 text-sm leading-6 ${danger ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-700"}`}>
            <span className="mr-2 font-bold">{index + 1}.</span>{item}
          </div>
        ))}
      </div>
    </div>
  );
}
