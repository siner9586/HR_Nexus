"use client";

import { useState } from "react";
import { UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function selectedEmployeeIds() {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[name="employeeIds"]:checked')).map((input) => input.value);
}

export function EmployeeBulkActionButton({ canArchive = false }: { canArchive?: boolean }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function openDialog() {
    const next = selectedEmployeeIds();
    if (!next.length) {
      toast.error("请先勾选员工");
      return;
    }
    setSelected(next);
    setOpen(true);
  }

  function exportSelected() {
    if (!selected.length) {
      toast.error("请先勾选员工");
      return;
    }
    window.location.href = `/api/employees/export?ids=${encodeURIComponent(selected.join(","))}`;
  }

  async function runStatusAction(action: "mark_pending_termination" | "archive") {
    if (action === "mark_pending_termination" && !window.confirm(`确认将 ${selected.length} 名员工标记为待离职？`)) return;
    if (action === "archive" && !window.confirm(`二次确认：归档 ${selected.length} 名员工后默认列表将不再关注这些记录。继续？`)) return;
    setLoading(true);
    try {
      const response = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, action }),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error?.message ?? "批量操作失败");
      toast.success(`已处理 ${payload.data.updated} 名员工`);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "批量操作失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={openDialog}>
        <UsersRound className="h-4 w-4" />
        批量操作
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h2 className="text-lg font-semibold text-slate-950">批量操作</h2>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                关闭
              </Button>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                已选择 {selected.length} 名员工。
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button type="button" variant="secondary" onClick={exportSelected}>
                  导出选中
                </Button>
                <Button type="button" variant="secondary" disabled={loading} onClick={() => runStatusAction("mark_pending_termination")}>
                  标记待离职
                </Button>
                {canArchive ? (
                  <Button type="button" variant="secondary" disabled={loading} onClick={() => runStatusAction("archive")}>
                    归档员工
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
