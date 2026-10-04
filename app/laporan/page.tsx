"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  score: number | null;
  created_at: string;
  assessment_type: string;
  report_json: any;
};

const label = (t: string) =>
  t === "existing"
    ? "Assessment 1 · Hotel Existing"
    : t === "pre-opening"
      ? "Assessment 2 · Pre-opening Hotel"
      : "Assessment 3 · Financial";

export default function LaporanPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [checking, setChecking] = useState(true);

  const loadReports = useCallback(async () => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) {
      router.replace("/login?next=/laporan");
      return;
    }

    const { data, error } = await supabase
      .from("assessment_reports")
      .select("id,score,created_at,assessment_type,report_json")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal memuat laporan:", error);
      setRows([]);
    } else {
      setRows((data || []) as Row[]);
    }
    setChecking(false);
  }, [router]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const deleteFinancialReport = async (id: string) => {
    const confirmed = window.confirm(
      "Hapus hasil assessment ini? Data hasil assessment dan PDF tersimpan akan dihapus permanen."
    );
    if (!confirmed) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/login");
      return;
    }

    const response = await fetch(
      "/api/assessment/financial/report/" + id,
      {
        method: "DELETE",
        headers: { Authorization: "Bearer " + session.access_token },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      window.alert(
        message || "Data assessment gagal dihapus. Silakan coba lagi."
      );
      return;
    }

    setRows((current) => current.filter((row) => row.id !== id));
    await loadReports();
    router.refresh();
  };

  if (checking) {
    return (
      <main className="min-h-screen bg-[#f4f7fb] px-6 py-12 lg:pl-[280px]">
        <p>Memeriksa akun...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-6 py-12 lg:pl-[280px]">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b8a80]">
          CoreStay
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Laporan</h1>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[#dce4ef] bg-white p-8">
            <h2 className="text-xl font-semibold">Belum ada laporan</h2>
            <p className="mt-2 text-sm text-[#66738a]">
              Semua hasil assessment yang sudah dihapus tidak akan ditampilkan lagi.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-4 text-[#66738a]">
              Semua laporan assessment yang tersimpan pada akun Anda.
            </p>

            <div className="mt-8 space-y-4">
              {rows.map((x) => (
                <div
                  key={x.id}
                  className="rounded-3xl border border-[#dce4ef] bg-white p-6"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-[#6b8a80]">
                    {label(x.assessment_type)}
                  </p>
                  <h2 className="mt-1 font-semibold">
                    {x.assessment_type === "financial"
                      ? "Financial Assessment Report"
                      : "Assessment Report"}
                  </h2>
                  <p className="mt-1 text-sm text-[#66738a]">
                    {new Date(x.created_at).toLocaleString("id-ID")} · Score{" "}
                    {x.score ?? "-"}/100
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    {x.assessment_type === "financial" ? (
                      <button
                        onClick={async () => {
                          const {
                            data: { session },
                          } = await supabase.auth.getSession();

                          if (!session) {
                            router.replace("/login");
                            return;
                          }

                          const r = await fetch(
                            "/api/assessment/financial/report/" + x.id,
                            {
                              headers: {
                                Authorization:
                                  "Bearer " + session.access_token,
                              },
                              cache: "no-store",
                            }
                          );

                          if (!r.ok) {
                            window.alert("Laporan tidak ditemukan.");
                            await loadReports();
                            return;
                          }

                          const b = await r.blob();
                          const u = URL.createObjectURL(b);
                          const a = document.createElement("a");
                          a.href = u;
                          a.download = "CoreStay-Financial-Assessment.pdf";
                          a.click();
                          URL.revokeObjectURL(u);
                        }}
                        className="rounded-xl bg-[#203b68] px-5 py-3 text-sm font-bold text-white"
                      >
                        Download PDF
                      </button>
                    ) : null}

                    {x.assessment_type === "financial" && (
                      <button
                        type="button"
                        onClick={() => deleteFinancialReport(x.id)}
                        className="shrink-0 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50"
                      >
                        🗑 Hapus Data
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
