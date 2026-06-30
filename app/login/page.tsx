import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { isDemoLoginEnabled } from "@/lib/runtime-env";

export default function LoginPage() {
  const demoLoginEnabled = isDemoLoginEnabled();
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 block text-sm font-medium text-blue-700">
          HR Nexus
        </Link>
        <LoginForm demoLoginEnabled={demoLoginEnabled} />
      </div>
    </main>
  );
}
