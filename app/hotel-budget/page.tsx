"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type BudgetForm = {
  hotelName: string; period: string; days: string; rooms: string; roomSold: string;
  roomRevenue: string; fbRevenue: string; otherRevenue: string; budgetRevenue: string;
  costOfSales: string; payroll: string; departmentalExpense: string; overhead: string;
  depreciation: string; interest: string; tax: string; cash: string; budgetExpense: string;
  notes: string; actionOwner: string; actionDue: string; actionTarget: string;
};
const blank: BudgetForm = {
  hotelName: "", period: "", days: "30", rooms: "", roomSold: "", roomRevenue: "",
  fbRevenue: "", otherRevenue: "", budgetRevenue: "", costOfSales: "", payroll: "",
  departmentalExpense: "", overhead: "", depreciation: "", interest: "", tax: "",
  cash: "", budgetExpense: "", notes: "", actionOwner: "", actionDue: "", actionTarget: "",
};
const sections = [
  { id: "statistics", label: "Budget & Statistics", short: "Statistik", color: "from-sky-500 to-blue-600", icon: "▦" },
  { id: "pnl", label: "Budget P&L", short: "P&L", color: "from-violet-500 to-purple-600", icon: "▤" },
  { id: "forecast", label: "Monthly & Annual Forecast", short: "Forecast", color: "from-teal-500 to-emerald-600", icon: "↗" },
  { id: "variance", label: "Variance & Exception Report", short: "Variance", color: "from-amber-500 to-orange-600", icon: "!" },
  { id: "action-plan", label: "Management Action Plan", short: "Action Plan", color: "from-pink-500 to-rose-600", icon: "✓" },
  { id: "export", label: "Export PDF & Excel", short: "Export", color: "from-indigo-500 to-blue-700", icon: "⇩" },
] as const;
const numericKeys = ["days","rooms","roomSold","roomRevenue","fbRevenue","otherRevenue","budgetRevenue","costOfSales","payroll","departmentalExpense","overhead","depreciation","interest","tax","cash","budgetExpense"] as const;
const money = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
const num = (value: string) => { const n = Number(value); return value.trim() === "" || !Number.isFinite(n) ? 0 : n; };
const fmt = (value: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);

export default function HotelBudgetPage() {
  const [activeTab, setActiveTab] = useState<typeof sections[number]["id"]>("statistics");
  const [form, setForm] = useState<BudgetForm>(blank);
  const [loaded, setLoaded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [message, setMessage] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [orchestrator, setOrchestrator] = useState<"idle" | "checking" | "passed" | "failed">("idle");

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (sections.some(s => s.id === tab)) setActiveTab(tab as typeof sections[number]["id"]);
    try {
      const raw = localStorage.getItem("corestay-hotel-budget-pnl-v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.form) setForm({ ...blank, ...parsed.form });
        if (typeof parsed.savedAt === "string") setSavedAt(parsed.savedAt);
      }
    } catch { setMessage("Data lokal sebelumnya tidak dapat dibaca. Periksa penyimpanan browser."); }
    setLoaded(true);
  }, []);

  const values = useMemo(() => {
    const roomAvailable = num(form.days) * num(form.rooms);
    const roomRevenue = num(form.roomRevenue);
    const fb = num(form.fbRevenue);
    const other = num(form.otherRevenue);
    const revenue = roomRevenue + fb + other;
    const costs = num(form.costOfSales) + num(form.payroll) + num(form.departmentalExpense) + num(form.overhead);
    const gop = revenue - costs;
    const roomSold = num(form.roomSold);
    return {
      roomAvailable, occupancy: roomAvailable > 0 ? roomSold / roomAvailable * 100 : null,
      adr: roomSold > 0 ? roomRevenue / roomSold : null,
      revpar: roomAvailable > 0 ? roomRevenue / roomAvailable : null,
      revenue, costs, gop, gopMargin: revenue > 0 ? gop / revenue * 100 : null,
      budgetRevenue: num(form.budgetRevenue), budgetExpense: num(form.budgetExpense),
      revenueVariance: form.budgetRevenue.trim() ? revenue - num(form.budgetRevenue) : null,
      costVariance: form.budgetExpense.trim() ? costs - num(form.budgetExpense) : null,
      netProfitEstimate: gop - num(form.depreciation) - num(form.interest) - num(form.tax),
    };
  }, [form]);

  const update = (key: keyof BudgetForm, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const field = (key: keyof BudgetForm, label: string, opts: { type?: string; hint?: string; placeholder?: string } = {}) => (
    <label key={key} className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <input type={opts.type || (numericKeys.includes(key as typeof numericKeys[number]) ? "number" : "text")}
        min={numericKeys.includes(key as typeof numericKeys[number]) ? "0" : undefined}
        step={opts.type === "date" ? undefined : "any"} value={form[key]}
        onChange={e => update(key, e.target.value)} placeholder={opts.placeholder || "Isi jika tersedia"}
        className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
      {opts.hint && <span className="mt-1 block text-xs text-slate-500">{opts.hint}</span>}
    </label>
  );

  function downloadExcel() {
    const rows: [string, string | number][] = [
      ["Hotel", form.hotelName], ["Periode", form.period], ["Hari Operasional", form.days], ["Jumlah Kamar", form.rooms],
      ["Kamar Terjual", form.roomSold], ["Kamar Tersedia (hasil hitung)", values.roomAvailable],
      ["Occupancy (%)", values.occupancy ?? "Tidak dapat dihitung"], ["ADR / ARR", values.adr ?? "Tidak dapat dihitung"],
      ["RevPAR", values.revpar ?? "Tidak dapat dihitung"], ["Room Revenue", num(form.roomRevenue)],
      ["F&B Revenue", num(form.fbRevenue)], ["Other Revenue", num(form.otherRevenue)], ["Total Revenue", values.revenue],
      ["Cost of Sales", num(form.costOfSales)], ["Payroll", num(form.payroll)], ["Departmental Expense", num(form.departmentalExpense)],
      ["Overhead", num(form.overhead)], ["Total Operating Cost (komponen di atas)", values.costs], ["GOP (estimasi)", values.gop],
      ["GOP Margin (%)", values.gopMargin ?? "Tidak dapat dihitung"], ["Depreciation", num(form.depreciation)],
      ["Interest", num(form.interest)], ["Tax", num(form.tax)], ["Net Profit Estimate", values.netProfitEstimate],
      ["Budget Revenue", form.budgetRevenue], ["Revenue Variance", values.revenueVariance ?? "Budget belum diisi"],
      ["Budget Expense", form.budgetExpense], ["Cost Variance", values.costVariance ?? "Budget belum diisi"],
      ["Cash (input)", form.cash], ["Catatan", form.notes], ["PIC", form.actionOwner], ["Target", form.actionTarget], ["Deadline", form.actionDue],
    ];
    const worksheet = XLSX.utils.aoa_to_sheet([["CORESTAY ADVISORY — HOTEL BUDGET & P&L"], ["Hotel", form.hotelName], ["Periode", form.period], [], ["Indikator", "Nilai"], ...rows]);
    worksheet["!cols"] = [{ wch: 40 }, { wch: 30 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Budget P&L");
    const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const url = URL.createObjectURL(new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a"); a.href = url; a.download = "CoreStay-Hotel-Budget-PnL.xlsx"; a.click(); URL.revokeObjectURL(url);
  }

  async function validateAndSave() {
    setMessage(""); setIssues([]); setWarnings([]); setOrchestrator("checking"); setSaving(true);
    const localIssues: string[] = [];
    if (!form.hotelName.trim()) localIssues.push("Nama hotel wajib diisi.");
    if (!form.period.trim()) localIssues.push("Periode laporan wajib diisi.");
    if (num(form.days) <= 0) localIssues.push("Hari operasional harus lebih dari 0.");
    if (num(form.rooms) <= 0) localIssues.push("Jumlah kamar harus lebih dari 0.");
    if (num(form.roomSold) < 0) localIssues.push("Kamar terjual tidak boleh negatif.");
    if (values.roomAvailable > 0 && num(form.roomSold) > values.roomAvailable) localIssues.push("Kamar terjual melebihi kamar tersedia. Periksa hari, jumlah kamar, atau room sold.");
    if ([form.roomRevenue,form.fbRevenue,form.otherRevenue,form.costOfSales,form.payroll,form.departmentalExpense,form.overhead].some(v => v.trim() && num(v) < 0)) localIssues.push("Nilai pendapatan dan biaya tidak boleh negatif pada form ini.");
    if (localIssues.length) {
      setIssues(localIssues); setOrchestrator("failed"); setMessage("Validasi awal gagal. Perbaiki isian sebelum menyimpan."); setSaving(false); return;
    }
    try {
      const response = await fetch("/api/hotel-budget/validate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form, calculated: values }),
      });
      const raw = await response.text();
      let data: { passed?: boolean; issues?: string[]; warnings?: string[]; summary?: string; error?: string } = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error("Respons validasi tidak dapat dibaca."); }
      if (!response.ok || data.passed !== true) {
        setIssues(data.issues?.length ? data.issues : [data.error || "Validasi final belum selesai. Data belum disimpan."]);
        setWarnings(data.warnings || []); setOrchestrator("failed");
        setMessage(data.error || "CORESTAY HOTEL BUDGET ORCHESTRATOR belum menyetujui data. Data belum disimpan.");
        setSaving(false); return;
      }
      const stamp = new Date().toISOString();
      localStorage.setItem("corestay-hotel-budget-pnl-v1", JSON.stringify({ form, savedAt: stamp, validation: data }));
      setSavedAt(stamp); setWarnings(data.warnings || []); setOrchestrator("passed");
      setMessage("Validasi otomatis selesai dan data tersimpan pada browser/perangkat ini. " + (data.summary || ""));
    } catch (e) {
      setOrchestrator("failed");
      setIssues([e instanceof Error ? e.message : "Validasi final gagal."]);
      setMessage("Gagal menyelesaikan validasi final. Data tidak disimpan; coba lagi setelah layanan pulih.");
    } finally { setSaving(false); }
  }

  const isActive = (id: string) => activeTab === id;
  const heading = sections.find(s => s.id === activeTab)?.label || sections[0].label;
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-50 px-4 pb-12 pt-20 text-slate-900 sm:px-6 lg:px-8 lg:pt-8 print:bg-white print:px-0 print:pt-0">
      <div className="mx-auto max-w-7xl print:hidden">
        <div className="mb-7 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#173b67] via-[#245b8c] to-[#4f46a5] p-6 text-white shadow-xl sm:p-8 print:hidden">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div><p className="mb-2 text-xs font-bold uppercase tracking-[.22em] text-sky-100">CORESTAY ADVISORY · HOTEL FINANCE WORKSPACE</p>
              <h1 className="text-2xl font-black tracking-tight sm:text-4xl">Hotel Budget &amp; P&amp;L</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50">Susun statistik operasional, anggaran, proyeksi, dan laporan laba-rugi hotel dalam satu workspace yang rapi dan mudah diperiksa.</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur"><p className="text-xs text-blue-100">Status validasi</p><p className="mt-1 font-bold">{orchestrator === "passed" ? "Lolos validasi" : orchestrator === "checking" ? "Sedang memeriksa…" : orchestrator === "failed" ? "Perlu diperiksa" : "Belum divalidasi"}</p></div>
          </div>
        </div>
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 print:hidden">
          {sections.map((s, i) => <a key={s.id} href={"/hotel-budget?tab=" + s.id} aria-current={isActive(s.id) ? "page" : undefined}
            className={"group rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:shadow-lg " + (isActive(s.id) ? "border-slate-300 bg-white shadow-md ring-2 ring-sky-100" : "border-white bg-white/70 shadow-sm")}>
            <span className={"mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-black text-white " + s.color}>{s.icon}</span>
            <span className="block text-xs font-bold leading-4 text-slate-800 sm:text-sm">{s.label}</span>
            <span className="mt-1 block text-[11px] text-slate-500">Bagian {i + 1}</span>
          </a>)}
        </div>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 rounded-[26px] border border-white bg-white/90 p-4 shadow-lg shadow-slate-200/50 sm:p-7 print:border-0 print:p-0 print:shadow-none">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-[.18em] text-sky-700">Bagian {sections.findIndex(s => s.id === activeTab) + 1} dari 6</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">{heading}</h2><p className="mt-1 text-sm text-slate-500">Angka kosong tidak dipaksakan menjadi rasio. Periksa sumber sebelum finalisasi.</p></div>
              <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">IDR · Rupiah</span>
            </div>
            {activeTab === "statistics" && <div className="grid gap-4 sm:grid-cols-2">
              {field("hotelName","Nama hotel",{placeholder:"Contoh: Hotel Marza 88"})}
              {field("period","Periode",{placeholder:"Contoh: Januari 2027 / FY 2027"})}
              {field("days","Hari operasional",{hint:"Gunakan jumlah hari aktual pada periode laporan."})}
              {field("rooms","Jumlah kamar tersedia",{hint:"Kamar build/inventory yang menjadi dasar statistik."})}
              {field("roomSold","Room nights terjual",{hint:"Gunakan room nights, bukan jumlah tamu."})}
              {field("roomRevenue","Room Revenue (Rp)",{hint:"Pendapatan kamar sesuai laporan sumber."})}
              {field("fbRevenue","Food & Beverage Revenue (Rp)")}
              {field("otherRevenue","Other Operating Revenue (Rp)")}
              <div className="sm:col-span-2 rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 p-4"><p className="font-bold text-slate-800">Statistik terhitung otomatis</p><div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[["Room Available",fmt(values.roomAvailable)],["Occupancy",values.occupancy === null ? "—" : fmt(values.occupancy) + "%"],["ADR / ARR",values.adr === null ? "—" : money(values.adr)],["RevPAR",values.revpar === null ? "—" : money(values.revpar)]].map(([l,v])=><div key={l} className="rounded-xl bg-white p-3"><p className="text-[11px] text-slate-500">{l}</p><p className="mt-1 break-words text-sm font-extrabold tabular-nums text-slate-800">{v}</p></div>)}
              </div></div>
            </div>}
            {activeTab === "pnl" && <div className="grid gap-4 sm:grid-cols-2">
              {field("roomRevenue","Room Revenue (Rp)")}{field("fbRevenue","F&B Revenue (Rp)")}{field("otherRevenue","Other Operating Revenue (Rp)")}
              {field("costOfSales","Cost of Sales (Rp)")}{field("payroll","Payroll & Related Expenses (Rp)")}{field("departmentalExpense","Other Departmental Expenses (Rp)")}{field("overhead","Undistributed / Overhead Expenses (Rp)")}
              {field("depreciation","Depreciation (Rp)")}{field("interest","Interest / Finance Cost (Rp)")}{field("tax","Tax (Rp)")}{field("cash","Cash Balance / Cash Flow source value (Rp)",{hint:"Isi sesuai label sumber; jangan samakan saldo kas dengan arus kas."})}
              <div className="sm:col-span-2 grid gap-3 rounded-2xl bg-violet-50 p-4 sm:grid-cols-3">{[["Total Revenue",money(values.revenue)],["Operating Cost (komponen terisi)",money(values.costs)],["GOP (estimasi)",money(values.gop)],["GOP Margin",values.gopMargin === null ? "—" : fmt(values.gopMargin)+"%"],["Net Profit Estimate",money(values.netProfitEstimate)]].map(([l,v])=><div key={l} className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">{l}</p><p className="mt-1 break-words text-sm font-extrabold tabular-nums">{v}</p></div>)}</div>
              <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">Catatan: GOP dan laba bersih di atas adalah kalkulasi sementara dari komponen yang Anda isi. Pastikan klasifikasi akun, biaya departemen, overhead, pajak, dan item non-operasional sesuai chart of accounts hotel.</p>
            </div>}
            {activeTab === "forecast" && <div className="space-y-4"><div className="rounded-2xl bg-teal-50 p-4 text-sm leading-6 text-teal-950">Forecast ini memakai asumsi dan angka yang Anda masukkan. Untuk proyeksi bulanan/tahunan yang lengkap, masukkan nilai budget revenue dan budget expense; jangan menafsirkan data kosong sebagai nol aktual.</div><div className="grid gap-4 sm:grid-cols-2">{field("budgetRevenue","Budget Total Revenue (Rp)")}{field("budgetExpense","Budget Total Expense (Rp)")}{field("period","Periode forecast",{placeholder:"Contoh: FY 2027"})}{field("notes","Asumsi forecast",{placeholder:"Catat asumsi okupansi, ADR, inflasi biaya, atau event"})}</div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white p-4 ring-1 ring-teal-100"><p className="text-sm text-slate-500">Budget Revenue</p><p className="mt-2 text-xl font-black tabular-nums">{form.budgetRevenue.trim() ? money(values.budgetRevenue) : "Belum diisi"}</p></div><div className="rounded-2xl bg-white p-4 ring-1 ring-teal-100"><p className="text-sm text-slate-500">Budget Expense</p><p className="mt-2 text-xl font-black tabular-nums">{form.budgetExpense.trim() ? money(values.budgetExpense) : "Belum diisi"}</p></div></div></div>}
            {activeTab === "variance" && <div className="space-y-4"><div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">Variance = Actual yang diinput dikurangi Budget. Angka positif untuk revenue umumnya berarti di atas budget; untuk biaya umumnya berarti biaya lebih tinggi dari budget. Pastikan periode Actual dan Budget sama.</div><div className="grid gap-4 sm:grid-cols-2">{field("budgetRevenue","Budget Total Revenue (Rp)")}{field("budgetExpense","Budget Total Expense (Rp)")}</div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white p-4 ring-1 ring-amber-100"><p className="text-sm text-slate-500">Revenue variance (Actual − Budget)</p><p className={"mt-2 break-words text-xl font-black tabular-nums " + (values.revenueVariance !== null && values.revenueVariance < 0 ? "text-rose-600" : "text-emerald-700")}>{values.revenueVariance === null ? "Budget belum diisi" : money(values.revenueVariance)}</p></div><div className="rounded-2xl bg-white p-4 ring-1 ring-amber-100"><p className="text-sm text-slate-500">Cost variance (Actual − Budget)</p><p className={"mt-2 break-words text-xl font-black tabular-nums " + (values.costVariance !== null && values.costVariance > 0 ? "text-rose-600" : "text-emerald-700")}>{values.costVariance === null ? "Budget belum diisi" : money(values.costVariance)}</p></div></div></div>}
            {activeTab === "action-plan" && <div className="grid gap-4 sm:grid-cols-2">{field("notes","Temuan / tindakan manajemen",{placeholder:"Jelaskan isu dan tindakan yang akan dilakukan"})}{field("actionOwner","PIC / penanggung jawab",{placeholder:"Nama atau jabatan"})}{field("actionDue","Deadline",{type:"date"})}{field("actionTarget","Target hasil",{placeholder:"Contoh: turunkan biaya energi 5% (isi jika ada dasar)"})}<div className="sm:col-span-2 rounded-2xl bg-pink-50 p-4 text-sm leading-6 text-pink-950">Setiap tindakan idealnya memiliki PIC, tenggat waktu, ukuran keberhasilan, dan bukti penyelesaian. Target tidak akan dibuat otomatis bila belum memiliki dasar data.</div></div>}
            {activeTab === "export" && <div className="space-y-4"><div className="rounded-2xl bg-indigo-50 p-5"><h3 className="font-extrabold text-indigo-950">Preview &amp; export</h3><p className="mt-2 text-sm leading-6 text-indigo-900">Lihat ringkasan terlebih dahulu, lalu cetak atau simpan sebagai PDF dari dialog print. Unduh CSV untuk dibuka di Excel. Format export memakai satu metrik per baris agar angka tidak bertumpuk.</p></div><div className="grid gap-3 sm:grid-cols-3"><button type="button" onClick={()=>setPreviewOpen(true)} className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-sky-700">Preview laporan</button><button type="button" onClick={()=>window.print()} className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white shadow hover:bg-slate-900">Print / Save PDF</button><button type="button" onClick={downloadExcel} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-emerald-700">Download Excel (.xlsx)</button></div></div>}
            <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-100 pt-5 print:hidden">
              <button type="button" onClick={()=>setPreviewOpen(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Preview sebelum simpan</button>
              <button type="button" disabled={saving || !loaded} onClick={validateAndSave} className="rounded-xl bg-gradient-to-r from-blue-700 to-violet-700 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Validasi final berjalan…" : "Validasi AI & Simpan"}</button>
              <button type="button" onClick={() => setPreviewOpen(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Preview / Print PDF</button>
              <button type="button" onClick={downloadExcel} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100">Download Excel (.xlsx)</button>
            </div>
            {message && <div className={"mt-4 rounded-xl border p-4 text-sm leading-6 " + (orchestrator === "passed" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : orchestrator === "failed" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-sky-200 bg-sky-50 text-sky-900")}>{message}</div>}
            {(issues.length > 0 || warnings.length > 0) && <div className="mt-3 space-y-3">{issues.length > 0 && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="font-bold text-rose-900">Temuan validasi — wajib ditangani</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-800">{issues.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}{warnings.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold text-amber-900">Peringatan</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">{warnings.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}</div>}
          </section>
          <aside className="space-y-4 print:hidden">
            <div className="rounded-[24px] bg-white p-5 shadow-md ring-1 ring-slate-100"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Live summary</p><p className="mt-2 text-sm text-slate-500">{form.hotelName || "Nama hotel belum diisi"}</p><div className="mt-4 space-y-3">{[["Total Revenue",money(values.revenue)],["GOP (estimasi)",money(values.gop)],["GOP Margin",values.gopMargin === null ? "—" : fmt(values.gopMargin)+"%"],["Room Occupancy",values.occupancy === null ? "—" : fmt(values.occupancy)+"%"]].map(([label,value])=><div key={label} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><span className="text-xs text-slate-500">{label}</span><span className="max-w-[60%] break-words text-right text-sm font-extrabold tabular-nums">{value}</span></div>)}</div></div>
            <div className="rounded-[24px] bg-gradient-to-br from-slate-900 to-blue-950 p-5 text-white"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">✓</span><h3 className="font-extrabold">CORESTAY BUDGET CHECKS</h3></div><p className="mt-3 text-sm leading-6 text-blue-100">Pemeriksaan formula, konsistensi statistik, nilai negatif, kelengkapan dasar, dan review AI sebelum data disimpan.</p><p className="mt-3 text-xs text-blue-200">Tidak ada sistem yang dapat menjamin zero mistake secara mutlak. Hasil perlu ditinjau terhadap dokumen sumber.</p></div>
            <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-5"><p className="font-bold text-sky-950">Data &amp; privasi</p><p className="mt-2 text-sm leading-6 text-sky-900">Versi awal menyimpan isian di browser/perangkat ini setelah validasi berhasil. Data tidak otomatis masuk ke akun atau Hasil Assessment.</p>{savedAt && <p className="mt-3 text-xs text-sky-800">Terakhir disimpan: {new Date(savedAt).toLocaleString("id-ID")}</p>}</div>
          </aside>
        </div>
      </div>
      {previewOpen && <div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 pt-8 sm:p-8 print:static print:block print:overflow-visible print:bg-white print:p-0" role="dialog" aria-modal="true" aria-label="Preview laporan"><div className="my-auto w-full max-w-4xl rounded-2xl bg-white p-5 shadow-2xl sm:p-8 print:my-0 print:max-w-none print:rounded-none print:p-0 print:shadow-none"><div className="mb-6 flex items-start justify-between gap-3 border-b border-slate-200 pb-4"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">CORESTAY ADVISORY</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Hotel Budget &amp; P&amp;L — Preview</h2><p className="mt-1 text-sm text-slate-500">{form.hotelName || "Nama hotel"} · {form.period || "Periode belum diisi"}</p></div><button onClick={()=>setPreviewOpen(false)} className="rounded-full bg-slate-100 px-3 py-2 font-bold text-slate-600" aria-label="Tutup preview">✕</button></div><div className="grid gap-3 sm:grid-cols-3">{[["Total Revenue",money(values.revenue)],["GOP (estimasi)",money(values.gop)],["GOP Margin",values.gopMargin===null?"—":fmt(values.gopMargin)+"%"]].map(([l,v])=><div key={l} className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">{l}</p><p className="mt-1 break-words text-lg font-black tabular-nums">{v}</p></div>)}</div><div className="mt-5 overflow-x-auto"><table className="w-full border-collapse text-sm"><tbody>{[["Hotel",form.hotelName],["Periode",form.period],["Hari operasional",form.days],["Jumlah kamar",form.rooms],["Room nights terjual",form.roomSold],["Room Available",fmt(values.roomAvailable)],["Occupancy",values.occupancy===null?"Tidak tersedia":fmt(values.occupancy)+"%"],["ADR / ARR",values.adr===null?"Tidak tersedia":money(values.adr)],["RevPAR",values.revpar===null?"Tidak tersedia":money(values.revpar)],["Room Revenue",money(num(form.roomRevenue))],["F&B Revenue",money(num(form.fbRevenue))],["Other Revenue",money(num(form.otherRevenue))],["Total Revenue",money(values.revenue)],["Cost of Sales",money(num(form.costOfSales))],["Payroll",money(num(form.payroll))],["Departmental Expenses",money(num(form.departmentalExpense))],["Overhead",money(num(form.overhead))],["Total Operating Cost (komponen di atas)",money(values.costs)],["GOP (estimasi)",money(values.gop)],["GOP Margin",values.gopMargin===null?"Tidak tersedia":fmt(values.gopMargin)+"%"],["Net Profit Estimate",money(values.netProfitEstimate)],["Cash (nilai sumber)",form.cash ? money(num(form.cash)) : "Tidak diisi"],["Budget Revenue",form.budgetRevenue ? money(values.budgetRevenue) : "Tidak diisi"],["Revenue Variance",values.revenueVariance===null?"Tidak dihitung":money(values.revenueVariance)],["Budget Expense",form.budgetExpense ? money(values.budgetExpense) : "Tidak diisi"],["Cost Variance",values.costVariance===null?"Tidak dihitung":money(values.costVariance)],["PIC",form.actionOwner],["Deadline",form.actionDue],["Target",form.actionTarget],["Catatan",form.notes]].map(([label,value],i)=><tr key={label} className={i%2?"bg-slate-50":""}><th className="w-[42%] border-b border-slate-200 px-3 py-2.5 text-left font-semibold text-slate-600">{label}</th><td className="break-words border-b border-slate-200 px-3 py-2.5 text-right font-medium tabular-nums text-slate-900">{value || "—"}</td></tr>)}</tbody></table></div><div className="mt-6 flex flex-wrap justify-end gap-3 print:hidden"><button onClick={()=>setPreviewOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm font-bold">Kembali ke form</button><button onClick={downloadExcel} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">Download Excel (.xlsx)</button><button onClick={()=>window.print()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Print / Save PDF</button></div></div></div>}
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: #fff !important; color: #111827 !important; font-size: 10pt; }
          .site-sidebar, .site-sidebar-mobile, button, a { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          table { width: 100% !important; table-layout: fixed; }\n          main > div:first-child { display: none !important; }\n          main > div[role="dialog"] { display: block !important; position: static !important; overflow: visible !important; background: #fff !important; padding: 0 !important; }\n          main > div[role="dialog"] > div { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; }
          th, td { overflow-wrap: anywhere; word-break: normal; padding: 6px 8px !important; }
          tr { break-inside: avoid; }
          * { box-shadow: none !important; }
        }
      `}</style>
    </main>
  );
}
