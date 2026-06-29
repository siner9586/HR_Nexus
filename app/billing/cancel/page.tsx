import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BillingCancelPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6">
      <Card className="max-w-md">
        <CardContent className="space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold">支付已取消</h1>
          <p className="text-sm text-slate-600">当前套餐未发生变化，可以返回套餐页重新选择。</p>
          <Link href="/billing"><Button>返回套餐页</Button></Link>
        </CardContent>
      </Card>
    </main>
  );
}
