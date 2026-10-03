"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function HasilPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login?next=/hasil");
      else setChecking(false);
    });
  }, [router]);

  if (checking) return <main className="min-h-screen bg-[#f4f7fb] px-6 py-12 lg:pl-[280px]"><div className="mx-auto max-w-5xl"><p className="text-sm text-[#66738a]">Memeriksa akun...</p></div></main>;

  return <main className="min-h-screen bg-[#f4f7fb] px-6 py-12 lg:pl-[280px]"><div className="mx-auto max-w-5xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b8a80]">CoreStay</p><h1 className="mt-3 text-4xl font-semibold text-[#17243d]">Hasil Saya</h1><p className="mt-4 text-[#66738a]">Hasil assessment Anda akan tersimpan di sini.</p><div className="mt-8 rounded-3xl border border-[#dce4ef] bg-white p-8"><h2 className="text-xl font-semibold">Belum ada hasil</h2><p className="mt-2 text-sm text-[#66738a]">Selesaikan assessment untuk melihat hasil dan rekomendasi Anda.</p><a href="/assessment" className="mt-6 inline-flex rounded-xl bg-[#203b68] px-5 py-3 text-sm font-bold text-white">Mulai Assessment</a></div></div></main>;
}