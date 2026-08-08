import { LogOut } from "lucide-react";
import Link from "next/link";

import { AdminMobileNavigation } from "@/components/admin/admin-mobile-navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { IconButton } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { UIProvider } from "@/components/ui/ui-provider";
import { requireAdminSession } from "@/lib/auth/admin";

import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "管理后台",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdminSession();

  return (
    <UIProvider>
      <div className="admin-shell-layout">
        <AdminSidebar />
        <div className="admin-shell-workspace">
          <header className="admin-shell-topbar">
            <div className="admin-shell-context">
              <div className="lg:hidden">
                <AdminMobileNavigation />
              </div>
              <nav aria-label="面包屑" className="admin-breadcrumb">
                <Link href="/admin">管理后台</Link>
                <span aria-hidden="true">/</span>
                <span>工作区</span>
              </nav>
            </div>
            <div className="admin-shell-account">
              <span className="admin-shell-user">{session.user.name}</span>
              <Link className="admin-shell-site-link" href="/">
                查看站点
              </Link>
              <form action={signOutAction}>
                <Tooltip content="退出登录">
                  <IconButton aria-label="退出登录" type="submit">
                    <LogOut aria-hidden="true" size={17} />
                  </IconButton>
                </Tooltip>
              </form>
            </div>
          </header>
          <main className="admin-shell-main" id="main-content">
            {children}
          </main>
        </div>
      </div>
    </UIProvider>
  );
}
