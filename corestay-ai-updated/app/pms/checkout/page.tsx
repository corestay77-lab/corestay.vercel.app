"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CheckoutPage() {
  const [data, setData] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  async function load() {
    const { data: hotel } = await supabase.from("pms_hotels").select("id").eq("code","CORESTAY01").maybeSingle();
    if (!hotel) return;

    const { data: reservations } = await supabase.from("pms_reservations").select("*").eq("hotel_id",hotel.id).eq("status","CHECKED_IN").order("check_out");
    const { data: roomData } = await supabase.from("pms_rooms").select("id,room_number").eq("hotel_id",hotel.id).eq("active",true);

    setData(reservations || []);
    setRooms(roomData || []);
  }

  useEffect(() => { load(); }, []);

  async function checkout(item: any) {
    if (!item.room_id) return;

    const ok = confirm("Konfirmasi CHECK-OUT " + item.guest_name + "?");
    if (!ok) return;

    await supabase.from("pms_reservations").update({
      status: "CHECKED_OUT"
    }).eq("id",item.id);

    await supabase.from("pms_rooms").update({
      status: "DIRTY"
    }).eq("id",item.room_id);

    await load();
  }

  function roomNumber(id: string) {
    return rooms.find((r) => r.id === id)?.room_number || "-";
  }

  return (
    <main className="min-h-screen bg-[#f4f6f5] text-slate-900">
      <header className="bg-[#10251d] px-6 py-6 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">CoreStay PMS</p>
            <h1 className="text-2xl font-bold">Guest Check-out</h1>
            <p className="text-xs text-white/50">Hotel Cores_Stay · CORESTAY01</p>
          </div>
          <div className="flex gap-2">
            <a href="/pms" className="rounded-xl bg-white/10 px-4 py-2 text-sm">Dashboard</a>
            <a href="/pms/rooms" className="rounded-xl bg-white/10 px-4 py-2 text-sm">Rooms</a>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl p-6 lg:p-8">
        <div className="mb-6">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">● LIVE</span>
          <h2 className="mt-4 text-3xl font-bold">Current In-House Guests</h2>
          <p className="mt-1 text-sm text-slate-500">
            CHECK-OUT otomatis mengubah kamar menjadi VACANT DIRTY.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="border-b p-5">
            <h3 className="font-bold">Guest Check-out</h3>
            <p className="text-xs text-slate-400">{data.length} guest in-house</p>
          </div>

          {data.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-lg font-bold">Tidak ada tamu CHECKED_IN</p>
              <p className="mt-2 text-sm text-slate-400">Belum ada tamu yang dapat di-check-out.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-4 text-left">Reservation</th>
                    <th className="p-4 text-left">Guest</th>
                    <th className="p-4 text-left">Room</th>
                    <th className="p-4 text-left">Check-out</th>
                    <th className="p-4 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-4 font-semibold">{item.reservation_no}</td>
                      <td className="p-4">{item.guest_name}</td>
                      <td className="p-4 font-bold">{roomNumber(item.room_id)}</td>
                      <td className="p-4">{item.check_out}</td>
                      <td className="p-4">
                        <button
                          onClick={() => checkout(item)}
                          className="rounded-xl bg-[#17352b] px-4 py-2 text-xs font-bold text-white"
                        >
                          CHECK-OUT
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="font-bold text-emerald-800">● LIVE PMS WORKFLOW</p>
          <p className="mt-1 text-sm text-emerald-700">CHECKED_IN → CHECKED_OUT → DIRTY → HOUSEKEEPING → CLEAN</p>
        </div>
      </section>
    </main>
  );
}





