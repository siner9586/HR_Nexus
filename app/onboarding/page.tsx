import { ModulePage } from "@/components/shared/module-page";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default function Page({ searchParams }: PageProps) {
  return <ModulePage moduleKey="onboarding" searchParams={searchParams} />;
}
