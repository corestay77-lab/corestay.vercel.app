"use client";
import { usePathname } from "next/navigation";

export default function PremiumReportBanner() {
  const pathname = usePathname();
  if (!pathname.includes("/assessment/") || !pathname.endsWith("/result")) return null;

  return (
    <section className="premium-report-banner mx-auto my-8 w-[calc(100%-2rem)] max-w-5xl rounded-3xl border border-[#d8b985] bg-white p-6 shadow-[0_20px_60px_rgba(32,59,104,.10)] sm:p-8 lg:ml-[270px] lg:w-[calc(100%-300px)]">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#a78660]">Laporan Premium</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#17243d]">Simpan hasil assessment Anda dalam PDF lengkap.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66738a]">Laporan Premium berisi ringkasan hasil, analisis area prioritas, dan rekomendasi tindakan yang dapat Anda simpan sebagai PDF.</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <a href="/paket-harga" className="rounded-xl bg-[#203b68] px-5 py-3 text-center text-sm font-bold text-white transition hover:-translate-y-0.5">Lihat Paket Premium</a>
          <button type="button" onClick={() => window.print()} className="rounded-xl border border-[#d7dee8] bg-white px-5 py-3 text-sm font-bold text-[#203b68] transition hover:-translate-y-0.5">Download / Simpan PDF</button>
        </div>
      </div>
    </section>
  );
}
