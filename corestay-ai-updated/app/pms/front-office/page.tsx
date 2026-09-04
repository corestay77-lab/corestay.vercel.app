"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase=createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const colors:any={
  CLEAN:"bg-emerald-50 border-emerald-200 text-emerald-700",
  DIRTY:"bg-red-50 border-red-200 text-red-700",
  CLEANING:"bg-amber-50 border-amber-200 text-amber-700",
  INSPECTED:"bg-blue-50 border-blue-200 text-blue-700",
  OCCUPIED:"bg-violet-50 border-violet-200 text-violet-700",
  OUT_OF_ORDER:"bg-slate-100 border-slate-300 text-slate-700"
};

const labels:any={
  CLEAN:"CLEAN",
  DIRTY:"DIRTY",
  CLEANING:"CLEANING",
  INSPECTED:"INSPECTED",
  OCCUPIED:"OCCUPIED",
  OUT_OF_ORDER:"OUT OF ORDER"
};

export default function FrontOfficePage(){
  const [rooms,setRooms]=useState<any[]>([]);

  async function load(){
    const {data}=await supabase
      .from("pms_rooms")
      .select("id,room_number,status")
      .order("room_number");
    setRooms(data||[]);
  }

  useEffect(()=>{
    load();
    const channel=supabase
      .channel("pms-front-office-live")
      .on("postgres_changes",
        {event:"*",schema:"public",table:"pms_rooms"},
        ()=>load()
      )
      .subscribe();

    return ()=>{supabase.removeChannel(channel)};
  },[]);

  return (
    <main className="min-h-screen bg-slate-100 p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">CoreStay PMS</p>
        <h1 className="mt-1 text-2xl font-bold">Front Office</h1>
        <p className="mt-1 text-sm text-slate-400">Live room availability and operational status</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-bold">Room Availability</h2>
          <p className="mt-1 text-xs text-slate-400">Live from Supabase</p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {rooms.map(room=>(
            <div key={room.id} className={`rounded-xl border p-4 text-center ${colors[room.status]||colors.CLEAN}`}>
              <p className="text-sm font-bold">{room.room_number}</p>
              <p className="mt-1 text-[9px] font-bold">{labels[room.status]||room.status||"UNKNOWN"}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}





