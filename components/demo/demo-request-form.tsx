"use client";

import { useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function DemoRequestForm() {
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    try {
      const response = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error?.message ?? "提交失败");
      toast.success("预约已提交");
      (document.getElementById("demo-request-form") as HTMLFormElement | null)?.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>预约产品演示</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="demo-request-form" action={submit} className="grid gap-4 md:grid-cols-2">
          <Input name="name" placeholder="姓名" required />
          <Input name="company" placeholder="公司名称" required />
          <Input name="email" type="email" placeholder="工作邮箱" required />
          <Input name="phone" placeholder="手机号" />
          <Input name="employeeCount" placeholder="员工规模，例如 200-500" />
          <textarea
            name="message"
            placeholder="希望重点了解的模块"
            className="min-h-28 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 md:col-span-2"
          />
          <Button disabled={loading} className="md:col-span-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
            提交预约
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
