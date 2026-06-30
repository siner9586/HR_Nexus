"use client";

import { useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const templateCsv = "name,phone,email,employeeNo,departmentName,positionName,hireDate,employmentType,workLocation,costCenterName\n张三,13812345678,zhangsan@example.com,E10001,人力资源部,HR Specialist,2026-06-29,FULL_TIME,合肥,总部管理成本中心\n";
const templateHref = `data:text/csv;charset=utf-8,\uFEFF${encodeURIComponent(templateCsv)}`;

export function EmployeeImportButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: number; errors?: Array<{ row: number; message: string }> } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function importEmployees() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("请选择 CSV 文件");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("reason", "员工列表页批量导入");
    setLoading(true);
    try {
      const response = await fetch("/api/employees/import", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      if (!payload.success) {
        setResult(payload.data ?? null);
        toast.error(payload.error?.message ?? "导入失败");
        return;
      }
      setResult(payload.data);
      toast.success(`导入完成：成功 ${payload.data.imported} 条，失败 ${payload.data.failed} 条`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导入失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" />
        批量导入
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h2 className="text-lg font-semibold text-slate-950">批量导入员工</h2>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                关闭
              </Button>
            </div>
            <div className="space-y-4 p-5">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                CSV 字段：name 必填；phone、email、employeeNo、departmentName、positionName、hireDate、employmentType、workLocation、costCenterName 可选。
              </div>
              <a href={templateHref} download="hr-nexus-employees-import-template.csv" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700">
                <FileText className="h-4 w-4" />
                下载 CSV 模板
              </a>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="block w-full rounded-md border border-slate-300 p-2 text-sm" />
              {result ? (
                <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-700">
                  <div>成功 {result.imported} 条，失败 {result.failed} 条</div>
                  {result.errors?.length ? (
                    <ul className="mt-2 max-h-28 overflow-y-auto text-xs text-red-700">
                      {result.errors.slice(0, 5).map((error) => (
                        <li key={`${error.row}-${error.message}`}>第 {error.row} 行：{error.message}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  取消
                </Button>
                <Button type="button" disabled={loading} onClick={importEmployees}>
                  {loading ? "导入中" : "开始导入"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
