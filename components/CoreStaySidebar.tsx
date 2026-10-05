"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const assessmentItems = [
  ["Hotel Existing", "Hotel Check-Up", "/assessment/existing"],
  ["Pre-Opening Hotel", "Pre-Opening Check", "/assessment/pre-opening"],
  ["Financial Report", "Financial Check", "/assessment/financial"],
] as const;

const mainItems = [
  ["Dashboard", "/", "dashboard"],
  ["Hasil Assessment", "/laporan", "chart"],
  ["Paket & Harga", "/paket-harga", "package"],
  ["CoreStay Hotel Toolkit", "/hotel-toolkit", "toolkit"],
  ["Experience", "/experience", "experience"],
] as const;

function MenuIcon({ name }: { name: "dashboard" | "clipboard" | "hotel" | "construction" | "money" | "chart" | "package" | "toolkit" | "experience" | "profile" | "login" | "signup" | "logout" }) {
  const paths: Record<string, React.ReactNode> = {
    dashboard: <><path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
    clipboard: <><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8 9h8M8 13h6M8 17h4"/></>,
    hotel: <><path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16"/><path d="M4 10h13M7 7h2M12 7h2M7 13h2M12 13h2M7 17h2M12 17h2M2 21h20"/></>,
    construction: <><path d="m3 21 7-7"/><path d="m14 10 7-7"/><path d="m12 12 3 3"/><path d="m5 19 3 2 3-3-3-3z"/><path d="m14 3 7 7"/></>,
    money: <><circle cx="12" cy="12" r="8"/><path d="M15 9.5c-.6-.7-1.6-1.1-2.8-1.1-1.7 0-2.7.8-2.7 2s1 1.8 2.8 2.1c1.7.3 2.7.8 2.7 2.1s-1 2-2.9 2c-1.2 0-2.3-.4-3-1.2M12 6.5v11"/></>,
    chart: <><path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/></>,
    package: <><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 7 8 4 8-4M4 7v10l8 4 8-4V7M12 11v10"/></>,
    toolkit: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.2 2.2-2.1-.7-.7-2.1z"/></>,
    experience: <><path d="M4 19.5V7.8a2 2 0 0 1 2-2h5v13.7"/><path d="M12 6h4a2 2 0 0 1 2 2v11.5"/><path d="M4 19.5c2-1 4-1 8 0 4-1 6-1 8 0"/><path d="M8 10h2M8 13h2M14 10h2M14 13h2"/></>,
    profile: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21a7 7 0 0 1 14 0"/></>,
    login: <><path d="M10 17l5-5-5-5"/><path d="M15 12H3M12 3h7v18h-7"/></>,
    signup: <><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></>,
    logout: <><path d="M10 17l5-5-5-5"/><path d="M15 12H3M12 3h7v18h-7"/></>,
  };
  return <span className="relative flex h-8 w-8 shrink-0 items-center justify-center text-white transition duration-200 group-hover:-translate-y-0.5 group-hover:text-white"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]">{paths[name]}</svg></span>;
}

export default function CoreStaySidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [assessmentOpen, setAssessmentOpen] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const hidden = pathname.startsWith("/admin") || pathname.startsWith("/pms");
  const activeAssessment = pathname === "/assessment" || pathname.startsWith("/assessment/");
  const close = () => setOpen(false);

  useEffect(() => { if (activeAssessment) setAssessmentOpen(true); }, [activeAssessment]);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setLoggedIn(!!data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (mounted) setLoggedIn(!!session); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = menuRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
      el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
  }, [pathname]);

  async function logout() {
    await supabase.auth.signOut();
    setLoggedIn(false);
    setOpen(false);
    window.location.href = "/";
  }

  if (hidden) return null;

  const nav = (
    <div ref={menuRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pr-1 pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(23,50,77,.2)_transparent]">
      <nav className="mt-2 space-y-1">
        {mainItems.slice(0, 1).map(([label, href, icon]) => (
          <Link aria-current={pathname === href ? "page" : undefined} key={label} href={href} onClick={close} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold tracking-[0.005em] transition ${pathname === href ? "bg-transparent text-white" : "text-white font-bold hover:bg-transparent hover:text-white"}`}>
            <MenuIcon name={icon as any} /><span>{label}</span>{pathname === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#b99a5b]" />}
          </Link>
        ))}

        <div className={`rounded-2xl ${activeAssessment ? "bg-transparent" : ""}`}>
          <button type="button" onClick={() => setAssessmentOpen(v => !v)} aria-expanded={assessmentOpen} className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${activeAssessment ? "text-slate-900" : "text-white font-bold hover:bg-transparent hover:text-white"}`}>
            <span className="flex items-center gap-3"><MenuIcon name="clipboard" />Assessment</span>
            <span className={`text-xs text-slate-400 transition-transform duration-200 ${assessmentOpen ? "rotate-90" : ""}`}>›</span>
          </button>
          <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ${assessmentOpen ? "max-h-72 opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="ml-6 mt-0.5 space-y-0.5 pl-2 pb-1">
              {assessmentItems.map(([label, desc, href], index) => (
                <Link aria-current={pathname === href ? "page" : undefined} key={label} href={href} onClick={close} className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 transition ${pathname === href ? "bg-transparent text-slate-900" : "text-white font-bold hover:bg-transparent hover:text-white"}`}>
                  <MenuIcon name={(["hotel", "construction", "money"] as const)[index]} />
                  <span className="min-w-0 block"><span className="block text-xs font-semibold tracking-[0.005em]">{label}</span><span className="mt-0.5 block text-[9px] text-white">{desc}</span></span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {mainItems.slice(1).map(([label, href, icon]) => (
          <Link aria-current={pathname === href ? "page" : undefined} key={label} href={href} onClick={close} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${pathname === href ? "bg-transparent text-white" : "text-white font-bold hover:bg-transparent hover:text-white"}`}>
            <MenuIcon name={icon as any} /><span>{label}</span>{pathname === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#b99a5b]" />}
          </Link>
        ))}
      </nav>

      <p className="mt-6 px-2 text-[9px] font-bold uppercase tracking-[0.25em] text-white">Account</p>
      <nav className="mt-2 space-y-1">
        {loggedIn ? <><Link aria-current={pathname === "/profil" ? "page" : undefined} href="/profil" onClick={close} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${pathname === "/profil" ? "bg-transparent text-white" : "text-white font-bold hover:bg-transparent hover:text-white"}`}><MenuIcon name="profile" />Profil</Link><button type="button" onClick={logout} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white bg-transparent transition hover:bg-transparent"><MenuIcon name="logout" />Logout</button></> : <><Link href="/login" onClick={close} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-white bg-transparent transition hover:bg-transparent"><MenuIcon name="login" />Login</Link><Link href="/signup" onClick={close} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-white bg-transparent transition hover:bg-transparent"><MenuIcon name="signup" />Sign Up</Link></>}
      </nav>
    </div>
  );

  return <><aside className="site-sidebar fixed inset-y-0 left-0 z-[100] hidden w-[264px] bg-[linear-gradient(155deg,#071a3d_0%,#123f73_38%,#4b2a78_72%,#087f86_100%)] text-white lg:flex lg:flex-col"><div className="flex h-full min-h-0 flex-col px-4 py-4"><Link href="/" className="flex w-full shrink-0 items-center justify-center rounded-2xl px-3 py-2.5"><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="h-auto w-[150px] object-contain" priority /></Link><div className="my-3 h-px bg-transparent" /><div className="flex min-h-0 flex-1 flex-col">{nav}</div><p className="mt-auto pb-1 text-center text-[8px] text-white">© CoreStay Advisory</p></div></aside><div className="site-sidebar-mobile lg:hidden"><button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="fixed left-3 top-3 z-[120] flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-transparent text-white shadow-[0_8px_24px_rgba(23,50,77,.12)] backdrop-blur-md"><span className="flex w-5 flex-col gap-1"><i className="h-0.5 w-full bg-black" /><i className="h-0.5 w-full bg-black" /><i className="h-0.5 w-full bg-black" /></span></button><div onClick={close} className={`fixed inset-0 z-[110] bg-slate-950/45 backdrop-blur-[3px] transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} /><aside className={`fixed inset-y-0 left-0 z-[115] flex w-[292px] flex-col bg-[linear-gradient(155deg,#071a3d_0%,#123f73_38%,#4b2a78_72%,#087f86_100%)] px-4 py-4 text-white shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "-translate-x-full"}`}><div className="flex shrink-0 items-center justify-between"><Link href="/" onClick={close} className="rounded-2xl px-3 py-2"><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={70} className="h-auto w-[145px] object-contain" /></Link><button type="button" onClick={close} aria-label="Close menu" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-transparent text-xl text-white transition hover:bg-transparent hover:text-white">×</button></div><div className="my-3 h-px bg-slate-100" /><div className="flex min-h-0 flex-1 flex-col">{nav}</div></aside></div></>;
}