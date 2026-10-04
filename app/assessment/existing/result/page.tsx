"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ExistingAreaResult = {
  key?: string;
  category?: string;
  title: string;
  score: number;
  level?: string;
  diagnosis: string;
  recommendation: string;
};

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
  diagnosis?: string;
  recommendation?: string;
  areaResults?: ExistingAreaResult[];
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
  if (score >= 80) return { color: "#22c55e", label: "READY", text: "text-green-400", bg: "bg-green-500/10" };
  if (score >= 60) return { color: "#eab308", label: "NEED IMPROVEMENT", text: "text-yellow-400", bg: "bg-yellow-500/10" };
  if (score >= 40) return { color: "#f97316", label: "HIGH RISK", text: "text-orange-400", bg: "bg-orange-500/10" };
  return { color: "#ef4444", label: "CRITICAL", text: "text-red-400", bg: "bg-red-500/10" };
}

function getOverallStatus(score: number) {
  if (score >= 80) return "Hotel memiliki fundamental bisnis yang kuat.";
  if (score >= 60) return "Hotel cukup sehat tetapi masih memiliki beberapa gap.";
  if (score >= 40) return "Hotel memiliki beberapa area bisnis yang perlu segera diperbaiki.";
  return "Hotel berada dalam kondisi critical dan membutuhkan corrective action.";
}

const premiumActions: Record<string, string[]> = {
  "Revenue & Pricing": [
    "Susun weekly revenue meeting dengan pickup, pace, occupancy, ADR dan RevPAR sebagai KPI wajib.",
    "Buat rate architecture per room type, segment dan season serta review rate parity antar-channel.",
    "Tetapkan promo hanya setelah menghitung displacement, net ADR, contribution dan conversion.",
  ],
  "Sales & Marketing": [
    "Bangun account plan untuk corporate, government, group/MICE dan travel trade dengan target produksi per account.",
    "Buat pipeline mingguan: prospect → quotation → negotiation → tentative → confirmed → lost.",
    "Ukur campaign berdasarkan booking, revenue, CAC/ROAS dan bukan hanya engagement.",
  ],
  Operasional: [
    "Audit SOP dan checklist pada proses yang paling berdampak terhadap guest experience dan cost.",
    "Terapkan daily briefing, handover log dan corrective-action tracker dengan PIC serta deadline.",
    "Gunakan guest complaint, review dan QA findings sebagai sumber root-cause improvement.",
  ],
  SDM: [
    "Susun manpower plan berbasis occupancy forecast, workload dan productivity ratio.",
    "Lengkapi competency matrix, training calendar, KPI dan coaching untuk posisi kritis.",
    "Bangun talent pipeline dan succession plan untuk posisi supervisor dan management.",
  ],
  Financial: [
    "Tetapkan monthly closing calendar dan pastikan P&L tersedia tepat waktu untuk management review.",
    "Buat budget-vs-actual variance review dengan PIC dan corrective action setiap bulan.",
    "Monitor departmental cost, cost per occupied room, utility, wastage dan purchasing discipline.",
  ],
  "Management & Strategy": [
    "Jalankan monthly business review dengan KPI, action tracker, PIC, deadline dan escalation.",
    "Turunkan strategic priorities menjadi target tahunan, initiative, budget dan milestone.",
    "Gunakan satu dashboard management untuk memonitor revenue, operation, people, finance dan execution.",
  ],
};

export default function ExistingResultPage() {
  const [result, setResult] = useState<ExistingResult | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("corestay_assessment");
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as ExistingResult;
      setResult(parsed);

      async function saveAssessment() {
        const savedKey = "corestay_existing_report_saved";
        if (sessionStorage.getItem(savedKey) === "1") return;

        const { data: auth } = await supabase.auth.getSession();
        if (!auth.session?.user) return;

        const { error } = await supabase.from("assessment_reports").insert({
          user_id: auth.session.user.id,
          assessment_type: "existing",
          file_name: parsed.hotelName
            ? `Assessment 1 — Hotel Existing — ${parsed.hotelName}`
            : "Assessment 1 — Hotel Existing",
          score: Number(parsed.overall) || 0,
          report_json: parsed,
          pdf_base64: "",
        });

        if (!error) {
          sessionStorage.setItem(savedKey, "1");
        } else {
          console.error("Gagal menyimpan Assessment 1:", error);
        }
      }

      void saveAssessment();
    } catch {
      setResult(null);
    }
  }, []);

  if (!result) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-center text-white">
        <Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={55} className="mx-auto h-[46px] w-[151px] object-contain" />
        <h1 className="mt-10 text-3xl font-bold">Assessment data not found.</h1>
        <p className="mt-4 text-slate-400">Silakan ulangi assessment hotel existing.</p>
      </main>
    );
  }

  const fallbackAreas: ExistingAreaResult[] = areas.map((area) => {
    const score = Math.min(100, Math.max(0, Number(result[area.key]) || 0));
    return {
      ...area,
      score,
      level: getScoreStyle(score).label,
      diagnosis: score >= 80 ? "Area berjalan baik dan perlu dipertahankan melalui monitoring KPI." : score >= 60 ? "Area cukup baik tetapi masih memiliki gap performa yang perlu diperbaiki." : score >= 40 ? "Area memiliki gap performa yang membutuhkan corrective action." : "Area berada pada kondisi kritis dan membutuhkan perbaikan segera.",
      recommendation: score >= 80 ? "Pertahankan performa dan lakukan continuous improvement berbasis KPI." : score >= 60 ? "Identifikasi performance gap, tetapkan corrective action dan monitor KPI secara rutin." : score >= 40 ? "Lakukan corrective action terstruktur dan monitoring mingguan pada area ini." : "Jadikan area ini prioritas perbaikan segera dengan action plan, PIC dan target yang terukur.",
    };
  });

  const areaResults: ExistingAreaResult[] = result.areaResults?.length
    ? result.areaResults.map((area) => {
        const matchingArea = areas.find((item) => item.key === area.key || item.key === area.category || item.title === area.title);
        const score = Math.min(100, Math.max(0, Number(area.score) || 0));
        return { key: area.key || matchingArea?.key || area.category || area.title, category: area.category || matchingArea?.key, title: area.title || matchingArea?.title || "Area", score, level: area.level || getScoreStyle(score).label, diagnosis: area.diagnosis || "Diagnosis belum tersedia.", recommendation: area.recommendation || "Rekomendasi belum tersedia." };
      })
    : fallbackAreas;

  const priorities = [...areaResults].sort((a, b) => a.score - b.score).slice(0, 3);
  const overallScore = Math.min(100, Math.max(0, Number(result.overall) || 0));
  const overallStyle = getScoreStyle(overallScore);
  const reportDate = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date());
  const risk = overallScore >= 80 ? "LOW" : overallScore >= 60 ? "MEDIUM" : "HIGH";

  function downloadPremiumPdf() {
    window.print();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white print:bg-white print:text-black">
      <div className="mx-auto max-w-6xl px-6 py-10 print:max-w-none print:px-8 print:py-6">
        <header className="border-b border-white/10 pb-8 print:border-black/20">
          <div className="flex items-start justify-between gap-6">
            <div>
              <Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={55} priority className="h-[46px] w-[151px] object-contain" />
              <p className="mt-8 text-sm font-semibold uppercase tracking-wider text-cyan-400 print:text-black">Existing Hotel Business Health Report</p>
              <h1 className="mt-3 text-4xl font-bold md:text-5xl">{result.hotelName || "Hotel Anda"}</h1>
              <p className="mt-3 text-slate-400 print:text-slate-600">{result.city || "-"} • Existing Hotel • {reportDate}</p>
            </div>
            <button onClick={downloadPremiumPdf} className="no-print shrink-0 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-400/20 hover:bg-cyan-300">⬇ Download Laporan Premium PDF</button>
          </div>
        </header>

        <section className="mt-8 grid gap-5 md:grid-cols-3 print:grid-cols-3">
          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-7 print:border-black/20 print:bg-slate-50"><p className="text-sm text-cyan-300 print:text-black">Overall Business Health</p><p className="mt-2 text-6xl font-bold text-cyan-400 print:text-black">{overallScore}%</p><p className="mt-2 text-sm text-slate-400 print:text-slate-600">dari 100</p></div>
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7 print:border-black/20 print:bg-slate-50"><p className="text-sm text-slate-400 print:text-slate-600">Business Status</p><p className={`mt-4 text-xl font-bold ${overallStyle.text} print:text-black`}>{overallStyle.label}</p></div>
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-7 print:border-black/20 print:bg-slate-50"><p className="text-sm text-slate-400 print:text-slate-600">Management Diagnosis</p><p className="mt-4 text-sm leading-6 text-slate-300 print:text-slate-700">{getOverallStatus(overallScore)}</p></div>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900 print:border-black/20 print:bg-white">
          <div className="border-b border-white/10 p-7 print:border-black/20"><p className="text-sm font-semibold uppercase tracking-wider text-cyan-400 print:text-black">Business Health Matrix</p><h2 className="mt-2 text-2xl font-bold">Analisis Kesehatan Hotel</h2><p className="mt-2 text-sm text-slate-500">Analisis kesehatan hotel berdasarkan enam area utama bisnis.</p></div>
          <div className="grid gap-4 p-7 md:grid-cols-2 print:grid-cols-2">
            {areaResults.map((area) => { const style = getScoreStyle(area.score); return <div key={`matrix-${area.key || area.title}`} className="rounded-2xl border border-white/10 bg-slate-950 p-5 print:border-black/15 print:bg-slate-50"><div className="flex items-center justify-between"><h3 className="font-bold">{area.title}</h3><span className="text-2xl font-extrabold print:text-black">{area.score}%</span></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full" style={{ width: `${area.score}%`, backgroundColor: style.color }} /></div><p className={`mt-3 text-xs font-bold ${style.text} print:text-black`}>{style.label}</p></div>; })}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-orange-400/20 bg-orange-400/5 p-7 print:border-black/20 print:bg-slate-50">
          <p className="text-sm font-semibold uppercase tracking-wider text-orange-400 print:text-black">Priority Attention</p><h2 className="mt-2 text-2xl font-bold">3 Area Prioritas Perbaikan</h2><p className="mt-2 text-sm text-slate-500">Area dengan skor terendah menjadi prioritas management.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3 print:grid-cols-3">{priorities.map((area, index) => { const style = getScoreStyle(area.score); return <div key={`priority-${area.key || area.title}`} className="rounded-2xl border border-white/10 bg-slate-950 p-5 print:border-black/15 print:bg-white"><div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-sm font-bold">{index + 1}</span><span className={`text-2xl font-extrabold ${style.text} print:text-black`}>{area.score}%</span></div><h3 className="mt-5 font-bold">{area.title}</h3><p className={`mt-2 text-xs font-bold ${style.text} print:text-black`}>{style.label}</p></div>; })}</div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-7 print:border-black/20 print:bg-white">
          <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400 print:text-black">Management Interpretation</p><h2 className="mt-2 text-2xl font-bold">Kondisi Bisnis Hotel</h2><p className="mt-4 text-lg leading-8 text-slate-300 print:text-slate-700">{result.diagnosis || getOverallStatus(overallScore)}</p><p className="mt-4 leading-8 text-slate-400 print:text-slate-700">Prioritas perbaikan dimulai dari area dengan skor terendah karena area tersebut berpotensi memberikan dampak terbesar terhadap profitability, operational efficiency dan business growth.</p>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900 print:border-black/20 print:bg-white">
          <div className="border-b border-white/10 p-7 print:border-black/20"><p className="text-sm font-semibold uppercase tracking-wider text-cyan-400 print:text-black">Assessment Detail</p><h2 className="mt-2 text-2xl font-bold">Diagnosis & Rekomendasi per Area</h2></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-950 print:bg-slate-100"><tr><th className="px-6 py-4">Area</th><th className="px-6 py-4">Score</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Diagnosis</th><th className="px-6 py-4">Rekomendasi</th></tr></thead><tbody>{areaResults.map((area) => <tr key={area.key || area.category || area.title} className="border-t border-white/5 align-top print:border-black/10"><td className="px-6 py-5 font-semibold">{area.title}</td><td className="px-6 py-5 font-bold">{area.score}%</td><td className="px-6 py-5">{area.level || getScoreStyle(area.score).label}</td><td className="px-6 py-5 leading-7 text-slate-300 print:text-slate-700">{area.diagnosis}</td><td className="px-6 py-5 leading-7 text-slate-400 print:text-slate-700">{area.recommendation}</td></tr>)}</tbody></table></div>
        </section>

        <section className="premium-report mt-10 overflow-hidden rounded-3xl border-2 border-[#d8b985]/50 bg-[#101c30] print:border-black print:bg-white">
          <div className="border-b border-white/10 p-8 print:border-black/20">
            <div className="flex items-start justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[0.25em] text-[#d8b985] print:text-black">Premium Management Report</p><h2 className="mt-2 text-3xl font-bold">Laporan Lengkap & Action Plan</h2><p className="mt-3 text-sm leading-6 text-slate-400 print:text-slate-600">Analisis premium ini menerjemahkan skor assessment menjadi prioritas bisnis, tindakan manajemen dan rekomendasi implementasi.</p></div><div className="no-print rounded-2xl bg-[#d8b985] px-4 py-3 text-center text-slate-950"><p className="text-[10px] font-bold uppercase">Premium</p><p className="text-lg font-extrabold">Rp49.000</p></div></div>
          </div>

          <div className="grid gap-6 p-8 md:grid-cols-3 print:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 print:border-black/15 print:bg-slate-50"><p className="text-xs uppercase tracking-wider text-slate-400">Risk Level</p><p className="mt-2 text-2xl font-extrabold print:text-black">{risk}</p><p className="mt-2 text-xs leading-5 text-slate-400 print:text-slate-600">Berdasarkan overall score {overallScore}%.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 print:border-black/15 print:bg-slate-50"><p className="text-xs uppercase tracking-wider text-slate-400">Priority Count</p><p className="mt-2 text-2xl font-extrabold print:text-black">3 area</p><p className="mt-2 text-xs leading-5 text-slate-400 print:text-slate-600">Area terendah menjadi fokus corrective action pertama.</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 print:border-black/15 print:bg-slate-50"><p className="text-xs uppercase tracking-wider text-slate-400">Review Cycle</p><p className="mt-2 text-2xl font-extrabold print:text-black">30–90 hari</p><p className="mt-2 text-xs leading-5 text-slate-400 print:text-slate-600">Gunakan review bulanan dan evaluasi ulang assessment setelah implementasi.</p></div>
          </div>

          <div className="border-t border-white/10 p-8 print:border-black/20">
            <h3 className="text-xl font-bold">Executive Recommendation</h3>
            <p className="mt-4 leading-8 text-slate-300 print:text-slate-700">{result.recommendation || "Fokus utama diarahkan pada perbaikan area dengan skor terendah, revenue improvement, operational efficiency, people readiness, sales development, financial control dan management KPI."}</p>
          </div>

          <div className="border-t border-white/10 p-8 print:border-black/20">
            <h3 className="text-xl font-bold">Detailed Corrective Action Plan</h3>
            <div className="mt-5 space-y-5">
              {priorities.map((area, index) => {
                const actions = premiumActions[area.title] || ["Tetapkan target perbaikan, PIC, deadline dan KPI untuk area ini.", "Lakukan root-cause analysis dan dokumentasikan corrective action.", "Review hasil secara mingguan sampai indikator mencapai target."];
                return <article key={`action-${area.key || area.title}`} className="rounded-2xl border border-white/10 bg-white/5 p-6 print:border-black/15 print:bg-slate-50"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-lg font-bold">{index + 1}. {area.title}</h4><span className="rounded-full px-3 py-1 text-xs font-bold print:border print:border-black/20">Current score: {area.score}%</span></div><p className="mt-3 text-sm leading-6 text-slate-400 print:text-slate-700"><strong>Diagnosis:</strong> {area.diagnosis}</p><ol className="mt-4 space-y-3">{actions.map((action, actionIndex) => <li key={action} className="flex gap-3 text-sm leading-6 text-slate-300 print:text-slate-700"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#d8b985] text-xs font-bold text-slate-950">{actionIndex + 1}</span>{action}</li>)}</ol><div className="mt-5 grid gap-3 md:grid-cols-3 print:grid-cols-3"><div className="rounded-xl bg-black/20 p-3 print:border print:border-black/10 print:bg-white"><p className="text-[10px] uppercase text-slate-500">PIC</p><p className="mt-1 text-sm font-semibold">Department Head</p></div><div className="rounded-xl bg-black/20 p-3 print:border print:border-black/10 print:bg-white"><p className="text-[10px] uppercase text-slate-500">Review</p><p className="mt-1 text-sm font-semibold">Weekly</p></div><div className="rounded-xl bg-black/20 p-3 print:border print:border-black/10 print:bg-white"><p className="text-[10px] uppercase text-slate-500">Target</p><p className="mt-1 text-sm font-semibold">+15 points / cycle</p></div></div></article>;
              })}
            </div>
          </div>

          <div className="border-t border-white/10 p-8 print:border-black/20">
            <h3 className="text-xl font-bold">90-Day Management Roadmap</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-3 print:grid-cols-3">
              {[['0–30 Hari','Diagnose & Stabilize','Validasi root cause, rapikan KPI, tetapkan PIC, SOP/checklist dan quick wins.'],['31–60 Hari','Implement & Monitor','Jalankan corrective action, weekly review, coaching dan kontrol variance.'],['61–90 Hari','Optimize & Scale','Ukur dampak terhadap revenue, cost, service dan people; pertahankan yang efektif.']].map(([period,title,desc]) => <div key={period} className="rounded-2xl border border-white/10 bg-white/5 p-5 print:border-black/15 print:bg-slate-50"><p className="text-xs font-bold text-[#d8b985] print:text-black">{period}</p><h4 className="mt-2 font-bold">{title}</h4><p className="mt-2 text-sm leading-6 text-slate-400 print:text-slate-700">{desc}</p></div>)}
            </div>
          </div>

          <div className="border-t border-white/10 bg-[#d8b985]/10 p-8 print:border-black/20 print:bg-slate-50">
            <h3 className="text-xl font-bold">Premium Recommendation</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300 print:text-slate-700">Laporan ini merupakan decision-support berdasarkan jawaban assessment. Untuk implementasi, CoreStay Advisory dapat membantu menyusun KPI, SOP, revenue strategy, sales plan, manpower plan, financial control dan monitoring action plan sesuai kondisi aktual hotel.</p>
          </div>
        </section>

        <div className="no-print mt-8 rounded-3xl border border-[#d8b985]/40 bg-[#d8b985]/10 p-7 text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8b985]">Premium Report</p><h2 className="mt-2 text-2xl font-bold">Simpan laporan lengkap Anda</h2><p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">Klik tombol di atas untuk membuka dialog cetak. Pilih <b>Save as PDF</b> pada perangkat Anda untuk menyimpan Laporan Premium.</p><button onClick={downloadPremiumPdf} className="mt-5 rounded-2xl bg-[#d8b985] px-6 py-3 font-bold text-slate-950 hover:brightness-105">⬇ Download Laporan Premium PDF</button></div>

        <footer className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-slate-600 print:border-black/20">CoreStay Advisory — Existing Hotel Business Health Assessment • Premium Management Report</footer>
      </div>
      <style jsx global>{`@media print { .no-print { display:none !important; } body { background:white !important; } .premium-report { break-inside:auto; } section, article { break-inside:avoid; } }`}</style>
    </main>
  );
}
