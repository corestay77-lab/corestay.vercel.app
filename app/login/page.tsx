"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/assessment");
    });
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage("Email atau password salah. Silakan coba lagi.");
      setLoading(false);
      return;
    }

    router.replace("/assessment");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-5 py-10 text-[#17243d] lg:pl-[250px]">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-[2rem] border border-[#dce4ef] bg-white p-7 shadow-[0_20px_70px_rgba(32,59,104,0.10)] sm:p-9">
          <div className="mb-7 text-center">
            <Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="mx-auto h-auto w-[150px] object-contain" priority />
            <h1 className="mt-6 text-2xl font-semibold">Login</h1>
            <p className="mt-2 text-sm text-[#748096]">Masuk untuk mengakses assessment dan hasil Anda.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="w-full rounded-xl border border-[#d8e0eb] px-4 py-3 text-sm outline-none transition focus:border-[#203b68] focus:ring-2 focus:ring-[#203b68]/10" placeholder="nama@email.com" />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold">Password</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="current-password" className="w-full rounded-xl border border-[#d8e0eb] px-4 py-3 text-sm outline-none transition focus:border-[#203b68] focus:ring-2 focus:ring-[#203b68]/10" placeholder="Password" />
            </div>

            {message && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{message}</p>}

            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#203b68] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#162d52] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? "Memproses..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs leading-5 text-[#8a95a5]">
            Belum memiliki akun? Gunakan menu registrasi yang tersedia pada alur pendaftaran CoreStay.
          </p>
        </div>
      </div>
    </main>
  );
}
