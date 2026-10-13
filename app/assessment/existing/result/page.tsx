"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Area={key:string;category:string;title:string;score:number;level:string;diagnosis:string;recommendation:string};
type Result={hotelName:string;city:string;hotelType:string;overall:number;status:string;risk:string;business:number;revenue:number;operations:number;people:number;profitability:number;weights:Record<string,number>;areaResults:Area[];diagnosis:string;recommendation:string;assessmentVersion?:string;methodology?:string;dataRule?:string;orchestrator?:any};
const areas=[
 {key:"business",title:"Business & Commercial Performance"},
 {key:"revenue",title:"Revenue & Financial Performance"},
 {key:"operations",title:"Operations & Guest Experience"},
 {key:"people",title:"People & Organization"},
 {key:"profitability",title:"Profitability & Cost Efficiency"},
] as const;

function style(score:number){if(score>=90)return{label:"EXCELLENT",tone:"text-green-400",bar:"#22c55e"};if(score>=80)return{label:"STRONG",tone:"text-green-400",bar:"#4ade80"};if(score>=70)return{label:"STABLE",tone:"text-yellow-400",bar:"#eab308"};if(score>=60)return{label:"NEEDS IMPROVEMENT",tone:"text-orange-400",bar:"#f97316"};if(score>=50)return{label:"AT RISK",tone:"text-orange-400",bar:"#fb923c"};return{label:"CRITICAL",tone:"text-red-400",bar:"#ef4444"}}


function readinessStyle(score:number){if(score>=80)return{label:"READY",tone:"text-green-400",bar:"#22c55e"};if(score>=60)return{label:"NEED IMPROVEMENT",tone:"text-yellow-400",bar:"#eab308"};if(score>=40)return{label:"HIGH RISK",tone:"text-orange-400",bar:"#f97316"};return{label:"CRITICAL",tone:"text-red-400",bar:"#ef4444"}}

export default function ExistingResultPage(){
 const [result,setResult]=useState<Result|null>(null);
 const [isLoading,setIsLoading]=useState(true);
 useEffect(()=>{
  const raw=sessionStorage.getItem("corestay_assessment");
  if(!raw){setIsLoading(false);return;}
  try{
   const parsed=JSON.parse(raw) as Result;
   setResult(parsed);
   void save(parsed);
  }catch{
   setResult(null);
  }finally{
   setIsLoading(false);
  }
 },[]);
 async function save(parsed:Result){
  try{
   const key="corestay_existing_report_saved";
   if(sessionStorage.getItem(key)==="1")return;
   const {data:auth}=await supabase.auth.getSession();
   if(!auth.session?.user)return;
   const {error}=await supabase.from("assessment_reports").insert({user_id:auth.session.user.id,assessment_type:"existing",file_name:parsed.hotelName?`Assessment — Hotel Existing — ${parsed.hotelName}`:"Assessment — Hotel Existing",score:Number(parsed.overall)||0,report_json:parsed,pdf_base64:""});
   if(!error)sessionStorage.setItem(key,"1");
   else console.warn("Gagal menyimpan hasil assessment ke riwayat:",error.message);
  }catch(error){
   console.warn("Gagal menyimpan hasil assessment ke riwayat:",error);
  }
 }
 if(isLoading)return <main className="min-h-screen bg-white px-6 py-20 text-center text-[#17243d]"><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={55} className="mx-auto h-[46px] w-[151px] object-contain"/><p className="mt-10 text-slate-400">Memuat hasil assessment...</p></main>;
 if(!result)return <main className="min-h-screen bg-white px-6 py-20 text-center text-[#17243d]"><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={55} className="mx-auto h-[46px] w-[151px] object-contain"/><h1 className="mt-10 text-3xl font-bold">Assessment data not found.</h1><p className="mt-4 text-slate-400">Silakan ulangi assessment Hotel Existing.</p></main>;
 const overall=Math.max(0,Math.min(100,Number(result.overall)||0));const overallStyle=style(overall);
 const resultAreas=result.areaResults?.length?result.areaResults:areas.map(a=>({key:a.key,category:a.key,title:a.title,score:Number(result[a.key as keyof Result])||0,level:style(Number(result[a.key as keyof Result])||0).label,diagnosis:"Data assessment perlu ditinjau bersama evidence hotel.",recommendation:"Validasi data, root cause, PIC, KPI dan action plan."}));
 const priorities=[...resultAreas].sort((a,b)=>a.score-b.score).slice(0,3);
 const date=new Intl.DateTimeFormat("id-ID",{dateStyle:"long"}).format(new Date());
 const print=()=>window.print();
 const impact=(s:number)=>s<60?"Immediate / 0–30 Days":s<70?"30 Days":s<80?"60 Days":"90 Days+";
 return <main className="min-h-screen bg-slate-950 text-white print:bg-white print:text-black">
  <div className="mx-auto max-w-6xl px-6 py-10 print:max-w-none print:px-8">
   <header className="border-b border-white/10 pb-8 print:border-black/20"><div className="flex items-start justify-between gap-6"><div><Image src="/logo-corestay.png" alt="CoreStay Advisory" width={180} height={55} className="h-[46px] w-[151px] object-contain"/><p className="mt-7 text-sm font-semibold uppercase tracking-wider text-cyan-400 print:text-black">Hospitality Business Auditor • Existing Hotel</p><h1 className="mt-3 text-4xl font-bold">{result.hotelName||"Hotel Anda"}</h1><p className="mt-3 text-slate-400 print:text-slate-400">{result.city||"Lokasi belum tersedia"} • {date}</p></div><button onClick={print} className="no-print rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950">⬇ Download / Print PDF</button></div></header>
   <section className="mt-8 grid gap-5 md:grid-cols-3"><div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-7"><p className="text-sm text-cyan-300">Overall Hotel Health</p><p className="mt-2 text-6xl font-bold text-cyan-400">{overall}%</p><p className="mt-2 text-sm text-slate-400">Weighted: Business 20% • Revenue 25% • Operations 20% • People 15% • Profitability 20%</p></div><div className="rounded-3xl border border-white/10 bg-slate-900 p-7"><p className="text-sm text-slate-400">Hotel Condition</p><p className={`mt-4 text-2xl font-bold ${overallStyle.tone}`}>{result.status||overallStyle.label}</p><p className="mt-2 text-sm text-slate-400">Risk: {result.risk||"To be validated"}</p></div><div className="rounded-3xl border border-white/10 bg-slate-900 p-7"><p className="text-sm text-slate-400">Audit Principle</p><p className="mt-4 text-sm leading-6 text-slate-300">Evidence → Finding → Gap → Root Cause → Business Impact → Recommendation → Priority → Action Plan</p></div></section>
   <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-7"><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-400">Executive Summary</p><h2 className="mt-2 text-2xl font-bold">Kondisi Hotel</h2><p className="mt-4 leading-8 text-slate-300">{result.diagnosis}</p>{result.orchestrator?.executiveDiagnostic&&<p className="mt-4 leading-8 text-slate-300">{result.orchestrator.executiveDiagnostic}</p>}<p className="mt-4 leading-8 text-slate-400">{result.recommendation}</p><div className="mt-6 rounded-2xl border border-white/10 bg-slate-950 p-5 text-sm text-slate-300">Data Gap rule: skor ini adalah hasil self-assessment. Temuan final wajib divalidasi dengan P&L, PMS, channel production, payroll, inventory, guest reviews, SOP, audit trail dan bukti operasional.</div></section>
   <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
    <div className="border-b border-white/10 p-7">
     <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Readiness Visualization</p>
     <h2 className="mt-2 text-2xl font-bold">Hotel Health Score by Area</h2>
     <p className="mt-2 text-sm text-slate-400">Ringkasan skor lima area strategis Hotel Existing. Semakin tinggi skor, semakin baik kondisi area berdasarkan jawaban assessment.</p>
     <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold">
      <span className="rounded-full bg-green-500/10 px-3 py-2 text-green-400">80–100 Ready</span>
      <span className="rounded-full bg-yellow-500/10 px-3 py-2 text-yellow-400">60–79 Need Improvement</span>
      <span className="rounded-full bg-orange-500/10 px-3 py-2 text-orange-400">40–59 High Risk</span>
      <span className="rounded-full bg-red-500/10 px-3 py-2 text-red-400">0–39 Critical</span>
     </div>
    </div>
    <div className="p-6 md:p-8">
     <div className="relative h-[350px]">
      <div className="absolute inset-x-0 top-3 bottom-20 flex flex-col justify-between pointer-events-none">
       {[100,75,50,25,0].map(v=><div key={v} className="flex items-center gap-3"><span className="w-8 text-right text-[10px] text-slate-500">{v}</span><div className="h-px flex-1 bg-white/10"/></div>)}
      </div>
      <div className="relative flex h-full items-end gap-4 overflow-x-auto px-3 pb-16 pt-6 md:gap-8">
       {resultAreas.map(area=>{const score=Math.min(100,Math.max(0,Number(area.score)||0));const visual=readinessStyle(score);return <div key={area.key} className="group flex h-full min-w-[100px] flex-1 flex-col items-center justify-end">
        <div className={`mb-2 text-xl font-extrabold ${visual.tone}`}>{score}%</div>
        <div className="relative flex h-[210px] w-full max-w-[76px] items-end overflow-hidden rounded-t-2xl bg-slate-800"><div className="w-full rounded-t-2xl transition-all duration-700 group-hover:brightness-125" style={{height:`${score}%`,backgroundColor:visual.bar,boxShadow:`0 0 24px ${visual.bar}44`}}/></div>
        <p className="mt-3 max-w-[110px] text-center text-[11px] font-semibold leading-4 text-white">{area.title}</p>
        <p className={`mt-1 text-center text-[9px] font-bold ${visual.tone}`}>{visual.label}</p>
       </div>})}
      </div>
     </div>
    </div>
   </section>
   <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
    <div className="border-b border-white/10 p-7"><p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">Hotel Existing Readiness Matrix</p><h2 className="mt-2 text-2xl font-bold">Readiness Matrix</h2><p className="mt-2 text-sm text-slate-400">Analisis kesiapan setiap area bisnis hotel berdasarkan skor, prioritas, diagnosis, dan rekomendasi perbaikan.</p></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
     <thead className="bg-slate-950"><tr><th className="px-6 py-4">Area</th><th className="px-6 py-4">Score</th><th className="px-6 py-4">Priority</th><th className="px-6 py-4">Diagnosis</th><th className="px-6 py-4">Rekomendasi</th></tr></thead>
     <tbody>{resultAreas.map(area=>{const score=Math.min(100,Math.max(0,Number(area.score)||0));const visual=readinessStyle(score);return <tr key={`matrix-${area.key}`} className="border-t border-white/10 align-top">
      <td className="px-6 py-5 font-semibold">{area.title}</td><td className="px-6 py-5 font-bold text-cyan-300">{score}</td>
      <td className="px-6 py-5"><span className={`rounded-lg bg-white/5 px-3 py-2 text-xs font-semibold ${visual.tone}`}>{visual.label}</span></td>
      <td className="max-w-xl px-6 py-5 leading-7 text-slate-300">{area.diagnosis||"Area ini perlu ditinjau bersama bukti operasional untuk memastikan gap dan akar masalah."}</td>
      <td className="max-w-xl px-6 py-5 leading-7 text-slate-300">{area.recommendation||"Susun tindakan korektif, PIC, tenggat waktu, KPI, dan bukti verifikasi."}</td>
     </tr>})}</tbody>
    </table></div>
   </section>
   <section className="mt-8 rounded-3xl border border-orange-400/20 bg-orange-400/5 p-7">
    <p className="text-sm font-semibold uppercase tracking-wider text-orange-400">30-Day Priority Action</p><h2 className="mt-2 text-2xl font-bold">5 Prioritas Perbaikan Hotel</h2>
    <div className="mt-5 space-y-3">{priorities.concat(resultAreas.filter(a=>!priorities.some(p=>p.key===a.key)).sort((a,b)=>a.score-b.score).slice(0,2)).map((area,index)=><div key={`action-${area.key}`} className="rounded-xl border border-white/10 bg-slate-950 p-4 text-sm leading-7 text-slate-300"><span className="mr-2 font-bold text-orange-400">{index+1}.</span><b>{area.title}:</b> {area.recommendation||area.diagnosis||"Validasi gap utama dan tetapkan tindakan korektif dalam 30 hari."}</div>)}</div>
   </section>
   <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-slate-900"><div className="border-b border-white/10 p-7"><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-400">Hotel Health Score</p><h2 className="mt-2 text-2xl font-bold">5 Area Utama</h2></div><div className="grid gap-4 p-7 md:grid-cols-2">{resultAreas.map(a=>{const s=style(a.score);return <div key={a.key} className="rounded-2xl border border-white/10 bg-slate-900 p-5"><div className="flex justify-between gap-4"><h3 className="font-bold">{a.title}</h3><span className={`text-2xl font-extrabold ${s.tone}`}>{a.score}%</span></div><div className="mt-4 h-3 rounded-full bg-slate-800"><div className="h-full rounded-full" style={{width:`${a.score}%`,backgroundColor:s.bar}}/></div><p className={`mt-3 text-xs font-bold ${s.tone}`}>{a.level||s.label}</p><p className="mt-3 text-xs text-slate-400">Weight {result.weights?.[a.key]||"-"}%</p></div>})}</div></section>
   <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-7"><p className="text-xs font-bold uppercase tracking-[.2em] text-orange-400">Priority Matrix</p><h2 className="mt-2 text-2xl font-bold">Top 3 Prioritas</h2><div className="mt-5 grid gap-4 md:grid-cols-3">{priorities.map((a,i)=><div key={a.key} className="rounded-2xl border border-white/10 bg-slate-900 p-5"><div className="flex justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800">{i+1}</span><b>{a.score}%</b></div><h3 className="mt-5 font-bold">{a.title}</h3><p className="mt-2 text-xs text-orange-400">Priority: {impact(a.score)}</p></div>)}</div></section>
   <section className="mt-8 grid gap-6 md:grid-cols-2"><div className="rounded-3xl border border-white/10 bg-slate-900 p-7"><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-400">Revenue Opportunities</p><h2 className="mt-2 text-xl font-bold">Revenue Leakage & Growth</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300"><li>• Rooms: ADR, occupancy, RevPAR, discount, complimentary, house use, cancellation/no-show.</li><li>• Distribution: net ADR, OTA commission, channel cost, direct booking and parity.</li><li>• F&B: average check, outlet productivity, banquet, breakfast, upselling and wastage.</li><li>• Ancillary: meeting, spa, laundry, parking, transport, recreation and cross-selling.</li></ul><p className="mt-5 text-xs text-orange-400">Revenue impact: To Be Quantified — data belum tersedia.</p></div><div className="rounded-3xl border border-white/10 bg-slate-900 p-7"><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-400">Cost Saving</p><h2 className="mt-2 text-xl font-bold">Cost Leakage & Efficiency</h2><ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300"><li>• Payroll, overtime, staffing ratio dan productivity.</li><li>• Utilities, maintenance dan recurring breakdown.</li><li>• Food/beverage cost, wastage dan inventory variance.</li><li>• OTA commission, supplies, laundry, linen, amenities dan procurement leakage.</li></ul><p className="mt-5 text-xs text-orange-400">Potential saving: To Be Quantified — jangan mengarang angka.</p></div></section>
   <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-7"><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-400">30–60–90 Day Action Plan</p><h2 className="mt-2 text-2xl font-bold">Turnaround & Performance Roadmap</h2><div className="mt-6 grid gap-4 md:grid-cols-4">{[["0–30 Days","Stabilize","Validasi leakage, cash control, pricing, urgent guest issues, manpower dan critical operational risks."],["31–60 Days","Optimize","Revenue management, sales pipeline, SOP, procurement, F&B, productivity dan variance control."],["61–90 Days","Improve","Profitability, commercial strategy, organization, technology, process redesign dan guest experience."],["3–12 Months","Transform","Repositioning, asset improvement, digital transformation, long-term revenue strategy dan restructuring."]].map(x=><div key={x[0]} className="rounded-2xl border border-white/10 bg-slate-900 p-5"><p className="text-xs font-bold text-cyan-400">{x[0]}</p><h3 className="mt-2 font-bold">{x[1]}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{x[2]}</p></div>)}</div></section>
   <section className="mt-8 rounded-3xl border-2 border-white/10 bg-slate-900 p-7"><p className="text-xs font-bold uppercase tracking-[.2em] text-cyan-400">Owner / Investor Conclusion</p><h2 className="mt-2 text-2xl font-bold">{result.status||overallStyle.label}</h2><div className="mt-6 grid gap-4 md:grid-cols-2"><div><b>Investment / Business Risk</b><p className="mt-2 text-slate-400">{result.risk||"To be validated"}</p></div><div><b>Immediate Priorities</b><p className="mt-2 text-slate-400">{priorities.map(x=>x.title).join(" • ")}</p></div><div><b>Biggest Revenue Opportunity</b><p className="mt-2 text-slate-400">Identifikasi dari rooms, distribution, F&B dan ancillary setelah evidence revenue tersedia.</p></div><div><b>Biggest Cost Leakage</b><p className="mt-2 text-slate-400">Identifikasi dari payroll, utilities, procurement, inventory, commission dan maintenance setelah data tersedia.</p></div><div><b>Biggest Operational Risk</b><p className="mt-2 text-slate-400">Validasi melalui SOP, guest complaints, QA, maintenance dan audit trail.</p></div><div><b>Biggest People Risk</b><p className="mt-2 text-slate-400">Validasi melalui organization, manpower, productivity, turnover, competency dan leadership evidence.</p></div></div></section>
   {result.orchestrator?.validation?.status==="PASSED"&&<section className="mt-8 rounded-3xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6 print:border-black print:bg-white"><p className="text-sm font-bold text-emerald-300 print:text-black">✓ {result.orchestrator.validation.label||"Lolos Validasi Otomatis CoreStay"}</p><p className="mt-2 text-sm leading-6 text-slate-300 print:text-black">Pemeriksaan dua tahap AI Orchestrator selesai. Skor dan bobot tetap mengikuti perhitungan assessment; temuan merupakan diagnosis berbasis jawaban self-assessment dan perlu dikonfirmasi dengan bukti operasional.</p><ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-400 print:text-black">{(result.orchestrator.validation.checks||[]).map((item:string,i:number)=><li key={i}>{item}</li>)}</ul></section>}
   <footer className="mt-12 overflow-hidden rounded-3xl bg-[#172b4d] text-white print:rounded-none print:border-t print:border-slate-300 print:bg-white print:text-slate-800">
    <div className="grid gap-6 px-7 py-8 md:grid-cols-[1.4fr_1fr] md:items-center print:px-0 print:py-5">
     <div>
      <p className="text-lg font-bold tracking-wide text-white print:text-slate-900">CoreStay Advisory</p>
      <p className="mt-2 text-sm font-medium text-slate-200 print:text-slate-300">Hospitality Business Advisory</p>
      <p className="mt-3 max-w-xl text-xs leading-6 text-slate-300 print:text-slate-400">Membantu pemilik dan pengelola hotel meningkatkan kinerja operasional, pendapatan, pengendalian biaya, dan profitabilitas melalui pendekatan bisnis yang terukur.</p>
     </div>
     <div className="md:border-l md:border-white/20 md:pl-6 print:border-slate-300">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-slate-300 print:text-slate-400">Assessment Report</p>
      <p className="mt-2 text-sm font-semibold text-white print:text-slate-900">Hospitality Business Auditor • Existing Hotel</p>
      <p className="mt-2 text-xs text-slate-300 print:text-slate-400">Confidential business assessment</p>
     </div>
    </div>
    <div className="flex flex-col gap-2 border-t border-white/15 px-7 py-4 text-xs text-slate-300 sm:flex-row sm:items-center sm:justify-between print:border-slate-300 print:px-0 print:text-slate-400">
     <span>© {new Date().getFullYear()} CoreStay Advisory. All rights reserved.</span>
     <span>Evidence-led insights • Practical action plans</span>
    </div>
   </footer>
  </div>
  <style jsx global>{`@page { size: A4 portrait; margin: 0; }
@media print {
html, body { background: #fff !important; color: #111827 !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
body { margin: 0 !important; font-size: 10pt !important; }
.no-print, button { display: none !important; }
main, main > div { background: #fff !important; color: #111827 !important; min-height: 0 !important; }
main > div { max-width: none !important; width: 100% !important; padding: 12mm !important; margin: 0 !important; }
header, section, footer { color: #111827 !important; }
header { margin-bottom: 8mm !important; padding-bottom: 5mm !important; }
h1 { font-size: 22pt !important; line-height: 1.2 !important; } h2 { font-size: 14pt !important; line-height: 1.25 !important; } h3 { font-size: 10.5pt !important; }
p, li, td, th { color: #273244 !important; overflow-wrap: anywhere !important; word-break: normal !important; }
section { margin-top: 6mm !important; }
.rounded-3xl, .rounded-2xl, .rounded-xl { border-radius: 3mm !important; box-shadow: none !important; }
.bg-slate-900, .bg-white, .bg-slate-800 { background: #fff !important; }
[class*="text-slate-"], [class*="text-cyan-"], [class*="text-orange-"], [class*="text-green-"], [class*="text-yellow-"], [class*="text-red-"] { color: #1f2937 !important; }
[class*="border-white"], [class*="border-cyan-"], [class*="border-orange-"] { border-color: #d1d5db !important; }
.overflow-x-auto, .overflow-hidden { overflow: visible !important; }
table { width: 100% !important; min-width: 0 !important; table-layout: fixed !important; border-collapse: collapse !important; font-size: 8pt !important; }
th, td { padding: 2.2mm !important; border: 1px solid #d1d5db !important; vertical-align: top !important; white-space: normal !important; }
tr { break-inside: avoid !important; page-break-inside: avoid !important; } thead { display: table-header-group !important; }
.grid { gap: 3mm !important; }
.rounded-3xl, .rounded-2xl, .rounded-xl { break-inside: auto; page-break-inside: auto; }
img { max-width: 42mm !important; max-height: 16mm !important; object-fit: contain !important; }
footer { margin-top: 8mm !important; padding-top: 3mm !important; border-color: #d1d5db !important; }
a { color: #111827 !important; text-decoration: none !important; }
}`}</style>
 </main>
}
