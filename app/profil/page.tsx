"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        router.replace("/login?next=/profil");
        return;
      }

      setEmail(session.user.email || "");
      setFullName(
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        ""
      );
      setLoading(false);
    }

    loadProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          router.replace("/login?next=/profil");
          return;
        }

        setEmail(session.user.email || "");
        setFullName(
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          ""
        );
        setLoading(false);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        name: fullName.trim(),
      },
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage("Profil berhasil diperbarui.");
    }

    setSaving(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f7fb] text-[#17243d] lg:pl-[250px]">
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 lg:px-12">
          <p className="text-sm text-slate-500">Memuat profil...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#17243d] lg:pl-[250px]">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b8a80]">Account</p>
        <h1 className="mt-3 text-4xl font-semibold">Profil</h1>
        <p className="mt-4 text-[#66738a]">
          Kelola informasi profil dan akses akun CoreStay Anda.
        </p>

        <section className="mt-8 max-w-2xl rounded-3xl border border-[#dce4ef] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#203b68] text-xl font-bold text-white">
              {(fullName || email || "U").trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {fullName || "Pengguna CoreStay"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{email}</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Nama
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nama lengkap"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#203b68] focus:ring-2 focus:ring-[#203b68]/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email akun
              </label>
              <input
                value={email}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500"
              />
              <p className="mt-2 text-xs text-slate-400">
                Email mengikuti akun autentikasi CoreStay Anda.
              </p>
            </div>

            {message && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={saveProfile}
                disabled={saving}
                className="rounded-xl bg-[#203b68] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Profil"}
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
