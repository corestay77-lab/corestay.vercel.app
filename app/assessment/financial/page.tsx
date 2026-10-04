"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AssessmentResult = {
  financialHealthScore: number;
  executiveSummary: string;
  revenueAnalysis: string;
  costAnalysis: string;
  profitAnalysis: string;
  risks: string[];
  recommendations: string[];
  actionPlan: string[];
  extractedFigures: { label: string; value: string; period: string }[];
};

const MAX_FILE_SIZE = 4 * 1024 * 1024;

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
    setText("");

    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Silakan upload laporan dalam format PDF.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("Ukuran PDF maksimal 4 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const session = await getSession();
    if (!session) return;

    setFile(selected);
    setFileName(selected.name);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("action", "extract");
      formData.append("file", selected);

      const response = await fetch("/api/assessment/financial", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      const raw = await response.text();
      let data: { text?: string; error?: string } = {};
      try { data = raw ? JSON.parse(raw) : {}; }
      catch { throw new Error(`Server mengembalikan respons tidak valid (HTTP ${response.status}).`); }

      if (!response.ok) throw new Error(data.error || `Ekstraksi gagal (HTTP ${response.status}).`);
      setText(data.text || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF gagal dibaca.");
    } finally {
      setLoading(false);
    }
  }

  async function analyze() {
    if (!text.trim()) return;
    const session = await getSession();
    if (!session) return;

    setAnalyzing(true);
    setError("");
    setResult(null);
    setReportId("");

    try {
      const formData = new FormData();
      formData.append("action", "analyze");
      formData.append("text", text);
      formData.append("fileName", fileName || "Financial-Report.pdf");

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
      setError(err instanceof Error ? err.message : "Analisa gagal diproses.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function copyAllText() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
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
          Alur sederhana: <b>Upload → Copy All Text → Analysis → Hasil</b>.
        </p>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading || analyzing}
            className="w-full rounded-3xl border-2 border-dashed border-[#203b68]/25 bg-[#203b68]/[0.03] p-8 text-center transition hover:border-[#203b68]/50 disabled:opacity-60 sm:p-12"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#203b68] text-2xl text-white">
              {loading ? "…" : "↑"}
            </div>
            <h2 className="mt-5 text-xl font-bold">{loading ? "Membaca PDF…" : "Upload Laporan Keuangan PDF"}</h2>
            <p className="mt-2 text-sm text-slate-500">PDF saja • Maksimal 4 MB</p>
            {fileName && <p className="mx-auto mt-5 max-w-full truncate rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ {fileName}</p>}
          </button>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        </section>

        {text && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Teks PDF</h2>
                <p className="mt-1 text-sm text-slate-500">Periksa teks hasil ekstraksi. Anda dapat menyalin seluruh teks sebelum analisa.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={copyAllText} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold">
                  {copied ? "✓ Tersalin" : "Copy All Text"}
                </button>
                <button type="button" onClick={analyze} disabled={analyzing} className="rounded-xl bg-[#203b68] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                  {analyzing ? "Menganalisa…" : "Analysis"}
                </button>
              </div>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-5 h-80 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none focus:border-[#203b68]" />
          </section>
        )}

        {error && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {result && (
          <section className="mt-8 space-y-5">
            <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8b985]">Financial Health Score</p>
              <div className="mt-3 text-6xl font-bold">{result.financialHealthScore}<span className="text-2xl text-white/40">/100</span></div>
              <p className="mt-5 max-w-3xl leading-7 text-white/75">{result.executiveSummary}</p>
            </div>
            {[
              ["Revenue Analysis", result.revenueAnalysis],
              ["Cost Analysis", result.costAnalysis],
              ["Profit Analysis", result.profitAnalysis],
            ].map(([title, value]) => (
              <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">{value}</p>
              </div>
            ))}
            <ResultList title="Risk / Red Flags" items={result.risks} danger />
            <ResultList title="Recommendations" items={result.recommendations} />
            <ResultList title="Action Plan" items={result.actionPlan} />
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
              <p className="mt-2 text-sm text-emerald-800">Hasil tersedia di Hasil Saya dan Laporan.</p>
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
