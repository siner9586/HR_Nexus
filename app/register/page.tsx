import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-2xl">
        <Link href="/" className="mb-6 block text-sm font-medium text-blue-700">
          HR Nexus
        </Link>
        <RegisterForm />
      </div>
    </main>
  );
}
