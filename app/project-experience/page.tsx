import Image from "next/image";

const pillars = [
  ["Penilaian Operasional dan Kesiapan Hotel","clipboard"],
  ["Pengembangan Prosedur Operasional Standar (SOP)","document"],
  ["Strategi Pendapatan dan Penetapan Harga","chart"],
  ["Penganggaran, Prakiraan, dan Pengendalian Keuangan","money"],
  ["Kesiapan Sumber Daya Manusia dan Organisasi","people"],
  ["Implementasi Sistem Manajemen Properti (PMS)","gear"],
  ["Optimalisasi Alur Kerja Housekeeping dan Front Office","hotel"],
  ["Pelaporan Manajemen dan Pemantauan Kinerja","report"],
] as const;

function Icon({type}:{type:string}) {
  const common={fill:"none",stroke:"currentColor",strokeWidth:1.8,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
  const paths:Record<string,React.ReactNode>={
    clipboard:<><rect x="5" y="4" width="14" height="17" rx="2" {...common}/><path d="M9 4.5V3h6v1.5M8 9h8M8 13h6M8 17h4" {...common}/></>,
    document:<><path d="M6 3h9l4 4v14H6zM15 3v5h4M9 13h6M9 17h5" {...common}/></>,
    chart:<><path d="M4 19V5M4 19h16M7 15l4-4 3 2 5-6" {...common}/></>,
    money:<><circle cx="12" cy="12" r="8" {...common}/><path d="M15 9.5c-.6-.7-1.6-1.1-2.8-1.1-1.7 0-2.7.8-2.7 2s1 1.8 2.8 2.1c1.7.3 2.7.8 2.7 2.1s-1 2-2.9 2M12 6.5v11" {...common}/></>,
    people:<><circle cx="9" cy="9" r="3" {...common}/><circle cx="16" cy="10" r="2.5" {...common}/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M14 17a5 5 0 0 1 6.5 3" {...common}/></>,
    gear:<><circle cx="12" cy="12" r="3" {...common}/><path d="M19 12a7 7 0 0 0-.1-1.1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.9-1.1L14.4 3h-4.8l-.3 2.9a7 7 0 0 0-1.9 1.1l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.1l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.9 1.1l.3 2.9h4.8l.3-2.9a7 7 0 0 0 1.9-1.1l2.3 1 2-3.4-2-1.5c.1-.3.1-.7.1-1.1z" {...common}/></>,
    hotel:<><path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16M4 10h13M7 7h2M12 7h2M7 13h2M12 13h2M7 17h2M12 17h2M2 21h20" {...common}/></>,
    report:<><rect x="4" y="4" width="16" height="16" rx="2" {...common}/><path d="M8 16v-3M12 16V9M16 16v-6" {...common}/></>,
  };
  return <svg viewBox="0 0 24 24" className="h-7 w-7">{paths[type]}</svg>;
}

export default function ProjectExperiencePage(){
  return <main className="min-h-screen bg-[#f8f8f6] text-[#102f5b] lg:ml-[264px]">
    <section className="relative min-h-[380px] overflow-hidden bg-white">
      <Image src="/experience/project-1.jpg" alt="CoreStay Project Experience" fill priority className="object-cover object-center opacity-95"/>
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/10"/>
      <div className="relative z-10 mx-auto flex min-h-[380px] max-w-[1180px] items-center px-6 py-16 lg:px-10">
        <div className="max-w-[560px]">
          <div className="mb-5 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.35em] text-[#b47d12]"><span className="h-px w-10 bg-[#b47d12]"/>Project Experience</div>
          <h1 className="font-serif text-5xl font-bold leading-[1.02] text-[#10284b] md:text-6xl">Transforming<br/>Hotels into<br/>Stronger Businesses</h1>
          <p className="mt-6 max-w-[470px] text-lg leading-7 text-[#214b82]">Pengalaman nyata dalam membantu hotel meningkatkan operasional, pendapatan, layanan, dan sistem manajemen.</p>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-[1180px] px-6 py-10 lg:px-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_1.02fr] lg:items-center">
        <div>
          <div className="mb-3 h-px w-10 bg-[#b47d12]"/>
          <h2 className="font-serif text-3xl font-bold text-[#102f5b]">Tentang Project Experience</h2>
          <p className="mt-5 text-lg leading-8 text-[#214b82]">Sebuah inisiatif transformasi strategis di bidang perhotelan yang berfokus pada penguatan operasional hotel, kinerja pendapatan, standar layanan, dan sistem manajemen.</p>
          <p className="mt-5 text-lg leading-8 text-[#214b82]">Melalui pendekatan <strong>CoreStay Advisory</strong>, proyek ini mengintegrasikan:</p>
        </div>
        <div className="relative h-[260px] overflow-hidden rounded-2xl shadow-sm">
          <Image src="/experience/project-1.jpg" alt="Project experience" fill className="object-cover object-center"/>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 border-t border-[#eadfca] md:grid-cols-2 lg:grid-cols-4">
        {pillars.map(([title,type],i)=><div key={title} className="min-h-[150px] border-b border-[#eadfca] px-5 py-6 lg:border-r lg:last:border-r-0">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#f3ead8] text-[#102f5b]"><Icon type={type}/></div>
          <p className="text-[15px] font-medium leading-6 text-[#173f78]">{title}</p>
        </div>)}
      </div>

      <div className="mt-6 rounded-xl bg-[#f2eadc] px-6 py-5 md:flex md:items-center md:gap-7">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[#b47d12]"><svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="m13.5 10.5 5-5M18.5 5.5h-3M18.5 5.5v3"/></svg></div>
        <div className="border-l border-[#b47d12] pl-6"><strong className="text-lg">Tujuannya sederhana:</strong><p className="text-base leading-6 text-[#173f78]">mentransformasikan operasional hotel menjadi bisnis yang lebih terstruktur, terukur, efisien, dan menguntungkan.</p></div>
      </div>

      <div className="relative mt-4 min-h-[135px] overflow-hidden rounded-xl bg-[#071a3d] text-white">
        <Image src="/experience/project-2.svg" alt="" fill className="object-cover object-center opacity-55"/>
        <div className="absolute inset-0 bg-gradient-to-r from-[#071a3d] via-[#071a3d]/80 to-transparent"/>
        <div className="relative z-10 flex min-h-[135px] items-center gap-6 px-7 py-6">
          <div className="hidden h-16 w-16 shrink-0 items-center justify-center border-r border-[#c79b42] pr-6 sm:flex"><svg viewBox="0 0 24 24" className="h-12 w-12 text-[#c79b42]" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M4 21V7l8-4 8 4v14M7 21v-8h10v8M9 9h2M13 9h2M9 12h2M13 12h2M9 15h2M13 15h2"/></svg></div>
          <p className="max-w-[760px] text-base leading-6 text-white/95">Proyek ini mencerminkan pendekatan <strong>CoreStay Advisory</strong> dalam membantu pemilik hotel beralih dari ketergantungan pada operasional harian menuju sistem manajemen hotel yang sistematis.</p>
        </div>
      </div>
    </section>
  </main>;
}
