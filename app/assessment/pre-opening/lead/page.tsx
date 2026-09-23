"use client";

import Image from "next/image";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function PreOpeningLeadPage() {
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

  function update(
    field: keyof typeof form,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();

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

    sessionStorage.setItem(
      "corestay_preopening_lead",
      JSON.stringify(form)
    );

    notifyAssessmentCompleted(form);

    router.push("/assessment/pre-opening/result");
  }

  function notifyAssessmentCompleted(contact: typeof form) {
    try {
      const stored = sessionStorage.getItem("corestay_preopening_result");
      if (!stored) return;

      const result = JSON.parse(stored) as {
        overall: number;
        status?: string;
        diagnosis?: string;
        areaResults?: { title: string; score: number; level?: string; recommendation?: string; diagnosis?: string }[];
      };

      const areas = (result.areaResults || []).map((item) => ({
        title: item.title,
        score: item.score,
        label: item.level,
        recommendation: item.recommendation,\n        diagnosis: item.diagnosis || (item.score >= 80 ? "Area memiliki readiness yang baik dan perlu dipertahankan." : item.score >= 60 ? "Area sudah mulai siap, tetapi masih terdapat gap yang perlu diselesaikan sebelum opening." : "Area memiliki gap readiness yang signifikan dan perlu menjadi prioritas perbaikan sebelum opening."),
      }));

      const priorities = [...areas].sort((a, b) => a.score - b.score).slice(0, 3);

      // Fire-and-forget: jangan blok navigasi user kalau email gagal terkirim.
      fetch("/api/notify-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelType: "preopening",
          hotelName: contact.hotel,
          city: contact.kota,
          overall: result.overall,
          status: result.status,
          diagnosis: result.diagnosis,
          areas,
          priorities,
        priorityActions: Array.isArray((result as any).priorityActions) ? (result as any).priorityActions : [],
        recommendation: "Hasil assessment menunjukkan area yang perlu diprioritaskan sebelum hotel memasuki fase soft opening. Fokus utama diarahkan pada penyelesaian gap yang berdampak pada revenue readiness, operational readiness, people readiness, distribution dan financial control. CoreStay Advisory dapat membantu owner melakukan pre-opening readiness, penyusunan sistem operasional, SOP, manpower planning, pricing & revenue strategy, OTA setup, sales preparation dan monitoring opening readiness sampai hotel siap beroperasi.",
          contact: {
            nama: contact.nama,
            whatsapp: contact.whatsapp,
            email: contact.email,
            kamar: contact.kamar,
          },
        }),
      }).catch((err) => {
        console.error("Gagal mengirim notifikasi email assessment:", err);
      });
    } catch (err) {
      console.error("Gagal menyiapkan notifikasi email assessment:", err);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10">

        <Image src="/logo.png" alt="CoreStay Advisory" width={180} height={55} priority className="h-auto w-[150px] object-contain" />

        <div className="mt-12">
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">
            Pre-opening Readiness Report
          </p>

          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            Satu langkah lagi sebelum melihat hasil.
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-400">
            Masukkan data hotel untuk mendapatkan diagnosis,
            prioritas risiko dan rekomendasi pre-opening yang lebih spesifik.
          </p>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-6">

          <div className="grid gap-6 md:grid-cols-2">

            <input
              value={form.nama}
              onChange={(e) => update("nama", e.target.value)}
              placeholder="Nama Anda *"
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-4 outline-none focus:border-cyan-400"
            />

            <input
              value={form.hotel}
              onChange={(e) => update("hotel", e.target.value)}
              placeholder="Nama Hotel *"
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-4 outline-none focus:border-cyan-400"
            />

            <input
              value={form.kota}
              onChange={(e) => update("kota", e.target.value)}
              placeholder="Kota *"
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-4 outline-none focus:border-cyan-400"
            />

            <input
              type="number"
              min="1"
              value={form.kamar}
              onChange={(e) => update("kamar", e.target.value)}
              placeholder="Jumlah Kamar *"
              className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-4 outline-none focus:border-cyan-400"
            />

          </div>

          <input
            type="tel"
            value={form.whatsapp}
            onChange={(e) => update("whatsapp", e.target.value)}
            placeholder="Nomor WhatsApp *"
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-4 outline-none focus:border-cyan-400"
          />

          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-4 outline-none focus:border-cyan-400"
          />

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-white px-6 py-4 font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Lihat Pre-opening Report
          </button>

        </form>

      </div>
    </main>
  );
}


