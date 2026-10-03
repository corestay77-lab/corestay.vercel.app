import type { ReactNode } from "react";

export default function AssessmentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="assessment-theme">
      {children}
      <style dangerouslySetInnerHTML={{ __html: `
        .assessment-theme { --cs-navy:#203b68; --cs-bg:#edf2f8; --cs-text:#17243d; --cs-muted:#66738a; }
        .assessment-theme main { background:var(--cs-bg)!important; color:var(--cs-text)!important; font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif!important; }
        .assessment-theme aside { color:#fff!important; }
        .assessment-theme aside p,.assessment-theme aside a { color:rgba(255,255,255,.65); }
        .assessment-theme aside a:hover,.assessment-theme aside a.bg-white\\/10 { color:#fff; }
        .assessment-theme main > div[class*="absolute"] { opacity:.18!important; }
        .assessment-theme [class*="bg-gradient-to-r"],.assessment-theme [class*="bg-gradient-to-br"] { background-image:none!important; background-color:#fff!important; }
        .assessment-theme [class*="from-amber"],.assessment-theme [class*="from-fuchsia"],.assessment-theme [class*="from-orange"],.assessment-theme [class*="from-violet"],.assessment-theme [class*="to-pink"],.assessment-theme [class*="to-cyan"],.assessment-theme [class*="to-violet"] { color:var(--cs-text)!important; }
        .assessment-theme [class*="bg-pink-500"],.assessment-theme [class*="bg-fuchsia-400"],.assessment-theme [class*="bg-amber-400"],.assessment-theme [class*="bg-orange-500"],.assessment-theme [class*="bg-violet-500"] { background-color:rgba(32,59,104,.08)!important; }
        .assessment-theme [class*="border-amber"],.assessment-theme [class*="border-fuchsia"] { border-color:#d5dde8!important; }
        .assessment-theme [class*="text-amber"],.assessment-theme [class*="text-fuchsia"],.assessment-theme [class*="text-orange"],.assessment-theme [class*="text-pink"] { color:var(--cs-navy)!important; }
        .assessment-theme [class*="font-serif"] { font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif!important; }
        .assessment-theme section[class*="rounded-3xl"],.assessment-theme section[class*="rounded-[2rem]"],.assessment-theme section[class*="rounded-[1.95rem]"] { border-color:#dce3ee!important; box-shadow:0 20px 60px rgba(32,59,104,.10)!important; }
        .assessment-theme button[class*="bg-gradient"] { background:var(--cs-navy)!important; color:#fff!important; }
        .assessment-theme button[class*="bg-[#203b68]"] { background:var(--cs-navy)!important; color:#fff!important; }
        .assessment-theme [class*="hover:border-amber"]:hover,.assessment-theme [class*="hover:border-fuchsia"]:hover { border-color:var(--cs-navy)!important; }
        .assessment-theme input,.assessment-theme button { font-family:inherit; }

        /* CoreStay assessment typography: compact, readable, and proportioned to the content. */
        .assessment-theme main { font-size:15px!important; line-height:1.55!important; }
        .assessment-theme main h1 { font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif!important; font-size:clamp(2rem,3.2vw,2.75rem)!important; line-height:1.12!important; letter-spacing:-.025em!important; font-weight:650!important; }
        .assessment-theme main h2 { font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif!important; font-size:clamp(1.35rem,2vw,1.7rem)!important; line-height:1.28!important; letter-spacing:-.018em!important; font-weight:650!important; }
        .assessment-theme main h3 { font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif!important; font-size:1.05rem!important; line-height:1.35!important; font-weight:650!important; }
        .assessment-theme main p { font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif!important; font-size:.9375rem!important; line-height:1.62!important; }
        .assessment-theme main button { font-size:.9375rem!important; line-height:1.45!important; }
        .assessment-theme main button div { line-height:1.55!important; }
        .assessment-theme main label { font-size:.875rem!important; line-height:1.5!important; }
        .assessment-theme main [class*="text-xs"] { font-size:.75rem!important; line-height:1.45!important; }
        .assessment-theme main [class*="text-sm"] { font-size:.875rem!important; line-height:1.55!important; }
        .assessment-theme main [class*="text-base"] { font-size:.9375rem!important; line-height:1.62!important; }
        .assessment-theme main [class*="text-lg"] { font-size:1.0625rem!important; line-height:1.55!important; }
        .assessment-theme main [class*="text-2xl"] { font-size:1.5rem!important; line-height:1.3!important; }
        .assessment-theme main [class*="text-3xl"] { font-size:1.75rem!important; line-height:1.22!important; }
        .assessment-theme main [class*="text-4xl"] { font-size:2.35rem!important; line-height:1.12!important; }
        .assessment-theme main [class*="text-5xl"] { font-size:2.65rem!important; line-height:1.1!important; }
        .assessment-theme main [class*="text-6xl"],.assessment-theme main [class*="text-7xl"] { font-size:2.85rem!important; line-height:1.08!important; }
        .assessment-theme main [class*="font-serif"] { font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif!important; }
        .assessment-theme main [class*="tracking-[0.35em]"] { letter-spacing:.22em!important; }
        .assessment-theme main [class*="leading-8"] { line-height:1.62!important; }
        .assessment-theme main [class*="leading-9"] { line-height:1.38!important; }

        @media (max-width: 767px) {
          .assessment-theme main h1 { font-size:2rem!important; }
          .assessment-theme main h2 { font-size:1.4rem!important; }
          .assessment-theme main p { font-size:.9375rem!important; }
          .assessment-theme main [class*="text-4xl"],.assessment-theme main [class*="text-5xl"],.assessment-theme main [class*="text-6xl"],.assessment-theme main [class*="text-7xl"] { font-size:2rem!important; }
        }

        @media (min-width: 1024px) {
          .assessment-theme main h1 { font-size:2.7rem!important; }
          .assessment-theme main h2 { font-size:1.65rem!important; }
        }
      ` }} />
    </div>
  );
}