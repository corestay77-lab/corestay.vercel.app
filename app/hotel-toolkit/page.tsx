"use client";

import { useState } from "react";

const templates = [
  { title: "Hotel Budget Template", category: "Finance", price: "Rp49.000", desc: "Template budget hotel yang siap digunakan untuk menyusun dan memonitor anggaran.", slides: ["Budget Dashboard", "Department Budget", "Monthly Summary"], preview: ["Revenue • Cost • GOP • Margin", "Rooms • F&B • HK • Engineering", "Budget • Actual • Variance"] },
  { title: "Hotel P&L Template", category: "Finance", price: "Rp59.000", desc: "Template Profit & Loss untuk memantau revenue, cost, GOP, dan margin hotel.", slides: ["P&L Overview", "Department P&L", "Monthly Analysis"], preview: ["Revenue → GOP → Net Profit", "Rooms • F&B • Other Revenue", "Actual • Budget • Variance"] },
  { title: "Front Office SOP", category: "Operations", price: "Rp79.000", desc: "Template SOP front office untuk membantu membangun proses kerja yang konsisten.", slides: ["SOP Structure", "Check-in Flow", "Daily Checklist"], preview: ["Purpose • Scope • Responsibility", "Reservation → Arrival → Check-in", "Shift Handover • Cashier • Reports"] },
  { title: "Housekeeping SOP", category: "Operations", price: "Rp79.000", desc: "Template SOP housekeeping untuk room cleaning, inspection, dan kontrol operasional.", slides: ["Room Cleaning SOP", "Inspection Checklist", "Daily Control"], preview: ["Preparation → Cleaning → Final Check", "Bedroom • Bathroom • Amenities", "Room Status • Productivity • Issues"] },
  { title: "Hotel Pre-Opening Checklist", category: "Pre-Opening", price: "Rp89.000", desc: "Checklist praktis untuk memantau kesiapan hotel sebelum opening.", slides: ["Opening Roadmap", "Department Readiness", "Go-Live Checklist"], preview: ["T-90 → T-60 → T-30 → Opening", "FO • HK • F&B • Engineering", "People • SOP • System • Facility"] },
  { title: "Hotel Revenue Management Template", category: "Revenue", price: "Rp69.000", desc: "Template untuk membantu monitoring ADR, occupancy, RevPAR, dan pricing.", slides: ["Revenue Dashboard", "Pricing Matrix", "Revenue Analysis"], preview: ["Occupancy • ADR • RevPAR", "BAR • Room Type • Segment", "Pickup • Pace • Opportunity"] },
];

function Preview({ item }: { item: typeof templates[number] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-[#dce4ef] bg-[#f7f9fc]">
      <div className="flex items-center justify-between border-b border-[#e7ecf3] bg-white px-4 py-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#66738a]">Preview • {active + 1}/3</span>
        <span className="rounded-full bg-[#edf3f0] px-2.5 py-1 text-[9px] font-bold text-[#55756b]">Sample</span>
      </div>
      <div className="min-h-[150px] bg-gradient-to-br from-[#17243d] via-[#203b68] to-[#315b73] p-4 text-white">
        <div className="flex items-start justify-between">
          <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/55">CoreStay Toolkit</span>
          <span className="text-[9px] text-white/50">01 — 03</span>
        </div>
        <h3 className="mt-6 text-lg font-semibold">{item.slides[active]}</h3>
        <p className="mt-2 text-xs leading-5 text-white/65">{item.preview[active]}</p>
        <div className="mt-5 flex gap-1.5">
          {item.preview[active].split(" • ").map((_, i) => <span key={i} className="h-1.5 flex-1 rounded-full bg-white/20" />)}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-2">
        {item.slides.map((slide, i) => (
          <button key={slide} type="button" onClick={() => setActive(i)} className={`rounded-lg border px-2 py-2 text-left transition ${active === i ? "border-[#203b68] bg-white shadow-sm" : "border-transparent bg-white/60 hover:bg-white"}`}>
            <span className="block text-[9px] font-bold text-[#203b68]">0{i + 1}</span>
            <span className="mt-1 block truncate text-[9px] font-medium text-[#66738a]">{slide}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function HotelToolkitPage() {
  const wa = "https://wa.me/6285109006363";
  return (
    <main className="min-h-screen bg-[#f4f7fb] px-6 py-12 lg:pl-[280px]">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b8a80]">CoreStay Business Tools</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#17243d]">CoreStay Hotel Toolkit</h1>
        <p className="mt-4 max-w-3xl text-[#66738a]">Template praktis untuk owner dan manajemen hotel. Lihat 1–3 slide preview sebelum membeli.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((item) => (
            <section key={item.title} className="flex flex-col rounded-3xl border border-[#dce4ef] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-[#eef4f1] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#55756b]">{item.category}</span>
                <span className="text-xs font-semibold text-[#8a6b35]">Digital Template</span>
              </div>
              <h2 className="mt-5 text-xl font-semibold text-[#17243d]">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#66738a]">{item.desc}</p>
              <Preview item={item} />\n              <PdfViewer title={item.title} file={`/toolkit/${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.pdf`} />
              <div className="mt-6 border-t border-[#edf1f6] pt-5">
                <p className="text-2xl font-bold text-[#203b68]">{item.price}</p>
                <a href={`${wa}?text=${encodeURIComponent(`Halo CoreStay, saya ingin membeli ${item.title} seharga ${item.price}.`)}`} target="_blank" rel="noopener noreferrer" className="mt-4 flex w-full items-center justify-center rounded-xl bg-[#17243d] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#203b68]">Beli & Dapatkan Template ↗</a>
              </div>
            </section>
          ))}
        </div>
        <div className="mt-8 rounded-3xl border border-[#dce4ef] bg-white p-6">
          <h2 className="text-lg font-semibold text-[#17243d]">Cara mendapatkan template</h2>
          <p className="mt-2 text-sm leading-6 text-[#66738a]">Klik preview untuk melihat contoh isi → pilih template → lakukan pembayaran → CoreStay mengirimkan file template lengkap yang dibeli.</p>
        </div>
      </div>
    </main>
  );
}
