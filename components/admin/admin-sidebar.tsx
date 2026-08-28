"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AdminAccount } from "./admin-account";
import { adminNavigation, isAdminNavigationActive } from "./admin-navigation";
import { ThemeToggle } from "@/components/ui/theme-provider";

interface AdminSidebarProps {
  user: {
    email: string;
    name: string;
  };
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar-shell hidden lg:block">
      <div className="admin-sidebar-shell-panel">
        <div className="admin-shell-brand-row">
          <Link className="admin-shell-brand" href="/admin">
            Sora 管理
          </Link>
          <ThemeToggle />
        </div>
        <nav aria-label="后台导航" className="admin-shell-navigation">
          {adminNavigation.map((group) => (
            <section className="admin-navigation-group" key={group.group}>
              <h2>{group.group}</h2>
              <div>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isAdminNavigationActive(pathname, item.href);
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={active ? "admin-shell-nav-link is-active" : "admin-shell-nav-link"}
                      href={item.href}
                      key={item.href}
                    >
                      <Icon aria-hidden="true" size={17} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
        <AdminAccount email={user.email} name={user.name} />
      </div>
    </aside>
  );
}
