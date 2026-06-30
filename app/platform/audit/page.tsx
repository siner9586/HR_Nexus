import { ModulePage } from "@/components/shared/module-page";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default function PlatformAuditPage({ searchParams }: PageProps) {
  return <ModulePage moduleKey="audit-logs" searchParams={searchParams} />;
}
