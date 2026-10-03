import type { ReactNode } from "react";

export default function AssessmentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="assessment-theme">
      {children}
      <style dangerouslySetInnerHTML={{ __html: `
        .assessment-theme {
          --cs-navy: #203b68;
          --cs-navy-dark: #162b4a;
          --cs-bg: #edf2f8;
          --cs-text: #17243d;
          --cs-muted: #66738a;
        }
        .assessment-theme main {
          background: var(--cs-bg) !important;
          color: var(--cs-text) !important;
          font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif !important;
        }
        .assessment-theme main > div[class*="absolute"] {
          opacity: .18 !important;
        }
        .assessment-theme [class*="bg-gradient-to-r"],
        .assessment-theme [class*="bg-gradient-to-br"] {
          background-image: none !important;
          background-color: #fff !important;
        }
        .assessment-theme [class*="from-amber"],
        .assessment-theme [class*="from-fuchsia"],
        .assessment-theme [class*="from-orange"],
        .assessment-theme [class*="from-violet"],
        .assessment-theme [class*="to-pink"],
        .assessment-theme [class*="to-cyan"],
        .assessment-theme [class*="to-violet"] {
          color: var(--cs-text) !important;
        }
        .assessment-theme [class*="bg-pink-500"],
        .assessment-theme [class*="bg-fuchsia-400"],
        .assessment-theme [class*="bg-amber-400"],
        .assessment-theme [class*="bg-orange-500"],
        .assessment-theme [class*="bg-violet-500"] {
          background-color: rgba(32,59,104,.08) !important;
        }
        .assessment-theme [class*="border-amber"],
        .assessment-theme [class*="border-fuchsia"] {
          border-color: #d5dde8 !important;
        }
        .assessment-theme [class*="text-amber"],
        .assessment-theme [class*="text-fuchsia"],
        .assessment-theme [class*="text-orange"],
        .assessment-theme [class*="text-pink"] {
          color: var(--cs-navy) !important;
        }
        .assessment-theme [class*="font-serif"] {
          font-family: var(--font-geist-sans), Arial, Helvetica, sans-serif !important;
        }
        .assessment-theme section[class*="rounded-3xl"],
        .assessment-theme section[class*="rounded-[2rem]"],
        .assessment-theme section[class*="rounded-[1.95rem]"] {
          border-color: #dce3ee !important;
          box-shadow: 0 20px 60px rgba(32,59,104,.10) !important;
        }
        .assessment-theme button[class*="bg-gradient"] {
          background: var(--cs-navy) !important;
          color: #fff !important;
        }
        .assessment-theme button[class*="bg-[#203b68]"] {
          background: var(--cs-navy) !important;
          color: #fff !important;
        }
        .assessment-theme [class*="hover:border-amber"]:hover,
        .assessment-theme [class*="hover:border-fuchsia"]:hover {
          border-color: var(--cs-navy) !important;
        }
        .assessment-theme input,
        .assessment-theme button {
          font-family: inherit;
        }
        .assessment-theme .assessment-brand {
          color: var(--cs-navy) !important;
        }
      ` }} />
    </div>
  );
}
