import { AdminMobileNavigation } from "@/components/admin/admin-mobile-navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { UIProvider } from "@/components/ui/ui-provider";
import { requireAdminSession } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "管理后台",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAdminSession();
  const currentUser = { email: session.user.email, name: session.user.name };

  return (
    <UIProvider>
      <div className="admin-shell-layout">
        <AdminSidebar user={currentUser} />
        <div className="admin-shell-workspace">
          <main className="admin-shell-main" id="main-content">
            <div className="admin-mobile-navigation-slot lg:hidden">
              <AdminMobileNavigation user={currentUser} />
            </div>
            {children}
          </main>
        </div>
      </div>
    </UIProvider>
  );
}
