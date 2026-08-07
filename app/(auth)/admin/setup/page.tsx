import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { isAdminInitialized } from "@/lib/auth/admin";

import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "初始化", robots: { index: false, follow: false } };

export default async function SetupPage() {
  if (await isAdminInitialized()) {
    redirect("/admin/login");
  }

  return (
    <AuthShell
      description="创建唯一的管理员账号，初始化完成后此入口会自动关闭。"
      title="初始化博客"
    >
      <SetupForm />
    </AuthShell>
  );
}
