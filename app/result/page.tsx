"use client";

import Image from "next/image";

import { useEffect, useState } from "react";
import { getDiagnosis, getOverallDiagnosis } from "../../lib/scoring";

type AssessmentData = {
  hotelName?: string;
  city?: string;
  overall: number;
  revenue: number;
  operasional: number;
  sdm: number;
  manajemen: number;
};

type LeadData = {
  nama: string;
  hotel: string;
  kota: string;
  kamar: string;
  whatsapp: string;
  email: string;
};

type AreaResult = {
  category: string;
  title: string;
  score: number;
  level: string;
  diagnosis: string;
  recommendation: string;
};

export default function ResultPage() {
  const [assessment, setAssessment] =
    useState<AssessmentData | null>(null);

  const [lead, setLead] =
    useState<LeadData | null>(null);

  useEffect(() => {
    const savedAssessment =
      sessionStorage.getItem("corestay_assessment");

    const savedLead =
      sessionStorage.getItem("corestay_lead");

    if (savedAssessment) {
      try {
        setAssessment(JSON.parse(savedAssessment));
      } catch {
        console.error("Data assessment tidak dapat dibaca.");
      }
    }

    if (savedLead) {
      try {
        setLead(JSON.parse(savedLead));
      } catch {
        console.error("Data lead tidak dapat dibaca.");
      }
    }
  }, []);

  if (!assessment) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-center text-white">
        <h1 className="text-3xl font-bold">
          Assessment belum tersedia.
        </h1>

        <p className="mt-4 text-slate-400">
          Silakan ulangi assessment hotel.
        </p>

        <a
          href="/assessment"
          className="mt-8 inline-block rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950"
        >
          Mulai Assessment
        </a>
      </main>
    );
  }

  const {
    overall,
    revenue,
    operasional,
    sdm,
    manajemen,
  } = assessment;

  const overallResult =
    getOverallDiagnosis(overall);

  const revenueResult =
    getDiagnosis("revenue", revenue);

  const operationalResult =
    getDiagnosis("operasional", operasional);

  const sdmResult =
    getDiagnosis("sdm", sdm);

  const managementResult =
    getDiagnosis("manajemen", manajemen);

  function getLevel(score: number) {
    if (score >= 80) return "Optimal";
    if (score >= 65) return "Baik";
    if (score >= 50) return "Perlu Perbaikan";
    if (score >= 30) return "Risiko Tinggi";
    return "Kritis";
  }

  function getRisk(score: number) {
    if (score >= 80) return "Rendah";
    if (score >= 65) return "Sedang";
    if (score >= 50) return "Sedang–Tinggi";
    return "Tinggi";
  }

  function getPriority(score: number) {
    if (score < 50) return "KRITIS";
    if (score < 65) return "TINGGI";
    if (score < 80) return "SEDANG";
    return "RENDAH";
  }

  const areaResults: AreaResult[] = [
    {
      category: "revenue",
      title: "Revenue & Pricing",
      score: revenue,
      level: getPriority(revenue),
      diagnosis: revenueResult.diagnosis,
      recommendation: revenueResult.recommendation,
    },
    {
      category: "operasional",
      title: "Operasional",
      score: operasional,
      level: getPriority(operasional),
      diagnosis: operationalResult.diagnosis,
      recommendation: operationalResult.recommendation,
    },
    {
      category: "sdm",
      title: "SDM",
      score: sdm,
      level: getPriority(sdm),
      diagnosis: sdmResult.diagnosis,
      recommendation: sdmResult.recommendation,
    },
    {
      category: "manajemen",
      title: "Manajemen",
      score: manajemen,
      level: getPriority(manajemen),
      diagnosis: managementResult.diagnosis,
      recommendation: managementResult.recommendation,
    },
  ];

  const priorityArea =
    [...areaResults].sort(
      (a, b) => a.score - b.score
    )[0];

  const businessRisk = getRisk(overall);

  const hotelName =
    lead?.hotel ||
    assessment.hotelName ||
    "Hotel Anda";

  const city =
    lead?.kota ||
    assessment.city ||
    "-";

  const roomCount =
    lead?.kamar ||
    "-";

  const priorityActions = [
    `Prioritaskan perbaikan area ${priorityArea.title} yang saat ini memiliki skor ${priorityArea.score}/100.`,
    "Lakukan review KPI dan performance hotel secara rutin untuk memastikan perbaikan berjalan terukur.",
    "Perkuat sistem operasional dan accountability setiap department.",
    "Evaluasi strategi revenue, pricing, distribution dan sales untuk meningkatkan profitability hotel.",
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">

        <header className="border-b border-white/10 pb-8">

          <Image src="/logo.png" alt="CoreStay Advisory" width={180} height={55} priority className="h-auto w-[150px] object-contain" />

          <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Hotel Existing Business Health Report
          </p>

          <h1 className="mt-3 text-4xl font-bold md:text-5xl">
            {hotelName}
          </h1>

          <p className="mt-3 text-slate-400">
            {city} • {roomCount} kamar
          </p>

        </header>

        <section className="mt-8 grid gap-5 md:grid-cols-3">

          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-7">

            <p className="text-sm text-cyan-300">
              Overall Business Health
            </p>

            <p className="mt-2 text-6xl font-bold text-cyan-400">
              {overall}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              dari 100
            </p>

          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">

            <p className="text-sm text-slate-400">
              Business Status
            </p>

            <p className="mt-4 text-xl font-bold">
              {overallResult.status}
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {getLevel(overall)}
            </p>

          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7">

            <p className="text-sm text-slate-400">
              Business Risk
            </p>

            <p className="mt-4 text-xl font-bold text-amber-400">
              {businessRisk}
            </p>

          </div>

        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-7">

          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Executive Diagnosis
          </p>

          <p className="mt-4 text-lg leading-8 text-slate-300">
            {overallResult.description}
          </p>

        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900">

          <div className="border-b border-white/10 p-7">

            <h2 className="text-2xl font-bold">
              Business Health Matrix
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Analisis kesehatan hotel berdasarkan empat area strategis.
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px] text-left text-sm">

              <thead className="bg-slate-950">

                <tr>
                  <th className="px-6 py-4">
                    Area
                  </th>

                  <th className="px-6 py-4">
                    Score
                  </th>

                  <th className="px-6 py-4">
                    Priority
                  </th>

                  <th className="px-6 py-4">
                    Diagnosis
                  </th>

                  <th className="px-6 py-4">
                    Rekomendasi
                  </th>
                </tr>

              </thead>

              <tbody>

                {areaResults.map((area) => (

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

                      <span className="ml-1 text-xs text-slate-500">
                        /100
                      </span>

                    </td>

                    <td className="px-6 py-5">

                      <span className="rounded-lg bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-400">
                        {area.level}
                      </span>

                    </td>

                    <td className="max-w-sm px-6 py-5 leading-7 text-slate-400">
                      {area.diagnosis}
                    </td>

                    <td className="max-w-sm px-6 py-5 leading-7 text-slate-300">
                      {area.recommendation}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </section>

        <section className="mt-8 rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-7">

          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            Priority Area
          </p>

          <h2 className="mt-3 text-3xl font-bold">
            Fokus pertama: {priorityArea.title}
          </h2>

          <div className="mt-5 flex items-end gap-3">

            <span className="text-6xl font-bold text-cyan-400">
              {priorityArea.score}
            </span>

            <span className="mb-2 text-slate-500">
              / 100
            </span>

          </div>

          <p className="mt-5 max-w-3xl leading-8 text-slate-300">
            Area ini memiliki skor paling rendah dibandingkan area
            bisnis lainnya. Perbaikan area ini berpotensi memberikan
            dampak paling besar terhadap kesehatan bisnis hotel.
          </p>

        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-7">

          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            30-Day Priority Action
          </p>

          <div className="mt-5 space-y-4">

            {priorityActions.map((action) => (

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
            Hasil assessment menunjukkan kondisi kesehatan bisnis hotel
            berdasarkan Revenue & Pricing, Operasional, SDM dan Manajemen.
            Area dengan skor terendah menjadi prioritas utama untuk
            dilakukan perbaikan.
          </p>

          <p className="mt-4 leading-8 text-slate-400">
            CoreStay Advisory dapat membantu owner melakukan business
            assessment lanjutan, revenue improvement, operational system,
            SOP, manpower planning, KPI implementation, OTA & distribution
            strategy serta monitoring performance hotel.
          </p>

          <a
            href="https://wa.me/6285109006363"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Konsultasi dengan CoreStay Advisory
          </a>

        </section>

        <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-slate-600">
          CoreStay Advisory — Hotel Existing Business Health Assessment
        </footer>

      </div>
    </main>
  );
}



