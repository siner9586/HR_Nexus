"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function EmployeeForm() {
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error?.message ?? "保存失败");
      toast.success("员工已创建");
      window.location.href = `/employees/${payload.data.id}`;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>新增员工</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={submit} className="grid gap-4 md:grid-cols-2">
          <Input name="name" placeholder="姓名" required />
          <Input name="email" type="email" placeholder="邮箱" />
          <Input name="phone" placeholder="手机" />
          <Input name="employmentType" placeholder="用工类型 FULL_TIME" />
          <Input name="hireDate" type="date" />
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 md:col-span-2">
            合同信息、紧急联系人、薪资基础配置和附件上传入口已在数据模型与详情页预留，保存后会写入 EmployeeChange 与 AuditLog。
          </div>
          <Button disabled={loading} className="md:col-span-2">
            保存员工
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
