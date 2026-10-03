"use client";

import { useRef, useState } from "react";

const steps = [
  "UPLOAD LAPORAN KEUANGAN PDF",
  "CoreStay membaca PDF",
  "Ekstraksi angka keuangan",
  "Validasi & normalisasi data",
  "Financial Assessment Engine",
  "AI Business Analysis",
];

const outputs = [
  "Financial Health Score",
  "Revenue Analysis",
  "Cost Analysis",
  "Profit Analysis",
  "Risk / Red Flags",
  "Recommendations",
  "Action Plan",
];

export default function FinancialAssessmentPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  function handleFile(file?: File) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Silakan upload laporan dalam format PDF.");
      return;
    }
    setFileName(file.name);
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#17243d] lg:pl-[250px]">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#203b68]">
            Assessment 3
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
            Financial Report Assessment
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-500 sm:text-lg">
            Upload laporan keuangan bulanan hotel dalam format PDF untuk mendapatkan
            analisa bisnis dan kesehatan finansial yang lebih mendalam.
          </p>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-3xl border-2 border-dashed border-[#203b68]/25 bg-[#203b68]/[0.03] p-8 text-center transition hover:border-[#203b68]/50 hover:bg-[#203b68]/[0.06] sm:p-12"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#203b68] text-2xl text-white">
              ↑
            </div>
            <h2 className="mt-5 text-xl font-bold">Upload Laporan Keuangan PDF</h2>
            <p className="mt-2 text-sm text-slate-500">
              Klik untuk memilih file PDF laporan keuangan bulanan.
            </p>
            {fileName && (
              <p className="mx-auto mt-5 max-w-full truncate rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                ✓ {fileName}
              </p>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold">Alur Financial Assessment</h2>
          <div className="mt-6 space-y-3">
            {steps.map((step, index) => (
              <div key={step} className="flex items-center gap-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#203b68] text-sm font-bold text-white">
                  {index + 1}
                </span>
                <span className="font-medium">{step}</span>
                {index < steps.length - 1 && (
                  <span className="ml-auto hidden text-slate-300 sm:block">↓</span>
                )}
              </div>
            ))}
          </div>

          <div className="my-7 border-t border-slate-100" />

          <div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8b985]">
              Hasil Analisa
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {outputs.map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 rounded-2xl border border-[#d8b985]/30 bg-[#d8b985]/[0.08] p-5">
            <p className="font-bold">Laporan Premium → PDF Download</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Setelah laporan diproses, CoreStay akan menyiapkan laporan premium
              berisi diagnosis, risiko, rekomendasi, dan action plan yang dapat
              diunduh dalam format PDF.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
