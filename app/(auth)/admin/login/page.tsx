import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { getAdminSession, isAdminInitialized } from "@/lib/auth/admin";

import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "登录", robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (!(await isAdminInitialized())) {
    redirect("/admin/setup");
  }

  if (await getAdminSession()) {
    redirect("/admin");
  }

  return (
    <AuthShell description="使用管理员账号进入内容管理后台。" title="登录">
      <LoginForm />
    </AuthShell>
  );
}
