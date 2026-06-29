import Link from "next/link";

export function UpgradeBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      <div className="font-medium">套餐用量提醒</div>
      <p className="mt-1">{message}</p>
      <Link href="/billing" className="mt-3 inline-flex font-medium text-blue-700">
        查看套餐
      </Link>
    </div>
  );
}
