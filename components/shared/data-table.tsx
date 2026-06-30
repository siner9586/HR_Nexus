import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

export type TableColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyText = "暂无数据",
}: {
  columns: TableColumn<T>[];
  rows: T[];
  emptyText?: string;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)} data-column={String(column.key)} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={String(row.id ?? index)} className="hover:bg-slate-50">
              {columns.map((column) => {
                const value = row[column.key as keyof T];
                return (
                  <td key={String(column.key)} data-column={String(column.key)} className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {column.render ? column.render(row) : String(column.key).toLowerCase().includes("status") ? <StatusBadge status={String(value ?? "")} /> : String(value ?? "-")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
