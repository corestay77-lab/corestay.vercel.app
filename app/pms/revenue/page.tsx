import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">CoreStay PMS</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">revenue</h1>
        <p className="mt-2 text-sm text-slate-500">Modul PMS siap dikembangkan.</p>
        <Link href="/pms" className="mt-6 inline-block text-sm font-semibold text-slate-700">← Kembali ke Dashboard</Link>
      </div>
    </main>
  );
}




