import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export default function AssessmentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="assessment-theme min-h-screen">
      <aside className="assessment-sidebar fixed inset-y-0 left-0 z-[80] hidden w-[250px] border-r border-white/10 bg-black text-white lg:flex lg:flex-col">
        <div className="flex h-full flex-col px-5 py-6">
          <Link
            href="/"
            className="flex items-center justify-center rounded-2xl px-2 py-3 transition-opacity duration-300 hover:opacity-80"
          >
            <Image
              src="/logo-corestay.png"
              alt="CoreStay Advisory"
              width={180}
              height={70}
              className="h-auto w-[165px] object-contain mix-blend-screen"
              priority
            />
          </Link>

          <div className="mt-6">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
              Assessment
            </p>
            <nav className="mt-4 space-y-1.5">
              <Link
                href="/assessment"
                className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/65 transition-all duration-300 ease-out hover:translate-x-1 hover:bg-white/10 hover:text-white"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/30 transition-colors group-hover:bg-[#d8b985]" />
                Hotel Assessment
              </Link>
              <Link
                href="/assessment/existing"
                className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/65 transition-all duration-300 ease-out hover:translate-x-1 hover:bg-white/10 hover:text-white"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/30 transition-colors group-hover:bg-[#d8b985]" />
                Hotel Existing
              </Link>
              <Link
                href="/assessment/pre-opening"
                className="group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/65 transition-all duration-300 ease-out hover:translate-x-1 hover:bg-white/10 hover:text-white"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/30 transition-colors group-hover:bg-[#d8b985]" />
                Pre-opening Hotel
              </Link>
            </nav>
          </div>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8b985]">
              CoreStay Advisory
            </p>
            <p className="mt-2 text-xs leading-5 text-white/50">
              Hotel Business Health Assessment
            </p>
            <a
              href="https://wa.me/6285109006363?text=Halo%20CoreStay%20Advisory%2C%20saya%20ingin%20berkonsultasi%20mengenai%20bisnis%20hotel%20saya."
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#162b4a] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#eef2f7]"
            >
              Talk to Us
            </a>
          </div>
        </div>
      </aside>

      <div className="assessment-mobile-nav lg:hidden">
        <input id="assessment-mobile-nav" type="checkbox" className="peer sr-only" />

        <label
          htmlFor="assessment-mobile-nav"
          className="fixed left-0 top-0 z-[100] flex h-12 w-12 cursor-pointer items-center justify-center rounded-br-2xl bg-black text-white shadow-lg transition-all duration-300 hover:w-14"
          aria-label="Buka menu assessment"
        >
          <span className="flex w-5 flex-col gap-1">
            <span className="h-0.5 w-full bg-white transition-transform duration-300" />
            <span className="h-0.5 w-full bg-white transition-opacity duration-300" />
            <span className="h-0.5 w-full bg-white transition-transform duration-300" />
          </span>
        </label>

        <label
          htmlFor="assessment-mobile-nav"
          className="pointer-events-none fixed inset-0 z-[90] bg-black/45 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 peer-checked:pointer-events-auto peer-checked:opacity-100"
          aria-label="Tutup menu"
        />

        <aside className="pointer-events-none fixed inset-y-0 left-0 z-[95] w-[285px] -translate-x-full bg-black px-6 py-6 text-white shadow-2xl transition-transform duration-300 ease-out peer-checked:pointer-events-auto peer-checked:translate-x-0">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center rounded-2xl px-2 py-2 transition-opacity hover:opacity-80">
              <Image
                src="/logo-corestay.png"
                alt="CoreStay Advisory"
                width={180}
                height={70}
                className="h-auto w-[155px] object-contain mix-blend-screen"
              />
            </Link>

            <label
              htmlFor="assessment-mobile-nav"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-xl text-white/80 transition-all duration-300 hover:rotate-90 hover:bg-white/15"
              aria-label="Tutup menu"
            >
              ×
            </label>
          </div>

          <p className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">
            Navigation
          </p>

          <nav className="mt-4 space-y-1.5">
            <Link
              href="/"
              className="block rounded-xl px-3 py-3 text-sm font-medium text-white/70 transition-all duration-300 hover:translate-x-1 hover:bg-white/10 hover:text-white"
            >
              Home
            </Link>
            <Link
              href="/assessment"
              className="block rounded-xl px-3 py-3 text-sm font-medium text-white/70 transition-all duration-300 hover:translate-x-1 hover:bg-white/10 hover:text-white"
            >
              Hotel Assessment
            </Link>
            <Link
              href="/assessment/existing"
              className="block rounded-xl px-3 py-3 text-sm font-medium text-white/70 transition-all duration-300 hover:translate-x-1 hover:bg-white/10 hover:text-white"
            >
              Hotel Existing
            </Link>
            <Link
              href="/assessment/pre-opening"
              className="block rounded-xl px-3 py-3 text-sm font-medium text-white/70 transition-all duration-300 hover:translate-x-1 hover:bg-white/10 hover:text-white"
            >
              Pre-opening Hotel
            </Link>
            <Link
              href="/#contact"
              className="block rounded-xl px-3 py-3 text-sm font-medium text-white/70 transition-all duration-300 hover:translate-x-1 hover:bg-white/10 hover:text-white"
            >
              Contact
            </Link>
          </nav>

          <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8b985]">
              CoreStay Advisory
            </p>
            <p className="mt-2 text-xs leading-5 text-white/50">
              Hotel Business Health Assessment
            </p>
          </div>
        </aside>
      </div>

      {children}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .assessment-theme {
              --cs-navy:#203b68;
              --cs-bg:#edf2f8;
              --cs-text:#17243d;
              --cs-muted:#66738a;
            }

            .assessment-theme main {
              background:var(--cs-bg)!important;
              color:var(--cs-text)!important;
              font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif!important;
              margin-left:0!important;
              padding-left:0!important;
            }

            /* Every assessment page uses the single shared sidebar above. */
            .assessment-theme main > aside,
            .assessment-theme main > header {
              display:none!important;
            }

            /* Remove duplicate page-level CoreStay logo. The only visible logos are in the menu/sidebar. */
            .assessment-theme main > img[alt*="CoreStay"],
            .assessment-theme main img[alt="CoreStay Advisory"] {
              display:none!important;
            }

            .assessment-theme aside {
              color:#fff!important;
            }

            .assessment-theme aside p,
            .assessment-theme aside a {
              color:rgba(255,255,255,.65);
            }

            .assessment-theme aside a:hover {
              color:#fff;
            }

            .assessment-theme main > div[class*="absolute"] {
              opacity:.18!important;
            }

            .assessment-theme [class*="bg-gradient-to-r"],
            .assessment-theme [class*="bg-gradient-to-br"] {
              background-image:none!important;
              background-color:#fff!important;
            }

            .assessment-theme [class*="from-amber"],
            .assessment-theme [class*="from-fuchsia"],
            .assessment-theme [class*="from-orange"],
            .assessment-theme [class*="from-violet"],
            .assessment-theme [class*="to-pink"],
            .assessment-theme [class*="to-cyan"],
            .assessment-theme [class*="to-violet"] {
              color:var(--cs-text)!important;
            }

            .assessment-theme [class*="bg-pink-500"],
            .assessment-theme [class*="bg-fuchsia-400"],
            .assessment-theme [class*="bg-amber-400"],
            .assessment-theme [class*="bg-orange-500"],
            .assessment-theme [class*="bg-violet-500"] {
              background-color:rgba(32,59,104,.08)!important;
            }

            .assessment-theme [class*="border-amber"],
            .assessment-theme [class*="border-fuchsia"] {
              border-color:#d5dde8!important;
            }

            .assessment-theme [class*="text-amber"],
            .assessment-theme [class*="text-fuchsia"],
            .assessment-theme [class*="text-orange"],
            .assessment-theme [class*="text-pink"] {
              color:var(--cs-navy)!important;
            }

            .assessment-theme [class*="font-serif"] {
              font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif!important;
            }

            .assessment-theme section[class*="rounded-3xl"],
            .assessment-theme section[class*="rounded-[2rem]"],
            .assessment-theme section[class*="rounded-[1.95rem]"] {
              border-color:#dce3ee!important;
              box-shadow:0 20px 60px rgba(32,59,104,.10)!important;
            }

            .assessment-theme button[class*="bg-gradient"],
            .assessment-theme button[class*="bg-[#203b68]"] {
              background:var(--cs-navy)!important;
              color:#fff!important;
            }

            .assessment-theme [class*="hover:border-amber"]:hover,
            .assessment-theme [class*="hover:border-fuchsia"]:hover {
              border-color:var(--cs-navy)!important;
            }

            .assessment-theme input,
            .assessment-theme button {
              font-family:inherit;
            }

            .assessment-theme main[class~="bg-slate-950"] {
              background:#edf2f8!important;
              color:#17243d!important;
            }

            .assessment-theme main[class~="bg-slate-950"] [class~="bg-slate-950"] {
              background:#f7f9fc!important;
            }

            .assessment-theme main[class~="bg-slate-950"] [class~="bg-slate-900"] {
              background:#fff!important;
            }

            .assessment-theme main[class~="bg-slate-950"] [class~="bg-slate-800"] {
              background:#e2e8f0!important;
            }

            .assessment-theme main[class~="bg-slate-950"] [class~="bg-slate-950/70"] {
              background:#f7f9fc!important;
            }

            .assessment-theme main[class~="bg-slate-950"] [class~="bg-white/5"],
            .assessment-theme main[class~="bg-slate-950"] [class~="bg-white/10"] {
              background:#eef2f7!important;
            }

            .assessment-theme main[class~="bg-slate-950"] [class~="border-white/10"],
            .assessment-theme main[class~="bg-slate-950"] [class~="border-white/5"] {
              border-color:#d7e0eb!important;
            }

            .assessment-theme main[class~="bg-slate-950"] [class~="text-white"] {
              color:#17243d!important;
            }

            .assessment-theme main[class~="bg-slate-950"] [class~="text-slate-300"] {
              color:#40516a!important;
            }

            .assessment-theme main[class~="bg-slate-950"] [class~="text-slate-400"],
            .assessment-theme main[class~="bg-slate-950"] [class~="text-slate-500"] {
              color:#5f6e83!important;
            }

            .assessment-theme main[class~="bg-slate-950"] [class~="text-cyan-400"],
            .assessment-theme main[class~="bg-slate-950"] [class~="text-cyan-300"] {
              color:#203b68!important;
            }

            .assessment-theme main[class~="bg-slate-950"] h1,
            .assessment-theme main[class~="bg-slate-950"] h2,
            .assessment-theme main[class~="bg-slate-950"] h3 {
              color:#17243d!important;
            }

            .assessment-theme main {
              font-size:15px!important;
              line-height:1.55!important;
            }

            .assessment-theme main h1 {
              font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif!important;
              font-size:clamp(2rem,3.2vw,2.75rem)!important;
              line-height:1.12!important;
              letter-spacing:-.025em!important;
              font-weight:650!important;
            }

            .assessment-theme main h2 {
              font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif!important;
              font-size:clamp(1.35rem,2vw,1.7rem)!important;
              line-height:1.28!important;
              letter-spacing:-.018em!important;
              font-weight:650!important;
            }

            .assessment-theme main h3 {
              font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif!important;
              font-size:1.05rem!important;
              line-height:1.35!important;
              font-weight:650!important;
            }

            .assessment-theme main p {
              font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif!important;
              font-size:.9375rem!important;
              line-height:1.62!important;
            }

            .assessment-theme main button {
              font-size:.9375rem!important;
              line-height:1.45!important;
            }

            .assessment-theme main button div {
              line-height:1.55!important;
            }

            .assessment-theme main label {
              font-size:.875rem!important;
              line-height:1.5!important;
            }

            .assessment-theme main [class*="text-xs"] {
              font-size:.75rem!important;
              line-height:1.45!important;
            }

            .assessment-theme main [class*="text-sm"] {
              font-size:.875rem!important;
              line-height:1.55!important;
            }

            .assessment-theme main [class*="text-base"] {
              font-size:.9375rem!important;
              line-height:1.62!important;
            }

            .assessment-theme main [class*="text-lg"] {
              font-size:1.0625rem!important;
              line-height:1.55!important;
            }

            .assessment-theme main [class*="text-2xl"] {
              font-size:1.5rem!important;
              line-height:1.3!important;
            }

            .assessment-theme main [class*="text-3xl"] {
              font-size:1.75rem!important;
              line-height:1.22!important;
            }

            .assessment-theme main [class*="text-4xl"] {
              font-size:2.35rem!important;
              line-height:1.12!important;
            }

            .assessment-theme main [class*="text-5xl"] {
              font-size:2.65rem!important;
              line-height:1.1!important;
            }

            .assessment-theme main [class*="text-6xl"],
            .assessment-theme main [class*="text-7xl"] {
              font-size:2.85rem!important;
              line-height:1.08!important;
            }

            @media (min-width:1024px) {
              .assessment-theme main {
                margin-left:250px!important;
                width:calc(100% - 250px)!important;
              }
            }

            @media (max-width:1023px) {
              .assessment-theme main {
                margin-left:0!important;
                width:100%!important;
              }
            }

            @media (max-width:767px) {
              .assessment-theme main h1 { font-size:2rem!important; }
              .assessment-theme main h2 { font-size:1.4rem!important; }
              .assessment-theme main p { font-size:.9375rem!important; }
              .assessment-theme main [class*="text-4xl"],
              .assessment-theme main [class*="text-5xl"],
              .assessment-theme main [class*="text-6xl"],
              .assessment-theme main [class*="text-7xl"] {
                font-size:2rem!important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
