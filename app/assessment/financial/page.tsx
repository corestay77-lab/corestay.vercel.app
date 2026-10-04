"use client";

import { useRef, useState, type ReactNode } from "react";
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

  async function deleteAssessment() {
    if (!reportId) return;
    const confirmed = window.confirm("Hapus hasil assessment ini? Data hasil assessment dan PDF tersimpan akan dihapus permanen.");
    if (!confirmed) return;

    const session = await getSession();
    if (!session) return;

    const response = await fetch(`/api/assessment/financial/report/${reportId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!response.ok) {
      setError("Data assessment tidak dapat dihapus.");
      return;
    }

    setResult(null);
    setReportId("");
    setFile(null);
    setFileName("");
    setText("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
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
                <p className="mt-2 text-2xl font-bold text-[#172a4d]">{getFigure(result.extractedFigures, ["GOP Margin", "GOP %", "GOP Margin %"]).value}</p>
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
          </section>
        )}
      </div>
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

function scoreStatus(score: number) {
  if (score >= 80) return { icon: "🟢", label: "Good", className: "text-emerald-700 bg-emerald-50" };
  if (score >= 60) return { icon: "🟡", label: "Moderate", className: "text-amber-700 bg-amber-50" };
  return { icon: "🔴", label: "High", className: "text-red-700 bg-red-50" };
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
  const normalized = (text || "").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();
  const lines = normalized.split("\n").map((x) => x.trim()).filter(Boolean);
  const headingPattern = /^(assessment|overall assessment|key findings|financial impact|management concern|areas to monitor|main profit drivers|payroll & manpower|operational expenses|utility cost|gross operating profit|margin analysis|potential saving|recommendation|expected impact|0[-–]30 days|31[-–]60 days|61[-–]90 days)$/i;

  return (
    <div className="space-y-4 text-[15px] leading-7 text-slate-600">
      {lines.map((line, index) => {
        const clean = line.replace(/^[-•*]\s*/, "").replace(/^\d+[.)]\s*/, "").replace(/^#+\s*/, "").trim();
        if (headingPattern.test(clean)) {
          return <h3 key={index} className="pt-2 text-sm font-bold uppercase tracking-wider text-[#172a4d]">{clean}</h3>;
        }
        if (/^[-•*]\s+/.test(line) || /^\d+[.)]\s+/.test(line)) {
          return <div key={index} className="flex gap-3"><span className="font-bold text-[#9b7439]">•</span><p>{clean}</p></div>;
        }
        return <p key={index}>{clean}</p>;
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
