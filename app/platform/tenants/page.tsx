import { ModulePage } from "@/components/shared/module-page";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default function PlatformTenantsPage({ searchParams }: PageProps) {
  return <ModulePage moduleKey="platform" searchParams={searchParams} />;
}
