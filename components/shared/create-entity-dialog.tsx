"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type CreateField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "datetime-local" | "email" | "url";
  required?: boolean;
  placeholder?: string;
};

export function CreateEntityDialog({ title, endpoint, fields }: { title: string; endpoint: string; fields: CreateField[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    try {
      const body = Object.fromEntries(Array.from(formData.entries()).filter(([, value]) => String(value).trim() !== ""));
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error?.message ?? "保存失败");
      toast.success("已创建");
      setOpen(false);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        新建
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                关闭
              </Button>
            </div>
            <form action={submit} className="grid gap-4 p-5 md:grid-cols-2">
              {fields.map((field) => (
                <label key={field.name} className="space-y-1 text-sm font-medium text-slate-700">
                  <span>{field.label}</span>
                  <Input name={field.name} type={field.type ?? "text"} required={field.required} placeholder={field.placeholder} />
                </label>
              ))}
              <div className="flex justify-end gap-2 md:col-span-2">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  取消
                </Button>
                <Button disabled={loading}>保存</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
