"use client";

import { useRef, useState } from "react";

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

const steps = [
  "UPLOAD LAPORAN KEUANGAN PDF",
  "CoreStay membaca PDF",
  "Ekstraksi angka keuangan",
  "Validasi & normalisasi data",
  "Financial Assessment Engine",
  "CoreStay Analysis",
];

export default function FinancialAssessmentPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AssessmentResult | null>(null);\n  const [reportId, setReportId] = useState("");

  async function handleFile(file?: File) {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Silakan upload laporan dalam format PDF.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileName("");
      setResult(null);
      setError("Ukuran file terlalu besar. Maksimal file yang dapat diupload adalah 4 MB.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFileName(file.name);
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/assessment/financial", {
        method: "POST",
        body: formData,
      });
      const raw = await response.text();
      let data: { result?: AssessmentResult; error?: string } = {};
      if (raw.trim()) {
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error(`Server mengembalikan respons yang tidak valid (HTTP ${response.status}). Silakan coba lagi.`);
        }
      }
      if (!response.ok) {
        throw new Error(data.error || `Analisa gagal (HTTP ${response.status}).`);
      }
      if (!data.result) {
        throw new Error("Server tidak mengembalikan hasil analisa.");
      }
      setResult(data.result);\n      setReportId(data.reportId || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analisa gagal diproses.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadPdf() {\n    if (!reportId) return;\n    const { data: { session } } = await supabase.auth.getSession();\n    if (!session) { router.replace("/login"); return; }\n    const response = await fetch(`/api/assessment/financial/report/${reportId}`, { headers: { Authorization: `Bearer ${session.access_token}` } });\n    if (!response.ok) { setError("PDF tidak dapat diunduh."); return; }\n    const blob = await response.blob(); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "CoreStay-Financial-Assessment.pdf"; a.click(); URL.revokeObjectURL(url);\n  }\n\n  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#17243d] lg:pl-[250px]">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#203b68]">Assessment 3</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Financial Report Assessment</h1>
          <p className="mt-4 text-base leading-7 text-slate-500 sm:text-lg">
            Upload laporan keuangan bulanan hotel. CoreStay akan membaca isi PDF,
            mengekstrak angka, memvalidasi data, lalu menghasilkan analisa bisnis berbasis AI.
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={loading}
            className="w-full rounded-3xl border-2 border-dashed border-[#203b68]/25 bg-[#203b68]/[0.03] p-8 text-center transition hover:border-[#203b68]/50 hover:bg-[#203b68]/[0.06] disabled:opacity-60 sm:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#203b68] text-2xl text-white">
              {loading ? "…" : "↑"}
            </div>
            <h2 className="mt-5 text-xl font-bold">{loading ? "CoreStay sedang menganalisa…" : "Upload Laporan Keuangan PDF"}</h2>
            <p className="mt-2 text-sm font-medium text-slate-600">PDF saja • Maksimal 4 MB</p>
            <p className="mt-1 text-xs text-slate-400">Laporan keuangan PDF, maksimal 4 MB per file.</p>
            {fileName && <p className="mx-auto mt-5 max-w-full truncate rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ {fileName}</p>}
          </button>
          <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">Alur Financial Assessment</h2>
          <div className="mt-6 space-y-3">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#203b68] text-sm font-bold text-white">{index + 1}</span>
                <span className="font-medium">{step}</span>
              </div>
            ))}
          </div>
        </section>

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
            ].map(([title, text]) => (
              <div key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="mt-4 whitespace-pre-line leading-7 text-slate-600">{text}</p>
              </div>
            ))}

            <ResultList title="Risk / Red Flags" items={result.risks} danger />
            <ResultList title="Recommendations" items={result.recommendations} />
            <ResultList title="Action Plan" items={result.actionPlan} />

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-bold">Angka Keuangan yang Ditemukan</h2>
              <div className="mt-5 space-y-2">
                {result.extractedFigures.length === 0 ? (
                  <p className="text-sm text-slate-500">Tidak ada angka terstruktur yang berhasil diidentifikasi.</p>
                ) : result.extractedFigures.map((item, index) => (
                  <div key={index} className="grid gap-1 rounded-xl bg-slate-50 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-4">
                    <span className="font-medium">{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                    <span className="text-sm text-slate-500">{item.period}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6"><p className="font-bold text-emerald-900">✓ Laporan PDF tersimpan</p><p className="mt-2 text-sm leading-6 text-emerald-800">Laporan ini sudah tersimpan ke akun Anda dan akan tampil di Hasil Saya serta Laporan.</p><button type="button" onClick={downloadPdf} className="mt-4 rounded-xl bg-[#203b68] px-5 py-3 text-sm font-bold text-white">Download Financial Assessment PDF</button></div><div className="rounded-3xl border border-[#d8b985]/30 bg-[#d8b985]/[0.08] p-6">
              <p className="font-bold">Laporan Premium → PDF Download</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Hasil analisa ini menjadi dasar laporan premium CoreStay: diagnosis,
                risiko, rekomendasi dan action plan.
              </p>
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
