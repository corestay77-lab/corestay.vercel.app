"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AssessmentPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<"existing" | "preopening" | "">("");

  function continueAssessment() {
    if (selected === "existing") router.push("/assessment/existing");
    if (selected === "preopening") router.push("/assessment/pre-opening");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07111f] text-white selection:bg-amber-300 selection:text-[#07111f]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,rgba(245,158,11,0.22),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(14,165,233,0.2),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(168,85,247,0.18),transparent_35%)]" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
        <nav className="flex items-center justify-between border-b border-white/10 pb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.38em] text-amber-300">CoreStay</p>
            <p className="mt-1 text-xs text-white/45">Advisory & Hospitality Intelligence</p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/60 backdrop-blur md:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
            Private Business Assessment
          </div>
        </nav>

        <header className="mx-auto max-w-4xl pt-14 text-center sm:pt-20">
          <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-200 backdrop-blur">
            <span>✦</span>
            Hotel Business Health Assessment
          </div>
          <h1 className="font-serif text-4xl font-medium leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Discover the <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">true health</span> of your hotel business.
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">
            A structured executive assessment to identify strengths, hidden gaps and priority opportunities across revenue, operations, people and profitability.
          </p>
        </header>

        <section className="mt-12 grid gap-6 md:grid-cols-2 lg:mt-16">
          <button
            type="button"
            aria-pressed={selected === "existing"}
            onClick={() => setSelected("existing")}
            className={`group relative overflow-hidden rounded-[2rem] border p-[1px] text-left transition duration-500 hover:-translate-y-1 ${selected === "existing" ? "border-amber-300/70 shadow-[0_24px_80px_rgba(245,158,11,0.18)]" : "border-white/10 hover:border-amber-200/35"}`}
          >
            <div className="relative h-full overflow-hidden rounded-[1.95rem] bg-gradient-to-br from-[#1a2637] via-[#111c2d] to-[#0b1422] p-7 sm:p-9">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl transition group-hover:bg-amber-400/20" />
              <div className="relative flex items-start justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200/20 bg-gradient-to-br from-amber-300/20 to-orange-500/10 text-3xl shadow-inner shadow-white/5">🏨</div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${selected === "existing" ? "bg-amber-300 text-[#101827]" : "bg-white/5 text-white/45"}`}>
                  {selected === "existing" ? "Selected" : "01"}
                </span>
              </div>
              <h2 className="relative mt-8 font-serif text-3xl font-medium text-white sm:text-4xl">Hotel Existing</h2>
              <p className="relative mt-4 max-w-lg text-sm leading-7 text-white/55 sm:text-base">
                Untuk hotel yang sudah beroperasi dan ingin mengevaluasi revenue, pricing, operational efficiency, people, guest experience dan profitability.
              </p>
              <div className="relative mt-8 flex items-center justify-between border-t border-white/10 pt-5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Operational Health</span>
                <span className="text-lg transition group-hover:translate-x-1">→</span>
              </div>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={selected === "preopening"}
            onClick={() => setSelected("preopening")}
            className={`group relative overflow-hidden rounded-[2rem] border p-[1px] text-left transition duration-500 hover:-translate-y-1 ${selected === "preopening" ? "border-fuchsia-300/70 shadow-[0_24px_80px_rgba(168,85,247,0.18)]" : "border-white/10 hover:border-fuchsia-200/35"}`}
          >
            <div className="relative h-full overflow-hidden rounded-[1.95rem] bg-gradient-to-br from-[#211a35] via-[#17162b] to-[#0c1424] p-7 sm:p-9">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-fuchsia-400/10 blur-3xl transition group-hover:bg-fuchsia-400/20" />
              <div className="relative flex items-start justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-fuchsia-200/20 bg-gradient-to-br from-fuchsia-300/20 to-violet-500/10 text-3xl shadow-inner shadow-white/5">🏗️</div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${selected === "preopening" ? "bg-fuchsia-300 text-[#171226]" : "bg-white/5 text-white/45"}`}>
                  {selected === "preopening" ? "Selected" : "02"}
                </span>
              </div>
              <h2 className="relative mt-8 font-serif text-3xl font-medium text-white sm:text-4xl">Pre-opening Hotel</h2>
              <p className="relative mt-4 max-w-lg text-sm leading-7 text-white/55 sm:text-base">
                Untuk hotel yang sedang dibangun, renovasi atau mempersiapkan opening pertama—concept, market, pricing, SOP, SDM, system, sales dan financial readiness.
              </p>
              <div className="relative mt-8 flex items-center justify-between border-t border-white/10 pt-5">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-200">Opening Readiness</span>
                <span className="text-lg transition group-hover:translate-x-1">→</span>
              </div>
            </div>
          </button>
        </section>

        <div className="mx-auto mt-8 w-full max-w-3xl">
          <button
            type="button"
            disabled={!selected}
            onClick={continueAssessment}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-400 px-6 py-5 font-semibold text-[#101827] shadow-[0_18px_50px_rgba(245,158,11,0.18)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_60px_rgba(245,158,11,0.28)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35 disabled:shadow-none"
          >
            <span className="relative z-10 flex items-center justify-center gap-3 text-sm sm:text-base">
              {!selected ? "Pilih jenis hotel untuk memulai" : selected === "existing" ? "Mulai Assessment — Hotel Existing" : "Mulai Assessment — Pre-opening Hotel"}
              {selected && <span className="text-lg transition group-hover:translate-x-1">→</span>}
            </span>
          </button>
        </div>

        <div className="mx-auto mt-7 flex max-w-3xl flex-wrap items-center justify-center gap-x-7 gap-y-3 text-[11px] uppercase tracking-[0.15em] text-white/35">
          <span>✦ Executive Perspective</span>
          <span>✦ Structured Analysis</span>
          <span>✦ Confidential</span>
        </div>

        <footer className="mt-auto pt-14 text-center text-xs text-white/25">
          © {new Date().getFullYear()} CoreStay Advisory · Hotel Business Health Assessment
        </footer>
      </div>
    </main>
  );
}
