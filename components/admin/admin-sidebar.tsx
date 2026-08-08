"use client";

import {
  BookOpenText,
  DatabaseBackup,
  FileText,
  FolderTree,
  Image,
  LayoutDashboard,
  Link2,
  MessageSquareText,
  Navigation,
  Settings,
  Tags,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavigation = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
  { href: "/admin/posts", label: "文章", icon: BookOpenText },
  { href: "/admin/pages", label: "页面", icon: FileText },
  { href: "/admin/categories", label: "分类", icon: FolderTree },
  { href: "/admin/tags", label: "标签", icon: Tags },
  { href: "/admin/comments", label: "评论", icon: MessageSquareText },
  { href: "/admin/media", label: "媒体", icon: Image },
  { href: "/admin/menus", label: "菜单", icon: Navigation },
  { href: "/admin/friends", label: "友链", icon: Link2 },
  { href: "/admin/data", label: "数据管理", icon: DatabaseBackup },
  { href: "/admin/settings", label: "设置", icon: Settings },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar hidden lg:block">
      <div className="admin-sidebar-panel">
        <Link className="admin-brand" href="/admin">
          Sora 管理
        </Link>
        <nav aria-label="后台导航" className="admin-nav">
          {adminNavigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={active ? "admin-nav-link admin-nav-link-active" : "admin-nav-link"}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden="true" size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
