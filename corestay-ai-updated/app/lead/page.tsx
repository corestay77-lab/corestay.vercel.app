"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AssessmentData = {
overall?: number;
revenue?: number;
operasional?: number;
sdm?: number;
manajemen?: number;
};

export default function LeadPage() {
const router = useRouter();

const [form, setForm] = useState({
nama: "",
hotel: "",
kota: "",
kamar: "",
whatsapp: "",
email: "",
});

const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

function updateField(
field: keyof typeof form,
value: string
) {
setForm(function (previous) {
return {
...previous,
[field]: value,
};
});
}

function getLevel(score: number) {
if (score < 40) {
return "Kritis";
}

if (score < 60) {
  return "Perlu Perbaikan";
}

if (score < 80) {
  return "Cukup Baik";
}

return "Baik";

}

function getDiagnosis(
revenue: number,
operasional: number,
sdm: number,
manajemen: number
) {
const scores = [
{
name: "Revenue & Pricing",
score: revenue,
},
{
name: "Operasional",
score: operasional,
},
{
name: "SDM",
score: sdm,
},
{
name: "Manajemen",
score: manajemen,
},
];

let priority = scores[0];

for (const item of scores) {
  if (item.score < priority.score) {
    priority = item;
  }
}

return priority;

}

function getRecommendation(
revenue: number,
operasional: number,
sdm: number,
manajemen: number
) {
const recommendations: string[] = [];

if (revenue < 60) {
  recommendations.push(
    "Review strategi pricing, BAR, positioning, dan channel mix untuk meningkatkan revenue."
  );
}

if (operasional < 60) {
  recommendations.push(
    "Rapikan SOP, checklist operasional, alur kerja antar-department, dan quality control."
  );
}

if (sdm < 60) {
  recommendations.push(
    "Perjelas struktur organisasi, job description, KPI, target kerja, dan sistem evaluasi SDM."
  );
}

if (manajemen < 60) {
  recommendations.push(
    "Bangun management reporting rutin agar owner dapat mengambil keputusan berdasarkan KPI dan profitabilitas."
  );
}

if (recommendations.length === 0) {
  recommendations.push(
    "Pertahankan sistem yang sudah berjalan dan lakukan continuous improvement berbasis KPI, profitability, dan customer experience."
  );
}

return recommendations.join(" ");

}

async function handleSubmit(
event: FormEvent<HTMLFormElement>
) {
event.preventDefault();

setError("");

if (
  !form.nama ||
  !form.hotel ||
  !form.kota ||
  !form.kamar ||
  !form.whatsapp
) {
  setError("Mohon lengkapi data yang wajib diisi.");
  return;
}

setLoading(true);

try {
  const assessmentData =
    sessionStorage.getItem("corestay_assessment");

  if (!assessmentData) {
    setError(
      "Data assessment tidak ditemukan. Silakan kembali ke halaman assessment."
    );

    setLoading(false);
    return;
  }

  const assessment: AssessmentData =
    JSON.parse(assessmentData);

  const revenue = Number(assessment.revenue || 0);
  const operasional = Number(
    assessment.operasional || 0
  );
  const sdm = Number(assessment.sdm || 0);
  const manajemen = Number(
    assessment.manajemen || 0
  );

  const overall = Math.round(
    (revenue +
      operasional +
      sdm +
      manajemen) /
      4
  );

  const diagnosis = getDiagnosis(
    revenue,
    operasional,
    sdm,
    manajemen
  );

  const recommendation = getRecommendation(
    revenue,
    operasional,
    sdm,
    manajemen
  );

  const priority =
    diagnosis.name +
    " — " +
    getLevel(diagnosis.score);

  const diagnosisText =
    diagnosis.name +
    " menjadi area prioritas dengan skor " +
    diagnosis.score +
    "/100.";

  const notesText =
    "Jumlah kamar: " +
    form.kamar;

  const { error: insertError } =
    await supabase
      .from("assessments")
      .insert({
        hotel_name: form.hotel,
        city: form.kota,
        contact_name: form.nama,
        email: form.email || null,
        whatsapp: form.whatsapp,

        overall: overall,
        revenue: revenue,
        operasional: operasional,
        sdm: sdm,

        lead_status: "New",

        diagnosis: diagnosisText,
        recommendation: recommendation,
        priority: priority,

        notes: notesText,
      });

  if (insertError) {
    console.error(
      "SUPABASE INSERT ERROR:",
      insertError
    );

    setError(
      "Data belum berhasil disimpan. Silakan coba lagi."
    );

    setLoading(false);
    return;
  }

  sessionStorage.setItem(
    "corestay_lead",
    JSON.stringify(form)
  );

  sessionStorage.setItem(
    "corestay_result",
    JSON.stringify({
      overall: overall,
      revenue: revenue,
      operasional: operasional,
      sdm: sdm,
      manajemen: manajemen,
      diagnosis: diagnosis.name,
      priority: priority,
      recommendation: recommendation,
    })
  );

  router.push("/result");
} catch (submitError) {
  console.error(
    "SUBMIT ERROR:",
    submitError
  );

  setError(
    "Terjadi kesalahan saat menyimpan data."
  );

  setLoading(false);
}

}

return ( <main className="min-h-screen bg-slate-950 text-white"> <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">

    <header>
      <p className="text-sm font-semibold tracking-[0.3em] text-blue-400">
        Core Stay_Advisory
      </p>

      <div className="mt-12">
        <p className="text-sm uppercase tracking-[0.25em] text-blue-400">
          Satu langkah lagi
        </p>

        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
          Kenali kondisi hotel Anda.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
          Masukkan data hotel Anda untuk melihat hasil
          assessment dan rekomendasi Core Stay_Advisory.
        </p>
      </div>
    </header>

    <form
      onSubmit={handleSubmit}
      className="mt-12 space-y-6"
    >

      <div className="grid gap-6 md:grid-cols-2">

        <div>
          <label className="text-sm text-slate-300">
            Nama Anda *
          </label>

          <input
            value={form.nama}
            onChange={(e) =>
              updateField("nama", e.target.value)
            }
            placeholder="Contoh: Budi Santoso"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-4 outline-none transition placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Nama Hotel *
          </label>

          <input
            value={form.hotel}
            onChange={(e) =>
              updateField("hotel", e.target.value)
            }
            placeholder="Contoh: Hotel ABC"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-4 outline-none transition placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Kota *
          </label>

          <input
            value={form.kota}
            onChange={(e) =>
              updateField("kota", e.target.value)
            }
            placeholder="Contoh: Makassar"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-4 outline-none transition placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300">
            Jumlah Kamar *
          </label>

          <input
            type="number"
            min="1"
            value={form.kamar}
            onChange={(e) =>
              updateField("kamar", e.target.value)
            }
            placeholder="Contoh: 42"
            className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-4 outline-none transition placeholder:text-slate-600 focus:border-blue-500"
          />
        </div>

      </div>

      <div>
        <label className="text-sm text-slate-300">
          Nomor WhatsApp *
        </label>

        <input
          type="tel"
          value={form.whatsapp}
          onChange={(e) =>
            updateField("whatsapp", e.target.value)
          }
          placeholder="Contoh: 081234567890"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-4 outline-none transition placeholder:text-slate-600 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="text-sm text-slate-300">
          Email
        </label>

        <input
          type="email"
          value={form.email}
          onChange={(e) =>
            updateField("email", e.target.value)
          }
          placeholder="nama@email.com"
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-4 outline-none transition placeholder:text-slate-600 focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="border-t border-white/10 pt-8">

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-white px-7 py-4 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Menganalisis Assessment..."
            : "Lihat Hasil Assessment"}
        </button>

        <p className="mt-4 text-center text-xs leading-5 text-slate-600">
          Data digunakan untuk memberikan hasil assessment
          dan informasi konsultasi Core Stay_Advisory.
        </p>

      </div>

    </form>

    <footer className="mt-auto pt-12 text-xs text-slate-600">
      Core Stay_Advisory — Assessment Kesehatan Bisnis Hotel
    </footer>

  </div>
</main>

);
}
