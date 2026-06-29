import { cn } from "@/lib/utils";

const statusTone: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  SIGNED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  NORMAL: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  PENDING: "bg-amber-50 text-amber-800 ring-amber-200",
  PENDING_APPROVAL: "bg-amber-50 text-amber-800 ring-amber-200",
  PENDING_SIGN: "bg-amber-50 text-amber-800 ring-amber-200",
  PROBATION: "bg-sky-50 text-sky-700 ring-sky-200",
  EXPIRING: "bg-orange-50 text-orange-800 ring-orange-200",
  REJECTED: "bg-red-50 text-red-700 ring-red-200",
  TERMINATED: "bg-slate-100 text-slate-600 ring-slate-200",
  MOCK: "bg-indigo-50 text-indigo-700 ring-indigo-200",
};

export function StatusBadge({ status, label }: { status?: string | null; label?: string }) {
  const value = status ?? "UNKNOWN";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        statusTone[value] ?? "bg-slate-50 text-slate-700 ring-slate-200",
      )}
    >
      {label ?? value}
    </span>
  );
}
