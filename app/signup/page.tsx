"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/assessment");
    });
  }, [router]);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password.length < 6) {
      setMessage("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      setMessage("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin + "/login" : undefined },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    if (data.session) {
      router.replace("/assessment");
      router.refresh();
      return;
    }
    setSuccess(true);
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-5 py-10 text-[#17243d] lg:pl-[250px]">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center">
        <div className="w-full rounded-[2rem] border border-[#dce4ef] bg-white p-7 shadow-[0_20px_70px_rgba(32,59,104,0.10)] sm:p-9">
          <div className="mb-7 text-center">
            <Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="mx-auto h-auto w-[150px] object-contain" priority />
            <h1 className="mt-6 text-2xl font-semibold">Sign Up</h1>
            <p className="mt-2 text-sm text-[#748096]">Buat akun CoreStay untuk menyimpan hasil assessment Anda.</p>
          </div>

          {success ? (
            <div className="rounded-2xl bg-emerald-50 p-5 text-center">
              <h2 className="font-semibold text-emerald-800">Pendaftaran berhasil</h2>
              <p className="mt-2 text-sm leading-6 text-emerald-700">Silakan cek email Anda untuk konfirmasi akun, lalu login.</p>
              <button type="button" onClick={() => router.push("/login")} className="mt-5 rounded-xl bg-[#203b68] px-5 py-3 text-sm font-bold text-white">Ke Login</button>
            </div>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label htmlFor="signup-email" className="mb-2 block text-sm font-semibold">Email</label>
                <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="w-full rounded-xl border border-[#d8e0eb] px-4 py-3 text-sm outline-none transition focus:border-[#203b68] focus:ring-2 focus:ring-[#203b68]/10" placeholder="nama@email.com" />
              </div>
              <div>
                <label htmlFor="signup-password" className="mb-2 block text-sm font-semibold">Password</label>
                <input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" className="w-full rounded-xl border border-[#d8e0eb] px-4 py-3 text-sm outline-none transition focus:border-[#203b68] focus:ring-2 focus:ring-[#203b68]/10" placeholder="Minimal 6 karakter" />
              </div>
              <div>
                <label htmlFor="signup-confirm" className="mb-2 block text-sm font-semibold">Konfirmasi Password</label>
                <input id="signup-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} autoComplete="new-password" className="w-full rounded-xl border border-[#d8e0eb] px-4 py-3 text-sm outline-none transition focus:border-[#203b68] focus:ring-2 focus:ring-[#203b68]/10" placeholder="Ulangi password" />
              </div>
              {message && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{message}</p>}
              <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#203b68] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#162d52] disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? "Mendaftarkan..." : "Buat Akun"}
              </button>
            </form>
          )}

          {!success && <p className="mt-6 text-center text-xs text-[#8a95a5]">Sudah memiliki akun? <button type="button" onClick={() => router.push("/login")} className="font-semibold text-[#203b68]">Login</button></p>}
        </div>
      </div>
    </main>
  );
}
