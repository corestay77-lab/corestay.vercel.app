"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Room = {
  id: string;
  room_number: string;
  status: string | null;
};

const statusConfig: Record<string, {
  label: string;
  box: string;
  number: string;
  dot: string;
}> = {
  VACANT_CLEAN: {
    label: "CLEAN",
    box: "border-emerald-200 bg-emerald-50",
    number: "text-emerald-900",
    dot: "bg-emerald-500",
  },
  VACANT_DIRTY: {
    label: "DIRTY",
    box: "border-red-200 bg-red-50",
    number: "text-red-900",
    dot: "bg-red-500",
  },
  CLEANING: {
    label: "CLEANING",
    box: "border-amber-200 bg-amber-50",
    number: "text-amber-900",
    dot: "bg-amber-500",
  },
  INSPECTED: {
    label: "INSPECTED",
    box: "border-sky-200 bg-sky-50",
    number: "text-sky-900",
    dot: "bg-sky-500",
  },
  OCCUPIED: {
    label: "OCCUPIED",
    box: "border-violet-200 bg-violet-50",
    number: "text-violet-900",
    dot: "bg-violet-500",
  },
  OUT_OF_ORDER: {
    label: "OUT OF ORDER",
    box: "border-slate-300 bg-slate-100",
    number: "text-slate-800",
    dot: "bg-slate-500",
  },
};

function getStatus(status: string | null) {
  return (
    statusConfig[status || "VACANT_CLEAN"] ||
    {
      label: status || "UNKNOWN",
      box: "border-slate-200 bg-white",
      number: "text-slate-900",
      dot: "bg-slate-400",
    }
  );
}

export default function PMSDashboard() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadRooms() {
    const { data, error } = await supabase
      .from("pms_rooms")
      .select("id, room_number, status")
      .order("room_number", { ascending: true });

    if (!error && data) {
      setRooms(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadRooms();

    const channel = supabase
      .channel("pms-room-status")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pms_rooms",
        },
        () => {
          loadRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const total = rooms.length;

    const occupied = rooms.filter(
      (r) => r.status === "OCCUPIED"
    ).length;

    const clean = rooms.filter(
      (r) =>
        r.status === "VACANT_CLEAN" ||
        r.status === "INSPECTED"
    ).length;

    const dirty = rooms.filter(
      (r) =>
        r.status === "VACANT_DIRTY" ||
        r.status === "CLEANING"
    ).length;

    const occupancy =
      total > 0 ? ((occupied / total) * 100).toFixed(1) : "0.0";

    return {
      total,
      occupied,
      clean,
      dirty,
      occupancy,
    };
  }, [rooms]);

  return (
    <main className="min-h-screen bg-slate-100 p-6 lg:p-8">

      <div className="mb-6 flex items-center justify-between">

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            CoreStay PMS
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Dashboard
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Real-time hotel operation
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-emerald-700">
            LIVE
          </span>
        </div>

      </div>

      <section className="mt-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 shadow-sm">
        <div className="flex h-11 items-center justify-between border-b border-slate-300 bg-white px-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-extrabold tracking-wide text-slate-800">
              ROOM STATUS
            </h2>
            <span className="text-[10px] font-medium text-slate-400">
              LIVE · SUPABASE
            </span>
          </div>

          <span className="rounded bg-slate-800 px-2.5 py-1 text-[10px] font-bold text-white">
            {rooms.length} ROOMS
          </span>
        </div>

        <div className="grid min-h-[calc(100vh-190px)] lg:grid-cols-[190px_1fr]">
          <aside className="border-r border-slate-300 bg-slate-100 p-2">
            <div className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-600">
              ALL ROOM
            </div>

            <div className="mb-3 flex items-center justify-between border border-slate-300 bg-white px-2.5 py-2">
              <span className="text-xs font-bold text-slate-700">
                0 - ALL
              </span>
              <span className="text-xs font-extrabold text-slate-900">
                {rooms.length}
              </span>
            </div>

            <div className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-600">
              ROOM STATUS
            </div>

            <div className="overflow-hidden border border-slate-300 bg-white">
              {Object.entries(statusConfig).map(([key, config]) => {
                const count = rooms.filter(
                  (room) => getStatus(room.status).label === config.label
                ).length;

                return (
                  <div
                    key={key} className={`flex items-center justify-between border-b border-white/30 px-3 py-2 last:border-b-0 ${config.box}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-3 w-3 shrink-0 rounded-sm ${config.dot}`}
                      />
                      <span className="truncate text-[10px] font-bold text-slate-700">
                        {config.label}
                      </span>
                    </div>

                    <span className="ml-2 text-[10px] font-extrabold text-slate-900">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>

          <div className="min-w-0 bg-slate-300 p-2">
            <div className="mb-2 flex items-center justify-between border-b border-slate-400 px-1 pb-2">
              <span className="text-xs font-extrabold text-slate-800">
                0 - ALL
              </span>

              <span className="text-[9px] font-semibold text-slate-500">
                {loading ? "LOADING..." : "LIVE ROOM INVENTORY"}
              </span>
            </div>

            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center bg-white text-xs text-slate-500">
                Memuat data kamar...
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center bg-white text-xs text-slate-500">
                Belum ada data kamar
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-1 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-14 2xl:grid-cols-16">
                {rooms.map((room) => {
                  const config = getStatus(room.status);

                  return (
                    <div
                      key={room.id}
                      title={`Room ${room.room_number} · ${config.label}`}
                      className={`flex h-[64px] min-w-0 flex-col items-center justify-center rounded-sm border border-white shadow-sm transition hover:z-10 hover:scale-105 hover:shadow-md ${config.box}`}
                    >
                      <span
                        className={`text-[17px] font-black leading-none ${config.number}`}
                      >
                        {room.room_number}
                      </span>

                      <span className="mt-1 max-w-full truncate px-1 text-center text-[7px] font-extrabold uppercase leading-none opacity-75">
                        {config.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-sm font-bold text-slate-900 sm:text-base">
              Daily Operations Summary
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Ringkasan performa operasional hotel hari ini
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Today
          </span>
        </div>

        <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <SummaryMetric
            label="Room Revenue"
            value="Rp 0"
            note="Today"
          />

          <SummaryMetric
            label="ARR / ADR"
            value="Rp 0"
            note="Average Room Rate"
          />

          <SummaryMetric
            label="Occupancy"
            value={`${stats.occupancy}%`}
            note={`${stats.occupied} rooms occupied`}
          />

          <SummaryMetric
            label="RevPAR"
            value="Rp 0"
            note="Revenue / available room"
          />

          <SummaryMetric
            label="Rooms Sold"
            value={String(stats.occupied)}
            note="Rooms occupied"
          />

          <SummaryMetric
            label="Available Rooms"
            value={String(Math.max(0, stats.total - stats.occupied))}
            note="Inventory available"
          />
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-4">
          <SummarySmallMetric
            label="Check-in"
            value="0"
          />

          <SummarySmallMetric
            label="Check-out"
            value="0"
          />

          <SummarySmallMetric
            label="No-show"
            value="0"
          />

          <SummarySmallMetric
            label="Cancellation"
            value="0"
          />
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              Revenue Performance
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              Daily room performance monitoring
            </p>
          </div>

          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">
            LIVE
          </span>
        </div>
      </section>
      <div className="mt-6 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4">

        <div>
          <p className="text-sm font-bold text-emerald-800">
            CoreStay PMS LIVE
          </p>

          <p className="mt-1 text-xs text-emerald-700">
            Status kamar tersinkronisasi dengan database Supabase.
          </p>
        </div>

        <span className="text-[10px] font-bold text-emerald-600">
          REAL-TIME
        </span>

      </div>

    </main>
  );
}

function Card({
  title,
  value,
  text,
}: {
  title: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {text}
      </p>

    </div>
  );
}















function SummaryMetric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="bg-white px-5 py-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 truncate text-xl font-extrabold text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-[10px] font-medium text-slate-400">
        {note}
      </p>
    </div>
  );
}

function SummarySmallMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold text-slate-900">
        {value}
      </p>
    </div>
  );
}






