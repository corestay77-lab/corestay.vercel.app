"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AssessmentPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<"existing" | "preopening" | "">("");

  function continueAssessment() {
    if (selected === "existing") {
      router.push("/assessment/existing");
    } else if (selected === "preopening") {
      router.push("/assessment/pre-opening");
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f7fb] text-[#17243d] lg:pl-[250px]"><aside className="fixed inset-y-0 left-0 z-50 hidden w-[250px] border-r border-white/10 bg-black text-[#17243d] lg:flex lg:flex-col">
        <div className="flex h-full flex-col px-6 py-7">
          <a href="/" className="flex items-center justify-center rounded-2xl px-2 py-3"><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="h-auto w-[165px] object-contain mix-blend-screen" /></a>
          <div className="mt-10">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[#17243d]/35">Assessment</p>
            <nav className="mt-4 space-y-1.5">
              <a href="/assessment" className="block rounded-xl bg-white/10 px-3 py-3 text-sm font-medium text-white">Hotel Assessment</a>
              <a href="/assessment/existing" className="block rounded-xl px-3 py-3 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-[#17243d]">Hotel Existing</a>
              <a href="/assessment/pre-opening" className="block rounded-xl px-3 py-3 text-sm font-medium text-[#17243d]/60 transition hover:bg-white/10 hover:text-[#17243d]">Pre-opening Hotel</a>
            </nav>
          </div>
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8b985]">CoreStay Advisory</p>
            <p className="mt-2 text-xs leading-5 text-white/50">Hotel Business Health Assessment</p>
          </div>
        </div>
      </aside><header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 px-5 py-3.5 text-white backdrop-blur-xl lg:hidden"><div className="flex items-center justify-between"><a href="/"><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={150} height={55} className="h-[40px] w-[125px] object-contain mix-blend-screen" /></a><a href="/assessment" className="text-xs font-semibold text-white/70">Assessment</a></div></header>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(245,158,11,.32),transparent_26%),radial-gradient(circle_at_90%_10%,rgba(6,182,212,.28),transparent_28%),radial-gradient(circle_at_15%_85%,rgba(236,72,153,.24),transparent_28%),radial-gradient(circle_at_85%_80%,rgba(139,92,246,.28),transparent_30%)]" />
      <div className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[#203b68]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-pink-500/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
        <header className="text-center">
          <p className="text-sm font-semibold tracking-[0.35em] text-[#203b68]">
            CoreStay_Advisory
          </p>
          <h1 className="mt-6 font-serif text-4xl font-medium leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-amber-200 via-orange-400 to-pink-400 bg-clip-text text-transparent">
              Hotel Business Health Assessment
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#17243d]/65 sm:text-lg">
            Identifikasi kekuatan, kelemahan, dan area prioritas yang
            memengaruhi revenue, operational efficiency, people, dan
            profitability hotel Anda.
          </p>
        </header>

        <section className="mt-12 grid gap-6 md:grid-cols-2 lg:mt-16">
          <button
            type="button"
            aria-pressed={selected === "existing"}
            onClick={() => setSelected("existing")}
            className={`group relative overflow-hidden rounded-[2rem] border p-[1px] text-left transition duration-500 hover:-translate-y-1 ${
              selected === "existing"
                ? "border-amber-300 shadow-[0_24px_80px_rgba(245,158,11,.22)]"
                : "border-white/10 hover:border-amber-200/50"
            }`}
          >
            <div className="relative h-full overflow-hidden rounded-[1.95rem] bg-gradient-to-br from-amber-950/70 via-slate-900 to-cyan-950/60 p-7 sm:p-9">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl transition group-hover:bg-amber-400/30" />
              <div className="relative flex items-start justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200/30 bg-gradient-to-br from-amber-300/30 to-orange-500/20 text-3xl shadow-lg shadow-amber-500/10">
                  🏨
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[.2em] ${
                  selected === "existing"
                    ? "bg-amber-300 text-slate-950"
                    : "bg-white/10 text-amber-100"
                }`}>
                  {selected === "existing" ? "Selected" : "01"}
                </span>
              </div>
              <h2 className="relative mt-8 font-serif text-3xl font-medium sm:text-4xl">
                Hotel Existing
              </h2>
              <p className="relative mt-4 max-w-lg text-sm leading-7 text-[#17243d]/60 sm:text-base">
                Untuk hotel yang sudah beroperasi dan ingin mengevaluasi revenue,
                pricing, operational efficiency, people, guest experience dan profitability.
              </p>
              <p className="relative mt-8 flex items-center justify-between border-t border-white/10 pt-5 text-sm font-semibold text-amber-200">
                Pilih Hotel Existing <span className="text-lg transition group-hover:translate-x-1">→</span>
              </p>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={selected === "preopening"}
            onClick={() => setSelected("preopening")}
            className={`group relative overflow-hidden rounded-[2rem] border p-[1px] text-left transition duration-500 hover:-translate-y-1 ${
              selected === "preopening"
                ? "border-fuchsia-300 shadow-[0_24px_80px_rgba(217,70,239,.22)]"
                : "border-white/10 hover:border-fuchsia-200/50"
            }`}
          >
            <div className="relative h-full overflow-hidden rounded-[1.95rem] bg-gradient-to-br from-fuchsia-950/70 via-slate-900 to-violet-950/70 p-7 sm:p-9">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-3xl transition group-hover:bg-fuchsia-400/30" />
              <div className="relative flex items-start justify-between">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-fuchsia-200/30 bg-gradient-to-br from-fuchsia-300/30 to-violet-500/20 text-3xl shadow-lg shadow-fuchsia-500/10">
                  🏗️
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[.2em] ${
                  selected === "preopening"
                    ? "bg-fuchsia-300 text-slate-950"
                    : "bg-white/10 text-fuchsia-100"
                }`}>
                  {selected === "preopening" ? "Selected" : "02"}
                </span>
              </div>
              <h2 className="relative mt-8 font-serif text-3xl font-medium sm:text-4xl">
                Pre-opening Hotel
              </h2>
              <p className="relative mt-4 max-w-lg text-sm leading-7 text-[#17243d]/60 sm:text-base">
                Untuk hotel yang sedang dibangun, renovasi atau mempersiapkan opening pertama—concept, market, pricing, SOP, SDM, system, sales dan financial readiness.
              </p>
              <p className="relative mt-8 flex items-center justify-between border-t border-white/10 pt-5 text-sm font-semibold text-fuchsia-200">
                Pilih Pre-opening Hotel <span className="text-lg transition group-hover:translate-x-1">→</span>
              </p>
            </div>
          </button>
        </section>

        <div className="mx-auto mt-8 w-full max-w-3xl">
          <button
            type="button"
            disabled={!selected}
            onClick={continueAssessment}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-amber-300 via-orange-400 to-pink-500 px-6 py-5 font-semibold text-slate-950 shadow-[0_18px_55px_rgba(249,115,22,.25)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_70px_rgba(236,72,153,.28)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-[#17243d]/35 disabled:shadow-none"
          >
            <span className="relative z-10 flex items-center justify-center gap-3 text-sm sm:text-base">
              {!selected
                ? "Pilih Jenis Hotel Terlebih Dahulu"
                : selected === "existing"
                  ? "Lanjutkan — Hotel Existing →"
                  : "Lanjutkan — Pre-opening Hotel →"}
            </span>
          </button>
        </div>

        <div className="mx-auto mt-7 text-center text-[11px] leading-6 text-[#17243d]/40">
          Assessment akan menyesuaikan pertanyaan dan rekomendasi berdasarkan jenis hotel yang Anda pilih.
        </div>

        <footer className="mt-auto pt-14 text-center text-xs text-[#17243d]/25">
          CoreStay_Advisory — Hotel Business Health Assessment
        </footer>
      </div>
    </main>
  );
}
