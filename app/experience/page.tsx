"use client";

import Image from "next/image";

const capabilities = [
  "Penilaian operasional dan kesiapan hotel",
  "Pengembangan Prosedur Operasional Standar (SOP)",
  "Strategi pendapatan dan penetapan harga",
  "Penganggaran, prakiraan, dan pengendalian keuangan",
  "Kesiapan sumber daya manusia dan organisasi",
  "Implementasi Sistem Manajemen Properti (PMS)",
  "Optimalisasi alur kerja housekeeping dan front office",
  "Pelaporan manajemen dan pemantauan kinerja",
];

export default function ExperiencePage() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#172d45]">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0b2340_0%,#173f65_55%,#5a3d72_100%)] px-6 pb-16 pt-12 text-white md:px-10 lg:px-14">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-[#d8bc79]">CoreStay Advisory</p>
          <div className="max-w-4xl">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Experience &amp; Projects</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-white/80 md:text-lg">
              Transformasi hotel berbasis sistem, kinerja, dan kesiapan operasional — dari strategi hingga implementasi.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10 md:px-10 lg:px-14">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <article className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(23,45,69,.10)]">
            <div className="relative aspect-[16/10] bg-slate-100">
              <Image src="/experience/project-1.jpg" alt="CoreStay Advisory project engagement" fill className="object-cover" priority />
            </div>
            <div className="p-7 md:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b08a42]">Strategic Hospitality Transformation</p>
              <h2 className="mt-3 text-2xl font-semibold text-[#172d45]">Penguatan Sistem Manajemen Hotel</h2>
              <p className="mt-5 leading-7 text-slate-600">
                Sebuah inisiatif transformasi strategis di bidang perhotelan yang berfokus pada penguatan operasional hotel,
                kinerja pendapatan, standar layanan, dan sistem manajemen.
              </p>
              <p className="mt-4 leading-7 text-slate-600">
                Melalui pendekatan CoreStay Advisory, proyek ini mengintegrasikan fungsi operasional, komersial, keuangan,
                sumber daya manusia, dan teknologi ke dalam satu kerangka manajemen yang lebih terstruktur.
              </p>
            </div>
          </article>

          <aside className="rounded-[28px] border border-[#d9c79f]/60 bg-[#fffdf8] p-7 shadow-[0_18px_55px_rgba(23,45,69,.07)] md:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b08a42]">CoreStay Approach</p>
            <h2 className="mt-3 text-2xl font-semibold">Integrated Hotel Management</h2>
            <div className="mt-6 space-y-3">
              {capabilities.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#173f65] text-[10px] font-bold text-white">{String(index + 1).padStart(2, "0")}</span>
                  <span className="text-sm leading-6 text-slate-600">{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12 md:px-10 lg:px-14">
        <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(23,45,69,.08)]">
            <div className="relative aspect-[4/5] bg-slate-100">
              <Image src="/experience/project-2.jpg" alt="CoreStay Advisory project handover" fill className="object-cover" />
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-[28px] bg-[#173f65] p-8 text-white shadow-[0_18px_55px_rgba(23,45,69,.12)] md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d8bc79]">The Objective</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight">Mengubah operasional menjadi bisnis yang lebih terukur.</h2>
            <p className="mt-6 leading-7 text-white/80">
              Tujuannya sederhana: mentransformasikan operasional hotel menjadi bisnis yang lebih terstruktur, terukur,
              efisien, dan menguntungkan.
            </p>
            <p className="mt-5 leading-7 text-white/80">
              Proyek ini mencerminkan pendekatan CoreStay Advisory dalam membantu pemilik hotel beralih dari ketergantungan
              pada operasional harian menuju sistem manajemen hotel yang sistematis.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/15 pt-6">
              <div><p className="text-2xl font-semibold">01</p><p className="mt-1 text-[11px] uppercase tracking-wider text-white/60">Assess</p></div>
              <div><p className="text-2xl font-semibold">02</p><p className="mt-1 text-[11px] uppercase tracking-wider text-white/60">Build</p></div>
              <div><p className="text-2xl font-semibold">03</p><p className="mt-1 text-[11px] uppercase tracking-wider text-white/60">Implement</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16 md:px-10 lg:px-14">
        <div className="rounded-[28px] border border-[#d9c79f]/60 bg-white p-7 text-center shadow-[0_18px_55px_rgba(23,45,69,.06)] md:p-10">
          <p className="text-sm font-medium text-slate-500">CoreStay Advisory</p>
          <p className="mx-auto mt-2 max-w-3xl text-lg font-medium leading-8 text-[#172d45]">
            Dari operasional harian menuju sistem manajemen hotel yang sistematis, terukur, dan berorientasi pada hasil.
          </p>
        </div>
      </section>
    </main>
  );
}