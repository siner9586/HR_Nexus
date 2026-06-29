export function Timeline({
  items,
}: {
  items: Array<{ title: string; time?: string; description?: string; status?: string }>;
}) {
  return (
    <ol className="space-y-4">
      {items.map((item, index) => (
        <li key={`${item.title}-${index}`} className="relative pl-6">
          <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-blue-600" />
          {index < items.length - 1 ? <span className="absolute left-[4px] top-4 h-full w-px bg-slate-200" /> : null}
          <div className="font-medium text-slate-900">{item.title}</div>
          <div className="mt-1 text-xs text-slate-500">{item.time}</div>
          {item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p> : null}
        </li>
      ))}
    </ol>
  );
}
