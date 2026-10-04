"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Report = {
  id: string;
  file_name: string;
  score: number | null;
  created_at: string;
  report_json: {
    recommendations?: string[];
    actionPlan?: string[];
    auditFindings?: string[];
    risks?: string[];
    conclusion?: string;
  } | null;
};

export default function RekomendasiPage() {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) {
        router.replace("/login?next=/rekomendasi");
        return;
      }

      const { data } = await supabase
        .from("assessment_reports")
        .select("id,file_name,score,created_at,report_json")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setReport((data as Report | null) || null);
      setChecking(false);
    }
    load();
  }, [router]);

  if (checking) {
    return <main className="min-h-screen bg-[#f4f7fb] px-6 py-12 lg:pl-[280px]"><div className="mx-auto max-w-5xl"><p className="text-sm text-[#66738a]">Memeriksa akun...</p></div></main>;
  }

  const recommendations = report?.report_json?.recommendations || [];
  const actionPlan = report?.report_json?.actionPlan || [];
  const findings = report?.report_json?.auditFindings || [];
  const risks = report?.report_json?.risks || [];

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-6 py-12 lg:pl-[280px]">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b8a80]">CoreStay</p>
        <h1 className="mt-3 text-4xl font-semibold text-[#17243d]">Rekomendasi</h1>
        <p className="mt-4 text-[#66738a]">Rekomendasi perbaikan berdasarkan hasil assessment terakhir Anda.</p>

        {!report ? (
          <div className="mt-8 rounded-3xl border border-[#dce4ef] bg-white p-8">
            <h2 className="text-xl font-semibold">Rekomendasi akan muncul di sini</h2>
            <p className="mt-2 text-sm text-[#66738a]">Selesaikan assessment untuk mendapatkan prioritas tindakan yang sesuai kondisi hotel Anda.</p>
            <a href="/assessment" className="mt-6 inline-flex rounded-xl bg-[#203b68] px-5 py-3 text-sm font-bold text-white">Mulai Assessment</a>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d8b985]">Assessment Terakhir</p>
              <h2 className="mt-2 text-xl font-bold">{report.file_name}</h2>
              <p className="mt-2 text-sm text-white/65">
                Score Financial Health: <b className="text-white">{report.score ?? "-"} / 100</b>
              </p>
            </div>

            <RecommendationList title="Prioritas Perbaikan" items={recommendations} />
            <RecommendationList title="Action Plan" items={actionPlan} />
            {findings.length > 0 && <RecommendationList title="Temuan yang Perlu Ditindaklanjuti" items={findings} />}
            {risks.length > 0 && <RecommendationList title="Risiko / Red Flags" items={risks} danger />}

            {recommendations.length === 0 && actionPlan.length === 0 && (
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
                Belum ada rekomendasi yang tersimpan pada hasil assessment terakhir.
              </div>
            )}

            <a href="/assessment/financial" className="inline-flex rounded-xl bg-[#203b68] px-5 py-3 text-sm font-bold text-white">
              Buat Assessment Baru
            </a>
          </div>
        )}
      </div>
    </main>
  );
}

function RecommendationList({ title, items, danger = false }: { title: string; items: string[]; danger?: boolean }) {
  return (
    <section className="rounded-3xl border border-[#dce4ef] bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold text-[#17243d]">{title}</h2>
      <div className="mt-5 space-y-3">
        {items.map((item, index) => (
          <div key={index} className={`rounded-2xl p-4 text-sm leading-6 ${danger ? "bg-red-50 text-red-800" : "bg-slate-50 text-slate-700"}`}>
            <span className="mr-2 font-bold">{index + 1}.</span>{item}
          </div>
        ))}
      </div>
    </section>
  );
}
