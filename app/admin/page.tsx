"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Assessment = {
  id: string;
  created_at: string;
  hotel_name: string | null;
  city: string | null;
  contact_name: string | null;
  email: string | null;
  whatsapp: string | null;
  overall: number | null;
  revenue: number | null;
  operasional: number | null;
  sdm: number | null;
  financial: number | null;
  strategy: number | null;
  lead_status: string | null;
  diagnosis: string | null;
  recommendation: string | null;
  priority: string | null;
  notes: string | null;
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAssessments() {
    setLoading(true);
    setError("");

    const { data: assessments, error: fetchError } = await supabase
      .from("assessments")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error(fetchError);
      setError("Data assessment tidak dapat dimuat.");
      setData([]);
    } else {
      setData(assessments || []);
    }

    setLoading(false);
  }

  async function checkUser() {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    setUser(currentUser);

    if (currentUser) {
      await loadAssessments();
    }
  }

  useEffect(() => {
    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      console.error(loginError);
      setError("Email atau password admin salah.");
      setLoading(false);
      return;
    }

    await loadAssessments();
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setData([]);
  }

  function getAverageScore() {
    if (data.length === 0) return 0;

    const total = data.reduce(
      (sum, item) => sum + Number(item.overall || 0),
      0
    );

    return Math.round(total / data.length);
  }

  function getNewLeads() {
    return data.filter(
      (item) => !item.lead_status || item.lead_status === "New"
    ).length;
  }

  function getPriorityCount() {
    return data.filter(
      (item) =>
        item.priority &&
        item.priority.toLowerCase().includes("kritis")
    ).length;
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
          <div className="w-full rounded-3xl border border-white/10 bg-slate-900 p-8 shadow-2xl">
            <p className="text-sm font-semibold tracking-[0.3em] text-blue-400">
              Core Stay_Advisory
            </p>

            <h1 className="mt-6 text-3xl font-bold">
              Admin Dashboard
            </h1>

            <p className="mt-3 text-slate-400">
              Login untuk melihat data assessment hotel.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label className="text-sm text-slate-300">
                  Email Admin
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300">
                  Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Login Admin"}
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1600px] px-6 py-10">

        <header className="flex flex-col gap-5 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.3em] text-blue-400">
              Core Stay_Advisory
            </p>

            <h1 className="mt-4 text-4xl font-bold">
              Assessment Dashboard
            </h1>

            <p className="mt-2 text-slate-400">
              Monitoring calon klien dan kesehatan bisnis hotel.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadAssessments}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm transition hover:bg-white/5"
            >
              Refresh
            </button>

            <button
              onClick={handleLogout}
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Total Assessment
            </p>
            <p className="mt-2 text-4xl font-bold">
              {data.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Lead Baru
            </p>
            <p className="mt-2 text-4xl font-bold">
              {getNewLeads()}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Rata-rata Score
            </p>
            <p className="mt-2 text-4xl font-bold">
              {getAverageScore()}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">
              Prioritas Kritis
            </p>
            <p className="mt-2 text-4xl font-bold text-red-400">
              {getPriorityCount()}
            </p>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          <div className="border-b border-white/10 p-6">
            <h2 className="text-xl font-semibold">
              Daftar Assessment
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Diagnosis dan rekomendasi berdasarkan hasil assessment.
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center text-slate-400">
              Memuat data...
            </div>
          ) : data.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              Belum ada data assessment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1500px] text-left text-sm">
                <thead className="border-b border-white/10 bg-slate-950">
                  <tr>
                    <th className="px-5 py-4">Hotel</th>
                    <th className="px-5 py-4">Kontak</th>
                    <th className="px-5 py-4">WhatsApp</th>
                    <th className="px-5 py-4">Overall</th>
                    <th className="px-5 py-4">Revenue</th>
                    <th className="px-5 py-4">Operasional</th>
                    <th className="px-5 py-4">SDM</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Prioritas</th>
                    <th className="px-5 py-4">Diagnosis</th>
                    <th className="px-5 py-4">Rekomendasi</th>
                    <th className="px-5 py-4">Tanggal</th>
                  </tr>
                </thead>

                <tbody>
                  {data.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-white/5 align-top transition hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-5">
                        <div className="font-semibold">
                          {item.hotel_name || "-"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {item.city || "-"}
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <div className="font-medium">
                          {item.contact_name || "-"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {item.email || "-"}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-5">
                        {item.whatsapp || "-"}
                      </td>

                      <td className="px-5 py-5">
                        <span className="rounded-lg bg-blue-500/10 px-3 py-1 font-bold text-blue-400">
                          {item.overall ?? 0}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        {item.revenue ?? 0}
                      </td>

                      <td className="px-5 py-5">
                        {item.operasional ?? 0}
                      </td>

                      <td className="px-5 py-5">
                        {item.sdm ?? 0}
                      </td>

                      <td className="px-5 py-5">
                        <span className="rounded-lg bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                          {item.lead_status || "New"}
                        </span>
                      </td>

                      <td className="min-w-[180px] px-5 py-5">
                        <span className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400">
                          {item.priority || "-"}
                        </span>
                      </td>

                      <td className="min-w-[300px] px-5 py-5 leading-6 text-slate-300">
                        {item.diagnosis || "-"}
                      </td>

                      <td className="min-w-[450px] px-5 py-5 leading-6 text-slate-400">
                        {item.recommendation || "-"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-5 text-slate-500">
                        {new Date(
                          item.created_at
                        ).toLocaleDateString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-10 text-xs text-slate-600">
          Core Stay_Advisory — Admin Dashboard
        </footer>
      </div>
    </main>
  );
}
