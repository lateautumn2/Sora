import {
  BookOpenText,
  FileText,
  FolderTree,
  Image,
  LayoutDashboard,
  MessageSquareText,
  Navigation,
  DatabaseBackup,
  Settings,
  Tags,
} from "lucide-react";
import Link from "next/link";

const adminNavigation = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
  { href: "/admin/posts", label: "文章", icon: BookOpenText },
  { href: "/admin/pages", label: "页面", icon: FileText },
  { href: "/admin/categories", label: "分类", icon: FolderTree },
  { href: "/admin/tags", label: "标签", icon: Tags },
  { href: "/admin/comments", label: "评论", icon: MessageSquareText },
  { href: "/admin/media", label: "媒体", icon: Image },
  { href: "/admin/menus", label: "菜单", icon: Navigation },
  { href: "/admin/data", label: "数据管理", icon: DatabaseBackup },
  { href: "/admin/settings", label: "设置", icon: Settings },
] as const;

export function AdminSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] lg:block">
      <div className="sticky top-0 p-4">
        <Link className="mb-5 block px-3 py-2 font-serif text-lg font-semibold" href="/admin">
          Sora 管理
        </Link>
        <nav aria-label="后台导航" className="space-y-1">
          {adminNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="flex h-10 items-center gap-3 rounded-[var(--radius)] px-3 text-sm text-[var(--muted)] hover:bg-white hover:text-[var(--text)]"
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
