"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STATUS = [
  { value: "CLEAN", label: "CLEAN", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { value: "DIRTY", label: "DIRTY", color: "bg-red-100 text-red-700 border-red-300" },
  { value: "CLEANING", label: "CLEANING", color: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "INSPECTED", label: "INSPECTED", color: "bg-blue-100 text-blue-700 border-blue-300" },
  { value: "OCCUPIED", label: "OCCUPIED", color: "bg-violet-100 text-violet-700 border-violet-300" },
  { value: "OUT_OF_ORDER", label: "OUT OF ORDER", color: "bg-slate-200 text-slate-700 border-slate-400" },
];

export default function HousekeepingPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function loadRooms() {
    const { data, error } = await supabase
      .from("pms_rooms")
      .select("id,room_number,status")
      .order("room_number");

    if (error) {
      setMessage("Gagal membaca kamar: " + error.message);
    } else {
      setRooms(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadRooms();

    const channel = supabase
      .channel("corestay-pms-rooms")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pms_rooms",
        },
        () => loadRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function changeStatus(room: any, status: string) {
    setSaving(room.id);
    setMessage("");

    const { error } = await supabase
      .from("pms_rooms")
      .update({ status })
      .eq("id", room.id);

    if (error) {
      setMessage(`Room ${room.room_number} gagal: ${error.message}`);
      setSaving(null);
      return;
    }

    const { data, error: verifyError } = await supabase
      .from("pms_rooms")
      .select("id,room_number,status")
      .eq("id", room.id)
      .limit(1);

    if (verifyError || !data?.length) {
      setMessage(
        `Room ${room.room_number} gagal diverifikasi: ${
          verifyError?.message || "data tidak ditemukan"
        }`
      );
      setSaving(null);
      return;
    }

    const updated = data[0];

    setRooms((current) =>
      current.map((r) =>
        r.id === room.id
          ? { ...r, status: updated.status }
          : r
      )
    );

    setMessage(
      `✓ Room ${room.room_number} → ${updated.status} berhasil disimpan.`
    );

    setSaving(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-7xl rounded-2xl bg-white p-8 shadow-sm">
          Memuat room inventory...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            CoreStay PMS
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Housekeeping
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Live room status control
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-bold text-slate-900">
              Room Status
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Perubahan status tersimpan langsung ke database PMS.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {rooms.map((room) => {
              const current = STATUS.find(
                (item) => item.value === room.status
              );

              return (
                <div
                  key={room.id}
                  className="flex flex-col gap-4 px-6 py-5 xl:flex-row xl:items-center xl:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-16 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                      {room.room_number}
                    </div>

                    <div>
                      <div className="font-bold text-slate-900">
                        Room {room.room_number}
                      </div>

                      <span
                        className={`mt-1 inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold ${current?.color || "bg-slate-100 text-slate-600 border-slate-200"}`}
                      >
                        {current?.label || room.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {STATUS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        disabled={saving === room.id}
                        onClick={() => changeStatus(room, item.value)}
                        className={`rounded-lg border px-3 py-2 text-[10px] font-bold transition hover:scale-[1.02] disabled:cursor-wait disabled:opacity-50 ${item.color}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
