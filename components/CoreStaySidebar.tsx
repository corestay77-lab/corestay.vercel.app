"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const assessmentItems = [
  ["Assessment 1", "Hotel Existing", "/assessment/existing"],
  ["Assessment 2", "Pre-opening Hotel", "/assessment/pre-opening"],
  ["Assessment 3", "Financial Report PDF", "/assessment/financial"],
  ["Semua Assessment", "Lihat semua", "/assessment"],
] as const;

export default function CoreStaySidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [assessmentOpen, setAssessmentOpen] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  if (pathname.startsWith("/admin") || pathname.startsWith("/pms")) return null;
  const activeAssessment = pathname === "/assessment" || pathname.startsWith("/assessment/");
  const close = () => setOpen(false);

  useEffect(() => {
    if (activeAssessment) setAssessmentOpen(true);
  }, [activeAssessment]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setLoggedIn(!!data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setLoggedIn(!!session);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setLoggedIn(false);
    setOpen(false);
    window.location.href = "/";
  }

  useEffect(() => {
    requestAnimationFrame(() => {
      const el = menuRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [pathname]);

  const nav = (
    <div ref={menuRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pr-1 pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,.2)_transparent]">
      <p className="px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Menu</p>
      <nav className="mt-3 space-y-1">
        <Link aria-current={pathname === "/" ? "page" : undefined} href="/" onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:translate-x-1 hover:bg-white/10 hover:text-white ${pathname === "/" ? "bg-white/10 text-white" : "text-white/65"}`}><i className="h-1.5 w-1.5 rounded-full bg-white/30" />Dashboard</Link>
        <div className={`rounded-2xl p-1 ${activeAssessment ? "bg-white/[0.04]" : ""}`}>
          <button type="button" onClick={() => setAssessmentOpen(v => !v)} aria-expanded={assessmentOpen} className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition hover:bg-white/10 hover:text-white ${activeAssessment ? "bg-white/10 text-white" : "text-white/65"}`}><span className="flex items-center gap-3"><i className="h-1.5 w-1.5 rounded-full bg-[#d8b985]" />Assessment</span><span className={`text-[#d8b985] transition-transform duration-200 ${assessmentOpen ? "rotate-90" : ""}`}>›</span></button>
          <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ${assessmentOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="mt-1 space-y-0.5 border-l border-white/10 pl-2">
              {assessmentItems.map(([label, desc, href]) => <Link aria-current={pathname === href ? "page" : undefined} key={label} href={href} onClick={close} className={`block rounded-lg px-3 py-1.5 text-xs transition hover:bg-white/10 hover:text-white ${pathname === href ? "bg-white/10 text-white" : "text-white/50"}`}><span className="block">{label}</span><span className="mt-0.5 block text-[10px] text-white/25">{desc}</span></Link>)}
            </div>
          </div>
        </div>
        {[['Laporan','/laporan'],['Rekomendasi','/rekomendasi'],['Paket & Harga','/paket-harga']].map(([label, href]) => <Link aria-current={pathname === href ? "page" : undefined} key={label} href={href} onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:translate-x-1 hover:bg-white/10 hover:text-white ${pathname === href ? "bg-white/10 text-white" : "text-white/65"}`}><i className="h-1.5 w-1.5 rounded-full bg-white/30" />{label}</Link>)}
      </nav>
      <p className="mt-6 px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Account</p>
      <nav className="mt-3 space-y-1">
        {loggedIn ? (
          <>
            <Link aria-current={pathname === "/profil" ? "page" : undefined} href="/profil" onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:translate-x-1 hover:bg-white/10 hover:text-white ${pathname === "/profil" ? "bg-white/10 text-white" : "text-white/65"}`}><i className="h-1.5 w-1.5 rounded-full bg-white/30" />Profil</Link>
            <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-white/65 transition hover:translate-x-1 hover:bg-white/10 hover:text-white"><i className="h-1.5 w-1.5 rounded-full bg-white/30" />Logout</button>
          </>
        ) : (
          <>
            <Link href="/login" onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:translate-x-1 hover:bg-white/10 hover:text-white ${pathname === "/login" ? "bg-white/10 text-white" : "text-white/65"}`}><i className="h-1.5 w-1.5 rounded-full bg-white/30" />Login</Link>
            <Link href="/signup" onClick={close} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition hover:translate-x-1 hover:bg-white/10 hover:text-white ${pathname === "/signup" ? "bg-white/10 text-white" : "text-white/65"}`}><i className="h-1.5 w-1.5 rounded-full bg-white/30" />Sign Up</Link>
          </>
        )}
      </nav>
    </div>
  );

  return <>
    <aside className="site-sidebar fixed inset-y-0 left-0 z-[100] hidden w-[250px] border-r border-white/10 bg-black text-white lg:flex lg:flex-col"><div className="flex h-full min-h-0 flex-col px-5 py-5"><Link href="/" className="flex shrink-0 items-center justify-center rounded-2xl px-2 py-2 hover:opacity-80"><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="h-auto w-[155px] object-contain mix-blend-screen" priority /></Link><div className="mt-3 flex min-h-0 flex-1 flex-col">{nav}</div><div className="shrink-0 pt-3"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8b985]">CoreStay Advisory</p><p className="mt-1 text-[11px] leading-4 text-white/50">Hospitality Business Transformation & Advisory.</p><a href="https://wa.me/6285109006363" target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-[#162b4a]">Talk to Us</a></div></div></div></aside>
    <div className="site-sidebar-mobile lg:hidden"><button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="fixed left-0 top-0 z-[120] flex h-12 w-12 items-center justify-center rounded-br-2xl bg-black text-white shadow-lg"><span className="flex w-5 flex-col gap-1"><i className="h-0.5 w-full bg-white" /><i className="h-0.5 w-full bg-white" /><i className="h-0.5 w-full bg-white" /></span></button><div onClick={close} className={`fixed inset-0 z-[110] bg-black/45 backdrop-blur-[2px] transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} /><aside className={`fixed inset-y-0 left-0 z-[115] flex w-[285px] flex-col bg-black px-5 py-5 text-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}><div className="flex shrink-0 items-center justify-between"><Link href="/" onClick={close}><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="h-auto w-[150px] object-contain mix-blend-screen" /></Link><button type="button" onClick={close} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl">×</button></div><div className="mt-5 flex min-h-0 flex-1 flex-col">{nav}</div></aside></div>
  </>;
}
