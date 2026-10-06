"use client";

import Image from "next/image";
import Link from "next/link";

const capabilities = [
  ["Penilaian Operasional", "dan Kesiapan Hotel", "clipboard"], ["Pengembangan", "Prosedur Operasional Standar (SOP)", "document"], ["Strategi Pendapatan", "dan Penetapan Harga", "chart"], ["Penganggaran, Prakiraan,", "dan Pengendalian Keuangan", "money"], ["Kesiapan Sumber Daya", "Manusia dan Organisasi", "people"], ["Implementasi Sistem", "Manajemen Properti (PMS)", "gear"], ["Optimalisasi Alur Kerja", "Housekeeping dan Front Office", "hotel"], ["Pelaporan Manajemen", "dan Pemantauan Kinerja", "report"],
] as const;

function Icon({ type }: { type: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    home:<><path d="m3 11 9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>, building:<><path d="M5 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M3 21h18M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/></>, briefcase:<><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>, people:<><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M15 15a5 5 0 0 1 6 5"/></>, document:<><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h6M9 16h6"/></>, book:<><path d="M4 4h7a3 3 0 0 1 3 3v14H7a3 3 0 0 0-3 3z"/><path d="M20 4h-6v17h6M7 8h4M7 12h4"/></>, mail:<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>, clipboard:<><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8 10h8M8 14h6"/></>, chart:<><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 5-6"/></>, money:<><circle cx="12" cy="12" r="8"/><path d="M15 9.5c-.6-.7-1.6-1.1-2.8-1.1-1.7 0-2.7.8-2.7 2s1 1.8 2.8 2.1c1.7.3 2.7.8 2.7 2.1s-1 2-2.9 2c-1.2 0-2.3-.4-3-1.2M12 6.5v11"/></>, gear:<><circle cx="12" cy="12" r="3"/><path d="m19 12 2-1-1-3-2 .2-1.4-1.4.2-2-3-1-1 2H10L9 5 6 6l.2 2L4.8 9.4l-2-.2-1 3 2 1v2l-2 1 1 3 2-.2L6.4 19l-.2 2 3 1 1-2h2l1 2 3-1-.2-2 1.4-1.4 2 .2 1-3-2-1z"/></>, hotel:<><path d="M4 21V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v15"/><path d="M4 12h16M7 8h3M14 8h3M7 16h3M14 16h3M2 21h20"/></>, report:<><path d="M5 20V5h14v15"/><path d="M8 16v-4M12 16V8M16 16v-6"/></>, arrow:<><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></>
  };
  return <svg viewBox="0 0 24 24" {...common} className="h-6 w-6">{paths[type]}</svg>;
}

const menu = [["Home","/","home"],["About Us","/about","building"],["Project Experience","/experience","briefcase"],["Services","/services","people"],["Toolkit","/hotel-toolkit","document"],["Blog","/blog","book"],["Contact","/contact","mail"]] as const;

export default function ExperiencePage() {
  return <div className="fixed inset-0 z-[200] overflow-y-auto bg-white text-[#17345d]">
    <aside className="fixed inset-y-0 left-0 z-[220] hidden w-[200px] flex-col overflow-hidden bg-[#071728] text-white lg:flex">
      <div className="flex h-full flex-col">
        <div className="px-5 pt-5"><Link href="/" className="block text-center"><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={145} height={62} className="mx-auto h-auto w-[142px] object-contain" priority /></Link></div>
        <nav className="mt-8 px-2.5">{menu.map(([label,href,icon])=><Link key={label} href={href} className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium transition ${href==="/experience"?"bg-[#e5b94d] text-white shadow-[0_8px_24px_rgba(229,185,77,.22)]":"text-white/90 hover:bg-white/10"}`}><Icon type={icon}/><span>{label}</span></Link>)}</nav>
        <div className="mt-auto"><div className="relative h-[220px] overflow-hidden"><img src="/experience/project-2.svg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" /><div className="absolute inset-0 bg-gradient-to-t from-[#071728] via-[#071728]/20 to-transparent"/></div><div className="bg-[#071728] px-5 pb-7 pt-0 text-center"><p className="font-serif text-[24px] italic leading-6 text-[#f2c95c]">Better<br/>Hotel<br/>Performance<br/>Together</p></div></div>
      </div>
    </aside>

    <main className="min-h-screen lg:ml-[200px]">
      <section className="relative min-h-[380px] overflow-hidden bg-[#fbfaf7]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_15%,rgba(229,185,77,.18),transparent_30%),linear-gradient(115deg,#fff_0%,#fbfaf7_48%,#f2eee4_100%)]"/>
        <div className="relative mx-auto flex min-h-[380px] max-w-[1250px] items-center px-7 py-12 md:px-12 lg:px-10">
          <div className="absolute left-7 top-5 z-30 md:left-12 lg:left-10">
            <Link href="/" className="group inline-flex items-center gap-2 rounded-full border border-[#b98a2c]/45 bg-white/90 px-4 py-2 text-[13px] font-semibold text-[#17345d] shadow-sm backdrop-blur-sm transition hover:bg-white hover:shadow-md">
              <Icon type="arrow"/><span>Kembali ke Menu Utama</span>
            </Link>
          </div>
          <div className="relative z-10 w-[49%] max-w-[520px]">
            <div className="mb-5 flex items-center gap-4 pt-9 text-[14px] font-semibold uppercase tracking-[.34em] text-[#b47b00]"><span className="h-[2px] w-10 bg-[#b47b00]"/>Project Experience</div>
            <h1 className="font-serif text-[48px] font-semibold leading-[1.05] tracking-[-.02em] text-[#102b4e] md:text-[54px]">Transforming<br/>Hotels into<br/>Stronger Businesses</h1>
            <p className="mt-7 max-w-[470px] text-[18px] leading-7 text-[#173f72]">Pengalaman nyata dalam membantu hotel meningkatkan operasional, pendapatan, layanan, dan sistem manajemen.</p>
          </div>
          <div className="absolute right-0 top-0 h-full w-[55%]"><Image src="/experience/project-1.jpg" alt="CoreStay Advisory project experience" fill className="object-cover object-center" priority/><div className="absolute inset-0 bg-gradient-to-r from-[#fbfaf7] via-[#fbfaf7]/25 to-transparent"/><div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#f1e9d9]/70 to-transparent"/></div>
        </div>
      </section>

      <section className="bg-white px-7 py-10 md:px-12 lg:px-10"><div className="mx-auto max-w-[1000px]">
        <div className="grid gap-8 lg:grid-cols-[1.02fr_.98fr]">
          <div><div className="mb-4 flex items-center gap-4 text-[13px] font-semibold uppercase tracking-[.16em] text-[#b47b00]"><span className="h-[2px] w-10 bg-[#b47b00]"/></div><h2 className="font-serif text-[30px] font-semibold leading-tight text-[#17345d]">Tentang Project Experience</h2><p className="mt-5 max-w-[530px] text-[17px] leading-7 text-[#1d4a82]">Sebuah inisiatif transformasi strategis di bidang perhotelan yang berfokus pada penguatan operasional hotel, kinerja pendapatan, standar layanan, dan sistem manajemen.</p><p className="mt-5 max-w-[530px] text-[17px] leading-7 text-[#1d4a82]">Melalui pendekatan <strong>CoreStay Advisory</strong>, proyek ini mengintegrasikan:</p></div>
          <div className="overflow-hidden rounded-[14px] border border-[#d9d1c3] shadow-sm"><div className="relative aspect-[16/8.4]"><Image src="/experience/project-1.jpg" alt="Project engagement" fill className="object-cover"/></div></div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-0 border-t border-[#e9dfcc] lg:grid-cols-4">{capabilities.map(([title,sub,icon])=><div key={title} className="flex min-h-[135px] gap-4 border-b border-[#e9dfcc] px-4 py-6 first:pl-0 lg:border-r lg:last:border-r-0"><div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-full bg-[#f7efe0] text-[#17345d]"><Icon type={icon}/></div><p className="pt-1 text-[15px] leading-6 text-[#173f72]"><span className="font-medium">{title}</span><br/>{sub}</p></div>)}</div>
        <div className="mt-5 rounded-[12px] bg-[#f5eee0] px-6 py-5 shadow-sm"><div className="flex items-center gap-5"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#fff9ed] text-[#b27a00]"><Icon type="chart"/></div><div className="h-12 w-px bg-[#d3bb82]"/><p className="text-[16px] leading-6 text-[#173f72]"><strong className="text-[17px]">Tujuannya sederhana:</strong><br/>mentransformasikan operasional hotel menjadi bisnis yang lebih terstruktur, terukur, efisien, dan menguntungkan.</p></div></div>
        <div className="relative mt-3 min-h-[135px] overflow-hidden rounded-[12px] bg-[#071c34] text-white"><div className="absolute right-0 top-0 h-full w-[38%]"><img src="/experience/project-2.svg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" /><div className="absolute inset-0 bg-gradient-to-r from-[#071c34] to-transparent"/></div><div className="relative flex min-h-[135px] items-center px-7 py-6 lg:w-[72%]"><div className="mr-6 flex h-12 w-12 shrink-0 items-center justify-center text-[#e9b94e]"><Icon type="building"/></div><div className="border-l border-[#c7a65b]/60 pl-5 text-[15px] leading-6 text-white/90">Proyek ini mencerminkan pendekatan <strong>CoreStay Advisory</strong> dalam membantu pemilik hotel beralih dari ketergantungan pada operasional harian menuju sistem manajemen hotel yang sistematis.</div></div></div>
      </div></section>
    </main>
  </div>;
}