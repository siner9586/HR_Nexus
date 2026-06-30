"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmployeeColumn = {
  key: string;
  label: string;
  required?: boolean;
};

const storageKey = "hr-nexus.employee-columns";

export const employeeColumns: EmployeeColumn[] = [
  { key: "selected", label: "勾选框", required: true },
  { key: "avatar", label: "头像" },
  { key: "name", label: "姓名", required: true },
  { key: "employeeNo", label: "工号" },
  { key: "phone", label: "手机" },
  { key: "email", label: "邮箱" },
  { key: "company", label: "公司" },
  { key: "department", label: "部门" },
  { key: "position", label: "岗位" },
  { key: "manager", label: "直属上级" },
  { key: "employmentType", label: "用工类型" },
  { key: "status", label: "员工状态" },
  { key: "hireDate", label: "入职日期" },
  { key: "probationEndDate", label: "试用期截止" },
  { key: "regularizationDate", label: "转正日期" },
  { key: "contractStatus", label: "合同状态" },
  { key: "workLocation", label: "工作地点" },
  { key: "costCenter", label: "成本中心" },
  { key: "updatedAt", label: "最近变动" },
  { key: "id", label: "操作", required: true },
];

const defaultVisible = employeeColumns.map((column) => column.key);

function applyColumnVisibility(visible: string[]) {
  const visibleSet = new Set(visible);
  for (const column of employeeColumns) {
    document.querySelectorAll<HTMLElement>(`[data-column="${column.key}"]`).forEach((element) => {
      element.style.display = visibleSet.has(column.key) ? "" : "none";
    });
  }
}

export function EmployeeColumnSettings() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(defaultVisible);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as string[];
      const next = employeeColumns.filter((column) => column.required || parsed.includes(column.key)).map((column) => column.key);
      window.requestAnimationFrame(() => setVisible(next));
    } catch {
      window.requestAnimationFrame(() => setVisible(defaultVisible));
    }
  }, []);

  useEffect(() => {
    applyColumnVisibility(visible);
  }, [visible]);

  function toggle(key: string) {
    const column = employeeColumns.find((item) => item.key === key);
    if (column?.required) return;
    const next = visible.includes(key) ? visible.filter((item) => item !== key) : [...visible, key];
    setVisible(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    applyColumnVisibility(next);
  }

  function reset() {
    setVisible(defaultVisible);
    window.localStorage.setItem(storageKey, JSON.stringify(defaultVisible));
  }

  return (
    <div className="relative">
      <Button type="button" variant="secondary" onClick={() => setOpen((value) => !value)}>
        <SlidersHorizontal className="h-4 w-4" />
        列设置
      </Button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">员工表字段</div>
            <button type="button" className="text-xs font-medium text-blue-700" onClick={reset}>
              恢复默认
            </button>
          </div>
          <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
            {employeeColumns.map((column) => (
              <label key={column.key} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={visible.includes(column.key)}
                  disabled={column.required}
                  onChange={() => toggle(column.key)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span>{column.label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
