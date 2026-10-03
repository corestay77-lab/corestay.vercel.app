import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const whatsappNumber = "6285109006363";
  const whatsappMessage = encodeURIComponent(
    "Halo CoreStay Advisory, saya ingin berkonsultasi mengenai bisnis hotel saya."
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <main className="min-h-screen bg-[#f6f8f6] text-[#24332f]">
      {/* NAVIGATION */}
      <header className="sticky top-0 z-50 border-b border-[#dfe7e2] bg-[#f6f8f6]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-corestay.png"
              alt="CoreStay Advisory"
              width={180}
              height={70}
              className="h-auto w-[145px] object-contain"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-[#52645e] md:flex">
            <a href="#services" className="transition hover:text-[#315c52]">Services</a>
            <a href="#assessment" className="transition hover:text-[#315c52]">Assessment</a>
            <a href="#contact" className="transition hover:text-[#315c52]">Contact</a>
          </nav>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-[#315c52] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#274d44]"
          >
            Talk to Us
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[#e1e8e3] bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(180,205,194,0.42),transparent_30%),radial-gradient(circle_at_12%_80%,rgba(239,222,205,0.38),transparent_28%)]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d7e3dd] bg-[#f4f8f5] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#315c52]">
              CoreStay Advisory
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-[-0.035em] text-[#20302b] md:text-6xl lg:text-7xl">
              Make Your Hotel
              <span className="block text-[#315c52]">More Organized & Profitable.</span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#65736f] md:text-xl">
              CoreStay Advisory membantu owner hotel memperbaiki operasional,
              pricing, revenue, SOP, dan sistem kerja agar bisnis hotel
              berjalan lebih rapi, terukur, dan menguntungkan.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/assessment"
                className="rounded-xl bg-[#315c52] px-7 py-4 text-center text-sm font-bold text-white shadow-lg shadow-[#315c52]/15 transition hover:-translate-y-0.5 hover:bg-[#274d44]"
              >
                Start Hotel Assessment
              </Link>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-[#d6dfda] bg-white px-7 py-4 text-center text-sm font-bold text-[#315c52] transition hover:border-[#b8cbc2] hover:bg-[#f7faf8]"
              >
                Consult via WhatsApp
              </a>
            </div>

            <p className="mt-4 text-sm text-[#87928e]">
              Initial consultation for hotel owners & management.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-[#dce9e2]/50 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-[#dce4df] bg-gradient-to-br from-[#edf5f0] via-white to-[#f4e9df] p-5 shadow-[0_25px_80px_rgba(49,92,82,0.12)]">
              <div className="rounded-[1.5rem] border border-white/80 bg-white/75 p-6 backdrop-blur">
                <div className="flex items-center justify-between border-b border-[#e4ebe7] pb-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#84938d]">
                      Hotel Business
                    </p>
                    <p className="mt-1 text-lg font-bold text-[#283a34]">
                      Health Overview
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7f0eb] text-[#315c52]">
                    ✦
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="rounded-2xl bg-[#f4f8f5] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#52645e]">Operational System</span>
                      <span className="h-2 w-16 rounded-full bg-[#b9cec3]" />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#f7f4ef] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#665d53]">Pricing & Revenue</span>
                      <span className="h-2 w-20 rounded-full bg-[#d7bea1]" />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-[#f1f4f7] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#596875]">People & SOP</span>
                      <span className="h-2 w-14 rounded-full bg-[#b7c6d1]" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-[#315c52] p-5 text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
                    Next Step
                  </p>
                  <p className="mt-2 text-xl font-semibold">
                    Start your hotel assessment
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="bg-[#f6f8f6] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#315c52]">
              What We Focus On
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#24332f] md:text-4xl">
              Practical systems for a healthier hotel business.
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="rounded-3xl border border-[#dbe6e0] bg-white p-7 shadow-[0_12px_45px_rgba(49,92,82,0.06)]">
              <div className="text-sm font-bold text-[#8aa79b]">01</div>
              <h3 className="mt-5 text-xl font-bold">Operational System</h3>
              <p className="mt-3 leading-7 text-[#687670]">
                Membantu membangun SOP, rules, struktur kerja, dan kontrol
                operasional yang lebih konsisten.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e3e5e8] bg-white p-7 shadow-[0_12px_45px_rgba(70,85,100,0.05)]">
              <div className="text-sm font-bold text-[#8298aa]">02</div>
              <h3 className="mt-5 text-xl font-bold">Pricing & Revenue</h3>
              <p className="mt-3 leading-7 text-[#687670]">
                Menata pricing, BAR, positioning, dan revenue strategy agar
                kamar tidak hanya terjual, tetapi menghasilkan.
              </p>
            </div>

            <div className="rounded-3xl border border-[#e8e0d9] bg-white p-7 shadow-[0_12px_45px_rgba(110,90,70,0.05)]">
              <div className="text-sm font-bold text-[#ad9278]">03</div>
              <h3 className="mt-5 text-xl font-bold">Hotel Business Health</h3>
              <p className="mt-3 leading-7 text-[#687670]">
                Assessment berbasis kondisi bisnis hotel untuk menemukan
                area yang paling membutuhkan perhatian.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ASSESSMENT */}
      <section id="assessment" className="relative overflow-hidden bg-[#e9f1ed]">
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[#c8ddd3]/60 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#ead8c7]/50 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#315c52]">
                Hotel Business Health Assessment
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-[#24332f] md:text-5xl">
                Seberapa sehat bisnis hotel Anda?
              </h2>
              <p className="mt-5 max-w-2xl leading-7 text-[#66746f]">
                Mulai dengan assessment sederhana untuk melihat area yang perlu
                diperbaiki sebelum mengambil keputusan bisnis berikutnya.
              </p>
            </div>

            <Link
              href="/assessment"
              className="rounded-xl bg-[#315c52] px-8 py-4 text-center text-sm font-bold text-white shadow-lg shadow-[#315c52]/15 transition hover:-translate-y-0.5 hover:bg-[#274d44]"
            >
              Start Assessment →
            </Link>
          </div>
        </div>
      </section>

      {/* CONTACT / FOOTER */}
      <footer id="contact" className="bg-[#243b36] text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <Image
                src="/logo-corestay.png"
                alt="CoreStay Advisory"
                width={180}
                height={70}
                className="h-auto w-[160px] object-contain"
              />
              <p className="mt-5 max-w-md text-sm leading-7 text-white/65">
                Hospitality Business Transformation & Advisory untuk membantu
                owner hotel membangun operasional yang lebih rapi, pricing
                yang lebih tepat, dan bisnis yang lebih menguntungkan.
              </p>
            </div>

            <div>
              <p className="text-sm font-bold text-[#d8e9e1]">CoreStay Advisory</p>
              <ul className="mt-5 space-y-3 text-sm text-white/60">
                <li>Hotel Business Assessment</li>
                <li>Operational System</li>
                <li>Pricing & Revenue</li>
                <li>SOP & Company Rules</li>
                <li>Pre-opening & Hotel Reset</li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-bold text-[#e8c9aa]">Let&apos;s Talk</p>
              <p className="mt-5 text-sm leading-7 text-white/60">
                Punya masalah dengan operasional, SDM, pricing, atau revenue hotel?
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block text-sm font-bold text-[#d8e9e1] transition hover:text-white"
              >
                WhatsApp: 0851 0900 6363 →
              </a>
            </div>
          </div>

          <div className="mt-12 border-t border-white/10 pt-7 text-xs text-white/40">
            © {new Date().getFullYear()} CoreStay Advisory. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
