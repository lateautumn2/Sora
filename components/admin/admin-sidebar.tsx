"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNavigation, isAdminNavigationActive } from "./admin-navigation";

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar-shell hidden lg:block">
      <div className="admin-sidebar-shell-panel">
        <Link className="admin-shell-brand" href="/admin">
          Sora 管理
        </Link>
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
      </div>
    </aside>
  );
}
