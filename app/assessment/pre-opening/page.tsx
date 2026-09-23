"use client";

import Image from "next/image";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Question = {
  category: string;
  title: string;
  question: string;
  options: string[];
};

const questions: Question[] = [
  {
    category: "concept",
    title: "Konsep & Positioning",
    question: "Seberapa jelas konsep dan positioning hotel yang akan dibuka?",
    options: [
      "Belum ada konsep yang jelas",
      "Konsep masih berupa ide",
      "Konsep sudah ditentukan",
      "Positioning dan target market sudah jelas",
      "Konsep, positioning dan USP sudah tervalidasi",
    ],
  },
  {
    category: "market",
    title: "Market",
    question: "Seberapa baik target market hotel sudah ditentukan?",
    options: [
      "Belum menentukan target market",
      "Target market masih umum",
      "Segmen utama sudah ditentukan",
      "Segmen dan kebutuhan pelanggan dianalisis",
      "Market segmentation dan demand analysis sudah matang",
    ],
  },
  {
    category: "feasibility",
    title: "Feasibility",
    question: "Seberapa lengkap studi kelayakan dan business plan hotel?",
    options: [
      "Belum tersedia",
      "Masih berupa estimasi sederhana",
      "Ada business plan dasar",
      "Feasibility dan financial projection tersedia",
      "Feasibility tervalidasi dengan scenario analysis",
    ],
  },
  {
    category: "revenue",
    title: "Pricing & Revenue",
    question: "Seberapa siap strategi pricing dan BAR hotel?",
    options: [
      "Belum menentukan harga",
      "Harga hanya mengikuti kompetitor",
      "BAR sudah ditentukan",
      "BAR berdasarkan market dan positioning",
      "Pricing architecture dan revenue strategy sudah siap",
    ],
  },
  {
    category: "distribution",
    title: "Distribution",
    question: "Seberapa siap channel penjualan dan OTA hotel?",
    options: [
      "Belum ada channel",
      "Baru merencanakan OTA",
      "OTA utama sudah dipilih",
      "OTA, direct booking dan corporate channel siap",
      "Channel mix dan distribution strategy sudah optimal",
    ],
  },
  {
    category: "operations",
    title: "Operasional",
    question: "Seberapa siap SOP operasional sebelum opening?",
    options: [
      "Belum ada SOP",
      "SOP masih dalam perencanaan",
      "SOP department utama tersedia",
      "SOP lengkap dan mulai diuji",
      "SOP lengkap, diuji dan siap digunakan saat opening",
    ],
  },
  {
    category: "hr",
    title: "SDM",
    question: "Seberapa siap recruitment dan struktur organisasi?",
    options: [
      "Belum ada struktur atau recruitment",
      "Struktur masih dirancang",
      "Struktur dan manpower plan tersedia",
      "Recruitment dan training berjalan",
      "Full team, job description, KPI dan training siap",
    ],
  },
  {
    category: "system",
    title: "System",
    question: "Seberapa siap PMS, POS dan sistem hotel?",
    options: [
      "Belum memilih sistem",
      "Masih membandingkan vendor",
      "Sistem sudah dipilih",
      "Sistem sudah dikonfigurasi",
      "PMS/POS, channel manager dan reporting sudah terintegrasi",
    ],
  },
  {
    category: "procurement",
    title: "Procurement",
    question: "Seberapa siap pengadaan equipment, linen dan amenities?",
    options: [
      "Belum dimulai",
      "Baru membuat daftar kebutuhan",
      "Vendor dan kebutuhan utama sudah ditentukan",
      "Sebagian besar kebutuhan sudah tersedia",
      "Seluruh kebutuhan opening sudah siap dan terkontrol",
    ],
  },
  {
    category: "sales",
    title: "Sales & Marketing",
    question: "Seberapa siap strategi sales dan marketing sebelum opening?",
    options: [
      "Belum ada strategi",
      "Baru membuat akun media sosial",
      "Marketing plan dasar tersedia",
      "Sales plan, digital marketing dan pre-opening campaign siap",
      "Sales pipeline dan opening campaign sudah berjalan",
    ],
  },
  {
    category: "finance",
    title: "Financial Readiness",
    question: "Seberapa siap budget dan cash flow untuk fase opening?",
    options: [
      "Belum memiliki budget yang jelas",
      "Budget masih berupa perkiraan",
      "Budget opening sudah dibuat",
      "Budget dan cash flow projection tersedia",
      "Budget, cash flow, contingency dan break-even sudah dianalisis",
    ],
  },
  {
    category: "readiness",
    title: "Opening Readiness",
    question: "Seberapa siap hotel untuk menerima tamu pertama?",
    options: [
      "Belum siap",
      "Masih banyak area kritis",
      "Sebagian besar area sedang dipersiapkan",
      "Minor preparation masih diperlukan",
      "Hotel siap untuk soft opening",
    ],
  },
];

const recommendation: Record<string, Record<string, string>> = {
  concept: {
    Critical: "Finalisasi konsep hotel, positioning, target customer dan USP sebelum keputusan komersial berikutnya dibuat.",
    High: "Lakukan refinement positioning dan validasi USP terhadap competitive set serta target market.",
    Medium: "Dokumentasikan positioning, customer profile dan value proposition agar menjadi dasar seluruh strategi komersial.",
    Low: "Pertahankan positioning dan lakukan validasi berkala terhadap perubahan demand pasar.",
  },
  market: {
    Critical: "Lakukan market study dan competitive mapping sebelum menetapkan pricing, revenue projection dan sales strategy.",
    High: "Perjelas segmentation, target customer, demand pattern dan competitive set.",
    Medium: "Perkuat demand analysis dan customer profiling untuk mendukung strategi komersial.",
    Low: "Lanjutkan monitoring demand dan competitive movement secara berkala.",
  },
  feasibility: {
    Critical: "Business plan dan feasibility study perlu diselesaikan sebelum opening commitment dilakukan.",
    High: "Validasi financial projection, demand assumption, CAPEX, OPEX dan scenario analysis.",
    Medium: "Perkuat sensitivity analysis dan proyeksi cash flow untuk 12 bulan pertama.",
    Low: "Gunakan feasibility sebagai baseline monitoring kinerja setelah opening.",
  },
  revenue: {
    Critical: "Pricing architecture, BAR, room-type pricing dan revenue strategy harus diselesaikan sebelum inventory dijual.",
    High: "Bangun BAR berdasarkan competitive set, positioning, demand dan target profitability.",
    Medium: "Finalisasi pricing ladder, promotion strategy, OTA parity dan revenue monitoring.",
    Low: "Siapkan revenue calendar dan mekanisme dynamic pricing sejak awal operasi.",
  },
  distribution: {
    Critical: "Segera siapkan OTA, direct booking, corporate channel dan channel manager sebelum opening.",
    High: "Finalisasi channel mix, OTA setup, content, rate parity dan distribution strategy.",
    Medium: "Optimalkan contribution masing-masing channel dan siapkan direct booking engine.",
    Low: "Tetapkan channel contribution target dan monitoring distribution cost.",
  },
  operations: {
    Critical: "SOP inti FO, HK, F&B, Engineering, Security dan Emergency harus tersedia dan diuji sebelum opening.",
    High: "Lakukan SOP completion, simulation dan operational readiness audit.",
    Medium: "Uji SOP melalui dry run dan dokumentasikan gap sebelum soft opening.",
    Low: "Tetapkan SOP audit dan continuous improvement setelah opening.",
  },
  hr: {
    Critical: "Recruitment, manpower plan, job description dan training harus menjadi prioritas sebelum opening.",
    High: "Percepat recruitment dan training untuk posisi kritis serta tetapkan KPI setiap department.",
    Medium: "Finalisasi manpower deployment, training matrix dan performance standard.",
    Low: "Lakukan competency assessment dan continuous training sebelum soft opening.",
  },
  system: {
    Critical: "Pilih dan implementasikan PMS, POS, channel manager dan reporting system sebelum hotel menerima transaksi.",
    High: "Selesaikan konfigurasi sistem, user access, rate setup, inventory dan reporting.",
    Medium: "Lakukan integration testing dan user training sebelum soft opening.",
    Low: "Siapkan dashboard KPI dan audit system setelah sistem berjalan.",
  },
  procurement: {
    Critical: "Buat procurement tracker dan prioritaskan seluruh item yang berdampak langsung terhadap opening.",
    High: "Percepat pengadaan equipment, OS&E, linen, amenities dan operational supplies.",
    Medium: "Pastikan seluruh item memiliki vendor, timeline dan quality control.",
    Low: "Finalisasi stock level, reorder point dan vendor management.",
  },
  sales: {
    Critical: "Bangun sales pipeline dan pre-opening campaign segera agar hotel tidak membuka tanpa demand.",
    High: "Aktifkan corporate sales, OTA content, digital campaign dan opening promotion.",
    Medium: "Perkuat sales pipeline, database prospect dan conversion tracking.",
    Low: "Tetapkan sales target dan channel contribution sejak bulan pertama.",
  },
  finance: {
    Critical: "Finalisasi opening budget, cash flow, contingency dan break-even sebelum opening.",
    High: "Validasi cash requirement dan monthly burn rate sampai hotel mencapai stabilisasi.",
    Medium: "Bangun financial dashboard dan monthly cash flow monitoring.",
    Low: "Tetapkan budget control dan variance analysis sejak bulan pertama.",
  },
  readiness: {
    Critical: "Hotel belum direkomendasikan untuk opening. Lakukan full pre-opening readiness audit.",
    High: "Selesaikan seluruh critical gap dan lakukan mock operation sebelum soft opening.",
    Medium: "Lakukan final readiness checklist dan dry run lintas department.",
    Low: "Hotel relatif siap; lakukan final inspection dan controlled soft opening.",
  },
};

function getLevel(score: number) {
  if (score < 40) return "Critical";
  if (score < 60) return "High";
  if (score < 80) return "Medium";
  return "Low";
}

export default function PreOpeningAssessmentPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  function selectAnswer(score: number) {
    const next = [...answers];
    next[current] = score;
    setAnswers(next);

    if (current < questions.length - 1) {
      setCurrent(current + 1);
      return;
    }

    const scores: Record<string, number> = {};

    questions.forEach((question, index) => {
      scores[question.category] = next[index] ?? 0;
    });

    const overall = Math.round(
      next.reduce((sum, score) => sum + score, 0) / questions.length
    );

    const areaResults = questions.map((question, index) => {
      const score = next[index] ?? 0;
      const level = getLevel(score);

      return {
        category: question.category,
        title: question.title,
        score,
        level,
        recommendation: recommendation[question.category][level],
      };
    });

    const criticalAreas = areaResults.filter(
      (item) => item.level === "Critical"
    );

    const highAreas = areaResults.filter(
      (item) => item.level === "High"
    );

    let status = "READY / NEAR OPENING";
    let risk = "LOW";

    if (overall < 40) {
      status = "HIGH RISK — NOT READY";
      risk = "HIGH";
    } else if (overall < 60) {
      status = "NEEDS PREPARATION";
      risk = "HIGH";
    } else if (overall < 80) {
      status = "CONDITIONAL READY";
      risk = "MEDIUM";
    }

    let diagnosis =
      "Hotel memiliki fondasi pre-opening yang cukup baik dan dapat melanjutkan persiapan menuju soft opening.";

    if (overall < 40) {
      diagnosis =
        "Hotel belum memiliki tingkat kesiapan yang memadai untuk opening. Terdapat gap fundamental yang perlu diselesaikan sebelum hotel menerima tamu.";
    } else if (overall < 60) {
      diagnosis =
        "Hotel masih memiliki beberapa risiko pre-opening yang signifikan. Opening sebaiknya tidak dilakukan sebelum area prioritas diperbaiki.";
    } else if (overall < 80) {
      diagnosis =
        "Hotel berada pada tahap conditional ready. Sebagian besar fondasi sudah tersedia, namun beberapa area masih membutuhkan corrective action sebelum soft opening.";
    }

    const priorityActions = areaResults
      .filter((item) => item.score < 80)
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(
        (item, index) =>
          `${index + 1}. ${item.title}: ${item.recommendation}`
      );

    const result = {
      hotelType: "preopening",
      overall,
      status,
      risk,
      diagnosis,
      scores,
      areaResults,
      criticalAreas,
      highAreas,
      priorityActions,
      completedAt: new Date().toISOString(),
    };

    sessionStorage.setItem(
      "corestay_preopening_result",
      JSON.stringify(result)
    );

    router.push("/assessment/pre-opening/lead");
  }

  const progress = Math.round(((current + 1) / questions.length) * 100);
  const question = questions[current];

  function previousQuestion() {
    if (current > 0) setCurrent(current - 1);
  }

  function nextQuestion() {
    if (current < questions.length - 1) setCurrent(current + 1);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">

        <Image src="/logo.png" alt="CoreStay Advisory" width={180} height={55} priority className="h-auto w-[150px] object-contain" />

        <div className="mt-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
              Pre-opening Hotel
            </p>
            <h1 className="mt-3 text-4xl font-bold md:text-5xl">
              Pre-opening Readiness Assessment
            </h1>
          </div>

          <span className="rounded-full bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-400">
            {progress}%
          </span>
        </div>

        <div className="mt-8 h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">

          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            {question.title}
          </p>

          <h2 className="mt-4 text-2xl font-bold leading-9">
            {question.question}
          </h2>

          <div className="mt-7 space-y-3">
            {question.options.map((option, index) => (
              <button
                key={option}
                type="button"
                onClick={() => selectAnswer(index * 25)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 p-5 text-left transition hover:border-cyan-400 hover:bg-cyan-400/5"
              >
                <div className="font-medium">
                  {option}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Nilai: {index * 25}
                </div>
              </button>
            ))}
          </div>

        </section>

        <p className="mt-6 text-center text-sm text-slate-500">
          Pertanyaan {current + 1} dari {questions.length}
        </p>

      </div>
    <div className="mt-8 flex items-center justify-between gap-4"><button type="button" onClick={previousQuestion} disabled={current === 0} className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-40">← Sebelumnya</button><button type="button" onClick={nextQuestion} disabled={current >= questions.length - 1} className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Pertanyaan Berikutnya →</button></div></main>
  );
}



