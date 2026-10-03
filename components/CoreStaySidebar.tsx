"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const assessmentItems = [
  ["Assessment 1", "Hotel Existing", "/assessment/existing"],
  ["Assessment 2", "Pre-opening Hotel", "/assessment/pre-opening"],
  ["Assessment 3", "Coming Soon", "/assessment"],
  ["Semua Assessment", "Lihat semua", "/assessment"],
] as const;

export default function CoreStaySidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname.startsWith("/admin") || pathname.startsWith("/pms")) return null;
  const activeAssessment = pathname === "/assessment" || pathname.startsWith("/assessment/");
  const close = () => setOpen(false);
  const nav = (
    <>
      <p className="px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Menu</p>
      <nav className="mt-3 space-y-1">
        <Link href="/" onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition hover:translate-x-1 hover:bg-white/10 hover:text-white ${pathname === "/" ? "bg-white/10 text-white" : "text-white/65"}`}><i className="h-1.5 w-1.5 rounded-full bg-white/30" />Dashboard</Link>
        <div className={`rounded-2xl p-1 ${activeAssessment ? "bg-white/[0.04]" : ""}`}>
          <Link href="/assessment" onClick={close} className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-white/10 hover:text-white ${activeAssessment ? "bg-white/10 text-white" : "text-white/65"}`}><span className="flex items-center gap-3"><i className="h-1.5 w-1.5 rounded-full bg-[#d8b985]" />Assessment</span><span className="text-[#d8b985]">›</span></Link>
          <div className="mt-1 space-y-0.5 border-l border-white/10 pl-2">
            {assessmentItems.map(([label, desc, href]) => <Link key={label} href={href} onClick={close} className="block rounded-lg px-3 py-2 text-xs text-white/50 transition hover:bg-white/10 hover:text-white"><span className="block">{label}</span><span className="mt-0.5 block text-[10px] text-white/25">{desc}</span></Link>)}
          </div>
        </div>
        {[['Hasil Saya','/hasil'],['Laporan','/laporan'],['Rekomendasi','/rekomendasi'],['Paket & Harga','/paket-harga']].map(([label, href]) => <Link key={label} href={href} onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition hover:translate-x-1 hover:bg-white/10 hover:text-white ${pathname === href ? "bg-white/10 text-white" : "text-white/65"}`}><i className="h-1.5 w-1.5 rounded-full bg-white/30" />{label}</Link>)}
      </nav>
      <p className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Account</p>
      <nav className="mt-3 space-y-1">
        <Link href="/profil" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/65 transition hover:translate-x-1 hover:bg-white/10 hover:text-white"><i className="h-1.5 w-1.5 rounded-full bg-white/30" />Profil</Link>
        <Link href="/" onClick={close} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/65 transition hover:translate-x-1 hover:bg-white/10 hover:text-white"><i className="h-1.5 w-1.5 rounded-full bg-white/30" />Logout</Link>
      </nav>
    </>
  );
  return <>
    <aside className="site-sidebar fixed inset-y-0 left-0 z-[100] hidden w-[250px] border-r border-white/10 bg-black text-white lg:flex lg:flex-col"><div className="flex h-full flex-col overflow-y-auto px-5 py-6"><Link href="/" className="flex items-center justify-center rounded-2xl px-2 py-3 hover:opacity-80"><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="h-auto w-[165px] object-contain mix-blend-screen" priority /></Link><div className="mt-5">{nav}</div><div className="mt-auto pt-6"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8b985]">CoreStay Advisory</p><p className="mt-2 text-xs leading-5 text-white/50">Hospitality Business Transformation & Advisory.</p><a href="https://wa.me/6285109006363" target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#162b4a]">Talk to Us</a></div></div></div></aside>
    <div className="site-sidebar-mobile lg:hidden"><button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="fixed left-0 top-0 z-[120] flex h-12 w-12 items-center justify-center rounded-br-2xl bg-black text-white shadow-lg"><span className="flex w-5 flex-col gap-1"><i className="h-0.5 w-full bg-white" /><i className="h-0.5 w-full bg-white" /><i className="h-0.5 w-full bg-white" /></span></button><div onClick={close} className={`fixed inset-0 z-[110] bg-black/45 backdrop-blur-[2px] transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} /><aside className={`fixed inset-y-0 left-0 z-[115] w-[285px] bg-black px-5 py-6 text-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}><div className="flex items-center justify-between"><Link href="/" onClick={close}><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="h-auto w-[155px] object-contain mix-blend-screen" /></Link><button type="button" onClick={close} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl">×</button></div><div className="mt-6">{nav}</div></aside></div>
  </>;
}
