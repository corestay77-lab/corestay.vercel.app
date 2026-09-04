"use client";

import Image from "next/image";

import { useEffect, useState } from "react";

type AreaResult = {
  category: string;
  title: string;
  score: number;
  level: string;
  recommendation: string;
  diagnosis?: string;
};

type Result = {
  overall: number;
  status: string;
  risk: string;
  diagnosis: string;
  areaResults: AreaResult[];
  priorityActions: string[];
};

function getScoreStyle(score: number) {
  if (score >= 80) return { color: "#22c55e", label: "READY", text: "text-green-400" };
  if (score >= 60) return { color: "#eab308", label: "NEED IMPROVEMENT", text: "text-yellow-400" };
  if (score >= 40) return { color: "#f97316", label: "HIGH RISK", text: "text-orange-400" };
  return { color: "#ef4444", label: "CRITICAL", text: "text-red-400" };
}

type Lead = {
  nama: string;
  hotel: string;
  kota: string;
  kamar: string;
  whatsapp: string;
  email: string;
};

export default function PreOpeningResultPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);

  useEffect(() => {
    const storedResult = sessionStorage.getItem(
      "corestay_preopening_result"
    );

    const storedLead = sessionStorage.getItem(
      "corestay_preopening_lead"
    );

    if (storedResult) {
      setResult(JSON.parse(storedResult));
    }

    if (storedLead) {
      setLead(JSON.parse(storedLead));
    }
  }, []);

  if (!result) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-center text-white">
        <h1 className="text-3xl font-bold">
          Pre-opening assessment belum tersedia.
        </h1>
        <p className="mt-4 text-slate-400">
          Silakan ulangi assessment.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

        <header className="border-b border-white/10 pb-8">
          <Image src="/corestay-advisory-result.png" alt="CoreStay Advisory" width={180} height={55} priority className="h-auto w-[150px] object-contain" />

          <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Pre-opening Readiness Report
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            {lead?.hotel || "Hotel Anda"}
          </h1>

          <p className="mt-3 text-slate-400">
            {lead?.kota || "-"} • {lead?.kamar || "-"} kamar
          </p>
        </header>

        <section className="mt-8 grid gap-5 md:grid-cols-3">

          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-7">
            <p className="text-sm text-cyan-300">
              Overall Readiness
            </p>
            <p className="mt-2 text-6xl font-bold text-cyan-400">
              {result.overall}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              dari 100
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">
            <p className="text-sm text-slate-400">
              Status Kesiapan
            </p>
            <p className="mt-4 text-xl font-bold">
              {result.status}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">
            <p className="text-sm text-slate-400">
              Opening Risk
            </p>
            <p className="mt-4 text-xl font-bold text-amber-400">
              {result.risk}
            </p>
          </div>

        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
          <div className="border-b border-white/10 p-7">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Readiness Visualization
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Pre-Opening Readiness Score
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Nilai kesiapan hotel berdasarkan setiap area strategis.
              Semakin tinggi batang, semakin siap area tersebut.
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
              <span className="rounded-full bg-green-500/10 px-3 py-2 text-green-400">🟢 80–100 Ready</span>
              <span className="rounded-full bg-yellow-500/10 px-3 py-2 text-yellow-400">🟡 60–79 Need Improvement</span>
              <span className="rounded-full bg-orange-500/10 px-3 py-2 text-orange-400">🟠 40–59 High Risk</span>
              <span className="rounded-full bg-red-500/10 px-3 py-2 text-red-400">🔴 0–39 Critical</span>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="relative h-[390px]">
              <div className="absolute inset-x-0 top-5 bottom-24 flex flex-col justify-between pointer-events-none">
                {[100,75,50,25,0].map((v) => (
                  <div key={v} className="flex items-center gap-3">
                    <span className="w-8 text-right text-[10px] text-slate-600">{v}</span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>
                ))}
              </div>

              <div className="relative flex h-full items-end gap-3 overflow-x-auto px-3 pb-20 pt-8 md:gap-6">
                {result.areaResults.map((area) => {
                  const score = Math.min(Math.max(Number(area.score) || 0, 0), 100);
                  const style = getScoreStyle(score);

                  return (
                    <div key={area.category} className="group flex h-full min-w-[88px] flex-1 flex-col items-center justify-end">
                      <div className={`mb-2 text-xl font-extrabold ${style.text}`}>
                        {score}%
                      </div>

                      <div className="relative flex h-[240px] w-full max-w-[72px] items-end overflow-hidden rounded-t-2xl bg-slate-800">
                        <div
                          className="w-full rounded-t-2xl transition-all duration-700 group-hover:brightness-125"
                          style={{
                            height: `${score}%`,
                            backgroundColor: style.color,
                            boxShadow: `0 0 28px ${style.color}55`,
                          }}
                        />
                      </div>

                      <p className="mt-3 max-w-[90px] text-center text-[11px] font-semibold leading-4 text-white">
                        {area.title}
                      </p>

                      <p className={`mt-1 text-[9px] font-bold text-center ${style.text}`}>
                        {style.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {result.areaResults.map((area) => {
                const score = Math.min(Math.max(Number(area.score) || 0, 0), 100);
                const style = getScoreStyle(score);

                return (
                  <div
                    key={`visual-${area.category}`}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/70 px-4 py-3"
                  >
                    <div>
                      <p className="text-xs font-semibold text-slate-300">
                        {area.title}
                      </p>
                      <p className={`mt-1 text-[10px] font-bold ${style.text}`}>
                        {style.label}
                      </p>
                    </div>

                    <p className={`text-2xl font-extrabold ${style.text}`}>
                      {score}%
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-orange-400/20 bg-orange-400/5 p-7">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">
            Priority Attention
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            3 Area Prioritas Sebelum Opening
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[...result.areaResults]
              .sort((a, b) => a.score - b.score)
              .slice(0, 3)
              .map((area, index) => {
                const score = Math.min(Math.max(Number(area.score) || 0, 0), 100);
                const style = getScoreStyle(score);

                return (
                  <div
                    key={`priority-${area.category}`}
                    className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className={`text-2xl font-extrabold ${style.text}`}>
                        {score}%
                      </span>
                    </div>

                    <h3 className="mt-5 font-bold">{area.title}</h3>

                    <p className={`mt-2 text-xs font-bold ${style.text}`}>
                      {style.label}
                    </p>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${score}%`,
                          backgroundColor: style.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-7">

          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Executive Diagnosis
          </p>

          <p className="mt-4 text-lg leading-8 text-slate-300">
            {result.diagnosis}
          </p>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900">

          <div className="border-b border-white/10 p-7">
            <h2 className="text-2xl font-bold">
              Pre-opening Readiness Matrix
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Analisis kesiapan berdasarkan setiap area strategis.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">

              <thead className="bg-slate-950">
                <tr>
                  <th className="px-6 py-4">Area</th>
                  <th className="px-6 py-4">Score</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Diagnosis</th>
                  <th className="px-6 py-4">Rekomendasi</th>
                </tr>
              </thead>

              <tbody>
                {result.areaResults.map((area) => (
                  <tr
                    key={area.category}
                    className="border-t border-white/5 align-top"
                  >
                    <td className="px-6 py-5 font-semibold">
                      {area.title}
                    </td>

                    <td className="px-6 py-5">
                      <span className="font-bold text-cyan-400">
                        {area.score}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <span className="rounded-lg bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-400">
                        {area.level}
                      </span>
                    </td>

                    <td className="max-w-xl px-6 py-5 leading-7 text-slate-300">
                      {area.score >= 80 ? "Area sudah memiliki readiness yang baik dan dapat dilanjutkan dengan monitoring." : area.score >= 60 ? "Area sudah mulai siap, tetapi masih terdapat gap yang perlu diselesaikan sebelum opening." : "Area memiliki gap readiness yang signifikan dan perlu menjadi prioritas perbaikan sebelum opening."}
                    </td>

                    <td className="max-w-xl px-6 py-5 leading-7 text-slate-400">
                      {area.recommendation}
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-7">

          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            30-Day Priority Action
          </p>

          <div className="mt-5 space-y-4">
            {result.priorityActions.map((action) => (
              <div
                key={action}
                className="rounded-xl border border-white/10 bg-slate-950 p-4 text-sm leading-7 text-slate-300"
              >
                {action}
              </div>
            ))}
          </div>

        </section>

        <section className="mt-8 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-7">
          <h2 className="text-2xl font-bold">
            Rekomendasi CoreStay Advisory
          </h2>

          <p className="mt-4 leading-8 text-slate-300">
            Hasil assessment menunjukkan area yang perlu diprioritaskan
            sebelum hotel memasuki fase soft opening. Fokus utama sebaiknya
            diarahkan pada penyelesaian gap yang memiliki dampak langsung
            terhadap revenue readiness, operational readiness, people readiness,
            distribution dan financial control.
          </p>

          <p className="mt-4 leading-8 text-slate-400">
            CoreStay Advisory dapat membantu owner melakukan pre-opening
            readiness, penyusunan sistem operasional, SOP, manpower planning,
            pricing & revenue strategy, OTA setup, sales preparation dan
            monitoring opening readiness sampai hotel siap beroperasi.
          </p>
        </section>

        <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-slate-600">
          CoreStay Advisory — Pre-opening Hotel Readiness Assessment
        </footer>

      </div>
    </main>
  );
}








