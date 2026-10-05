"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Row = { id:string; file_name:string; score:number|null; created_at:string; assessment_type:string; report_json:any };

const label=(t:string)=>t==="existing"?"Assessment 1 · Hotel Existing":t==="pre-opening"?"Assessment 2 · Pre-opening Hotel":"Assessment 3 · Financial";

export default function HasilPage(){
  const router=useRouter();
  const[rows,setRows]=useState<Row[]>([]);
  const[checking,setChecking]=useState(true);
  const[deleting,setDeleting]=useState<string|null>(null);

  useEffect(()=>{
    (async()=>{
      const{data:auth}=await supabase.auth.getSession();
      if(!auth.session){router.replace("/login?next=/hasil");return}
      const{data:items,error}=await supabase.from("assessment_reports").select("id,file_name,score,created_at,assessment_type,report_json").order("created_at",{ascending:false});
      if(error) console.error("Gagal memuat hasil:",error);
      setRows((items||[]) as Row[]);
      setChecking(false);
    })()
  },[router]);

  function preview(x:Row){
    if(x.assessment_type==="financial"){
      window.open("/api/assessment/financial/report/"+x.id,"_blank","noopener,noreferrer");
      return;
    }
    if(!x.report_json){ alert("Data laporan tidak tersedia untuk preview."); return; }
    sessionStorage.setItem("corestay_assessment",JSON.stringify(x.report_json));
    sessionStorage.setItem("corestay_existing_report_saved","1");
    router.push(x.assessment_type==="pre-opening"?"/assessment/pre-opening/result":"/assessment/existing/result");
  }

  async function removeReport(x:Row){
    if(!window.confirm("Hapus laporan \"" + x.file_name + "\"? Laporan yang dihapus tidak dapat dipulihkan.")) return;
    setDeleting(x.id);
    const{error}=await supabase.from("assessment_reports").delete().eq("id",x.id);
    if(error){
      console.error("Gagal menghapus hasil:",error);
      alert("Laporan gagal dihapus. Periksa akses akun atau coba lagi.");
    }else{
      setRows(prev=>prev.filter(row=>row.id!==x.id));
    }
    setDeleting(null);
  }

  if(checking)return <main className="min-h-screen bg-[#f4f7fb] px-6 py-12 lg:pl-[280px]"><p>Memeriksa akun...</p></main>;

  return <main className="min-h-screen bg-[#f4f7fb] px-6 py-12 lg:pl-[280px]">
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#6b8a80]">CoreStay</p>
      <h1 className="mt-3 text-4xl font-semibold">Hasil Saya</h1>
      <p className="mt-4 text-[#66738a]">Semua hasil assessment yang tersimpan pada akun Anda.</p>
      {rows.length===0
        ? <div className="mt-8 rounded-3xl border border-[#dce4ef] bg-white p-8"><h2 className="text-xl font-semibold">Belum ada hasil</h2><p className="mt-2 text-sm text-[#66738a]">Selesaikan assessment untuk menyimpan hasil.</p></div>
        : <div className="mt-8 space-y-4">{rows.map(x=><div key={x.id} className="rounded-3xl border border-[#dce4ef] bg-white p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-[#6b8a80]">{label(x.assessment_type)}</p>
                <h2 className="mt-1 truncate font-semibold">{x.file_name}</h2>
                <p className="mt-1 text-sm text-[#66738a]">{new Date(x.created_at).toLocaleString("id-ID")} · Score {x.score??"-"}/100</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={()=>preview(x)} className="rounded-xl border border-[#203b68] bg-white px-5 py-3 text-sm font-bold text-[#203b68] transition hover:bg-[#eef3f9]">Preview</button>
                {x.assessment_type==="financial"&&<a href={"/api/assessment/financial/report/"+x.id} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[#203b68] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#162b4a]">Download PDF</a>}
                <button type="button" disabled={deleting===x.id} onClick={()=>removeReport(x)} className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50">{deleting===x.id?"Menghapus…":"Hapus"}</button>
              </div>
            </div>
          </div>)}</div>}
    </div>
  </main>
}
