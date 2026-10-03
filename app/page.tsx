import Image from "next/image";
import Link from "next/link";

export default function Home() {
  const whatsappNumber = "6285109006363";
  const whatsappMessage = encodeURIComponent(
    "Halo CoreStay Advisory, saya ingin berkonsultasi mengenai bisnis hotel saya."
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#17243d] lg:pl-[250px]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[250px] border-r border-white/10 bg-black text-white lg:flex lg:flex-col">
        <div className="flex h-full flex-col px-6 py-7">
          <Link href="/" className="flex items-center justify-center rounded-2xl px-2 py-3">
            <Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="h-auto w-[165px] object-contain mix-blend-screen" priority />
          </Link>
          <div className="mt-6">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Navigation</p>
            <nav className="mt-4 space-y-1.5">
              <a href="#services" className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"><span className="h-1.5 w-1.5 rounded-full bg-white/30 transition group-hover:bg-[#d8b985]" />Services</a>
              <a href="#assessment" className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"><span className="h-1.5 w-1.5 rounded-full bg-white/30 transition group-hover:bg-[#d8b985]" />Assessment</a>
              <a href="#contact" className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"><span className="h-1.5 w-1.5 rounded-full bg-white/30 transition group-hover:bg-[#d8b985]" />Contact</a>
            </nav>
          </div>
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8b985]">CoreStay Advisory</p>
            <p className="mt-2 text-xs leading-5 text-white/50">Hospitality Business Transformation & Advisory.</p>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#162b4a] transition hover:bg-[#eef2f7]">Talk to Us</a>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <Link href="/" className="flex items-center"><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="h-auto w-[135px] object-contain mix-blend-screen" priority /></Link>
          <nav className="flex items-center gap-4 text-xs font-semibold text-white/65"><a href="#services" className="hover:text-white">Services</a><a href="#assessment" className="hover:text-white">Assessment</a><a href="#contact" className="hover:text-white">Contact</a></nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#edf2f8]">
        <div className="absolute -right-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-[#d8e2f0] blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-[28rem] w-[28rem] rounded-full bg-[#e9e1d8] blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[58%] overflow-hidden lg:block" aria-hidden="true">
          <svg viewBox="0 0 1440 430" preserveAspectRatio="none" className="absolute bottom-0 h-full w-full opacity-[0.13]"><defs><linearGradient id="hotelFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#203b68" stopOpacity="0.95" /><stop offset="100%" stopColor="#203b68" stopOpacity="0.15" /></linearGradient></defs><path fill="url(#hotelFade)" d="M0 430V335h95v-72h70v-38h76v38h48v-92h90v92h42V155h108v108h48V76h132v187h56V190h84v73h74V118h120v145h48V45h138v218h48v-83h74v83h101v167H0Z"/><g fill="#eef3f8"><path d="M125 286h34v34h-34zM183 286h34v34h-34zM319 190h34v34h-34zM377 190h34v34h-34zM510 112h34v34h-34zM568 112h34v34h-34zM692 230h34v34h-34zM750 230h34v34h-34zM873 158h34v34h-34zM931 158h34v34h-34zM1052 86h34v34h-34zM1110 86h34v34h-34zM1235 122h34v34h-34zM1293 122h34v34h-34z"/></g></svg>
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-6 py-14 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-[15px] font-medium tracking-[0.12em] text-[#58708f]">CoreStay Advisory</p>
            <h1 className="mt-4 max-w-[620px] text-[44px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#17243d] md:text-[46px] lg:text-[48px]">
              Make Your Hotel <span className="text-[#203b68]">More Organized & Profitable.</span>
            </h1>
            <p className="mt-6 max-w-[620px] text-[16px] leading-[1.65] text-[#66738a] md:text-[17px]">
              CoreStay Advisory membantu owner hotel memperbaiki operasional, pricing, revenue, SOP, dan sistem kerja agar bisnis hotel berjalan lebih rapi, terukur, dan menguntungkan.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/assessment" className="rounded-xl bg-[#203b68] px-7 py-4 text-center text-sm font-bold text-white shadow-xl shadow-[#315c52]/20 transition hover:-translate-y-1 hover:bg-[#162d52]">Start Hotel Assessment</Link>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border border-[#d7dee8] bg-white/80 px-7 py-4 text-center text-sm font-bold text-[#203b68] shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white">Consult via WhatsApp</a>
            </div>
            <p className="mt-3 text-sm text-[#8a95a5]">Initial consultation for hotel owners & management.</p>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-8 rounded-[3rem] bg-[#cbd7e8]/60 blur-3xl" />
            <div className="relative rounded-[2.5rem] border border-white/80 bg-white/70 p-4 shadow-[0_30px_100px_rgba(32,59,104,0.16)] backdrop-blur">
              <div className="rounded-[2rem] bg-[#162b4a] p-7 text-white">
                <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">CoreStay</p><h2 className="mt-2 text-2xl font-semibold">Hotel Business Health</h2></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">Advisory</span></div>
                <div className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/50">01</p><p className="mt-2 font-semibold">Operations</p></div><div className="rounded-2xl bg-[#b99362]/20 p-4"><p className="text-xs text-[#d8b985]">02</p><p className="mt-2 font-semibold">Revenue</p></div><div className="rounded-2xl bg-[#6f8eae]/20 p-4"><p className="text-xs text-[#cbd8e8]">03</p><p className="mt-2 font-semibold">People</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/50">04</p><p className="mt-2 font-semibold">SOP & System</p></div></div>
                <Link href="/assessment" className="mt-4 flex items-center justify-between rounded-2xl bg-[#f3f6fa] px-5 py-4 text-sm font-bold text-[#203b68] transition hover:bg-white">Start Assessment <span>→</span></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="bg-white py-14 lg:py-18"><div className="mx-auto max-w-7xl px-6 lg:px-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b8a80]">Our Focus</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#24332f] md:text-4xl">From hotel problems to practical systems.</h2></div><p className="max-w-md text-sm leading-6 text-[#7a8581]">Pendekatan CoreStay berfokus pada hal yang benar-benar dipakai dalam operasional hotel sehari-hari.</p></div><div className="mt-7 grid gap-5 md:grid-cols-3"><div className="group rounded-[2rem] border border-[#dce4ef] bg-[#f7f9fc] p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#315c52]/10"><div className="flex items-center justify-between"><span className="text-sm font-bold text-[#6f89aa]">01</span><span className="text-[#9caec3]">↗</span></div><h3 className="mt-8 text-xl font-bold">Operational System</h3><p className="mt-3 leading-7 text-[#687670]">Membantu membangun SOP, rules, struktur kerja, dan kontrol operasional yang lebih konsisten.</p></div><div className="group rounded-[2rem] border border-[#e3ded6] bg-[#faf8f4] p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#a9825d]/10"><div className="flex items-center justify-between"><span className="text-sm font-bold text-[#a78660]">02</span><span className="text-[#bba17f]">↗</span></div><h3 className="mt-12 text-xl font-bold">Pricing & Revenue</h3><p className="mt-3 leading-7 text-[#687670]">Menata pricing, BAR, positioning, dan revenue strategy agar kamar tidak hanya terjual, tetapi menghasilkan.</p></div><div className="group rounded-[2rem] border border-[#d9e1eb] bg-[#f5f8fb] p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-[#617d95]/10"><div className="flex items-center justify-between"><span className="text-sm font-bold text-[#7089a7]">03</span><span className="text-[#9aabc0]">↗</span></div><h3 className="mt-12 text-xl font-bold">Hotel Business Health</h3><p className="mt-3 leading-7 text-[#687670]">Assessment berbasis kondisi bisnis hotel untuk menemukan area yang paling membutuhkan perhatian.</p></div></div></div></section>

      <section id="assessment" className="bg-[#eeeae4] py-14 lg:py-18"><div className="mx-auto max-w-7xl px-6 lg:px-8"><div className="overflow-hidden rounded-[2.5rem] bg-[#203b68] p-8 text-white shadow-[0_25px_80px_rgba(32,59,104,0.18)] md:p-12"><div className="grid items-center gap-10 md:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#cbd8e8]">Hotel Business Health Assessment</p><h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">Seberapa sehat bisnis hotel Anda?</h2><p className="mt-4 max-w-2xl leading-7 text-white/70">Mulai dengan assessment sederhana untuk melihat area yang perlu diperbaiki sebelum mengambil keputusan bisnis berikutnya.</p></div><Link href="/assessment" className="rounded-xl bg-white px-7 py-4 text-center text-sm font-bold text-[#203b68] shadow-xl transition hover:-translate-y-1 hover:bg-[#f7f9fc]">Start Assessment →</Link></div></div></div></section>

      <footer id="contact" className="bg-[#162b4a] text-white"><div className="mx-auto max-w-7xl px-6 py-12 lg:px-8"><div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]"><div><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="h-auto w-[160px] object-contain mix-blend-screen" /><p className="mt-5 max-w-md text-sm leading-7 text-white/60">Hospitality Business Transformation & Advisory untuk membantu owner hotel membangun operasional yang lebih rapi, pricing yang lebih tepat, dan bisnis yang lebih menguntungkan.</p></div><div><p className="text-sm font-bold text-[#d1dced]">CoreStay Advisory</p><ul className="mt-5 space-y-3 text-sm text-white/55"><li>Hotel Business Assessment</li><li>Operational System</li><li>Pricing & Revenue</li><li>SOP & Company Rules</li><li>Pre-opening & Hotel Reset</li></ul></div><div><p className="text-sm font-bold text-[#d8b985]">Let's Talk</p><p className="mt-5 text-sm leading-7 text-white/55">Punya masalah dengan operasional, SDM, pricing, atau revenue hotel?</p><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-block text-sm font-bold text-[#d1dced] hover:text-white">WhatsApp: 0851 0900 6363 →</a></div></div><div className="mt-8 border-t border-white/10 pt-7 text-xs text-white/35">© {new Date().getFullYear()} CoreStay Advisory. All rights reserved.</div></div></footer>
    </main>
  );
}