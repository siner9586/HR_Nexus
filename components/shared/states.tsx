export function EmptyState({ title = "暂无数据", description }: { title?: string; description?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="font-medium text-slate-800">{title}</p>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

export function LoadingState({ title = "加载中" }: { title?: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{title}</div>;
}

export function ErrorState({ title = "加载失败" }: { title?: string }) {
  return <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-sm text-red-700">{title}</div>;
}
