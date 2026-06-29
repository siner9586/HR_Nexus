export function UsageMeter({ value, max }: { value: number; max: number | null }) {
  const percent = max ? Math.min((value / max) * 100, 100) : 18;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
        <span>{value}</span>
        <span>{max ?? "不限"}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-blue-700" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
