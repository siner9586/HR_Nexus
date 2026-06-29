"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BillingActions({ planCode }: { planCode: "STANDARD" | "PROFESSIONAL" | "ENTERPRISE" }) {
  async function checkout() {
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode, interval: "month" }),
    });
    const payload = await response.json();
    if (!payload.success) {
      toast.error(payload.error?.message ?? "无法创建 Checkout");
      return;
    }
    window.location.href = payload.data.url;
  }

  return <Button onClick={checkout}>升级到 {planCode}</Button>;
}

export function BillingPortalButton() {
  async function openPortal() {
    const response = await fetch("/api/billing/portal", { method: "POST" });
    const payload = await response.json();
    if (!payload.success) {
      toast.error(payload.error?.message ?? "无法进入客户门户");
      return;
    }
    window.location.href = payload.data.url;
  }

  return (
    <Button variant="secondary" onClick={openPortal}>
      管理账单
    </Button>
  );
}
