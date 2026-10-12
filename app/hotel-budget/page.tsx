"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { ACCOUNT_LINES, ACCOUNT_SECTIONS, GROUP_LABELS, GROUP_ORDER, calculateBudget, emptyAccounts, numeric, sumGroup, type AccountValue } from "@/lib/hotel-budget-final";

type Statistics = { days: string; rooms: string; outInventory: string; houseUse: string; outOfOrder: string; complimentary: string; roomPaid: string };
type ForecastMonth = { label: string; occupancy: string; adr: string; fbRevenue: string; otherRevenue: string; operatingCosts: string };
type ForecastYear = { label: string; days: string; rooms: string; occupancy: string; adr: string; fbRevenue: string; otherRevenue: string; operatingCosts: string };
type BudgetForm = {
  hotelName: string; period: string; yearStart: string; statistics: Statistics;
  accounts: Record<string, AccountValue>;
  forecast: { monthly: ForecastMonth[]; annual: ForecastYear[] };
  confirmAccountReview: boolean; notes: string; actionOwner: string; actionDue: string; actionTarget: string;
};
type SavedReport = { id: string; hotel_name: string; period_label: string; created_at: string; form_data: BudgetForm; calculated_data: any; validation_data: any };
const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const makeMonthly = (year: number): ForecastMonth[] => monthNames.map((label,i)=>({label:label+" "+year,occupancy:"",adr:"",fbRevenue:"",otherRevenue:"",operatingCosts:""}));
const makeAnnual = (year: number): ForecastYear[] => Array.from({length:10},(_,i)=>({label:String(year+i),days:String((year+i)%4===0?366:365),rooms:"",occupancy:"",adr:"",fbRevenue:"",otherRevenue:"",operatingCosts:""}));
const makeBlank = (): BudgetForm => ({
  hotelName:"",period:"",yearStart:"2027",
  statistics:{days:"30",rooms:"",outInventory:"",houseUse:"",outOfOrder:"",complimentary:"",roomPaid:""},
  accounts:emptyAccounts(),forecast:{monthly:makeMonthly(2027),annual:makeAnnual(2027)},
  confirmAccountReview:false,notes:"",actionOwner:"",actionDue:"",actionTarget:""
});
const idr = (value: number | null | undefined) => value===null||value===undefined||!Number.isFinite(value) ? "—" : new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(value);
const fmt = (value: number | null | undefined, digits=2) => value===null||value===undefined||!Number.isFinite(value) ? "—" : new Intl.NumberFormat("id-ID",{maximumFractionDigits:digits}).format(value);
const optional = (value: string) => value.trim()==="" ? null : numeric(value);
const safeVal = (value: string) => value.trim()==="" ? null : Number(value);
const totalColumn = (groups: readonly (typeof GROUP_ORDER[number])[], accounts: Record<string,AccountValue>, column: keyof AccountValue) => {
  const values=groups.map(g=>sumGroup(accounts,g,column));
  return values.some(v=>v!==null) ? values.reduce<number>((s,v)=>s+(v??0),0) : null;
};
const calcMonthly = (row: ForecastMonth, year: number, index: number, rooms: string) => {
  const days=new Date(year,index+1,0).getDate(), roomCount=optional(rooms), occ=optional(row.occupancy), adr=optional(row.adr);
  const roomRevenue=roomCount!==null&&occ!==null&&adr!==null ? days*roomCount*occ/100*adr : null;
  const fb=optional(row.fbRevenue), other=optional(row.otherRevenue), costs=optional(row.operatingCosts);
  const rev=roomRevenue!==null||fb!==null||other!==null ? (roomRevenue??0)+(fb??0)+(other??0) : null;
  return {days,roomRevenue,revenue:rev,costs,gop:rev!==null&&costs!==null?rev-costs:null};
};
const calcAnnual = (row: ForecastYear) => {
  const days=optional(row.days), rooms=optional(row.rooms), occ=optional(row.occupancy), adr=optional(row.adr);
  const roomRevenue=days!==null&&rooms!==null&&occ!==null&&adr!==null?days*rooms*occ/100*adr:null;
  const fb=optional(row.fbRevenue), other=optional(row.otherRevenue), costs=optional(row.operatingCosts);
  const revenue=roomRevenue!==null||fb!==null||other!==null?(roomRevenue??0)+(fb??0)+(other??0):null;
  return {roomRevenue,revenue,costs,gop:revenue!==null&&costs!==null?revenue-costs:null};
};

export default function HotelBudgetPage() {
  const [form,setForm]=useState<BudgetForm>(makeBlank);
  const [activeTab,setActiveTab]=useState("statistics");
  const [authStatus,setAuthStatus]=useState<"checking"|"authenticated"|"unauthenticated">("checking");
  const [accessToken,setAccessToken]=useState("");
  const [reports,setReports]=useState<SavedReport[]>([]);
  const [selectedReport,setSelectedReport]=useState("");
  const [search,setSearch]=useState("");
  const [previewOpen,setPreviewOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [loadingReports,setLoadingReports]=useState(false);
  const [message,setMessage]=useState("");
  const [issues,setIssues]=useState<string[]>([]);
  const [warnings,setWarnings]=useState<string[]>([]);
  const [orchestrator,setOrchestrator]=useState<"idle"|"checking"|"passed"|"failed">("idle");
  const [summary,setSummary]=useState("");

  const loadReports=useCallback(async(token:string)=>{
    setLoadingReports(true);
    try{
      const response=await fetch("/api/hotel-budget/reports",{headers:{Authorization:"Bearer "+token},cache:"no-store"});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"Daftar laporan tidak dapat dibaca.");
      const list=Array.isArray(data.reports)?data.reports:[];
      setReports(list);
      if(list.length) setSelectedReport(prev=>prev||list[0].id);
    }catch(e){setMessage(e instanceof Error?e.message:"Gagal membaca laporan tersimpan.");}
    finally{setLoadingReports(false);}
  },[]);

  useEffect(()=>{
    let alive=true;
    supabase.auth.getSession().then(({data})=>{
      if(!alive)return;
      const token=data.session?.access_token||"";
      setAccessToken(token);setAuthStatus(token?"authenticated":"unauthenticated");
      if(token) void loadReports(token);
    }).catch(()=>{if(alive)setAuthStatus("unauthenticated");});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
      const token=session?.access_token||"";
      setAccessToken(token);setAuthStatus(token?"authenticated":"unauthenticated");
      if(token) void loadReports(token); else {setReports([]);setSelectedReport("");}
    });
    return()=>{alive=false;subscription.unsubscribe();};
  },[loadReports]);

  useEffect(()=>{
    const start=Number(form.yearStart);
    if(Number.isInteger(start)&&start>=1900&&start<=2200){
      setForm(prev=>{
        const monthly=prev.forecast.monthly.map((row,i)=>({...row,label:monthNames[i]+" "+start}));
        const annual=prev.forecast.annual.map((row,i)=>({...row,label:String(start+i),days:row.days||String((start+i)%4===0?366:365)}));
        return {...prev,forecast:{monthly,annual}};
      });
    }
  },[form.yearStart]);

  const values=useMemo(()=>calculateBudget(form),[form]);
  const revenueActual=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"actual");
  const revenueBudget=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"budget");
  const revenueLastYear=totalColumn(["roomRevenue","fbRevenue","otherRevenue"],form.accounts,"lastYear");
  const costActual=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"actual");
  const costBudget=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"budget");
  const costLastYear=totalColumn(["costOfSales","payroll","operatingExpenses","overhead"],form.accounts,"lastYear");
  const filteredLines=useMemo(()=>ACCOUNT_LINES.filter(line=>(line.code+" "+line.label+" "+line.section).toLowerCase().includes(search.toLowerCase())),[search]);
  const selectedSaved=reports.find(r=>r.id===selectedReport);
  const updateStats=(key:keyof Statistics,value:string)=>setForm(prev=>({...prev,statistics:{...prev.statistics,[key]:value}}));
  const updateMeta=(key:"hotelName"|"period"|"yearStart"|"notes"|"actionOwner"|"actionDue"|"actionTarget",value:string)=>setForm(prev=>({...prev,[key]:value}));
  const updateAccount=(code:string,column:keyof AccountValue,value:string)=>setForm(prev=>({...prev,accounts:{...prev.accounts,[code]:{...(prev.accounts[code]||{actual:"",budget:"",lastYear:""}),[column]:value}}}));
  const updateMonth=(index:number,key:keyof Omit<ForecastMonth,"label">,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,monthly:prev.forecast.monthly.map((r,i)=>i===index?{...r,[key]:value}:r)}}));
  const updateYear=(index:number,key:keyof Omit<ForecastYear,"label">,value:string)=>setForm(prev=>({...prev,forecast:{...prev.forecast,annual:prev.forecast.annual.map((r,i)=>i===index?{...r,[key]:value}:r)}}));

  const inputClass="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
  const field=(label:string,value:string,onChange:(value:string)=>void,options:{type?:string;hint?:string;min?:string;step?:string;placeholder?:string}={})=>(
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span>
      <input className={inputClass} type={options.type||"text"} value={value} onChange={e=>onChange(e.target.value)} min={options.min} step={options.step||"any"} placeholder={options.placeholder||"Isi sesuai sumber"} />
      {options.hint&&<span className="mt-1 block text-xs leading-5 text-slate-500">{options.hint}</span>}
    </label>
  );
  const statField=(key:keyof Statistics,label:string,hint?:string)=>field(label,form.statistics[key],v=>updateStats(key,v),{type:"number",min:"0",hint,step:key==="days"||key==="rooms"?"1":"any"});
  const numberInput=(value:string,onChange:(v:string)=>void,placeholder="—")=><input type="number" min="0" step="any" className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-2 text-right text-xs tabular-nums outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 sm:w-32" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} />;

  async function saveFinal(){
    setMessage("");setIssues([]);setWarnings([]);setSummary("");setOrchestrator("checking");
    if(!accessToken){setOrchestrator("failed");setIssues(["Login diperlukan untuk menyimpan laporan secara aman ke akun."]);setMessage("Silakan login, lalu kembali ke Hotel Budget & P&L. Form yang sedang terbuka tetap ada sampai halaman ditutup.");return;}
    if(!form.hotelName.trim()||!form.period.trim()){setOrchestrator("failed");setIssues(["Nama hotel dan periode wajib diisi."]);setMessage("Lengkapi identitas laporan terlebih dahulu.");return;}
    setSaving(true);
    try{
      const response=await fetch("/api/hotel-budget/reports",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+accessToken},body:JSON.stringify({form})});
      const raw=await response.text();let data:any={};
      try{data=raw?JSON.parse(raw):{};}catch{throw new Error("Respons server tidak valid. Data tetap berada di form dan belum disimpan.");}
      if(!response.ok||data.passed!==true){
        setOrchestrator("failed");setIssues(Array.isArray(data.issues)&&data.issues.length?data.issues:[data.error||"Validasi final belum lolos."]);setWarnings(data.warnings||[]);setMessage(data.error||"Validasi final gagal. Laporan belum disimpan.");return;
      }
      setOrchestrator("passed");setWarnings(data.warnings||[]);setSummary(data.summary||"");setSelectedReport(data.report.id);
      setMessage("Laporan lolos pemeriksaan matematis dan AI Orchestrator, lalu tersimpan pada akun Anda.");
      await loadReports(accessToken);
    }catch(e){setOrchestrator("failed");setIssues([e instanceof Error?e.message:"Validasi final gagal."]);setMessage("Laporan belum disimpan. Data tetap berada di form; coba kembali setelah masalah teratasi.");}
    finally{setSaving(false);}
  }

  function openSaved(report:SavedReport){
    if(report?.form_data){setForm({...makeBlank(),...report.form_data,accounts:{...emptyAccounts(),...(report.form_data.accounts||{})}});setSelectedReport(report.id);setOrchestrator("passed");setWarnings(report.validation_data?.warnings||[]);setSummary(report.validation_data?.summary||"");setMessage("Laporan tersimpan dibuka. Perubahan pada form belum tersimpan sampai Anda menjalankan validasi dan simpan lagi.");setIssues([]);}
  }
  async function deleteSaved(report:SavedReport){
    if(!accessToken||!window.confirm("Hapus laporan "+report.hotel_name+" — "+report.period_label+"? Tindakan ini tidak dapat dibatalkan."))return;
    try{
      const response=await fetch("/api/hotel-budget/reports?id="+encodeURIComponent(report.id),{method:"DELETE",headers:{Authorization:"Bearer "+accessToken}});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Laporan gagal dihapus.");
      const rest=reports.filter(r=>r.id!==report.id);setReports(rest);if(selectedReport===report.id)setSelectedReport(rest[0]?.id||"");setMessage("Laporan berhasil dihapus dari akun Anda.");
    }catch(e){setMessage(e instanceof Error?e.message:"Laporan gagal dihapus.");}
  }

  function downloadExcel(){
    const statRows=[
      ["Hotel",form.hotelName],["Periode",form.period],["Hari operasional",optional(form.statistics.days)],["Jumlah kamar",optional(form.statistics.rooms)],
      ["Total Room Build",values.totalRoomBuild],["Out of Inventory",optional(form.statistics.outInventory)],["House Use",optional(form.statistics.houseUse)],
      ["Out of Order",optional(form.statistics.outOfOrder)],["Room Available / Saleable",values.roomAvailable],["Complimentary Room Nights",optional(form.statistics.complimentary)],
      ["Paid Room Nights",optional(form.statistics.roomPaid)],["Occupancy (%)",values.occupancy],["ADR / ARR",values.adr],["RevPAR",values.revpar],
      ["Total Revenue — akun terisi",values.revenue],["Total Operating Cost — akun terisi",values.costs],["GOP — estimasi akun terisi",values.gop],
      ["GOP Margin (%)",values.gopMargin],["Other Income",values.otherIncome],["Other Expenses & Below GOP",values.otherExpenses],["Net Profit — estimasi",values.netProfit],
      ["Catatan",form.notes],["PIC",form.actionOwner],["Deadline",form.actionDue],["Target",form.actionTarget]
    ];
    const pnlRows:any[][]=[["Account Code","Account / Description","Section","Actual","Budget","Variance Actual − Budget","Last Year Same Period","Variance Actual − Last Year"]];
    for(const line of ACCOUNT_LINES){const row=form.accounts[line.code]||{actual:"",budget:"",lastYear:""};const a=optional(row.actual),b=optional(row.budget),l=optional(row.lastYear);pnlRows.push([line.code,line.label,line.section,a,b,a!==null&&b!==null?a-b:null,l,a!==null&&l!==null?a-l:null]);}
    const monthlyRows:any[][]=[["Month","Days","Occupancy (%)","ADR / ARR","Room Revenue (calculated)","F&B Revenue","Other Revenue","Total Revenue","Operating Costs","GOP / Contribution"]];
    form.forecast.monthly.forEach((row,i)=>{const c=calcMonthly(row,Number(form.yearStart),i,form.statistics.rooms);monthlyRows.push([row.label,c.days,optional(row.occupancy),optional(row.adr),c.roomRevenue,optional(row.fbRevenue),optional(row.otherRevenue),c.revenue,optional(row.operatingCosts),c.gop]);});
    const annualRows:any[][]=[["Year","Days","Rooms","Occupancy (%)","ADR / ARR","Room Revenue (calculated)","F&B Revenue","Other Revenue","Total Revenue","Operating Costs","GOP / Contribution"]];
    form.forecast.annual.forEach(row=>{const c=calcAnnual(row);annualRows.push([row.label,optional(row.days),optional(row.rooms),optional(row.occupancy),optional(row.adr),c.roomRevenue,optional(row.fbRevenue),optional(row.otherRevenue),c.revenue,optional(row.operatingCosts),c.gop]);});
    const workbook=XLSX.utils.book_new();
    const add=(name:string,rows:any[][],widths:number[])=>{const ws=XLSX.utils.aoa_to_sheet(rows);ws["!cols"]=widths.map(w=>({wch:w}));ws["!freeze"]={xSplit:0,ySplit:1};ws["!autofilter"]={ref:ws["!ref"]||"A1"};XLSX.utils.book_append_sheet(workbook,ws,name);};
    add("Summary",[[ "CORESTAY ADVISORY — HOTEL BUDGET & P&L"],["Hotel",form.hotelName],["Period",form.period],[],["Metric","Value"],...statRows],[38,30]);
    add("Account P&L",pnlRows,[16,44,36,20,20,24,24,24]);
    add("Monthly Forecast",monthlyRows,[22,10,16,18,22,20,20,22,22,22]);
    add("10-Year Forecast",annualRows,[14,10,10,16,18,24,20,20,22,22,22]);
    const output=XLSX.write(workbook,{bookType:"xlsx",type:"array"});
    const url=URL.createObjectURL(new Blob([output],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
    const a=document.createElement("a");a.href=url;a.download="CoreStay-Hotel-Budget-PnL-"+(form.period||"report").replace(/[^a-z0-9-_]+/gi,"-")+".xlsx";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  const tabItems=[
    {id:"statistics",label:"Budget & Statistics",sub:"Statistik hotel",color:"from-sky-500 to-blue-600"},
    {id:"pnl",label:"Budget P&L",sub:"Rincian akun",color:"from-violet-500 to-purple-600"},
    {id:"forecast",label:"Monthly & Annual Forecast",sub:"12 bulan",color:"from-teal-500 to-emerald-600"},
    {id:"variance",label:"Variance & Exception Report",sub:"Actual vs Budget",color:"from-amber-500 to-orange-600"},
    {id:"action-plan",label:"Management Action Plan",sub:"PIC dan target",color:"from-pink-500 to-rose-600"},
    {id:"export",label:"Export PDF & Excel",sub:"Preview dan unduh",color:"from-indigo-500 to-blue-700"}
  ];
  const sectionLabel=tabItems.find(x=>x.id===activeTab)?.label||tabItems[0].label;
  const roomStats=[
    ["Total Room Build",values.totalRoomBuild],["Room Available / Saleable",values.roomAvailable],
    ["Occupancy",values.occupancy],["ADR / ARR",values.adr],["RevPAR",values.revpar]
  ] as [string,number|null][];
  const metric=(label:string,value:string,detail?:string)=><div key={label} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 break-words text-lg font-black tabular-nums text-slate-900">{value}</p>{detail&&<p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p>}</div>;

  return <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-violet-50 px-3 pb-12 pt-20 text-slate-900 sm:px-6 lg:px-8 lg:pt-8">
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-6 overflow-hidden rounded-[28px] bg-gradient-to-r from-[#173b67] via-[#245b8c] to-[#6554b7] p-5 text-white shadow-xl sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-sky-100">CORESTAY ADVISORY · HOTEL FINANCE WORKSPACE</p><h1 className="text-2xl font-black tracking-tight sm:text-4xl">Hotel Budget &amp; P&amp;L</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50">Satu workspace untuk statistik hotel, rincian akun P&amp;L, perbandingan Actual vs Budget vs Last Year, proyeksi, dan tindakan manajemen.</p></div>
          <div className="min-w-[190px] rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur"><p className="text-xs text-blue-100">Status final validation</p><p className="mt-1 font-bold">{orchestrator==="passed"?"Lolos & tersimpan":orchestrator==="checking"?"Memvalidasi…":orchestrator==="failed"?"Perlu diperiksa":"Belum divalidasi"}</p><p className="mt-1 text-[11px] text-blue-100">{authStatus==="checking"?"Memeriksa sesi login":authStatus==="authenticated"?"Akun terhubung":"Login diperlukan untuk menyimpan"}</p></div>
        </div>
      </header>

      <section className="mb-6 rounded-2xl border border-white bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1"><label className="mb-1.5 block text-sm font-bold text-slate-700">Laporan tersimpan di akun</label><select className={inputClass} value={selectedReport} onChange={e=>{const id=e.target.value;setSelectedReport(id);const report=reports.find(r=>r.id===id);if(report)openSaved(report);}} disabled={authStatus!=="authenticated"||loadingReports||reports.length===0}><option value="">{authStatus==="unauthenticated"?"Login untuk melihat laporan":loadingReports?"Memuat laporan…":reports.length?"Pilih laporan tersimpan":"Belum ada laporan tersimpan"}</option>{reports.map(r=><option key={r.id} value={r.id}>{r.hotel_name} — {r.period_label} ({new Date(r.created_at).toLocaleDateString("id-ID")})</option>)}</select></div>
          {selectedSaved&&<button type="button" onClick={()=>void deleteSaved(selectedSaved)} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 hover:bg-rose-100">Hapus laporan terpilih</button>}
          {authStatus==="unauthenticated"&&<a href="/login?next=/hotel-budget" className="rounded-xl bg-sky-700 px-4 py-3 text-center text-sm font-bold text-white hover:bg-sky-800">Login untuk menyimpan</a>}
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">Laporan final tersimpan di Supabase dan terikat pada akun Anda. Data laporan akun lain tidak dapat dibuka melalui menu ini. Data yang belum disimpan hanya berada di form aktif.</p>
      </section>

      <nav className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {tabItems.map((tab,i)=><button key={tab.id} type="button" onClick={()=>setActiveTab(tab.id)} aria-current={activeTab===tab.id?"page":undefined} className={"min-w-0 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-lg "+(activeTab===tab.id?"border-sky-300 bg-white shadow-md ring-2 ring-sky-100":"border-white bg-white/70 shadow-sm")}><span className={"mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-black text-white "+tab.color}>{String(i+1).padStart(2,"0")}</span><span className="block text-xs font-bold leading-4 text-slate-800 sm:text-sm">{tab.label}</span><span className="mt-1 block text-[11px] text-slate-500">{tab.sub}</span></button>)}
      </nav>

      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="min-w-0 rounded-[26px] border border-white bg-white/95 p-4 shadow-lg shadow-slate-200/50 sm:p-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-sky-700">Bagian {tabItems.findIndex(x=>x.id===activeTab)+1} dari 6</p><h2 className="mt-1 text-xl font-extrabold sm:text-2xl">{sectionLabel}</h2><p className="mt-1 text-sm text-slate-500">Gunakan data sumber yang sama periodenya. Nilai kosong tidak otomatis diubah menjadi nol.</p></div><span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">IDR · Rupiah</span></div>

          {activeTab==="statistics"&&<div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {field("Nama hotel",form.hotelName,v=>updateMeta("hotelName",v),{placeholder:"Contoh: Hotel Marza 88"})}
              {field("Periode laporan",form.period,v=>updateMeta("period",v),{placeholder:"Contoh: Januari 2027 / FY 2027"})}
              {field("Tahun awal forecast",form.yearStart,v=>updateMeta("yearStart",v),{type:"number",min:"1900",step:"1"})}
              {statField("days","No. of Days","Jumlah hari dalam periode laporan.")}
              {statField("rooms","No. of Room Build","Jumlah kamar fisik yang menjadi dasar kapasitas.")}
              {statField("outInventory","Out of Inventory (room nights)","Room nights tidak masuk inventori operasional.")}
              {statField("houseUse","House Use (room nights)","Room nights untuk penggunaan internal.")}
              {statField("outOfOrder","Out of Order (room nights)","Room nights kamar tidak dapat dijual.")}
              {statField("complimentary","Complimentary Room Nights","Room nights gratis; termasuk occupancy tetapi tidak masuk denominator ADR paid rooms.")}
              {statField("roomPaid","Room Paid / Sold Nights","Room nights berbayar, bukan jumlah tamu.")}
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-sky-50 via-indigo-50 to-violet-50 p-4 sm:p-5"><h3 className="font-extrabold text-slate-900">Statistik terhitung otomatis</h3><p className="mt-1 text-xs leading-5 text-slate-500">Room Available = Total Room Build − Out of Inventory − House Use − Out of Order. Pastikan basis room nights konsisten.</p><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">{roomStats.map(([label,value])=>metric(label,label==="Occupancy"?(value===null?"—":fmt(value)+"%"):label==="ADR / ARR"||label==="RevPAR"?idr(value):fmt(value,0)))}</div></div>
            <div className="rounded-2xl border border-sky-100 bg-white p-4"><h3 className="font-bold">Checklist statistik sebelum finalisasi</h3><ul className="mt-2 grid gap-2 text-sm leading-5 text-slate-600 sm:grid-cols-2"><li>• Gunakan hari operasional sesuai periode.</li><li>• Room nights tidak boleh melebihi Room Available.</li><li>• Isi angka 0 secara eksplisit jika telah dipastikan tidak ada nilai.</li><li>• Cocokkan Room Revenue dengan laporan sumber.</li></ul></div>
          </div>}

          {activeTab==="pnl"&&<div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metric("Total Revenue — Actual",idr(values.revenue),"Subtotal akun revenue yang terisi")}{metric("Operating Cost — Actual",idr(values.costs),"Subtotal akun biaya operasional yang terisi")}{metric("GOP — estimasi",idr(values.gop),"Revenue dikurangi cost of sales, payroll, departmental dan overhead")}{metric("GOP Margin",values.gopMargin===null?"—":fmt(values.gopMargin)+"%","Hanya dihitung jika revenue positif")}</div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">Setiap baris akun memiliki kolom Actual, Budget, dan Last Year Same Period. Total merupakan subtotal baris yang diisi; baris kosong bukan otomatis nol. Gunakan search untuk menemukan kode akun.</div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="block min-w-0 sm:max-w-md"><span className="mb-1 block text-xs font-bold text-slate-600">Cari kode akun / nama / bagian</span><input className={inputClass} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Contoh: 41101, payroll, utilities..." /></label><span className="text-xs text-slate-500">{filteredLines.length} baris akun ditemukan</span></div>
            <div className="space-y-5">
              {ACCOUNT_SECTIONS.map(section=>{const lines=filteredLines.filter(line=>line.section===section);if(!lines.length)return null;return <div key={section} className="overflow-hidden rounded-2xl border border-slate-200"><div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3 text-sm font-extrabold text-white">{section}<span className="ml-2 text-xs font-medium text-slate-300">({lines.length} akun)</span></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] border-collapse text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-3 text-left">Kode</th><th className="px-3 py-3 text-left">Nama akun</th><th className="px-3 py-3 text-right">Actual (Rp)</th><th className="px-3 py-3 text-right">Budget (Rp)</th><th className="px-3 py-3 text-right">Last Year (Rp)</th><th className="px-3 py-3 text-right">Var. A−B</th></tr></thead><tbody>{lines.map((line,i)=>{const row=form.accounts[line.code]||{actual:"",budget:"",lastYear:""};const actual=optional(row.actual),budget=optional(row.budget),variance=actual!==null&&budget!==null?actual-budget:null;return <tr key={line.code} className={i%2?"bg-slate-50/70":"bg-white"}><td className="whitespace-nowrap border-t border-slate-100 px-3 py-2 font-mono text-[11px] text-slate-500">{line.code}</td><td className="max-w-[260px] border-t border-slate-100 px-3 py-2 font-semibold text-slate-700">{line.label}</td><td className="border-t border-slate-100 px-2 py-2">{numberInput(row.actual,v=>updateAccount(line.code,"actual",v))}</td><td className="border-t border-slate-100 px-2 py-2">{numberInput(row.budget,v=>updateAccount(line.code,"budget",v))}</td><td className="border-t border-slate-100 px-2 py-2">{numberInput(row.lastYear,v=>updateAccount(line.code,"lastYear",v))}</td><td className={"border-t border-slate-100 px-3 py-2 text-right font-bold tabular-nums "+(variance!==null&&variance<0?"text-rose-600":variance!==null?"text-emerald-700":"text-slate-300")}>{variance===null?"—":fmt(variance,0)}</td></tr>;})}</tbody></table></div></div>;})}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">{metric("Other Income",idr(values.otherIncome),"")}{metric("Other Expenses & Below GOP",idr(values.otherExpenses),"Subtotal akun terisi")}{metric("Owner Share Profit — sebelum pajak",idr(values.ownerShareProfitBeforeTax),"GOP + other income − biaya setelah GOP sebelum pajak")}{metric("Net Owner Profit — estimasi",idr(values.netProfit),"Owner Share Profit dikurangi income tax")}{metric("Owner Cash After CapEx — estimasi",idr(values.ownerCashAfterCapex),"Net Owner Profit dikurangi pembayaran owner cash yang diisi")}</div>
            <label className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm leading-5 text-sky-950"><input type="checkbox" className="mt-1 h-4 w-4 accent-sky-700" checked={form.confirmAccountReview} onChange={e=>setForm(prev=>({...prev,confirmAccountReview:e.target.checked}))}/><span><strong>Saya telah meninjau seluruh akun yang relevan.</strong> Baris kosong telah diperiksa dan memang tidak berlaku atau tidak memiliki nilai untuk periode ini. Saya memahami baris kosong tidak otomatis dianggap nol.</span></label>
          </div>}

          {activeTab==="forecast"&&<div className="space-y-7">
            <div className="rounded-2xl bg-teal-50 p-4 text-sm leading-6 text-teal-950">Forecast menggunakan asumsi yang Anda masukkan. Room Revenue dihitung dari hari × jumlah kamar × occupancy × ADR. Kolom F&amp;B, other revenue, dan operating costs diisi terpisah. Angka hasil perhitungan tetap perlu dibandingkan dengan asumsi sumber.</div>
            <div><h3 className="mb-3 text-lg font-extrabold">Monthly Forecast — 12 bulan</h3><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[980px] border-collapse text-xs"><thead className="bg-teal-800 text-white"><tr>{["Bulan","Days","Occupancy %","ADR / ARR (Rp)","F&B Revenue (Rp)","Other Revenue (Rp)","Operating Costs (Rp)","Room Revenue kalkulasi","Total Revenue","GOP / Contribution"].map(x=><th key={x} className="px-3 py-3 text-right first:text-left">{x}</th>)}</tr></thead><tbody>{form.forecast.monthly.map((row,i)=>{const c=calcMonthly(row,Number(form.yearStart),i,form.statistics.rooms);return <tr key={row.label} className={i%2?"bg-slate-50":"bg-white"}><td className="whitespace-nowrap border-t px-3 py-2 font-bold">{row.label}</td><td className="border-t px-2 py-2 text-right tabular-nums">{c.days}</td><td className="border-t px-2 py-2">{numberInput(row.occupancy,v=>updateMonth(i,"occupancy",v))}</td><td className="border-t px-2 py-2">{numberInput(row.adr,v=>updateMonth(i,"adr",v))}</td><td className="border-t px-2 py-2">{numberInput(row.fbRevenue,v=>updateMonth(i,"fbRevenue",v))}</td><td className="border-t px-2 py-2">{numberInput(row.otherRevenue,v=>updateMonth(i,"otherRevenue",v))}</td><td className="border-t px-2 py-2">{numberInput(row.operatingCosts,v=>updateMonth(i,"operatingCosts",v))}</td><td className="border-t px-3 py-2 text-right font-semibold tabular-nums">{idr(c.roomRevenue)}</td><td className="border-t px-3 py-2 text-right font-semibold tabular-nums">{idr(c.revenue)}</td><td className="border-t px-3 py-2 text-right font-semibold tabular-nums">{idr(c.gop)}</td></tr>;})}</tbody></table></div></div>
            <div><h3 className="mb-3 text-lg font-extrabold">Annual Forecast — 10 tahun</h3><div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[1000px] border-collapse text-xs"><thead className="bg-indigo-800 text-white"><tr>{["Tahun","Days","Rooms","Occupancy %","ADR / ARR (Rp)","F&B Revenue (Rp)","Other Revenue (Rp)","Operating Costs (Rp)","Room Revenue kalkulasi","Total Revenue","GOP / Contribution"].map(x=><th key={x} className="px-3 py-3 text-right first:text-left">{x}</th>)}</tr></thead><tbody>{form.forecast.annual.map((row,i)=>{const c=calcAnnual(row);return <tr key={row.label} className={i%2?"bg-slate-50":"bg-white"}><td className="border-t px-3 py-2 font-bold">{row.label}</td><td className="border-t px-2 py-2">{numberInput(row.days,v=>updateYear(i,"days",v))}</td><td className="border-t px-2 py-2">{numberInput(row.rooms,v=>updateYear(i,"rooms",v))}</td><td className="border-t px-2 py-2">{numberInput(row.occupancy,v=>updateYear(i,"occupancy",v))}</td><td className="border-t px-2 py-2">{numberInput(row.adr,v=>updateYear(i,"adr",v))}</td><td className="border-t px-2 py-2">{numberInput(row.fbRevenue,v=>updateYear(i,"fbRevenue",v))}</td><td className="border-t px-2 py-2">{numberInput(row.otherRevenue,v=>updateYear(i,"otherRevenue",v))}</td><td className="border-t px-2 py-2">{numberInput(row.operatingCosts,v=>updateYear(i,"operatingCosts",v))}</td><td className="border-t px-3 py-2 text-right font-semibold tabular-nums">{idr(c.roomRevenue)}</td><td className="border-t px-3 py-2 text-right font-semibold tabular-nums">{idr(c.revenue)}</td><td className="border-t px-3 py-2 text-right font-semibold tabular-nums">{idr(c.gop)}</td></tr>;})}</tbody></table></div></div>
          </div>}

          {activeTab==="variance"&&<div className="space-y-5">
            <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">Variance dihitung hanya jika Actual dan Budget sama-sama diisi. Untuk revenue, nilai positif biasanya berarti di atas budget. Untuk biaya, nilai positif berarti biaya di atas budget dan perlu ditinjau. Perbandingan wajib menggunakan periode yang sama.</div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metric("Revenue Actual",idr(revenueActual))}{metric("Revenue Budget",idr(revenueBudget))}{metric("Revenue Variance",revenueActual===null||revenueBudget===null?"Belum lengkap":idr(revenueActual-revenueBudget))}{metric("Revenue Last Year",idr(revenueLastYear))}{metric("Cost Actual",idr(costActual))}{metric("Cost Budget",idr(costBudget))}{metric("Cost Variance",costActual===null||costBudget===null?"Belum lengkap":idr(costActual-costBudget))}{metric("Cost Last Year",idr(costLastYear))}{metric("GOP Margin",values.gopMargin===null?"—":fmt(values.gopMargin)+"%")}</div>
            <div className="overflow-x-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[750px] border-collapse text-sm"><thead className="bg-amber-100 text-amber-950"><tr>{["Kelompok akun","Actual","Budget","Variance A−B","Last Year","Variance A−LY"].map(x=><th key={x} className="px-3 py-3 text-right first:text-left">{x}</th>)}</tr></thead><tbody>{GROUP_ORDER.map((group,i)=>{const a=sumGroup(form.accounts,group,"actual"),b=sumGroup(form.accounts,group,"budget"),l=sumGroup(form.accounts,group,"lastYear");return <tr key={group} className={i%2?"bg-slate-50":"bg-white"}><td className="border-t px-3 py-3 font-semibold">{GROUP_LABELS[group]}</td><td className="border-t px-3 py-3 text-right tabular-nums">{idr(a)}</td><td className="border-t px-3 py-3 text-right tabular-nums">{idr(b)}</td><td className="border-t px-3 py-3 text-right font-bold tabular-nums">{a!==null&&b!==null?idr(a-b):"Belum lengkap"}</td><td className="border-t px-3 py-3 text-right tabular-nums">{idr(l)}</td><td className="border-t px-3 py-3 text-right font-bold tabular-nums">{a!==null&&l!==null?idr(a-l):"Belum lengkap"}</td></tr>;})}</tbody></table></div>
          </div>}

          {activeTab==="action-plan"&&<div className="space-y-5">
            <div className="rounded-2xl bg-pink-50 p-4 text-sm leading-6 text-pink-950">Catat tindakan yang didasarkan pada temuan data. Sistem tidak mengarang target atau mengubah hasil keuangan. Pastikan PIC, deadline, dan ukuran keberhasilan jelas.</div>
            <div className="grid gap-4 sm:grid-cols-2">{field("Temuan / tindakan manajemen",form.notes,v=>updateMeta("notes",v),{placeholder:"Temuan, penyebab, tindakan yang disepakati"})}{field("PIC / penanggung jawab",form.actionOwner,v=>updateMeta("actionOwner",v),{placeholder:"Nama atau jabatan"})}{field("Deadline",form.actionDue,v=>updateMeta("actionDue",v),{type:"date"})}{field("Target hasil",form.actionTarget,v=>updateMeta("actionTarget",v),{placeholder:"Target yang disetujui dan dapat diukur"})}</div>
            <div className="rounded-2xl border border-pink-100 bg-white p-4"><h3 className="font-extrabold">Template tindak lanjut</h3><div className="mt-3 grid gap-3 sm:grid-cols-3">{metric("PIC",form.actionOwner||"Belum diisi")}{metric("Deadline",form.actionDue||"Belum diisi")}{metric("Target",form.actionTarget||"Belum diisi")}</div></div>
          </div>}

          {activeTab==="export"&&<div className="space-y-5">
            <div className="rounded-2xl bg-indigo-50 p-5"><h3 className="font-extrabold text-indigo-950">Preview, print PDF, dan Excel</h3><p className="mt-2 text-sm leading-6 text-indigo-900">Preview menampilkan identitas laporan, statistik, ringkasan P&amp;L, dan daftar akun. PDF dibuat dari dialog print browser; pilih “Save as PDF”. File Excel berisi empat sheet terpisah: Summary, Account P&amp;L, Monthly Forecast, dan 10-Year Forecast.</p></div>
            <div className="grid gap-3 sm:grid-cols-3"><button type="button" onClick={()=>setPreviewOpen(true)} className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-sky-700">Preview laporan</button><button type="button" onClick={downloadExcel} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow hover:bg-emerald-700">Download Excel (.xlsx)</button><button type="button" onClick={()=>setPreviewOpen(true)} className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white shadow hover:bg-slate-900">Preview &amp; Print PDF</button></div>
            <div className="rounded-2xl border border-indigo-100 bg-white p-4"><h3 className="font-bold">Ringkasan untuk export</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metric("Hotel",form.hotelName||"Belum diisi")}{metric("Periode",form.period||"Belum diisi")}{metric("Total Revenue",idr(values.revenue))}{metric("GOP",idr(values.gop))}{metric("GOP Margin",values.gopMargin===null?"—":fmt(values.gopMargin)+"%")}{metric("Net Profit — estimasi",idr(values.netProfit))}</div></div>
          </div>}

          <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <button type="button" onClick={()=>setPreviewOpen(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Preview sebelum simpan</button>
            <button type="button" disabled={saving||authStatus==="checking"} onClick={()=>void saveFinal()} className="rounded-xl bg-gradient-to-r from-blue-700 to-violet-700 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{saving?"Validasi & simpan berjalan…":"Validasi Final AI & Simpan"}</button>
            <button type="button" onClick={downloadExcel} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 hover:bg-emerald-100">Download Excel (.xlsx)</button>
          </div>
          {message&&<div className={"mt-4 rounded-xl border p-4 text-sm leading-6 "+(orchestrator==="passed"?"border-emerald-200 bg-emerald-50 text-emerald-900":orchestrator==="failed"?"border-rose-200 bg-rose-50 text-rose-900":"border-sky-200 bg-sky-50 text-sky-900")}>{message}{summary&&<p className="mt-2 font-semibold">{summary}</p>}</div>}
          {(issues.length>0||warnings.length>0)&&<div className="mt-3 space-y-3">{issues.length>0&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="font-bold text-rose-900">Temuan validasi — wajib ditangani</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-rose-800">{issues.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}{warnings.length>0&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="font-bold text-amber-900">Peringatan data</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">{warnings.map((item,i)=><li key={i}>{item}</li>)}</ul></div>}</div>}
        </section>

        <aside className="space-y-4">
          <div className="rounded-[24px] bg-white p-5 shadow-md ring-1 ring-slate-100"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Live summary</p><p className="mt-2 break-words text-sm text-slate-500">{form.hotelName||"Nama hotel belum diisi"}</p><div className="mt-4 space-y-3">{[["Total Revenue",idr(values.revenue)],["Operating Cost",idr(values.costs)],["GOP — estimasi",idr(values.gop)],["GOP Margin",values.gopMargin===null?"—":fmt(values.gopMargin)+"%"],["Occupancy",values.occupancy===null?"—":fmt(values.occupancy)+"%"]].map(([label,value])=><div key={label} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><span className="text-xs text-slate-500">{label}</span><span className="max-w-[60%] break-words text-right text-sm font-extrabold tabular-nums">{value}</span></div>)}</div></div>
          <div className="rounded-[24px] bg-gradient-to-br from-slate-900 to-blue-950 p-5 text-white"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">✓</span><h3 className="font-extrabold">CORESTAY BUDGET ORCHESTRATOR</h3></div><p className="mt-3 text-sm leading-6 text-blue-100">Validasi matematis di server, pemeriksaan kapasitas kamar, rekonsiliasi akun, pemeriksaan forecast, lalu AI review. Penyimpanan hanya dilakukan setelah semua pemeriksaan wajib lolos.</p><p className="mt-3 text-xs text-blue-200">AI adalah lapisan review tambahan; angka final tetap harus dicocokkan dengan sumber akuntansi.</p></div>
          <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-5"><p className="font-bold text-sky-950">Data &amp; privasi</p><p className="mt-2 text-sm leading-6 text-sky-900">Laporan final disimpan di Supabase dengan Row Level Security. Pengguna hanya dapat membaca dan menghapus laporan milik akunnya sendiri. Form yang belum disimpan tidak dikirim ke database.</p><p className="mt-3 text-xs leading-5 text-sky-800">Penyimpanan memerlukan sesi login valid dan tabel database telah diaktifkan melalui migrasi.</p></div>
        </aside>
      </div>
    </div>

    {previewOpen&&<div className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 pt-6 sm:p-8" role="dialog" aria-modal="true" aria-label="Preview laporan"><article className="print-report my-auto w-full max-w-5xl rounded-2xl bg-white p-5 shadow-2xl sm:p-8">
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-slate-200 pb-4"><div><p className="text-xs font-bold uppercase tracking-widest text-sky-700">CORESTAY ADVISORY</p><h2 className="mt-1 text-xl font-black sm:text-2xl">Hotel Budget &amp; P&amp;L</h2><p className="mt-1 text-sm text-slate-500">{form.hotelName||"Nama hotel belum diisi"} · {form.period||"Periode belum diisi"}</p></div><button type="button" onClick={()=>setPreviewOpen(false)} className="rounded-full bg-slate-100 px-3 py-2 font-bold text-slate-600 print:hidden" aria-label="Tutup preview">✕</button></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{metric("Total Revenue",idr(values.revenue))}{metric("Operating Cost",idr(values.costs))}{metric("GOP — estimasi",idr(values.gop))}{metric("GOP Margin",values.gopMargin===null?"—":fmt(values.gopMargin)+"%")}</div>
      <h3 className="mt-6 mb-2 text-sm font-extrabold">1. Hotel Statistics</h3><div className="overflow-x-auto"><table className="w-full border-collapse text-xs"><tbody>{[["Hotel",form.hotelName],["Periode",form.period],["No. of Days",form.statistics.days],["No. of Room Build",form.statistics.rooms],["Total Room Build",fmt(values.totalRoomBuild,0)],["Out of Inventory",form.statistics.outInventory],["House Use",form.statistics.houseUse],["Out of Order",form.statistics.outOfOrder],["Room Available / Saleable",fmt(values.roomAvailable,0)],["Complimentary Room Nights",form.statistics.complimentary],["Paid Room Nights",form.statistics.roomPaid],["Occupancy",values.occupancy===null?"Tidak dapat dihitung":fmt(values.occupancy)+"%"],["ADR / ARR",idr(values.adr)],["RevPAR",idr(values.revpar)]].map(([label,value],i)=><tr key={label} className={i%2?"bg-slate-50":""}><th className="w-[44%] border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-600">{label}</th><td className="break-words border-b border-slate-200 px-3 py-2 text-right font-medium tabular-nums">{value||"—"}</td></tr>)}</tbody></table></div>
      <h3 className="mt-6 mb-2 text-sm font-extrabold">2. P&amp;L Summary</h3><div className="overflow-x-auto"><table className="w-full border-collapse text-xs"><thead><tr className="bg-slate-800 text-white"><th className="px-3 py-2 text-left">Account Group</th><th className="px-3 py-2 text-right">Actual</th><th className="px-3 py-2 text-right">Budget</th><th className="px-3 py-2 text-right">Variance</th><th className="px-3 py-2 text-right">Last Year</th></tr></thead><tbody>{GROUP_ORDER.map((group,i)=>{const a=sumGroup(form.accounts,group,"actual"),b=sumGroup(form.accounts,group,"budget"),l=sumGroup(form.accounts,group,"lastYear");return <tr key={group} className={i%2?"bg-slate-50":""}><td className="border-b border-slate-200 px-3 py-2 font-semibold">{GROUP_LABELS[group]}</td><td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums">{idr(a)}</td><td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums">{idr(b)}</td><td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums">{a!==null&&b!==null?idr(a-b):"—"}</td><td className="border-b border-slate-200 px-3 py-2 text-right tabular-nums">{idr(l)}</td></tr>;})}</tbody></table></div>
      <h3 className="mt-6 mb-2 text-sm font-extrabold">3. Detailed Account Lines</h3><div className="overflow-x-auto"><table className="w-full border-collapse text-[10px]"><thead><tr className="bg-slate-800 text-white"><th className="px-2 py-2 text-left">Code</th><th className="px-2 py-2 text-left">Account</th><th className="px-2 py-2 text-right">Actual</th><th className="px-2 py-2 text-right">Budget</th><th className="px-2 py-2 text-right">Var. A−B</th><th className="px-2 py-2 text-right">Last Year</th></tr></thead><tbody>{ACCOUNT_LINES.map((line,i)=>{const row=form.accounts[line.code];const a=optional(row?.actual),b=optional(row?.budget),l=optional(row?.lastYear);return <tr key={line.code} className={i%2?"bg-slate-50":""}><td className="border-b border-slate-100 px-2 py-1.5 font-mono">{line.code}</td><td className="border-b border-slate-100 px-2 py-1.5">{line.label}</td><td className="border-b border-slate-100 px-2 py-1.5 text-right tabular-nums">{a===null?"—":fmt(a,0)}</td><td className="border-b border-slate-100 px-2 py-1.5 text-right tabular-nums">{b===null?"—":fmt(b,0)}</td><td className="border-b border-slate-100 px-2 py-1.5 text-right tabular-nums">{a!==null&&b!==null?fmt(a-b,0):"—"}</td><td className="border-b border-slate-100 px-2 py-1.5 text-right tabular-nums">{l===null?"—":fmt(l,0)}</td></tr>;})}</tbody></table></div>
      <h3 className="mt-6 mb-2 text-sm font-extrabold">4. Monthly Forecast</h3><div className="overflow-x-auto"><table className="w-full border-collapse text-[10px]"><thead><tr className="bg-teal-800 text-white"><th className="px-2 py-2 text-left">Bulan</th><th className="px-2 py-2 text-right">Occupancy</th><th className="px-2 py-2 text-right">ADR</th><th className="px-2 py-2 text-right">Room Revenue</th><th className="px-2 py-2 text-right">Total Revenue</th><th className="px-2 py-2 text-right">Operating Cost</th><th className="px-2 py-2 text-right">GOP</th></tr></thead><tbody>{form.forecast.monthly.map((row,i)=>{const c=calcMonthly(row,Number(form.yearStart),i,form.statistics.rooms);return <tr key={row.label} className={i%2?"bg-slate-50":""}><td className="border-b px-2 py-1.5">{row.label}</td><td className="border-b px-2 py-1.5 text-right">{row.occupancy?row.occupancy+"%":"—"}</td><td className="border-b px-2 py-1.5 text-right">{idr(optional(row.adr))}</td><td className="border-b px-2 py-1.5 text-right">{idr(c.roomRevenue)}</td><td className="border-b px-2 py-1.5 text-right">{idr(c.revenue)}</td><td className="border-b px-2 py-1.5 text-right">{idr(c.costs)}</td><td className="border-b px-2 py-1.5 text-right">{idr(c.gop)}</td></tr>;})}</tbody></table></div>
      <h3 className="mt-6 mb-2 text-sm font-extrabold">5. 10-Year Forecast</h3><div className="overflow-x-auto"><table className="w-full border-collapse text-[10px]"><thead><tr className="bg-indigo-800 text-white"><th className="px-2 py-2 text-left">Year</th><th className="px-2 py-2 text-right">Occupancy</th><th className="px-2 py-2 text-right">ADR</th><th className="px-2 py-2 text-right">Room Revenue</th><th className="px-2 py-2 text-right">Total Revenue</th><th className="px-2 py-2 text-right">Operating Cost</th><th className="px-2 py-2 text-right">GOP</th></tr></thead><tbody>{form.forecast.annual.map((row,i)=>{const c=calcAnnual(row);return <tr key={row.label} className={i%2?"bg-slate-50":""}><td className="border-b px-2 py-1.5">{row.label}</td><td className="border-b px-2 py-1.5 text-right">{row.occupancy?row.occupancy+"%":"—"}</td><td className="border-b px-2 py-1.5 text-right">{idr(optional(row.adr))}</td><td className="border-b px-2 py-1.5 text-right">{idr(c.roomRevenue)}</td><td className="border-b px-2 py-1.5 text-right">{idr(c.revenue)}</td><td className="border-b px-2 py-1.5 text-right">{idr(c.costs)}</td><td className="border-b px-2 py-1.5 text-right">{idr(c.gop)}</td></tr>;})}</tbody></table></div>
      <h3 className="mt-6 mb-2 text-sm font-extrabold">6. Management Action Plan</h3><div className="overflow-x-auto"><table className="w-full border-collapse text-xs"><tbody>{[["Temuan / Tindakan",form.notes],["PIC",form.actionOwner],["Deadline",form.actionDue],["Target",form.actionTarget]].map(([l,v],i)=><tr key={l} className={i%2?"bg-slate-50":""}><th className="w-[35%] border-b px-3 py-2 text-left">{l}</th><td className="whitespace-pre-wrap break-words border-b px-3 py-2">{v||"—"}</td></tr>)}</tbody></table></div>
      {orchestrator==="passed"&&<p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 print:border-slate-300 print:bg-white">CORESTAY HOTEL BUDGET ORCHESTRATOR — final validation passed · {summary||"Pemeriksaan matematis dan AI selesai."}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3 print:hidden"><button type="button" onClick={()=>setPreviewOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold">Kembali ke form</button><button type="button" onClick={downloadExcel} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">Download Excel (.xlsx)</button><button type="button" onClick={()=>window.print()} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Print / Save PDF</button></div>
    </article></div>}

    <style jsx global>{`
      @media print {
        @page { size: A4 landscape; margin: 10mm; }
        body { background: #fff !important; color: #111827 !important; font-size: 9pt !important; }
        body * { visibility: hidden !important; }
        .print-report, .print-report * { visibility: visible !important; }
        .print-report { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; box-shadow: none !important; overflow: visible !important; }
        .print-report button { display: none !important; }
        table { width: 100% !important; table-layout: fixed !important; border-collapse: collapse !important; }
        th, td { overflow-wrap: anywhere !important; word-break: normal !important; padding: 4px 5px !important; }
        tr { break-inside: avoid !important; }
        * { box-shadow: none !important; }
      }
    `}</style>
  </main>;
}
