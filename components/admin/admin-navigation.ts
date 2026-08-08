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
import type { LucideIcon } from "lucide-react";
import type { Route } from "next";

export interface AdminNavigationItem {
  href: Route;
  icon: LucideIcon;
  label: string;
}

export interface AdminNavigationGroup {
  group: string;
  items: readonly AdminNavigationItem[];
}

export const adminNavigation: readonly AdminNavigationGroup[] = [
  {
    group: "概览",
    items: [{ href: "/admin", icon: LayoutDashboard, label: "仪表盘" }],
  },
  {
    group: "内容",
    items: [
      { href: "/admin/posts", icon: BookOpenText, label: "文章" },
      { href: "/admin/pages", icon: FileText, label: "页面" },
      { href: "/admin/categories", icon: FolderTree, label: "分类" },
      { href: "/admin/tags", icon: Tags, label: "标签" },
    ],
  },
  {
    group: "互动",
    items: [
      { href: "/admin/comments", icon: MessageSquareText, label: "评论" },
      { href: "/admin/friends", icon: Link2, label: "友链" },
    ],
  },
  {
    group: "管理",
    items: [
      { href: "/admin/media", icon: Image, label: "媒体" },
      { href: "/admin/menus", icon: Navigation, label: "菜单" },
      { href: "/admin/data", icon: DatabaseBackup, label: "数据管理" },
      { href: "/admin/settings", icon: Settings, label: "设置" },
    ],
  },
];

export function isAdminNavigationActive(pathname: string, href: Route): boolean {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}
