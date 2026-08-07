import { LogOut } from "lucide-react";
import Link from "next/link";

import { AdminMobileNavigation } from "@/components/admin/admin-mobile-navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
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
    <div className="flex min-h-screen bg-white">
      <AdminSidebar />
      <div className="min-w-0 flex-1">
        <header className="relative flex h-16 items-center justify-between border-b border-[var(--border)] px-5 md:px-8">
          <AdminMobileNavigation />
          <span className="ml-2 font-medium lg:hidden">Sora 管理</span>
          <span className="ml-auto hidden text-sm text-[var(--muted)] sm:inline">
            {session.user.name}
          </span>
          <Link className="ml-4 text-sm text-[var(--muted)] hover:text-[var(--primary)]" href="/">
            查看站点
          </Link>
          <form action={signOutAction} className="ml-2">
            <button
              aria-label="退出登录"
              className="grid size-9 place-items-center rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
              title="退出登录"
              type="submit"
            >
              <LogOut aria-hidden="true" size={17} />
            </button>
          </form>
        </header>
        <main className="mx-auto max-w-[var(--content-width)] px-5 py-8 md:px-8" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
