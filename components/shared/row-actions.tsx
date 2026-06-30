"use client";

import Link from "next/link";
import { Archive, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function RowActions({
  href,
  deleteEndpoint,
  actionLabel = "归档",
}: {
  href?: string;
  deleteEndpoint?: string;
  actionLabel?: string;
}) {
  async function archive() {
    if (!deleteEndpoint) return;
    if (!window.confirm(`确认${actionLabel}这条记录？`)) return;
    const response = await fetch(deleteEndpoint, { method: "DELETE" });
    if (!response.ok) {
      toast.error("操作失败");
      return;
    }
    toast.success(`已${actionLabel}`);
    window.location.reload();
  }

  return (
    <div className="flex items-center gap-2">
      {href ? (
        <Link href={href} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
          <MoreHorizontal className="h-3.5 w-3.5" />
          查看
        </Link>
      ) : null}
      {deleteEndpoint ? (
        <Button type="button" variant="secondary" size="sm" onClick={archive}>
          <Archive className="h-3.5 w-3.5" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
