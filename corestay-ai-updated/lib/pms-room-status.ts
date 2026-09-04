"use client";

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export const ROOM_STATUS = {
  CLEAN: {
    label: "CLEAN",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
  DIRTY: {
    label: "DIRTY",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
  },
  CLEANING: {
    label: "CLEANING",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
  },
  INSPECTED: {
    label: "INSPECTED",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  OCCUPIED: {
    label: "OCCUPIED",
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
  },
  OUT_OF_ORDER: {
    label: "OUT OF ORDER",
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
  },
} as const;

export function normalizeRoomStatus(status: string | null | undefined) {
  if (status === "VACANT_CLEAN") return "CLEAN";
  if (status === "VACANT_DIRTY") return "DIRTY";

  if (
    status === "CLEAN" ||
    status === "DIRTY" ||
    status === "CLEANING" ||
    status === "INSPECTED" ||
    status === "OCCUPIED" ||
    status === "OUT_OF_ORDER"
  ) {
    return status;
  }

  return "CLEAN";
}

export function subscribeToRoomChanges(
  callback: () => void
) {
  return supabase
    .channel("corestay-pms-room-status-live")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "pms_rooms",
      },
      callback
    )
    .subscribe();
}
