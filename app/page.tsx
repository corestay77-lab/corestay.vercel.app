import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const whatsappNumber = "6285109006363";
  const whatsappMessage = encodeURIComponent(
    "Halo CoreStay Advisory, saya ingin berkonsultasi mengenai bisnis hotel saya."
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#23332e]">
      <header className="sticky top-0 z-50 border-b border-[#dfe7e1] bg-[#f5f7f4]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center">
            <Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="h-auto w-[150px] object-contain mix-blend-multiply" priority />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#61706b] md:flex">
            <a href="#services" className="hover:text-[#315c52]">Services</a>
            <a href="#assessment" className="hover:text-[#315c52]">Assessment</a>
            <a href="#contact" className="hover:text-[#315c52]">Contact</a>
          </nav>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#315c52] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#315c52]/15 transition hover:-translate-y-0.5 hover:bg-[#274d44]">Talk to Us</a>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#eef3ef]">
        <div className="absolute -right-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-[#d8e6df] blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-[28rem] w-[28rem] rounded-full bg-[#eee1d4] blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-28">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#55776d]">CoreStay Advisory</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.03] tracking-[-0.045em] text-[#20312b] md:text-6xl lg:text-7xl">
              Make Your Hotel
              <span className="block text-[#315c52]">More Organized & Profitable.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#66756f] md:text-xl">
              CoreStay Advisory membantu owner hotel memperbaiki operasional,
              pricing, revenue, SOP, dan sistem kerja agar bisnis hotel
              berjalan lebih rapi, terukur, dan menguntungkan.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/assessment" className="rounded-xl bg-[#315c52] px-7 py-4 text-center text-sm font-bold text-white shadow-xl shadow-[#315c52]/20 transition hover:-translate-y-1 hover:bg-[#274d44]">Start Hotel Assessment</Link>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[#d3ddd7] bg-white/80 px-7 py-4 text-center text-sm font-bold text-[#315c52] shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white">Consult via WhatsApp</a>
            </div>
            <p className="mt-4 text-sm text-[#87938e]">Initial consultation for hotel owners & management.</p>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-8 rounded-[3rem] bg-[#cbded4]/60 blur-3xl" />
            <div className="relative rounded-[2.5rem] border border-white/80 bg-white/70 p-4 shadow-[0_30px_100px_rgba(49,92,82,0.16)] backdrop-blur">
              <div className="rounded-[2rem] bg-[#243b36] p-7 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">CoreStay</p>
                    <h2 className="mt-2 text-2xl font-semibold">Hotel Business Health</h2>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">Advisory</span>
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/50">01</p><p className="mt-2 font-semibold">Operations</p></div>
                  <div className="rounded-2xl bg-[#d9b38c]/20 p-4"><p className="text-xs text-[#e8c9aa]">02</p><p className="mt-2 font-semibold">Revenue</p></div>
                  <div className="rounded-2xl bg-[#7da998]/20 p-4"><p className="text-xs text-[#c8ddd4]">03</p><p className="mt-2 font-semibold">People</p></div>
                  <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/50">04</p><p className="mt-2 font-semibold">SOP & System</p></div>
                </div>
                <Link href="/assessment" className="mt-6 flex items-center justify-between rounded-2xl bg-[#f1f5f2] px-5 py-4 text-sm font-bold text-[#315c52] transition hover:bg-white">
                  Start Assessment <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="bg-white py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b8a80]">Our Focus</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#24332f] md:text-4xl">From hotel problems to practical systems.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#7a8581]">Pendekatan CoreStay berfokus pada hal yang benar-benar dipakai dalam operasional hotel sehari-hari.</p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="group rounded-[2rem] border border-[#dfe9e3] bg-[#f7faf8] p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#315c52]/10">
              <div className="flex items-center justify-between"><span className="text-sm font-bold text-[#7ca193]">01</span><span className="text-[#9bb5aa]">↗</span></div>
              <h3 className="mt-12 text-xl font-bold">Operational System</h3>
              <p className="mt-3 leading-7 text-[#687670]">Membantu membangun SOP, rules, struktur kerja, dan kontrol operasional yang lebih konsisten.</p>
            </div>
            <div className="group rounded-[2rem] border border-[#e7e4dd] bg-[#fbf8f3] p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#a9825d]/10">
              <div className="flex items-center justify-between"><span className="text-sm font-bold text-[#b39475]">02</span><span className="text-[#c4a98d]">↗</span></div>
              <h3 className="mt-12 text-xl font-bold">Pricing & Revenue</h3>
              <p className="mt-3 leading-7 text-[#687670]">Menata pricing, BAR, positioning, dan revenue strategy agar kamar tidak hanya terjual, tetapi menghasilkan.</p>
            </div>
            <div className="group rounded-[2rem] border border-[#dfe4ea] bg-[#f6f8fa] p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#617d95]/10">
              <div className="flex items-center justify-between"><span className="text-sm font-bold text-[#7b93a7]">03</span><span className="text-[#a3b5c4]">↗</span></div>
              <h3 className="mt-12 text-xl font-bold">Hotel Business Health</h3>
              <p className="mt-3 leading-7 text-[#687670]">Assessment berbasis kondisi bisnis hotel untuk menemukan area yang paling membutuhkan perhatian.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="assessment" className="bg-[#f5f0e9] py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2.5rem] bg-[#315c52] p-8 text-white shadow-[0_25px_80px_rgba(49,92,82,0.18)] md:p-12">
            <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#cfe0d8]">Hotel Business Health Assessment</p>
                <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">Seberapa sehat bisnis hotel Anda?</h2>
                <p className="mt-5 max-w-2xl leading-7 text-white/70">Mulai dengan assessment sederhana untuk melihat area yang perlu diperbaiki sebelum mengambil keputusan bisnis berikutnya.</p>
              </div>
              <Link href="/assessment" className="rounded-xl bg-white px-7 py-4 text-center text-sm font-bold text-[#315c52] shadow-xl transition hover:-translate-y-1 hover:bg-[#f5faf8]">Start Assessment →</Link>
            </div>
          </div>
        </div>
      </section>

      <footer id="contact" className="bg-[#243b36] text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="h-auto w-[160px] object-contain mix-blend-multiply" />
              <p className="mt-5 max-w-md text-sm leading-7 text-white/60">Hospitality Business Transformation & Advisory untuk membantu owner hotel membangun operasional yang lebih rapi, pricing yang lebih tepat, dan bisnis yang lebih menguntungkan.</p>
            </div>
            <div><p className="text-sm font-bold text-[#d8e9e1]">CoreStay Advisory</p><ul className="mt-5 space-y-3 text-sm text-white/55"><li>Hotel Business Assessment</li><li>Operational System</li><li>Pricing & Revenue</li><li>SOP & Company Rules</li><li>Pre-opening & Hotel Reset</li></ul></div>
            <div><p className="text-sm font-bold text-[#e8c9aa]">Let&apos;s Talk</p><p className="mt-5 text-sm leading-7 text-white/55">Punya masalah dengan operasional, SDM, pricing, atau revenue hotel?</p><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-sm font-bold text-[#d8e9e1] hover:text-white">WhatsApp: 0851 0900 6363 →</a></div>
          </div>
          <div className="mt-12 border-t border-white/10 pt-7 text-xs text-white/35">© {new Date().getFullYear()} CoreStay Advisory. All rights reserved.</div>
        </div>
      </footer>
    </main>
  );
}
