import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { EmployeeForm } from "@/components/employees/employee-form";
import { getCurrentUser } from "@/lib/auth";

export default async function NewEmployeePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <AppShell>
      <PageHeader title="新增员工" description="录入基本信息、工作信息、用工信息、合同信息、紧急联系人、薪资基础配置和附件入口。" />
      <div className="p-4 sm:p-6">
        <EmployeeForm />
      </div>
    </AppShell>
  );
}
