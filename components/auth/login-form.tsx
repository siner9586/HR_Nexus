"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const demoAccounts = [
  ["平台管理员", "admin@platform.local", "Admin123456!"],
  ["企业所有者", "owner@demo.com", "Demo123456!"],
  ["HR 专员", "hr@demo.com", "Demo123456!"],
  ["薪酬专员", "payroll@demo.com", "Demo123456!"],
  ["普通员工", "employee@demo.com", "Demo123456!"],
] as const;

export function LoginForm({ demoLoginEnabled }: { demoLoginEnabled: boolean }) {
  const [email, setEmail] = useState(demoLoginEnabled ? "owner@demo.com" : "");
  const [password, setPassword] = useState(demoLoginEnabled ? "Demo123456!" : "");
  const [loading, setLoading] = useState(false);

  async function login(nextEmail = email, nextPassword = password) {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, password: nextPassword }),
      });
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error?.message ?? "登录失败");
      toast.success("登录成功");
      window.location.href = payload.data.redirectTo;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>登录 HR Nexus</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">邮箱</label>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">密码</label>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <Button className="w-full" disabled={loading} onClick={() => login()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          登录
        </Button>
        {demoLoginEnabled ? (
          <div className="grid gap-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-amber-700">Demo environment</p>
            {demoAccounts.map(([label, demoEmail, demoPassword]) => (
              <Button
                key={demoEmail}
                variant="secondary"
                type="button"
                onClick={() => {
                  setEmail(demoEmail);
                  setPassword(demoPassword);
                  void login(demoEmail, demoPassword);
                }}
              >
                {label}演示登录
              </Button>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
