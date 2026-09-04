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
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12">

        <header className="text-center">
          <p className="text-sm font-semibold tracking-[0.35em] text-cyan-400">
            CoreStay_Advisory
          </p>

          <h1 className="mt-6 text-4xl font-bold md:text-6xl">
            Hotel Business Health Assessment
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">
            Identifikasi kekuatan, kelemahan, dan area prioritas yang
            memengaruhi revenue, operational efficiency, people, dan
            profitability hotel Anda.
          </p>
        </header>

        <section className="mt-12 grid gap-6 md:grid-cols-2">

          <button
            type="button"
            onClick={() => setSelected("existing")}
            className={`rounded-3xl border p-8 text-left transition ${
              selected === "existing"
                ? "border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-500/10"
                : "border-slate-800 bg-slate-900 hover:border-cyan-400/60"
            }`}
          >
            <div className="text-5xl">🏨</div>

            <h2 className="mt-6 text-2xl font-bold">
              Hotel Existing
            </h2>

            <p className="mt-4 leading-7 text-slate-400">
              Untuk hotel yang sudah beroperasi dan ingin mengevaluasi
              revenue, pricing, operational efficiency, people dan
              profitability.
            </p>

            <p className="mt-6 font-semibold text-cyan-400">
              Pilih Hotel Existing →
            </p>
          </button>

          <button
            type="button"
            onClick={() => setSelected("preopening")}
            className={`rounded-3xl border p-8 text-left transition ${
              selected === "preopening"
                ? "border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-500/10"
                : "border-slate-800 bg-slate-900 hover:border-cyan-400/60"
            }`}
          >
            <div className="text-5xl">🏗️</div>

            <h2 className="mt-6 text-2xl font-bold">
              Pre-opening Hotel
            </h2>

            <p className="mt-4 leading-7 text-slate-400">
              Untuk hotel yang sedang dibangun, renovasi atau mempersiapkan
              opening pertama, termasuk concept, market, pricing, SOP,
              SDM, system, sales dan financial readiness.
            </p>

            <p className="mt-6 font-semibold text-cyan-400">
              Pilih Pre-opening Hotel →
            </p>
          </button>

        </section>

        <button
          type="button"
          disabled={!selected}
          onClick={continueAssessment}
          className="mt-8 w-full rounded-2xl bg-white px-6 py-4 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {!selected
            ? "Pilih Jenis Hotel Terlebih Dahulu"
            : selected === "existing"
              ? "Lanjutkan — Hotel Existing →"
              : "Lanjutkan — Pre-opening Hotel →"}
        </button>

        <div className="mt-8 text-center text-sm text-slate-500">
          Assessment akan menyesuaikan pertanyaan dan rekomendasi dengan
          kondisi hotel Anda.
        </div>

        <footer className="mt-auto pt-16 text-center text-xs text-slate-600">
          CoreStay_Advisory — Hotel Business Health Assessment
        </footer>

      </div>
    </main>
  );
}

