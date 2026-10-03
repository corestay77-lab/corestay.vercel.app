import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const whatsappNumber = "6285109006363";
  const whatsappMessage = encodeURIComponent(
    "Halo CoreStay Advisory, saya ingin berkonsultasi mengenai bisnis hotel saya."
  );

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <main className="min-h-screen overflow-hidden bg-[#fffaf2] text-slate-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/50 bg-white/75 backdrop-blur-xl">
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
            className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            WhatsApp
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-100 via-rose-50 to-cyan-100">
        <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-400/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 md:pb-32 md:pt-28">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex rounded-full border border-amber-300/70 bg-white/70 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm backdrop-blur">
              Hospitality Business Transformation & Advisory
            </div>

            <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-slate-950 md:text-7xl">
              Make Your Hotel
              <span className="block bg-gradient-to-r from-amber-600 via-rose-500 to-fuchsia-600 bg-clip-text text-transparent">
                More Organized & Profitable.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-700 md:text-xl">
              CoreStay Advisory membantu owner hotel memperbaiki operasional,
              pricing, revenue, SOP, dan sistem kerja agar bisnis hotel
              berjalan lebih rapi, terukur, dan menguntungkan.
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/assessment"
                className="rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-7 py-4 text-center font-bold text-white shadow-xl shadow-orange-500/25 transition hover:-translate-y-1 hover:shadow-2xl"
              >
                Start Hotel Assessment
              </Link>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-white/80 bg-white/75 px-7 py-4 text-center font-bold text-slate-800 shadow-lg backdrop-blur transition hover:-translate-y-1 hover:bg-white"
              >
                Consult via WhatsApp
              </a>
            </div>

            <p className="mt-4 text-sm font-medium text-slate-600">
              Initial consultation for hotel owners & management.
            </p>
          </div>

          {/* VALUE CARDS */}
          <div className="mt-20 grid gap-5 md:grid-cols-3">
            <div className="group rounded-3xl border border-amber-200 bg-gradient-to-br from-white to-amber-50 p-7 shadow-xl shadow-amber-200/30 transition hover:-translate-y-2">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-lg font-black text-white shadow-lg">
                01
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Operational System
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                Membantu membangun SOP, rules, struktur kerja, dan kontrol
                operasional yang lebih konsisten.
              </p>
            </div>

            <div className="group rounded-3xl border border-cyan-200 bg-gradient-to-br from-white to-cyan-50 p-7 shadow-xl shadow-cyan-200/30 transition hover:-translate-y-2">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-lg font-black text-white shadow-lg">
                02
              </div>
              <h2 className="text-xl font-black text-slate-900">
                Pricing & Revenue
              </h2>
              <p className="mt-3 leading-7 text-slate-600">
                Menata pricing, BAR, positioning, dan revenue strategy agar
                kamar tidak hanya terjual, tetapi menghasilkan.
              </p>
            </div>

            <div className="group rounded-3xl border border-fuchsia-200 bg-gradient-to-br from-white to-fuchsia-50 p-7 shadow-xl shadow-fuchsia-200/30 transition hover:-translate-y-2">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-lg font-black text-white shadow-lg">
                03
              </div>
              <h2 className="text-xl font-black text-slate-900">
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
      <section className="relative overflow-hidden bg-gradient-to-r from-violet-700 via-fuchsia-600 to-rose-500">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-20 text-center text-white">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-200">
            Hotel Business Health Assessment
          </p>

          <h2 className="mt-4 text-3xl font-black md:text-5xl">
            Seberapa sehat bisnis hotel Anda?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-7 text-white/85">
            Mulai dengan assessment sederhana untuk melihat area yang perlu
            diperbaiki sebelum mengambil keputusan bisnis berikutnya.
          </p>

          <div className="mt-8">
            <Link
              href="/assessment"
              className="inline-block rounded-2xl bg-white px-8 py-4 font-black text-violet-700 shadow-2xl transition hover:-translate-y-1 hover:bg-amber-50"
            >
              Start Assessment
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-3">
            {/* BRAND */}
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

            {/* SERVICES */}
            <div>
              <h3 className="font-bold text-amber-300">
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

            {/* CONTACT */}
            <div>
              <h3 className="font-bold text-cyan-300">
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
                className="mt-5 inline-block font-bold text-emerald-300 transition hover:text-white"
              >
                WhatsApp: 0851 0900 6363 →
              </a>
            </div>
          </div>

          {/* BOTTOM FOOTER */}
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
