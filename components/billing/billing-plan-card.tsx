import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

export function BillingPlanCard({
  name,
  price,
  features,
  current,
}: {
  name: string;
  price: number;
  features: string[];
  current?: boolean;
}) {
  return (
    <Card className={current ? "border-blue-500 ring-2 ring-blue-100" : ""}>
      <CardContent className="space-y-4">
        <div>
          <div className="text-lg font-semibold text-slate-950">{name}</div>
          <div className="mt-2 text-2xl font-bold text-slate-950">{price ? formatCurrency(price) : "联系销售"}</div>
        </div>
        <ul className="space-y-2 text-sm text-slate-600">
          {features.slice(0, 6).map((feature) => (
            <li key={feature}>- {feature}</li>
          ))}
        </ul>
        <Button variant={current ? "secondary" : "primary"} className="w-full">
          {current ? "当前套餐" : "升级"}
        </Button>
      </CardContent>
    </Card>
  );
}
