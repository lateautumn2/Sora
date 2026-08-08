import type { Route } from "next";
import Link from "next/link";

export interface AdminTabItem {
  href: string;
  label: string;
  value: string;
}

export function AdminTabs({
  activeValue,
  label,
  tabs,
}: {
  activeValue: string;
  label: string;
  tabs: readonly AdminTabItem[];
}) {
  return (
    <nav aria-label={label} className="admin-link-tabs" role="tablist">
      {tabs.map((tab) => {
        const active = tab.value === activeValue;
        return (
          <Link
            aria-selected={active}
            className={active ? "admin-link-tab is-active" : "admin-link-tab"}
            href={tab.href as Route}
            key={tab.value}
            role="tab"
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
