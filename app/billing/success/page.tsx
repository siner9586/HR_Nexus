import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BillingSuccessPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <Card className="max-w-md">
        <CardContent className="space-y-4 p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <h1 className="text-xl font-semibold">支付成功</h1>
          <p className="text-sm text-slate-600">Stripe webhook 或 mock checkout 会同步订阅状态。</p>
          <div className="flex justify-center gap-3">
            <Link href="/dashboard"><Button>返回工作台</Button></Link>
            <Link href="/billing"><Button variant="secondary">查看当前套餐</Button></Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
