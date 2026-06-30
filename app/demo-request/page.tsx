import Link from "next/link";
import { DemoRequestForm } from "@/components/demo/demo-request-form";

export default function DemoRequestPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/" className="mb-6 block text-sm font-medium text-blue-700">
          HR Nexus
        </Link>
        <DemoRequestForm />
      </div>
    </main>
  );
}
