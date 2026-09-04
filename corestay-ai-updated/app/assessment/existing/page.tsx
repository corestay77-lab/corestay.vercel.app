"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = {
  label: string;
  score: number;
};

type Question = {
  category: string;
  title: string;
  question: string;
  options: Option[];
};

const options: Option[] = [
  { label: "Belum ada / tidak dilakukan", score: 0 },
  { label: "Masih sangat terbatas", score: 25 },
  { label: "Sudah ada tetapi belum konsisten", score: 50 },
  { label: "Sudah berjalan dan dimonitor", score: 75 },
  { label: "Sudah optimal dan dievaluasi rutin", score: 100 },
];

const questions: Question[] = [
  {
    category: "revenue",
    title: "Revenue & Pricing",
    question:
      "Seberapa baik hotel menentukan harga kamar berdasarkan demand dan kondisi pasar?",
    options,
  },
  {
    category: "revenue",
    title: "Revenue & Pricing",
    question:
      "Seberapa baik hotel memonitor Occupancy, ADR dan RevPAR?",
    options,
  },
  {
    category: "revenue",
    title: "Revenue & Pricing",
    question:
      "Seberapa optimal penggunaan OTA dan channel distribusi hotel?",
    options,
  },
  {
    category: "revenue",
    title: "Revenue & Pricing",
    question:
      "Seberapa baik hotel mengelola promo, discount, corporate rate dan direct booking?",
    options,
  },

  {
    category: "sales",
    title: "Sales & Marketing",
    question:
      "Seberapa jelas target market dan positioning hotel?",
    options,
  },
  {
    category: "sales",
    title: "Sales & Marketing",
    question:
      "Seberapa aktif hotel melakukan sales dan membangun corporate account?",
    options,
  },
  {
    category: "sales",
    title: "Sales & Marketing",
    question:
      "Seberapa konsisten hotel menjalankan marketing, digital promotion dan customer acquisition?",
    options,
  },

  {
    category: "operasional",
    title: "Operasional",
    question:
      "Seberapa lengkap SOP operasional hotel saat ini?",
    options,
  },
  {
    category: "operasional",
    title: "Operasional",
    question:
      "Seberapa konsisten SOP dijalankan oleh setiap department?",
    options,
  },
  {
    category: "operasional",
    title: "Operasional",
    question:
      "Seberapa baik hotel melakukan quality control terhadap pelayanan dan kebersihan?",
    options,
  },
  {
    category: "operasional",
    title: "Operasional",
    question:
      "Seberapa baik hotel mengontrol biaya dan efisiensi operasional?",
    options,
  },

  {
    category: "sdm",
    title: "SDM",
    question:
      "Seberapa jelas struktur organisasi dan pembagian tanggung jawab karyawan?",
    options,
  },
  {
    category: "sdm",
    title: "SDM",
    question:
      "Seberapa baik recruitment, manpower planning dan penempatan karyawan dilakukan?",
    options,
  },
  {
    category: "sdm",
    title: "SDM",
    question:
      "Seberapa baik training, KPI dan evaluasi kinerja karyawan dijalankan?",
    options,
  },

  {
    category: "financial",
    title: "Financial",
    question:
      "Seberapa baik hotel memiliki laporan profit & loss yang rutin dan akurat?",
    options,
  },
  {
    category: "financial",
    title: "Financial",
    question:
      "Seberapa baik hotel mengetahui serta mengontrol cost setiap department?",
    options,
  },
  {
    category: "financial",
    title: "Financial",
    question:
      "Seberapa baik management mengetahui profitability dan cash flow hotel?",
    options,
  },

  {
    category: "management",
    title: "Management & Strategy",
    question:
      "Seberapa baik management menggunakan data dan KPI dalam mengambil keputusan?",
    options,
  },
  {
    category: "management",
    title: "Management & Strategy",
    question:
      "Seberapa rutin owner atau management melakukan business review dan evaluasi KPI?",
    options,
  },
  {
    category: "management",
    title: "Management & Strategy",
    question:
      "Seberapa jelas strategi, target dan action plan hotel untuk meningkatkan kinerja bisnis?",
    options,
  },
];

const categories = [
  "revenue",
  "sales",
  "operasional",
  "sdm",
  "financial",
  "management",
];

export default function ExistingAssessmentPage() {
  const router = useRouter();

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [hotelName, setHotelName] = useState("");
  const [city, setCity] = useState("");

  const question = questions[current];
  const selectedAnswer = answers[current];

  function selectAnswer(score: number) {
    const updated = [...answers];
    updated[current] = score;
    setAnswers(updated);
  }

  function previousQuestion() {
    if (current > 0) {
      setCurrent(current - 1);
    }
  }

  function calculateResult(finalAnswers: number[]) {
    const categoryScores: Record<string, number> = {};

    categories.forEach((category) => {
      const categoryQuestions = questions
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.category === category);

      const values = categoryQuestions.map(
        ({ index }) => finalAnswers[index] ?? 0
      );

      categoryScores[category] = values.length
        ? Math.round(
            values.reduce((sum, value) => sum + value, 0) /
              values.length
          )
        : 0;
    });

    const overall = Math.round(
      categories.reduce(
        (sum, category) => sum + categoryScores[category],
        0
      ) / categories.length
    );

    return {
      hotelName,
      city,
      hotelType: "existing",
      overall,
      revenue: categoryScores.revenue,
      sales: categoryScores.sales,
      operasional: categoryScores.operasional,
      sdm: categoryScores.sdm,
      financial: categoryScores.financial,
      management: categoryScores.management,
    };
  }

  function notifyAssessmentCompleted(result: ReturnType<typeof calculateResult>) {
    const areaTitles: Record<string, string> = {
      revenue: "Revenue & Pricing",
      sales: "Sales & Marketing",
      operasional: "Operasional",
      sdm: "SDM",
      financial: "Financial",
      management: "Management & Strategy",
    };

    const areas = categories.map((category) => ({
      title: areaTitles[category],
      score: result[category as keyof typeof result] as number,
    }));

    const priorities = [...areas].sort((a, b) => a.score - b.score).slice(0, 3);

    // Fire-and-forget: jangan blok navigasi user kalau email gagal terkirim.
    fetch("/api/notify-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelType: "existing",
        hotelName: result.hotelName,
        city: result.city,
        overall: result.overall,
        areas,
        priorities,
      }),
    }).catch((err) => {
      console.error("Gagal mengirim notifikasi email assessment:", err);
    });
  }

  function nextQuestion() {
    if (selectedAnswer === undefined) {
      return;
    }

    if (current < questions.length - 1) {
      setCurrent(current + 1);
      return;
    }

    const result = calculateResult(answers);

    sessionStorage.setItem(
      "corestay_assessment",
      JSON.stringify(result)
    );

    notifyAssessmentCompleted(result);

    router.push("/assessment/existing/result");
  }

  const progress = Math.round(
    ((current + 1) / questions.length) * 100
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">

        <header>
          <div className="flex items-center justify-between">
            <Image src="/logo.png" alt="CoreStay Advisory" width={180} height={55} priority className="h-auto w-[150px] object-contain" />

            <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs text-cyan-300">
              Hotel Existing
            </span>
          </div>

          <h1 className="mt-8 text-4xl font-bold md:text-5xl">
            Assessment Kesehatan Bisnis Hotel
          </h1>

          <p className="mt-4 text-slate-400">
            Evaluasi kondisi hotel berdasarkan 6 area utama bisnis hotel.
          </p>
        </header>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">
              Pertanyaan {current + 1} dari {questions.length}
            </span>

            <span className="font-semibold text-cyan-400">
              {progress}%
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
            {question.title}
          </p>

          <h2 className="mt-3 text-2xl font-bold leading-9">
            {question.question}
          </h2>

          <div className="mt-7 space-y-3">
            {question.options.map((option, index) => (
              <button
                key={`${option.label}-${index}`}
                type="button"
                onClick={() => selectAnswer(option.score)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedAnswer === option.score
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-slate-700 bg-slate-950 hover:border-cyan-400"
                }`}
              >
                <div className="font-medium">
                  {option.label}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  Nilai: {option.score}
                </div>
              </button>
            ))}
          </div>
        </section>

        

        <div className="mt-8 flex items-center justify-between gap-4">

          <button
            type="button"
            onClick={previousQuestion}
            disabled={current === 0}
            className={`rounded-xl border px-5 py-3 text-sm font-semibold transition ${
              current === 0
                ? "cursor-not-allowed border-slate-800 text-slate-700"
                : "border-slate-700 text-slate-300 hover:border-cyan-400 hover:text-cyan-400"
            }`}
          >
            ← Sebelumnya
          </button>

          <button
            type="button"
            onClick={nextQuestion}
            disabled={selectedAnswer === undefined}
            className={`flex items-center gap-3 rounded-xl px-6 py-3 text-sm font-semibold transition ${
              selectedAnswer === undefined
                ? "cursor-not-allowed bg-slate-800 text-slate-600"
                : "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
            }`}
          >
            {current === questions.length - 1
              ? "Lihat Hasil"
              : "Pertanyaan Berikutnya"}

            <span className="text-lg">→</span>
          </button>

        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Jawab berdasarkan kondisi hotel Anda saat ini.
        </p>

      </div>
    </main>
  );
}








