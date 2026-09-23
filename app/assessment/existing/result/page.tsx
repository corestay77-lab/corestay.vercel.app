"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type ExistingResult = {
  hotelName: string;
  city: string;
  hotelType: string;
  overall: number;
  revenue: number;
  sales: number;
  operasional: number;
  sdm: number;
  financial: number;
  management: number;
};

const areas = [
  { key: "revenue", title: "Revenue & Pricing" },
  { key: "sales", title: "Sales & Marketing" },
  { key: "operasional", title: "Operasional" },
  { key: "sdm", title: "SDM" },
  { key: "financial", title: "Financial" },
  { key: "management", title: "Management & Strategy" },
] as const;

function getScoreStyle(score: number) {
  if (score >= 80)
    return {
      color: "#22c55e",
      label: "READY",
      text: "text-green-400",
      bg: "bg-green-500/10",
    };

  if (score >= 60)
    return {
      color: "#eab308",
      label: "NEED IMPROVEMENT",
      text: "text-yellow-400",
      bg: "bg-yellow-500/10",
    };

  if (score >= 40)
    return {
      color: "#f97316",
      label: "HIGH RISK",
      text: "text-orange-400",
      bg: "bg-orange-500/10",
    };

  return {
    color: "#ef4444",
    label: "CRITICAL",
    text: "text-red-400",
    bg: "bg-red-500/10",
  };
}

function getOverallStatus(score: number) {
  if (score >= 80) return "Hotel memiliki fundamental bisnis yang kuat.";
  if (score >= 60) return "Hotel cukup sehat tetapi masih memiliki beberapa gap.";
  if (score >= 40) return "Hotel memiliki beberapa area bisnis yang perlu segera diperbaiki.";
  return "Hotel berada dalam kondisi critical dan membutuhkan corrective action.";
}

export default function ExistingResultPage() {
  const [result, setResult] = useState<ExistingResult | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("corestay_assessment");

    if (stored) {
      try {
        setResult(JSON.parse(stored));
      } catch {
        setResult(null);
      }
    }
  }, []);

  if (!result) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-center text-white">
        <Image
          src="/corestay-advisory-result.png"
          alt="CoreStay Advisory"
          width={180}
          height={55}
          className="mx-auto h-auto w-[150px]"
        />

        <h1 className="mt-10 text-3xl font-bold">
          Assessment data not found.
        </h1>

        <p className="mt-4 text-slate-400">
          Silakan ulangi assessment hotel existing.
        </p>
      </main>
    );
  }

  const areaResults = areas.map((area) => ({
    ...area,
    score: Math.min(
      100,
      Math.max(0, Number(result[area.key]) || 0)
    ),
  }));

  const priorities = [...areaResults]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  const overallStyle = getScoreStyle(result.overall);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

        <header className="border-b border-white/10 pb-8">
          <Image
            src="/corestay-advisory-result.png"
            alt="CoreStay Advisory"
            width={180}
            height={55}
            priority
            className="h-auto w-[150px] object-contain"
          />

          <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Existing Hotel Business Health Report
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            {result.hotelName || "Hotel Anda"}
          </h1>

          <p className="mt-3 text-slate-400">
            {result.city || "-"} • Existing Hotel
          </p>
        </header>

        <section className="mt-8 grid gap-5 md:grid-cols-3">

          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-7">
            <p className="text-sm text-cyan-300">
              Overall Business Health
            </p>

            <p className="mt-2 text-6xl font-bold text-cyan-400">
              {result.overall}%
            </p>

            <p className="mt-2 text-sm text-slate-400">
              dari 100
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">
            <p className="text-sm text-slate-400">
              Business Status
            </p>

            <p className={`mt-4 text-xl font-bold ${overallStyle.text}`}>
              {overallStyle.label}
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">
            <p className="text-sm text-slate-400">
              Management Diagnosis
            </p>

            <p className="mt-4 text-sm leading-6 text-slate-300">
              {getOverallStatus(result.overall)}
            </p>
          </div>

        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
          <div className="border-b border-white/10 p-7">
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Business Health Matrix
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Analisis Kesehatan Hotel
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Analisis kesehatan hotel berdasarkan empat area strategis.
            </p>
          </div>

          <div className="grid gap-4 p-7 md:grid-cols-2">
            {areaResults.slice(0,4).map((area) => {
              const style = getScoreStyle(area.score);

              return (
                <div
                  key={`matrix-${area.key}`}
                  className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{area.title}</h3>
                    <span className={`text-2xl font-extrabold ${style.text}`}>
                      {area.score}%
                    </span>
                  </div>

                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${area.score}%`,
                        backgroundColor: style.color,
                      }}
                    />
                  </div>

                  <p className={`mt-3 text-xs font-bold ${style.text}`}>
                    {style.label}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900">

          <div className="border-b border-white/10 p-7">

            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Business Health Visualization
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              Existing Hotel Performance Score
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Perbandingan kondisi enam area utama bisnis hotel berdasarkan
              jawaban assessment Anda.
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
              <span className="rounded-full bg-green-500/10 px-3 py-2 text-green-400">
                🟢 80–100 Ready
              </span>

              <span className="rounded-full bg-yellow-500/10 px-3 py-2 text-yellow-400">
                🟡 60–79 Need Improvement
              </span>

              <span className="rounded-full bg-orange-500/10 px-3 py-2 text-orange-400">
                🟠 40–59 High Risk
              </span>

              <span className="rounded-full bg-red-500/10 px-3 py-2 text-red-400">
                🔴 0–39 Critical
              </span>
            </div>
          </div>

          <div className="p-6 md:p-8">

            <div className="relative h-[420px]">

              <div className="absolute inset-x-0 top-5 bottom-28 flex flex-col justify-between pointer-events-none">

                {[100, 75, 50, 25, 0].map((value) => (
                  <div
                    key={value}
                    className="flex items-center gap-3"
                  >
                    <span className="w-8 text-right text-[10px] text-slate-600">
                      {value}
                    </span>

                    <div className="h-px flex-1 bg-white/5" />
                  </div>
                ))}

              </div>

              <div className="relative flex h-full items-end gap-4 overflow-x-auto px-3 pb-24 pt-8 md:gap-7">

                {areaResults.map((area) => {

                  const style = getScoreStyle(area.score);

                  return (
                    <div
                      key={area.key}
                      className="group flex h-full min-w-[100px] flex-1 flex-col items-center justify-end"
                    >

                      <div
                        className={`mb-2 text-xl font-extrabold ${style.text}`}
                      >
                        {area.score}%
                      </div>

                      <div className="relative flex h-[250px] w-full max-w-[76px] items-end overflow-hidden rounded-t-2xl bg-slate-800">

                        <div
                          className="w-full rounded-t-2xl transition-all duration-700 group-hover:brightness-125"
                          style={{
                            height: `${area.score}%`,
                            backgroundColor: style.color,
                            boxShadow: `0 0 28px ${style.color}55`,
                          }}
                        />

                      </div>

                      <p className="mt-3 max-w-[105px] text-center text-[11px] font-semibold leading-4 text-white">
                        {area.title}
                      </p>

                      <p
                        className={`mt-1 text-[9px] font-bold text-center ${style.text}`}
                      >
                        {style.label}
                      </p>

                    </div>
                  );
                })}

              </div>
            </div>

            <div className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-3">

              {areaResults.map((area) => {

                const style = getScoreStyle(area.score);

                return (
                  <div
                    key={`score-${area.key}`}
                    className="rounded-xl border border-white/5 bg-slate-950/70 p-4"
                  >

                    <div className="flex items-center justify-between">

                      <div>
                        <p className="text-xs font-semibold text-slate-300">
                          {area.title}
                        </p>

                        <p
                          className={`mt-1 text-[10px] font-bold ${style.text}`}
                        >
                          {style.label}
                        </p>
                      </div>

                      <p
                        className={`text-2xl font-extrabold ${style.text}`}
                      >
                        {area.score}%
                      </p>

                    </div>

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
            3 Area Prioritas Perbaikan
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Area dengan skor terendah secara otomatis menjadi prioritas
            management.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">

            {priorities.map((area, index) => {

              const style = getScoreStyle(area.score);

              return (
                <div
                  key={`priority-${area.key}`}
                  className="rounded-2xl border border-white/10 bg-slate-950 p-5"
                >

                  <div className="flex items-center justify-between">

                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-sm font-bold">
                      {index + 1}
                    </span>

                    <span
                      className={`text-2xl font-extrabold ${style.text}`}
                    >
                      {area.score}%
                    </span>

                  </div>

                  <h3 className="mt-5 font-bold">
                    {area.title}
                  </h3>

                  <p className={`mt-2 text-xs font-bold ${style.text}`}>
                    {style.label}
                  </p>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">

                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${area.score}%`,
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
            Management Interpretation
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            Kondisi Bisnis Hotel
          </h2>

          <p className="mt-4 text-lg leading-8 text-slate-300">
            {getOverallStatus(result.overall)}
          </p>

          <p className="mt-4 leading-8 text-slate-400">
            Assessment ini menunjukkan area bisnis yang sudah kuat dan area
            yang masih memiliki performance gap. Prioritas perbaikan
            sebaiknya dimulai dari tiga area dengan skor terendah karena
            area tersebut berpotensi memberikan dampak terbesar terhadap
            profitability, operational efficiency dan business growth.
          </p>

        </section>

        <section className="mt-8 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-7">

          <h2 className="text-2xl font-bold">
            Rekomendasi CoreStay Advisory
          </h2>

          <p className="mt-4 leading-8 text-slate-300">
            CoreStay Advisory dapat membantu owner melakukan business
            diagnostic, revenue improvement, pricing strategy, SOP
            optimization, manpower planning, sales development, financial
            control dan management KPI untuk meningkatkan performa hotel.
          </p>

        </section>

        <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-slate-600">
          CoreStay Advisory — Existing Hotel Business Health Assessment
        </footer>

      </div>
    </main>
  );
}



