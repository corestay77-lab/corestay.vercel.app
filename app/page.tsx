import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const whatsappNumber = "6285109006363";
  const whatsappMessage = encodeURIComponent(
    "Halo CoreStay Advisory, saya ingin berkonsultasi mengenai bisnis hotel saya."
  );

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <main className="min-h-screen bg-[#050817] text-white">

      {/* HEADER */}
      <header className="border-b border-white/10">
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
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium transition hover:bg-white hover:text-[#050817]"
          >
            WhatsApp
          </a>

        </div>
      </header>


      {/* HERO */}
      <section className="relative overflow-hidden">

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.18),transparent_35%)]" />

        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 md:pb-32 md:pt-28">

          <div className="max-w-4xl">

            <div className="mb-6 inline-flex rounded-full border border-[#d9b75d]/30 bg-[#d9b75d]/10 px-4 py-2 text-sm text-[#e6c96b]">
              Hospitality Business Transformation & Advisory
            </div>

            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Make Your Hotel
              <span className="block text-[#e6c96b]">
                More Organized & Profitable.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              CoreStay Advisory membantu owner hotel memperbaiki operasional,
              pricing, revenue, SOP, dan sistem kerja agar bisnis hotel
              berjalan lebih rapi, terukur, dan menguntungkan.
            </p>


            {/* CTA */}
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">

              <Link
                href="/assessment"
                className="rounded-xl bg-blue-600 px-7 py-4 text-center font-semibold shadow-lg shadow-blue-600/20 transition hover:bg-blue-500"
              >
                Start Hotel Assessment
              </Link>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/20 bg-white/5 px-7 py-4 text-center font-semibold transition hover:bg-white/10"
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

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <div className="mb-4 text-2xl text-[#e6c96b]">01</div>

              <h2 className="text-xl font-semibold">
                Operational System
              </h2>

              <p className="mt-3 leading-7 text-slate-400">
                Membantu membangun SOP, rules, struktur kerja, dan kontrol
                operasional yang lebih konsisten.
              </p>
            </div>


            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <div className="mb-4 text-2xl text-[#e6c96b]">02</div>

              <h2 className="text-xl font-semibold">
                Pricing & Revenue
              </h2>

              <p className="mt-3 leading-7 text-slate-400">
                Menata pricing, BAR, positioning, dan revenue strategy agar
                kamar tidak hanya terjual, tetapi menghasilkan.
              </p>
            </div>


            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <div className="mb-4 text-2xl text-[#e6c96b]">03</div>

              <h2 className="text-xl font-semibold">
                Hotel Business Health
              </h2>

              <p className="mt-3 leading-7 text-slate-400">
                Assessment berbasis kondisi bisnis hotel untuk menemukan
                area yang paling membutuhkan perhatian.
              </p>
            </div>

          </div>

        </div>
      </section>


      {/* ASSESSMENT CTA */}
      <section className="border-y border-white/10 bg-white/[0.025]">

        <div className="mx-auto max-w-6xl px-6 py-20 text-center">

          <p className="text-sm font-medium uppercase tracking-[0.25em] text-[#e6c96b]">
            Hotel Business Health Assessment
          </p>

          <h2 className="mt-4 text-3xl font-bold md:text-4xl">
            Seberapa sehat bisnis hotel Anda?
          </h2>

          <p className="mx-auto mt-5 max-w-2xl leading-7 text-slate-400">
            Mulai dengan assessment sederhana untuk melihat area yang perlu
            diperbaiki sebelum mengambil keputusan bisnis berikutnya.
          </p>

          <div className="mt-8">
            <Link
              href="/assessment"
              className="inline-block rounded-xl bg-blue-600 px-8 py-4 font-semibold transition hover:bg-blue-500"
            >
              Start Assessment
            </Link>
          </div>

        </div>

      </section>


      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#030510]">

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

              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
                Hospitality Business Transformation & Advisory untuk membantu
                owner hotel membangun operasional yang lebih rapi, pricing
                yang lebih tepat, dan bisnis yang lebih menguntungkan.
              </p>

            </div>


            {/* SERVICES */}
            <div>

              <h3 className="font-semibold text-white">
                CoreStay Advisory
              </h3>

              <ul className="mt-5 space-y-3 text-sm text-slate-400">
                <li>Hotel Business Assessment</li>
                <li>Operational System</li>
                <li>Pricing & Revenue</li>
                <li>SOP & Company Rules</li>
                <li>Pre-opening & Hotel Reset</li>
              </ul>

            </div>


            {/* CONTACT */}
            <div>

              <h3 className="font-semibold text-white">
                Let&apos;s Talk
              </h3>

              <p className="mt-5 text-sm leading-7 text-slate-400">
                Punya masalah dengan operasional, SDM, pricing, atau revenue
                hotel?
              </p>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block font-semibold text-[#e6c96b] transition hover:text-white"
              >
                WhatsApp: 0851 0900 6363 →
              </a>

            </div>

          </div>


          {/* BOTTOM FOOTER */}
          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-7 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">

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