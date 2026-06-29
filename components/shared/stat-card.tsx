import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  title,
  value,
  icon,
  hint,
}: {
  title: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
          {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {icon ? <div className="rounded-md bg-blue-50 p-2 text-blue-700">{icon}</div> : null}
      </CardContent>
    </Card>
  );
}
