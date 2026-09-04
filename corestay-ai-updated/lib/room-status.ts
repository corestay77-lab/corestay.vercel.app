export const ROOM_STATUSES = {
  CLEAN: {
    label: "CLEAN",
    color: "emerald",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
  DIRTY: {
    label: "DIRTY",
    color: "red",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
  },
  CLEANING: {
    label: "CLEANING",
    color: "amber",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
  },
  INSPECTED: {
    label: "INSPECTED",
    color: "blue",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
  },
  OCCUPIED: {
    label: "OCCUPIED",
    color: "violet",
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
  },
  OUT_OF_ORDER: {
    label: "OUT OF ORDER",
    color: "slate",
    bg: "bg-slate-100",
    border: "border-slate-300",
    text: "text-slate-700",
  },
} as const;

export type RoomStatus = keyof typeof ROOM_STATUSES;

export function normalizeRoomStatus(status: string | null | undefined): RoomStatus {
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
