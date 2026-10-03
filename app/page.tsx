import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const whatsappNumber = "6285109006363";
  const whatsappMessage = encodeURIComponent(
    "Halo CoreStay Advisory, saya ingin berkonsultasi mengenai bisnis hotel saya."
  );

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f9f7] text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-corestay.png"
              alt="CoreStay Advisory"
              width={180}
              height={70}
              className="h-auto w-[150px] object-contain"
              priority
            />
          </Link>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#315c52] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#315c52]/15 transition hover:-translate-y-0.5 hover:bg-[#274d44]"
          >
            WhatsApp
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#eef6f1] via-white to-[#fdf4ec]">
        <div className="absolute -right-32 -top-24 h-96 w-96 rounded-full bg-[#dceee6] blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-[#f7e4d5] blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 md:pb-32 md:pt-28">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex rounded-full border border-[#cfe1d8] bg-white/80 px-4 py-2 text-sm font-semibold text-[#315c52] shadow-sm">
              Hospitality Business Transformation & Advisory
            </div>

            <h1 className="text-5xl font-bold leading-[1.08] tracking-tight text-slate-900 md:text-7xl">
              Make Your Hotel
              <span className="block text-[#315c52]">
                More Organized & Profitable.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
              CoreStay Advisory membantu owner hotel memperbaiki operasional,
              pricing, revenue, SOP, dan sistem kerja agar bisnis hotel
              berjalan lebih rapi, terukur, dan menguntungkan.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/assessment"
                className="rounded-2xl bg-[#315c52] px-7 py-4 text-center font-semibold text-white shadow-lg shadow-[#315c52]/20 transition hover:-translate-y-1 hover:bg-[#274d44]"
              >
                Start Hotel Assessment
              </Link>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-slate-200 bg-white/90 px-7 py-4 text-center font-semibold text-slate-700 shadow-sm transition hover:-translate-y-1 hover:border-[#c6dcd3] hover:bg-[#f5faf7]"
              >
                Consult via WhatsApp
              </a>
            </div>

            <p className="mt-4 text-sm text-slate-500">
              Initial consultation for hotel owners & management.
            </p>
          </div>

          {/* VALUE CARDS */}
          <div className="mt-20 grid gap-5 md:grid-cols-3">
            <div className="rounded-3xl border border-[#dce9e3] bg-white p-7 shadow-[0_18px_50px_rgba(49,92,82,0.08)] transition hover:-translate-y-1">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e7f1ec] text-sm font-bold text-[#315c52]">
                01
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Operational System
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                Membantu membangun SOP, rules, struktur kerja, dan kontrol
                operasional yang lebih konsisten.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e1e7ee] bg-white p-7 shadow-[0_18px_50px_rgba(70,90,110,0.07)] transition hover:-translate-y-1">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf0f7] text-sm font-bold text-[#48657f]">
                02
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Pricing & Revenue
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                Menata pricing, BAR, positioning, dan revenue strategy agar
                kamar tidak hanya terjual, tetapi menghasilkan.
              </p>
            </div>

            <div className="rounded-3xl border border-[#eadfd7] bg-white p-7 shadow-[0_18px_50px_rgba(120,90,70,0.07)] transition hover:-translate-y-1">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f8eee7] text-sm font-bold text-[#9a684c]">
                03
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Hotel Business Health
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                Assessment berbasis kondisi bisnis hotel untuk menemukan
                area yang paling membutuhkan perhatian.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ASSESSMENT CTA */}
      <section className="relative overflow-hidden bg-[#315c52]">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#78a895]/25 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#d9b38c]/15 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-20 text-center text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#d8e9e1]">
            Hotel Business Health Assessment
          </p>

          <h2 className="mt-4 text-3xl font-bold md:text-5xl">
            Seberapa sehat bisnis hotel Anda?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-7 text-white/80">
            Mulai dengan assessment sederhana untuk melihat area yang perlu
            diperbaiki sebelum mengambil keputusan bisnis berikutnya.
          </p>

          <div className="mt-8">
            <Link
              href="/assessment"
              className="inline-block rounded-2xl bg-white px-8 py-4 font-semibold text-[#315c52] shadow-xl transition hover:-translate-y-1 hover:bg-[#f5faf7]"
            >
              Start Assessment
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#243b36] text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-3">
            <div>
              <Image
                src="/logo-corestay.png"
                alt="CoreStay Advisory"
                width={180}
                height={70}
                className="h-auto w-[160px] object-contain"
              />

              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">
                Hospitality Business Transformation & Advisory untuk membantu
                owner hotel membangun operasional yang lebih rapi, pricing
                yang lebih tepat, dan bisnis yang lebih menguntungkan.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-[#d8e9e1]">
                CoreStay Advisory
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-slate-300">
                <li>Hotel Business Assessment</li>
                <li>Operational System</li>
                <li>Pricing & Revenue</li>
                <li>SOP & Company Rules</li>
                <li>Pre-opening & Hotel Reset</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#e8c9aa]">
                Let&apos;s Talk
              </h3>

              <p className="mt-5 text-sm leading-7 text-slate-300">
                Punya masalah dengan operasional, SDM, pricing, atau revenue
                hotel?
              </p>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block font-semibold text-[#d8e9e1] transition hover:text-white"
              >
                WhatsApp: 0851 0900 6363 →
              </a>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-7 text-xs text-slate-400 md:flex-row md:items-center md:justify-between">
            <p>
              © {new Date().getFullYear()} CoreStay Advisory. All rights reserved.
            </p>

            <p>
              Hospitality Business Transformation & Advisory
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
