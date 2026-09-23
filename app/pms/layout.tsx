import Image from "next/image";
import Link from "next/link";

const menu = [
  ["/pms", "Dashboard"],
  ["/pms/reservations", "Reservation"],
  ["/pms/front-office", "Front Office"],
  ["/pms/rooms", "Rooms"],
  ["/pms/guests", "Guests"],
  ["/pms/housekeeping", "Housekeeping"],
  ["/pms/revenue", "Revenue"],
  ["/pms/finance", "Finance"],
  ["/pms/reports", "Reports"],
  ["/pms/settings", "Settings"],
];

export default function PMSLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[220px] bg-[#090909] text-white lg:flex lg:flex-col">
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex h-10 items-center justify-center">
            <Image
              src="/logo-corestay.png"
              alt="CoreStay"
              width={96}
              height={34}
              className="h-auto w-[96px] object-contain"
              priority
            />
          </div>
          <p className="mt-3 text-[8px] uppercase tracking-[0.16em] text-white/40">
            Property Management System
          </p>
          <p className="mt-1 text-[13px] font-semibold">Hotel Cores_Stay</p>
        </div>

        <nav className="flex-1 px-3 py-4">
          <p className="mb-2 px-2 text-[8px] uppercase tracking-[0.16em] text-white/30">
            Main Menu
          </p>
          <div className="space-y-1">
            {menu.map(([href, label], index) => (
              <Link
                key={href}
                href={href}
                className={`flex h-8 items-center rounded-lg px-3 text-[11px] transition ${
                  index === 0
                    ? "bg-white/10 font-semibold text-white"
                    : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="px-3 pb-4">
          <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/10 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[8px] font-bold text-emerald-300">
                SYSTEM LIVE
              </span>
            </div>
            <p className="mt-0.5 text-[8px] text-white/35">
              Supabase connected
            </p>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:ml-[220px]">
        {children}
      </div>
    </div>
  );
}





