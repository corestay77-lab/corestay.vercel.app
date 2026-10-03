"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RekomendasiPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login?next=/rekomendasi");
      else setChecking(false);
    });
  }, [router]);

  if (checking) return <main className="min-h-screen bg-[#f4f7fb] px-6 py-12 lg:pl-[280px]"><div className="mx-auto max-w-5xl"><p className="text-sm text-[#66738a]">Memeriksa akun...</p></div></main>;

  return <main className="min-h-screen bg-[#f4f7fb] px-6 py-12 lg:pl-[280px]"><div className="mx-auto max-w-5xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b8a80]">CoreStay</p><h1 className="mt-3 text-4xl font-semibold text-[#17243d]">Rekomendasi</h1><p className="mt-4 text-[#66738a]">Rekomendasi perbaikan berdasarkan hasil assessment Anda.</p><div className="mt-8 rounded-3xl border border-[#dce4ef] bg-white p-8"><h2 className="text-xl font-semibold">Rekomendasi akan muncul di sini</h2><p className="mt-2 text-sm text-[#66738a]">Selesaikan assessment untuk mendapatkan prioritas tindakan yang sesuai kondisi hotel Anda.</p></div></div></main>;
}