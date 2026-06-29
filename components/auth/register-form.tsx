"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const [loading, setLoading] = useState(false);

  async function submit(formData: FormData) {
    setLoading(true);
    const body = Object.fromEntries(formData.entries());
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error?.message ?? "注册失败");
      toast.success("企业租户创建成功，请登录");
      window.location.href = "/login";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>创建企业租户</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={submit} className="grid gap-4 md:grid-cols-2">
          <Input name="companyName" placeholder="企业名称" required />
          <Input name="industry" placeholder="行业" required />
          <Input name="companySize" placeholder="企业规模" required />
          <Input name="contactName" placeholder="管理员姓名" required />
          <Input name="email" type="email" placeholder="邮箱" required />
          <Input name="phone" placeholder="手机" />
          <Input name="password" type="password" placeholder="密码" required />
          <Button disabled={loading} className="md:col-span-2">
            创建租户
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
